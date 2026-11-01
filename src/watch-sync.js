export function watchTarget(state,serverNow=Date.now()){
 const rate=Number(state.rate)||1,anchor=Date.parse(state.anchor_at),position=Math.max(0,Number(state.position)||0);
 const moving=state.status==='active'&&!state.paused&&state.host_ready===true&&state.guest_ready===true;
 const until=Math.min(serverNow,Date.parse(state.host_seen)+10000,Date.parse(state.guest_seen)+10000);
 const elapsed=moving&&Number.isFinite(anchor)&&Number.isFinite(until)?Math.max(0,(until-anchor)/1000):0;
 return {position:Math.min(86400,position+elapsed*rate),paused:!moving||serverNow<anchor||until<serverNow,rate,startIn:moving?Math.max(0,anchor-serverNow):0};
}
export function watchCorrection(media,state,serverNow=Date.now()){
 const target=watchTarget(state,serverNow),drift=target.position-(Number(media.currentTime)||0);
 return {...target,drift,seek:Math.abs(drift)>.9,playbackRate:target.paused||Math.abs(drift)<.12?target.rate:Math.max(.5,Math.min(2,target.rate+(drift>0?.035:-.035)))};
}
export class WatchClock{
 constructor(){this.offset=0;this.rtt=Infinity}
 observe(sent,received,serverStamp){const rtt=received-sent,server=Date.parse(serverStamp);if(!Number.isFinite(server)||rtt<0||rtt>10000)return;if(rtt<=this.rtt*1.5){this.offset=server-(sent+received)/2;this.rtt=Math.min(this.rtt,rtt)}}
 now(){return Date.now()+this.offset}
}
export function newerWatch(current,next){return !!next&&(!current||next.id===current.id&&Number(next.revision)>Number(current.revision))}
export function validPeerWatch(current,next,sender){
 if(!current||!next||![current.host_id,current.guest_id].includes(sender))return false;
 if(['id','host_id','guest_id','content_id','expires_at'].some(key=>next[key]!==current[key]))return false;
 if(!Number.isSafeInteger(next.revision)||next.revision<=Number(current.revision)||next.revision>Number(current.revision)+1000)return false;
 if(!Number.isInteger(next.episode_index)||next.episode_index<0||next.episode_index>9999||sender!==current.host_id&&next.episode_index!==current.episode_index)return false;
 return ['active','ended'].includes(next.status)&&typeof next.paused==='boolean'&&typeof next.host_ready==='boolean'&&typeof next.guest_ready==='boolean'&&Number.isFinite(next.position)&&next.position>=0&&next.position<=86400&&Number.isFinite(next.rate)&&next.rate>=.5&&next.rate<=2&&['anchor_at','host_seen','guest_seen'].every(key=>Number.isFinite(Date.parse(next[key])));
}
