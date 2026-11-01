// Start the peer connection promptly even when the optional TURN endpoint is slow.
// Once credentials arrive, the active peer can add them and initiate an ICE restart.
export async function fastRtcConfig(load, fallback, waitMs=900){
 const ready=Promise.resolve().then(load);
 let timer;
 const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),Math.max(0,waitMs))});
 try{
  const initial=await Promise.race([ready,timeout]);
  return {initial,ready,provisional:initial===fallback};
 }finally{clearTimeout(timer)}
}
export function shouldUpgradeTurn(current, fresh){
 return !!fresh?.turnConfigured && Array.isArray(fresh.iceServers) && fresh.iceServers.some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(url=>typeof url==='string'&&/^turns?:/i.test(url))) && !current;
}
