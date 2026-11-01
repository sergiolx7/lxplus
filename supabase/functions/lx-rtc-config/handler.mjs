import {cloudflareCredentials} from './cloudflare.mjs';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const stun=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
const keys=['rtc_turn_key_id','rtc_turn_api_token'];
async function readBody(req){const reader=req.body?.getReader();if(!reader)throw Error('INVALID_REQUEST');let size=0,parts=[];for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>12000){await reader.cancel();throw Error('REQUEST_TOO_LARGE')}parts.push(next.value)}try{return JSON.parse(await new Blob(parts).text())}catch{throw Error('INVALID_REQUEST')}}
export async function handleRtc(req,{createClient,env,fetcher=fetch}){
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();if(!token)return json({error:'AUTH_REQUIRED'},401);
 try{
  const body=await readBody(req),action=body.action||'credentials';
  if(!['credentials','status','save','probe'].includes(action))return json({error:'INVALID_REQUEST'},400);
  if(action==='credentials'&&(!['call','watch'].includes(body.kind)||!/^[-a-f0-9]{36}$/i.test(body.id||'')))return json({error:'INVALID_REQUEST'},400);
  const client=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const user=await client.auth.getUser(token);if(user.error||!user.data?.user)return json({error:'AUTH_REQUIRED'},401);
  if(action==='credentials'){const access=await client.rpc('lx_rtc_config_access',{p_kind:body.kind,p_id:body.id});if(access.error||access.data!==true)return json({error:'RTC_ACCESS_OR_LIMIT'},403)}
  else{const role=await client.rpc('lx_admin_role'),approved=await client.rpc('lx_is_approved');if(role.error||role.data!=='owner'||approved.error||approved.data!==true)return json({error:'OWNER_REQUIRED'},403)}
  let admin;
  const service=()=>admin||=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  async function config(){const fallback={id:env('LX_TURN_KEY_ID'),token:env('LX_TURN_API_TOKEN')};if(!env('SUPABASE_SERVICE_ROLE_KEY'))return fallback;const stored=await service().from('lx_integrations').select('key,secret').in('key',keys);if(stored.error)return fallback;const values=Object.fromEntries((stored.data||[]).map(row=>[row.key,row.secret]));return values.rtc_turn_key_id&&values.rtc_turn_api_token?{id:values.rtc_turn_key_id,token:values.rtc_turn_api_token}:fallback}
  if(action==='save'){
   const id=String(body.keyId||'').trim(),secret=String(body.apiToken||'').trim();if(!/^[a-z0-9_-]{1,128}$/i.test(id)||secret.length<16||secret.length>4096)return json({error:'TURN_INVALID_KEY'},400);
   await cloudflareCredentials({id,token:secret},{fetcher});
   const saved=await service().from('lx_integrations').upsert([{key:keys[0],secret:id,updated_at:new Date().toISOString(),updated_by:user.data.user.id},{key:keys[1],secret,updated_at:new Date().toISOString(),updated_by:user.data.user.id}],{onConflict:'key'});if(saved.error)return json({error:'TURN_SAVE_FAILED'},503);
   console.info('LX_RTC_CONFIG_UPDATED',JSON.stringify({actor:user.data.user.id,provider:'cloudflare'}));return json({configured:true,provider:'cloudflare',credentialsAccepted:true});
  }
  const selected=await config(),configured=!!selected.id&&!!selected.token;
  if(action==='status')return json({configured,provider:'cloudflare'});
  if(!configured)return json(action==='probe'?{error:'TURN_NOT_CONFIGURED'}:{iceServers:stun,turnConfigured:false,expiresIn:0,reason:'TURN_NOT_CONFIGURED'},action==='probe'?503:200);
  return json(await cloudflareCredentials(selected,{fetcher}));
 }catch(error){const code=String(error.message||'');return json({error:['INVALID_REQUEST','REQUEST_TOO_LARGE','TURN_NOT_CONFIGURED','TURN_INVALID_KEY','TURN_CREDENTIALS_REJECTED','TURN_SAVE_FAILED','RTC_PROVIDER_UNAVAILABLE'].includes(code)?code:'RTC_UNAVAILABLE'},code==='REQUEST_TOO_LARGE'?413:code==='INVALID_REQUEST'||code==='TURN_INVALID_KEY'?400:503)}
}
