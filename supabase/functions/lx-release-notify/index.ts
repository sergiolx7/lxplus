import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

// A single-use, expiring release token authorizes this internal worker.
// Tokens stay out of the repository, client bundle and logs.
const json = (value: unknown, status=200) => new Response(JSON.stringify(value), {
 status, headers: {"Content-Type":"application/json", "Cache-Control":"no-store"}
});
Deno.serve(async (req: Request) => {
 if(req.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405);
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!/^[a-f0-9]{64}$/.test(token)) return json({error:"AUTH_REQUIRED"},401);
 let body: Record<string,unknown>;
 try {body=await req.json();} catch {return json({error:"INVALID_JSON"},400);}
 const release=String(body.release||"");
 if(!/^UI[0-9]{2,4}$/.test(release)) return json({error:"INVALID_RELEASE"},400);
 const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,"0")).join("");
 const {data:job,error:jobError}=await service.from("lx_release_dispatch").select("release,token_hash,payload,status,created_at").eq("release",release).maybeSingle();
 if(jobError||!job||job.token_hash!==digest||job.status!=="queued"||Date.now()-Date.parse(job.created_at)>3600000) return json({error:"JOB_UNAUTHORIZED"},403);
 const {data:config,error:configError}=await service.from("lx_push_config").select("value").eq("key","vapid").single();
 const cfg=config?.value;
 if(configError||!cfg?.publicKey||!cfg?.privateKey||!cfg?.subject) return json({error:"PUSH_CONFIG_UNAVAILABLE"},503);
 const {data:subs,error:subError}=await service.from("lx_push_subscriptions").select("id,user_id,endpoint,p256dh,auth").eq("enabled",true).limit(5000);
 if(subError) return json({error:"SUBSCRIPTIONS_UNAVAILABLE"},503);
 const {data:claimed,error:claimError}=await service.from("lx_release_dispatch").update({status:"sending",started_at:new Date().toISOString()}).eq("release",release).eq("status","queued").eq("token_hash",digest).select("release").maybeSingle();
 if(claimError||!claimed) return json({error:"JOB_ALREADY_CLAIMED"},409);
 try {
  webpush.setVapidDetails(cfg.subject,cfg.publicKey,cfg.privateKey);
  const payload=JSON.stringify({title:String(job.payload.title||"LX Plus").slice(0,80),body:String(job.payload.body||"").slice(0,400),url:"/",tag:"lx-release-"+release,source:"LX Plus",sentAt:new Date().toISOString()});
  let sent=0,failed=0;const stale: string[]=[],rows=subs||[];
  for(let i=0;i<rows.length;i+=20) await Promise.all(rows.slice(i,i+20).map(async sub=>{
   try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:86400,timeout:15000});sent++;}
   catch(error){failed++;const status=Number((error as {statusCode?:number})?.statusCode||0);if(status===404||status===410)stale.push(sub.id);}
  }));
  if(stale.length) await service.from("lx_push_subscriptions").delete().in("id",stale);
  const result={sent,failed,removed:stale.length,total:rows.length,users:new Set(rows.map(s=>s.user_id)).size};
  await service.from("lx_release_dispatch").update({status:"completed",token_hash:null,result,finished_at:new Date().toISOString()}).eq("release",release);
  return json({ok:true,...result});
 } catch {
  await service.from("lx_release_dispatch").update({status:"failed",token_hash:null,result:{error:"DISPATCH_FAILED"},finished_at:new Date().toISOString()}).eq("release",release);
  return json({error:"DISPATCH_FAILED"},500);
 }
});
