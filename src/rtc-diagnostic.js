// A bounded connectivity probe; no microphone, camera or permanent TURN credential is used.
export function relayCapabilities(iceServers=[]){
 const urls=(Array.isArray(iceServers)?iceServers:[]).flatMap(s=>Array.isArray(s?.urls)?s.urls:[s?.urls]).filter(s=>typeof s==='string');
 return {hasTurn:urls.some(s=>/^turns?:/i.test(s)),
         hasTls443:urls.some(s=>/^turns:[^/?]+:443(?:[?]|$)/i.test(s))};
}
export async function probeTurnRelay(iceServers,{PeerConnection=globalThis.RTCPeerConnection,timeoutMs=11000}={}){
 const capabilities=relayCapabilities(iceServers);
 if(!capabilities.hasTurn)return {reachable:false,reason:'TURN_NOT_CONFIGURED',...capabilities};
 if(typeof PeerConnection!=='function')return {reachable:false,reason:'WEBRTC_UNSUPPORTED',...capabilities};
 let pc;
 try{pc=new PeerConnection({iceServers,iceTransportPolicy:'relay',iceCandidatePoolSize:0})}
 catch{return {reachable:false,reason:'RTC_INIT_FAILED',...capabilities}}
 return new Promise(resolve=>{
  let finished=false,lastError='',timer;
  const finish=(reachable,reason)=>{
   if(finished)return;finished=true;clearTimeout(timer);
   try{pc.onicecandidate=null;pc.onicecandidateerror=null;pc.close()}catch{}
   resolve({reachable,reason:reachable?'RELAY_CANDIDATE_FOUND':reason,...capabilities});
  };
  pc.onicecandidate=e=>{
   if(e.candidate&&(e.candidate.type==='relay'||/\styp relay(?:\s|$)/.test(e.candidate.candidate||'')))finish(true,'');
   else if(!e.candidate)finish(false,lastError||'NO_RELAY_CANDIDATE');
  };
  pc.onicecandidateerror=e=>{if(Number(e.errorCode)===701)lastError='TURN_UNREACHABLE';else if(Number(e.errorCode)>=400)lastError='TURN_AUTH_OR_NETWORK_ERROR'};
  timer=setTimeout(()=>finish(false,lastError||'RELAY_TIMEOUT'),Math.min(Math.max(timeoutMs,1000),20000));
  Promise.resolve().then(async()=>{
   pc.createDataChannel('lx-turn-diagnostic');
   const offer=await pc.createOffer();if(!finished)await pc.setLocalDescription(offer);
  }).catch(()=>finish(false,'RTC_NEGOTIATION_FAILED'));
 });
}
