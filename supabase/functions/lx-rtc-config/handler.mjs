const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const stun=[{urls:['stun:stun.cloudflare.com:3478']}];
export async function handleRtc(req,{createClient,env,fetcher=fetch}){
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();if(!token)return json({error:'AUTH_REQUIRED'},401);
 try{
  const text=await req.text();if(text.length>1000)return json({error:'INVALID_REQUEST'},400);
  let body;try{body=JSON.parse(text)}catch{return json({error:'INVALID_REQUEST'},400)}
  if(!['call','watch'].includes(body.kind)||!/^[-a-f0-9]{36}$/i.test(body.id||''))return json({error:'INVALID_REQUEST'},400);
  const client=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const user=await client.auth.getUser(token);if(user.error||!user.data?.user)return json({error:'AUTH_REQUIRED'},401);
  const access=await client.rpc('lx_rtc_config_access',{p_kind:body.kind,p_id:body.id});if(access.error||access.data!==true)return json({error:'RTC_ACCESS_OR_LIMIT'},403);
  const id=env('LX_TURN_KEY_ID'),key=env('LX_TURN_API_TOKEN');if(!id||!key)return json({iceServers:stun,turnConfigured:false,expiresIn:0});
  if(!/^[a-z0-9_-]{1,128}$/i.test(id))return json({error:'RTC_NOT_CONFIGURED'},503);
  const response=await fetcher('https://rtc.live.cloudflare.com/v1/turn/keys/'+id+'/credentials/generate-ice-servers',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({ttl:3600}),signal:AbortSignal.timeout(6000)});
  if(!response.ok)return json({error:'RTC_PROVIDER_UNAVAILABLE'},503);
  const data=await response.json(),iceServers=(data.iceServers||[]).map(server=>({urls:(Array.isArray(server.urls)?server.urls:[server.urls]).filter(url=>typeof url==='string'&&/^(stun:|turn:|turns:)/.test(url)&&!/:53(?:\?|$)/.test(url)),...(typeof server.username==='string'?{username:server.username}:{}),...(typeof server.credential==='string'?{credential:server.credential}:{})})).filter(s=>s.urls.length);
  if(!iceServers.some(s=>s.urls.some(url=>/^turns?:/.test(url))))return json({error:'RTC_PROVIDER_UNAVAILABLE'},503);
  return json({iceServers,turnConfigured:true,expiresIn:3600});
 }catch{return json({error:'RTC_UNAVAILABLE'},503)}
}
