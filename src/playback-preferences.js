export function normalizePlayback(value={}){
 value=value&&typeof value==='object'?value:{};
 const number=(v,fallback,min,max)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
 return {volume:number(value.volume,1,0,1),muted:value.muted===true,speed:[.75,1,1.25,1.5,2].includes(Number(value.speed))?Number(value.speed):1,autoplayNext:value.autoplayNext!==false,subtitleSize:number(value.subtitleSize,100,75,200),subtitleOffset:number(value.subtitleOffset,0,-30,30),subtitleLanguage:/^[a-z0-9-]{2,15}$/i.test(value.subtitleLanguage||'')?value.subtitleLanguage:'off'};
}
export function applyPlayback(media,value){const p=normalizePlayback(value);media.volume=p.volume;media.muted=p.muted;media.playbackRate=p.speed;return p}
export function resumePosition(progress,duration,index=null){
 if(!progress||!Number.isFinite(duration)||duration<=0||(progress.episodeIndex??null)!==index)return 0;
 const position=Number(progress.position);return Number.isFinite(position)&&position>0&&position<duration-5?position:0;
}
export function nextEpisodeCountdown({seconds=8,onTick=()=>{},onNext=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let remaining=seconds,timer=null,active=true;
 const cancel=()=>{active=false;clearTimer(timer)};
 const now=()=>{if(!active)return;cancel();onNext()};
 const tick=()=>{if(!active)return;onTick(remaining);if(remaining--<=0)now();else timer=setTimer(tick,1000)};
 tick();return {cancel,now};
}
