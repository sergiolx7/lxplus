import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {providerDiscovery,searchTerms} from './providers.mjs';
const base=Deno.env.get('SUPABASE_URL')||'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
const db=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function authorized(req){
 const scheduled=req.headers.get('x-lx-job-token')||'';
 if(/^[a-f0-9]{64}$/.test(scheduled)){
  const r=await db.rpc('lx_auto_authorize',{p_token:scheduled});if(!r.error&&r.data===true)return true;
 }
 const jwt=(req.headers.get('Authorization')||'').match(/^Bearer (\S+)$/i)?.[1];
 if(!jwt||!anon)return false;
 const userDb=createClient(base,anon,{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false,autoRefreshToken:false}});
 const user=await userDb.auth.getUser(jwt);
 if(user.error||!user.data?.user)return false;
 const role=await userDb.rpc('lx_admin_role');
 return !role.error&&['owner','administrator','editor'].includes(role.data);
}
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 if(Number(req.headers.get('content-length')||0)>2000)return json({error:'REQUEST_TOO_LARGE'},413);
 try{
  if(!await authorized(req))return json({error:'UNAUTHORIZED'},401);
  const input=await req.text();if(input.length>2000||JSON.parse(input||'{}').action!=='run')return json({error:'INVALID_ACTION'},400);
  const claim=await db.rpc('lx_music_robot_claim');if(claim.error)throw Error('CLAIM_FAILED');
  const job=claim.data;if(!job)return json({status:'idle',reason:'disabled, daily limit reached, or another run in progress'});
  const run=job.run_id;let scanned=0,added=0,duplicates=0,status='error',error=null;
  try{
   const settings=await db.from('lx_integrations').select('key,secret').in('key',['youtube_music_api_key','spotify_client_id','spotify_client_secret']);
   if(settings.error)throw Error('CREDENTIALS_UNAVAILABLE');
   const creds=Object.fromEntries((settings.data||[]).map(x=>[x.key,x.secret]));
   if(!creds.youtube_music_api_key&&!(creds.spotify_client_id&&creds.spotify_client_secret)){status='needs_setup';error='PROVIDER_KEY_REQUIRED'}
   else{
    const discovery=await providerDiscovery({query:searchTerms(job.queries,job.cursor),limit:job.limit,youtubeKey:creds.youtube_music_api_key||'',spotifyId:creds.spotify_client_id||'',spotifySecret:creds.spotify_client_secret||''});
    scanned=discovery.scanned;
    if(discovery.items.length){
     const staged=await db.rpc('lx_music_robot_stage',{p_items:discovery.items});
     if(staged.error)throw Error('STAGING_FAILED');
     added=Number(staged.data?.added)||0;duplicates=Number(staged.data?.duplicates)||0;
    }
    status=discovery.errors.length?'partial':'success';error=discovery.errors[0]||null;
   }
  }catch(e){status='error';error=['STAGING_FAILED','CREDENTIALS_UNAVAILABLE'].includes(e.message)?e.message:'ROBOT_PROVIDER_FAILED'}
  finally{
   const finish=await db.rpc('lx_music_robot_finish',{p_run:run,p_scanned:scanned,p_added:added,p_duplicates:duplicates,p_status:status,p_error:error});
   if(finish.error)return json({error:'RUN_FINISH_FAILED'},503);
  }
  return json({status,scanned,added,duplicates,error_code:error});
 }catch{return json({error:'ROBOT_UNAVAILABLE'},503)}
});
