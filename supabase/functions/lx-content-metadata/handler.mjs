// Authenticated provider metadata: never accept arbitrary fetch hosts or invent artist/album.
const hosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be','open.spotify.com']);
export function canonicalProvider(input){
 try{
  const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||!hosts.has(u.hostname.toLowerCase()))return null;
  const path=u.pathname.split('/').filter(Boolean),host=u.hostname.toLowerCase();
  if(host==='open.spotify.com'){
   const type=path[0]==='embed'?path[1]:path[0],id=path[0]==='embed'?path[2]:path[1];
   if(type!=='track'||!/^[A-Za-z0-9]{22}$/.test(id||''))return null;
   return {provider:'Spotify',url:'https://open.spotify.com/track/'+id,endpoint:'https://open.spotify.com/oembed?url='+encodeURIComponent('https://open.spotify.com/track/'+id)};
  }
  let id=host.includes('youtu.be')?path[0]:path[0]==='watch'?u.searchParams.get('v'):['shorts','live','embed','v'].includes(path[0])?path[1]:null;
  if(!/^[\w-]{11}$/.test(id||''))return null;
  const url='https://www.youtube.com/watch?v='+id;
  return {provider:'YouTube',url,endpoint:'https://www.youtube.com/oembed?url='+encodeURIComponent(url)+'&format=json'};
 }catch{return null}
}
const safeCover=(value,provider)=>{
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';const h=u.hostname.toLowerCase();return (provider==='Spotify'&&h==='i.scdn.co'||provider==='YouTube'&&['i.ytimg.com','img.youtube.com','yt3.ggpht.com'].includes(h))?u.href:''}catch{return ''}
};
export async function providerMetadata(url,{fetcher=fetch}={}){
 const parsed=canonicalProvider(url);if(!parsed)return {url,status:'review',reason:'Provedor ou link de faixa não suportado'};
 let timer;const controller=new AbortController();
 try{
  timer=setTimeout(()=>controller.abort(),4200);
  const response=await fetcher(parsed.endpoint,{signal:controller.signal,headers:{accept:'application/json'},redirect:'error'});
  if(!response.ok)return {url,provider:parsed.provider,status:'review',reason:'Metadados não disponíveis no provedor'};
  const data=await response.json();
  const title=String(data?.title||'').trim().slice(0,200);
  if(!title)return {url,provider:parsed.provider,status:'review',reason:'Título ausente na fonte oficial'};
  return {url,provider:parsed.provider,title,cover:safeCover(data.thumbnail_url,parsed.provider),status:'identified'};
 }catch{return {url,provider:parsed.provider,status:'review',reason:'Provedor temporariamente indisponível'}}
 finally{clearTimeout(timer)}
}
export async function handleMetadata(req,{env,fetcher=fetch}={}){
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
 const token=req.headers.get('authorization')||'';
 const base=env?.('SUPABASE_URL'),key=env?.('SUPABASE_ANON_KEY');
 if(!/^Bearer \S+$/.test(token)||!base||!key)return respond({error:'UNAUTHORIZED'},401);
 try{
  const authorized=await fetcher(base+'/rest/v1/rpc/lx_admin_role',{method:'POST',headers:{Authorization:token,apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(4000)});
  if(!authorized.ok)return respond({error:'UNAUTHORIZED'},401);
  const role=await authorized.json();
  if(!['owner','administrator','editor'].includes(role))return respond({error:'FORBIDDEN'},403);
  const request=await req.json();
  if(!Array.isArray(request?.urls)||request.urls.length<1||request.urls.length>40)return respond({error:'LIMIT_40'},400);
  if(request.urls.some(u=>typeof u!=='string'||u.length>3000))return respond({error:'INVALID_URL'},400);
  const entries=[];
  // Small batches avoid exceeding edge limits and third-party oEmbed rate limits.
  for(let start=0;start<request.urls.length;start+=8){
   entries.push(...await Promise.all(request.urls.slice(start,start+8).map(url=>providerMetadata(url,{fetcher}))));
  }
  return respond({items:entries});
 }catch{return respond({error:'PROVIDER_UNAVAILABLE'},502)}
}
