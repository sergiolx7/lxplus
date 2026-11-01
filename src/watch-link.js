import {db} from './data.js';
import {rtcConfig} from './rtc-config.js';
import {checked} from './ui.js';
import {validPeerWatch} from './watch-sync.js';
// Tiny canonical state packets only. The video is fetched independently by each member.
export class WatchLink{
 constructor(room,userId,onState){this.room=room;this.userId=userId;this.onState=onState;this.cursor=0;this.seen=new Set();this.ice=[];this.queue=Promise.resolve();this.closed=false;this.retries=0}
 async start(){
  if(!globalThis.RTCPeerConnection)return;
  const config=await rtcConfig('watch',this.room.id);if(this.closed)return;
  const pc=this.pc=new RTCPeerConnection({iceServers:config.iceServers}),host=this.room.host_id===this.userId;
  pc.onicecandidate=e=>{if(e.candidate)this.signal('ice',e.candidate.toJSON()).catch(()=>{})};
  pc.ondatachannel=e=>this.bind(e.channel);
  pc.onnegotiationneeded=async()=>{if(!host||this.negotiating||pc.signalingState!=='stable')return;this.negotiating=true;try{await pc.setLocalDescription(await pc.createOffer());await this.signal('offer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}catch{}finally{this.negotiating=false}};
  pc.onconnectionstatechange=()=>{if(!this.closed&&host&&pc.connectionState==='failed'&&this.retries++<2)pc.restartIce()};
  this.channel=db.channel('lx-watch-signal-'+this.room.id+'-'+this.userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_watch_signals',filter:'session_id=eq.'+this.room.id},e=>this.receive(e.new)).subscribe();
  this.timer=setInterval(()=>this.poll(),1200);await this.poll();if(host)this.bind(pc.createDataChannel('lx-watch-state',{ordered:true}));
  if(config.turnConfigured)this.renewTimer=setInterval(async()=>{try{const fresh=await rtcConfig('watch',this.room.id);if(!this.closed&&this.pc===pc&&fresh.turnConfigured){pc.setConfiguration({iceServers:fresh.iceServers});if(host)pc.restartIce()}}catch{}},3000000);
 }
 bind(channel){if(this.closed){channel.close();return}this.data=channel;channel.onmessage=e=>{if(typeof e.data!=='string'||e.data.length>8000)return;try{const packet=JSON.parse(e.data),other=this.room.host_id===this.userId?this.room.guest_id:this.room.host_id;if(packet.room===this.room.id&&packet.sender===other&&validPeerWatch(this.room,packet.state,other))this.onState(packet.state)}catch{}}}
 send(state){if(this.data?.readyState==='open'&&this.data.bufferedAmount<16000)this.data.send(JSON.stringify({room:this.room.id,sender:this.userId,state}))}
 async signal(kind,payload){if(!this.closed)await checked(db.from('lx_watch_signals').insert({session_id:this.room.id,sender_id:this.userId,kind,payload}))}
 async poll(){if(this.closed||this.polling)return;this.polling=true;try{const rows=await checked(db.from('lx_watch_signals').select('id,sender_id,kind,payload').eq('session_id',this.room.id).gt('id',this.cursor).order('id').limit(100));for(const row of rows||[]){this.cursor=Math.max(this.cursor,Number(row.id));this.receive(row)}}catch{}finally{this.polling=false}}
 receive(signal){if(this.closed||!this.pc||signal.sender_id===this.userId||this.seen.has(String(signal.id)))return;this.seen.add(String(signal.id));this.queue=this.queue.catch(()=>{}).then(async()=>{const pc=this.pc;if(!pc||this.closed)return;if(signal.kind==='offer'){await pc.setRemoteDescription(signal.payload);for(const ice of this.ice.splice(0))await pc.addIceCandidate(ice);await pc.setLocalDescription(await pc.createAnswer());await this.signal('answer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}else if(signal.kind==='answer'&&pc.signalingState==='have-local-offer'){await pc.setRemoteDescription(signal.payload);for(const ice of this.ice.splice(0))await pc.addIceCandidate(ice)}else if(signal.kind==='ice'){if(pc.remoteDescription)await pc.addIceCandidate(signal.payload);else this.ice.push(signal.payload)}}).catch(()=>{})}
 destroy(){this.closed=true;clearInterval(this.timer);clearInterval(this.renewTimer);this.data?.close();this.pc?.close();this.pc=null;if(this.channel)db.removeChannel(this.channel)}
}
