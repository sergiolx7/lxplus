import {db} from './data.js';
// STUN remains a safe best-effort fallback. TURN keys are never committed to frontend code.
export const stunServers=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
export async function rtcConfig(kind,id){
 try{
  const {data,error}=await db.functions.invoke('lx-rtc-config',{body:{kind,id},signal:AbortSignal.timeout(8500)});
  if(!error&&Array.isArray(data?.iceServers)&&data.iceServers.length){
   const turnAvailable=!!data.turnConfigured&&data.iceServers.some(server=>(Array.isArray(server.urls)?server.urls:[server.urls]).some(url=>typeof url==='string'&&/^turns?:/i.test(url)));
   return {iceServers:data.iceServers,turnConfigured:turnAvailable,expiresIn:Number(data.expiresIn)||0,reason:turnAvailable?'':data.reason||'TURN_NOT_CONFIGURED'};
  }
  return {iceServers:stunServers,turnConfigured:false,expiresIn:0,reason:data?.error||'RTC_PROVIDER_UNAVAILABLE'};
 }catch{
  return {iceServers:stunServers,turnConfigured:false,expiresIn:0,reason:'RTC_PROVIDER_UNAVAILABLE'};
 }
}
