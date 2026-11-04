// Live level analysis only. Audio never reaches a recorder, a file or the speakers.
export function voiceDetector({attackMs=100,releaseMs=380,minLevel=.018}={}){
 let floor=.004,since=null,lastVoice=-Infinity,speaking=false;
 return (rms,now,{enabled=true,muted=false,live=true}={})=>{
  const level=Number.isFinite(rms)?Math.max(0,rms):0;
  if(!enabled||muted||!live){since=null;speaking=false;lastVoice=-Infinity;return {speaking:false,level:0}}
  const threshold=Math.max(minLevel,floor*3.2);
  if(!speaking&&level<threshold*.8)floor=floor*.94+Math.min(level,.025)*.06;
  if(level>threshold){if(since===null)since=now;if(now-since>=attackMs){speaking=true;lastVoice=now}}
  else {since=null;if(now-lastVoice>releaseMs)speaking=false}
  return {speaking,level:Math.min(1,level*7)};
 };
}
export function watchVoiceActivity(track,onSample,{AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,audioContext=null,intervalMs=80}={}){
 if(!track||(!AudioContext&&!audioContext)){onSample({speaking:false,level:0,available:false});return ()=>{}}
 let context,source,analyser,timer,closed=false;
 const stop=()=>{if(closed)return;closed=true;clearInterval(timer);track.removeEventListener('ended',stop);try{source?.disconnect();analyser?.disconnect()}catch{}if(!audioContext)context?.close().catch(()=>{});onSample({speaking:false,level:0,available:false})};
 try{
  context=audioContext||new AudioContext();source=context.createMediaStreamSource(new MediaStream([track]));analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
  const samples=new Float32Array(analyser.fftSize),detect=voiceDetector();
  const sample=()=>{if(closed)return;analyser.getFloatTimeDomainData(samples);let sum=0;for(const n of samples)sum+=n*n;onSample({...detect(Math.sqrt(sum/samples.length),performance.now(),{enabled:track.enabled,muted:track.muted,live:track.readyState==='live'}),available:context.state==='running'})};
  context.resume().catch(()=>{});timer=setInterval(sample,intervalMs);track.addEventListener('ended',stop,{once:true});sample();return stop;
 }catch{stop();return ()=>{}}
}
