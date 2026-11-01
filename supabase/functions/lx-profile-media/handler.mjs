const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export function inspectProfileImage(bytes,kind,premium){
 if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>5*1024*1024)throw Error('PROFILE_IMAGE_SIZE');
 const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));let mime,ext,animated=false;
 if(ascii(0,6)==='GIF87a'||ascii(0,6)==='GIF89a'){mime='image/gif';ext='gif';animated=true}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){mime='image/jpeg';ext='jpg'}
 else if([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)){mime='image/png';ext='png';for(let i=8;i+12<=bytes.length;){const size=new DataView(bytes.buffer,bytes.byteOffset+i,4).getUint32(0);if(ascii(i+4,i+8)==='acTL')animated=true;if(size>bytes.length-i-12)throw Error('PROFILE_IMAGE_INVALID');i+=size+12}}
 else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'){mime='image/webp';ext='webp';for(let i=12;i+8<=bytes.length;){const size=new DataView(bytes.buffer,bytes.byteOffset+i+4,4).getUint32(0,true);if(['ANIM','ANMF'].includes(ascii(i,i+4)))animated=true;if(size>bytes.length-i-8)throw Error('PROFILE_IMAGE_INVALID');i+=8+size+(size%2)}}
 else throw Error('PROFILE_IMAGE_FORMAT');
 if(animated&&(kind!=='banner'||premium!==true))throw Error('PREMIUM_BANNER_REQUIRED');
 if(ext==='gif'){const w=bytes[6]+bytes[7]*256,h=bytes[8]+bytes[9]*256;if(!w||!h||w*h>16000000||w>4096||h>4096)throw Error('PROFILE_IMAGE_SIZE')}if(ext==='png'&&bytes.length>=24){const view=new DataView(bytes.buffer,bytes.byteOffset);const w=view.getUint32(16),h=view.getUint32(20);if(!w||!h||w*h>16000000)throw Error('PROFILE_IMAGE_SIZE')}return {mime,ext,animated};
}
export async function handleProfileMedia(req,{createClient,env}){
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();if(!token)return json({error:'AUTH_REQUIRED'},401);
 try{
  if(Number(req.headers.get('content-length'))>6*1024*1024)return json({error:'PROFILE_IMAGE_SIZE'},413);
  const client=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const user=await client.auth.getUser(token);if(user.error||!user.data?.user)return json({error:'AUTH_REQUIRED'},401);
  const profile=await client.from('lx_profiles').select('user_id,approved,is_premium').eq('user_id',user.data.user.id).maybeSingle();if(profile.error||!profile.data?.approved)return json({error:'APPROVAL_REQUIRED'},403);
  const reader=req.body?.getReader();if(!reader)return json({error:'INVALID_REQUEST'},400);const chunks=[];let total=0;for(;;){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.byteLength;if(total>6*1024*1024){await reader.cancel();return json({error:'PROFILE_IMAGE_SIZE'},413)}chunks.push(chunk.value)}const form=await new Response(new Blob(chunks),{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData(),file=form.get('file'),kind=form.get('kind');if(!['avatar','banner'].includes(kind)||!file?.arrayBuffer)return json({error:'INVALID_REQUEST'},400);
  const image=inspectProfileImage(new Uint8Array(await file.arrayBuffer()),kind,profile.data.is_premium);
  const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}}),path='profiles/'+user.data.user.id+'/'+kind+'-'+crypto.randomUUID()+'.'+image.ext;
  const uploaded=await admin.storage.from('lx-assets').upload(path,file,{upsert:false,contentType:image.mime});if(uploaded.error)return json({error:'PROFILE_UPLOAD_FAILED'},503);
  const url=admin.storage.from('lx-assets').getPublicUrl(path).data.publicUrl;
  // Recheck entitlement in the UPDATE, so a revocation during upload cannot publish an animated banner.
  let query=admin.from('lx_profiles').update({[kind==='banner'?'banner_url':'avatar_url']:url}).eq('user_id',user.data.user.id).eq('approved',true);if(image.animated)query=query.eq('is_premium',true);
  const update=await query.select('user_id').maybeSingle();if(update.error||!update.data){await admin.storage.from('lx-assets').remove([path]);return json({error:'PROFILE_UPDATE_FAILED'},409)}
  return json({url,animated:image.animated});
 }catch(error){const code=String(error.message||'');return json({error:/^(PROFILE_IMAGE_|PREMIUM_BANNER_REQUIRED)/.test(code)?code:'PROFILE_UPLOAD_FAILED'},code==='PREMIUM_BANNER_REQUIRED'?403:400)}
}
