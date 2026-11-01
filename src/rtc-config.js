import {db} from './data.js';
export const stunServers=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
export async function rtcConfig(kind,id){
 try{const {data,error}=await db.functions.invoke('lx-rtc-config',{body:{kind,id},signal:AbortSignal.timeout(7000)});if(!error&&Array.isArray(data?.iceServers)&&data.iceServers.length)return {iceServers:data.iceServers,turnConfigured:data.turnConfigured===true,expiresIn:Number(data.expiresIn)||0}}
 catch{/* STUN remains available when the optional relay endpoint is unavailable. */}
 return {iceServers:stunServers,turnConfigured:false,expiresIn:0};
}
