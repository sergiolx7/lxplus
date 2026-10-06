import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createCatalogService } from '../_shared/universal-service.mjs';
import { CatalogError } from '../_shared/universal-core.mjs';

const env=(name:string)=>Deno.env.get(name)||'';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info, x-lx-job-secret','access-control-allow-methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const resolveDns=async(host:string)=>{
  const values=await Promise.allSettled([Deno.resolveDns(host,'A'),Deno.resolveDns(host,'AAAA')]);
  return values.flatMap(v=>v.status==='fulfilled'?v.value:[]);
};
const catalog=createCatalogService({db,env,resolveDns});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    if(Number(req.headers.get('content-length')||0)>2_000_000)throw new CatalogError('REQUEST_TOO_LARGE',413);
    const raw=await req.text();if(raw.length>2_000_000)throw new CatalogError('REQUEST_TOO_LARGE',413);
    let body;try{body=JSON.parse(raw);}catch{throw new CatalogError('INVALID_JSON');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new CatalogError('INVALID_REQUEST');
    const isWorker=body.action==='maintenance'&&!!env('LX_CATALOG_JOB_SECRET')&&req.headers.get('x-lx-job-secret')===env('LX_CATALOG_JOB_SECRET');
    let user:{id:string,admin:boolean,worker?:boolean};
    if(isWorker)user={id:'worker',admin:true,worker:true};
    else{
      const authorization=req.headers.get('authorization')||'';
      if(!/^Bearer /i.test(authorization))throw new CatalogError('AUTHENTICATION_REQUIRED',401);
      const client=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
      const {data,error}=await client.auth.getUser();if(error||!data.user||data.user.is_anonymous)throw new CatalogError('INVALID_SESSION',401);
      const [profile,role]=await Promise.all([db.from('lx_profiles').select('approved').eq('user_id',data.user.id).maybeSingle(),db.from('lx_admins').select('role').eq('user_id',data.user.id).maybeSingle()]);
      if(!profile.data?.approved&&!role.data)throw new CatalogError('ACCOUNT_NOT_APPROVED',403);
      const isAdmin=['owner','administrator','editor'].includes(role.data?.role||'');
      user={id:data.user.id,admin:isAdmin};
      const rate=await db.rpc('lx_uc_gate',{p_key:'user:'+user.id,p_limit:120,p_window_ms:60000});
      if(rate.error)throw new CatalogError('CATALOG_DATABASE_NOT_READY',503);
      if(!rate.data)throw new CatalogError('RATE_LIMIT',429);
    }
    return json(await catalog.action(body,user));
  }catch(error){
    const e=error as {code?:string,status?:number,name?:string};
    // Never include database errors, request URLs, provider responses or tokens in client messages.
    return json({error:e.code||((e.name==='TimeoutError'||e.name==='AbortError')?'PROVIDER_TIMEOUT':'CATALOG_FAILED')},e.status||503);
  }
});
