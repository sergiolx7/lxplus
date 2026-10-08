import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createAutomation} from '../_shared/automation-core.mjs';
const base=Deno.env.get('SUPABASE_URL')||'';
const db=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 const token=req.headers.get('x-lx-job-token')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return json({error:'UNAUTHORIZED'},401);
 try{
  const allowed=await db.rpc('lx_auto_authorize',{p_token:token});if(allowed.error||allowed.data!==true)return json({error:'UNAUTHORIZED'},401);
  if(Number(req.headers.get('content-length')||0)>2000)return json({error:'REQUEST_TOO_LARGE'},413);
  const raw=await req.text();if(raw.length>2000)return json({error:'REQUEST_TOO_LARGE'},413);
  const body=JSON.parse(raw);const automation=createAutomation({db,base});return json(await automation.run(body.kind));
 }catch{return json({error:'AUTOMATION_FAILED'},503);}
});
