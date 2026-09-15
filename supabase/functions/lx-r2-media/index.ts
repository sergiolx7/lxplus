import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders={...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"};
const out=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:jsonHeaders});
const fail=(error:string,status=400,message?:string)=>out({error,message:message||error},status);
const safe=(name:string)=>String(name||"media").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-160) || "media";

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{status:200,headers:corsHeaders});
  if(req.method!=="POST") return fail("METHOD_NOT_ALLOWED",405);
  let body:any={};
  try{ body=await req.json(); }catch{ return fail("INVALID_JSON",400); }

  const supa=createClient(
    Deno.env.get("SUPABASE_URL")||"",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",
    {auth:{persistSession:false,autoRefreshToken:false}}
  );

  const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!bearer) return fail("AUTH_REQUIRED",401);
  const {data:userData,error:userError}=await supa.auth.getUser(bearer);
  const user=userData?.user;
  if(userError||!user) return fail("AUTH_REQUIRED",401);

  const [{data:adminRow},{data:profileRow}]=await Promise.all([
    supa.from("lx_admins").select("user_id,role").eq("user_id",user.id).maybeSingle(),
    supa.from("lx_profiles").select("approved").eq("user_id",user.id).maybeSingle(),
  ]);
  const adminRole=String(adminRow?.role||"").toLowerCase();
  const isAdmin=!!adminRow?.user_id;
  const canManageMedia=["owner","administrator","editor"].includes(adminRole);
  const canConfigureStorage=adminRole==="owner";
  const approved=isAdmin||!!profileRow?.approved;

  const secret=async(key:string)=>{
    const {data}=await supa.from("lx_integrations").select("secret").eq("key",key).maybeSingle();
    return String(data?.secret||"").trim();
  };
  const cfg=async()=>{
    const [accountId,bucket,accessKeyId,secretAccessKey]=await Promise.all([
      secret("r2_account_id"),secret("r2_bucket"),secret("r2_access_key_id"),secret("r2_secret_access_key")
    ]);
    const configured=!!(accountId&&bucket&&accessKeyId&&secretAccessKey);
    return {accountId,bucket,accessKeyId,secretAccessKey,configured};
  };
  const clientFor=(c:any)=>new S3Client({
    region:"auto",
    endpoint:`https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials:{accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey},
    forcePathStyle:true,
  });

  try{
    const action=String(body?.action||"");
    const c=await cfg();

    if(action==="status"){
      if(!canManageMedia) return fail("PERMISSION_REQUIRED",403);
      return out({configured:c.configured,bucket:c.configured?c.bucket:"",provider:"Cloudflare R2"});
    }
    if(!c.configured) return fail("R2_NOT_CONFIGURED",409,"Cloudflare R2 ainda não foi configurado no ADM.");

    const s3=clientFor(c);

    if(action==="test"){
      if(!canConfigureStorage) return fail("OWNER_REQUIRED",403);
      await s3.send(new HeadBucketCommand({Bucket:c.bucket}));
      const origin=String(body?.origin||"").trim();
      let corsConfigured=false,corsWarning="";
      if(/^https?:\/\//i.test(origin)){
        try{
          await s3.send(new PutBucketCorsCommand({
            Bucket:c.bucket,
            CORSConfiguration:{CORSRules:[{
              AllowedOrigins:[origin],
              AllowedMethods:["GET","HEAD","PUT"],
              AllowedHeaders:["*"],
              ExposeHeaders:["ETag"],
              MaxAgeSeconds:3600,
            }]}
          }));
          corsConfigured=true;
        }catch(e){
          corsWarning=String((e as Error)?.message||e);
          console.warn("R2 CORS auto-config failed",e);
        }
      }
      return out({ok:true,bucket:c.bucket,corsConfigured,corsWarning});
    }

    if(action==="presign_upload"){
      if(!canManageMedia) return fail("PERMISSION_REQUIRED",403);
      const size=Math.max(0,Number(body?.size)||0);
      if(size>5*1024*1024*1024) return fail("R2_SINGLE_UPLOAD_TOO_LARGE",413,"Este arquivo passou de 5 GB. Use uma versão menor ou upload multipart.");
      const filename=safe(String(body?.filename||body?.label||"media"));
      const contentType=String(body?.contentType||"application/octet-stream").slice(0,160);
      const key=`media/${user.id}/${Date.now()}_${crypto.randomUUID().slice(0,8)}_${filename}`;
      const cmd=new PutObjectCommand({Bucket:c.bucket,Key:key,ContentType:contentType,CacheControl:"private, max-age=3600"});
      const url=await getSignedUrl(s3,cmd,{expiresIn:3600});
      return out({url,key,bucket:c.bucket,expiresIn:3600});
    }

    if(action==="presign_get"){
      if(!approved) return fail("APPROVED_ACCOUNT_REQUIRED",403);
      const key=String(body?.key||"").replace(/^r2:/,"").trim();
      if(!key.startsWith("media/")) return fail("INVALID_R2_KEY",400);
      const expires=Math.min(21600,Math.max(300,Number(body?.expires)||21600));
      const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:c.bucket,Key:key}),{expiresIn:expires});
      return out({url,key,expiresIn:expires});
    }

    if(action==="delete"){
      if(!canManageMedia) return fail("PERMISSION_REQUIRED",403);
      const key=String(body?.key||"").replace(/^r2:/,"").trim();
      if(!key.startsWith("media/")) return fail("INVALID_R2_KEY",400);
      await s3.send(new DeleteObjectCommand({Bucket:c.bucket,Key:key}));
      return out({ok:true,key});
    }

    return fail("UNKNOWN_ACTION",404);
  }catch(e){
    console.error("lx-r2-media",e);
    const name=String((e as any)?.name||"");
    const message=String((e as Error)?.message||e);
    if(/NoSuchBucket/i.test(name+message)) return fail("R2_BUCKET_NOT_FOUND",404,"O bucket informado não existe.");
    if(/AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch|Unauthorized/i.test(name+message)) return fail("R2_CREDENTIALS_REJECTED",403,"As credenciais do R2 foram recusadas.");
    return fail("R2_UPSTREAM_ERROR",502,message);
  }
});
