export function probeRelay(iceServers,{timeout=18000,signal}={}){
 return new Promise(resolve=>{
  if(signal?.aborted)return resolve({relay:false,cancelled:true,errors:[]});let pc,timer,settled=false;const errors=new Set();
  const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);pc?.close();resolve({...result,errors:[...errors]})},cancel=()=>finish({relay:false,cancelled:true});
  try{pc=new RTCPeerConnection({iceServers,iceTransportPolicy:'relay'});pc.createDataChannel('lx-relay-check');pc.onicecandidate=event=>{if(event.candidate?.type==='relay')finish({relay:true});else if(!event.candidate)finish({relay:false})};pc.onicecandidateerror=event=>errors.add(Number(event.errorCode)||0);signal?.addEventListener('abort',cancel,{once:true});timer=setTimeout(()=>finish({relay:false}),timeout);pc.createOffer().then(offer=>pc.setLocalDescription(offer)).catch(()=>finish({relay:false}))}catch{finish({relay:false})}
 });
}
