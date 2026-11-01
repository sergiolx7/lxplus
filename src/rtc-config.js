import {db} from './data.js';
export const stunServers=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
export async function rtcConfig(kind,id){
 let reason='RTC_UNAVAILABLE';
 try{const {data,error}=await db.functions.invoke('lx-rtc-config',{body:{kind,id},signal:AbortSignal.timeout(7000)});if(!error&&Array.isArray(data?.iceServers)&&data.iceServers.length)return {iceServers:data.iceServers,turnConfigured:data.turnConfigured===true,expiresIn:Number(data.expiresIn)||0,reason:data.reason||null,relaySource:data.relaySource||null};reason=data?.error||reason;try{reason=(await error?.context?.clone().json())?.error||reason}catch{}}
 catch{/* Keep the existing relay configuration during a temporary endpoint failure. */}
 return {iceServers:stunServers,turnConfigured:false,expiresIn:0,reason};
}
