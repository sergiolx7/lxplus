// The future provider must supply a verified adapter. No endpoint or signature is guessed.
export const gatewayUnavailable=()=>({available:false,code:'GATEWAY_NOT_CONFIGURED',checkout_available:false});
export function createBillingHandler({authenticate,runAction,origins=[]}){
 return async request=>{
  const origin=request.headers.get('Origin');
  const cors={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&origins.includes(origin)){cors['Access-Control-Allow-Origin']=origin;cors['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';cors['Access-Control-Allow-Methods']='POST, OPTIONS'}
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(origin&&!origins.includes(origin))return reply({error:'ORIGIN_NOT_ALLOWED'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization')||'')?.[1];
  if(!token)return reply({error:'AUTH_REQUIRED'},401);
  try{
   const user=await authenticate(token);if(!user?.id)return reply({error:'AUTH_REQUIRED'},401);
   const text=await request.text();if(text.length>4096)return reply({error:'REQUEST_TOO_LARGE'},413);
   let input;try{input=JSON.parse(text)}catch{return reply({error:'INVALID_REQUEST'},400)}
   if(!input||Array.isArray(input)||typeof input!=='object')return reply({error:'INVALID_REQUEST'},400);
   if(['checkout','cancel'].includes(input.action))return reply(gatewayUnavailable(),503);
   if(!['status','quote'].includes(input.action))return reply({error:'INVALID_ACTION'},400);
   const result=await runAction(token,input.action,input.data||{});
   if(result.error)return reply({error:'REQUEST_REJECTED'},400);
   return reply(result.data);
  }catch{return reply({error:'BILLING_UNAVAILABLE'},503)}
 };
}
// Until the provider is named, all webhook requests are rejected without changing data.
export function disabledWebhook(){return new Response(JSON.stringify(gatewayUnavailable()),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
