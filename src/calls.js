import {db} from './data.js';
import {checked,esc,avatar} from './ui.js';

// Media permissions are requested only after the member presses Call or Accept.
export class Calls {
 constructor({userId,toast,directory=()=>[]}){this.userId=userId;this.toast=toast;this.directory=directory;this.call=null;this.pc=null;this.local=null;this.remote=null;this.screen=null;this.channel=null;this.cursor=0;this.ice=[];this.polling=false;this.closed=false;this.attempts=0;this.seen=new Set();this.incoming=null;this.pollTimer=setInterval(()=>this.poll().catch(()=>{}),3000);this.poll().catch(()=>{})}
 async poll(){
  if(this.closed||this.polling)return;this.polling=true;
  try{
   if(!this.call){const rows=await checked(db.from('lx_calls').select('id,caller_id,callee_id,mode,status,created_at').eq('callee_id',this.userId).eq('status','ringing').gte('created_at',new Date(Date.now()-90000).toISOString()).order('created_at',{ascending:false}).limit(1));if(rows?.length&&this.incoming?.id!==rows[0].id)this.showIncoming(rows[0]);if(!rows?.length&&this.incoming){this.incoming=null;this.removeSurface()}return}
   const state=await checked(db.rpc('lx_call_heartbeat',{p_call_id:this.call.id}));
   if(!['ringing','accepted'].includes(state.status)){this.disposeMedia();this.removeSurface();this.call=null;return}
   if(this.call.status!==state.status){this.call.status=state.status;this.status(state.status==='accepted'?'Conectando…':'Chamando…')}
   if(state.status==='ringing'&&Date.now()-new Date(this.call.created_at).valueOf()>60000){await this.end();return}
   const signals=await checked(db.from('lx_call_signals').select('id,sender_id,kind,payload').eq('call_id',this.call.id).gt('id',this.cursor).order('id').limit(100));
   for(const signal of signals||[]){this.cursor=Math.max(this.cursor,Number(signal.id));if(signal.sender_id!==this.userId)await this.receive(signal)}
  }finally{this.polling=false}
 }
 showIncoming(call){
  this.incoming=call;const person=this.directory().find(p=>p.user_id===call.caller_id)||{name:'Membro LX'};this.removeSurface();
  const el=document.createElement('section');el.className='call-incoming';el.setAttribute('aria-label','Chamada recebida');el.innerHTML=avatar(person)+'<div><strong>'+esc(person.name)+'</strong><small>Chamada de '+(call.mode==='audio'?'voz':'vídeo')+'</small></div><button class="btn primary" data-call-accept>Atender</button><button class="btn danger" data-call-reject>Recusar</button>';document.body.appendChild(el);this.surface=el;
  el.querySelector('[data-call-accept]').onclick=()=>this.accept(call).catch(error=>{this.toast(error.message);this.reject(call).catch(()=>{})});el.querySelector('[data-call-reject]').onclick=()=>this.reject(call).catch(e=>this.toast(e.message));
 }
 async reject(call){await checked(db.rpc('lx_respond_call',{p_call_id:call.id,p_accept:false}));this.incoming=null;this.removeSurface()}
 async capture(mode){if(!navigator.mediaDevices?.getUserMedia)throw Error('Este navegador não oferece acesso à câmera e ao microfone. Use um navegador atualizado em HTTPS.');return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:mode==='video'?{width:{ideal:1280},height:{ideal:720},facingMode:'user'}:false})}
 async start(person,mode='video'){
  if(this.call)throw Error('Encerre a chamada atual primeiro.');
  const stream=await this.capture(mode);
  try{const id=await checked(db.rpc('lx_start_call',{p_other:person.user_id,p_mode:mode}));this.call={id,caller_id:this.userId,callee_id:person.user_id,mode,status:'ringing',created_at:new Date().toISOString()};this.local=stream;this.openSurface(person);await this.preparePeer(true)}catch(e){stream.getTracks().forEach(t=>t.stop());this.call=null;this.disposeMedia();this.removeSurface();throw e}
 }
 async accept(call){
  if(this.call)return;const stream=await this.capture(call.mode);
  try{await checked(db.rpc('lx_respond_call',{p_call_id:call.id,p_accept:true}));this.call={...call,status:'accepted'};this.local=stream;this.incoming=null;this.openSurface(this.directory().find(p=>p.user_id===call.caller_id)||{name:'Membro LX'});await this.preparePeer(false);await this.poll()}catch(e){stream.getTracks().forEach(t=>t.stop());this.call=null;this.disposeMedia();this.removeSurface();throw e}
 }
 openSurface(person){
  this.removeSurface();const el=document.createElement('section');el.className='call-surface';el.setAttribute('role','dialog');el.setAttribute('aria-label','Chamada com '+person.name);
  el.innerHTML='<header><div>'+avatar(person)+'<div><strong>'+esc(person.name)+'</strong><small id="callStatus">Conectando…</small></div></div><button class="btn small" data-call-mini>Minimizar</button></header><div class="call-stage"><video id="callRemote" autoplay playsinline></video><div id="callAudioLabel">'+avatar(person)+'<p>Chamada de '+(this.call.mode==='audio'?'voz':'vídeo')+'</p></div><video id="callLocal" autoplay muted playsinline></video></div><footer><button class="btn" data-call-mic aria-pressed="true">Microfone ligado</button>'+(this.call.mode==='video'?'<button class="btn" data-call-camera aria-pressed="true">Câmera ligada</button><button class="btn" data-call-screen>Compartilhar tela</button>':'')+'<button class="btn danger" data-call-end>Encerrar</button></footer>';
  document.body.appendChild(el);this.surface=el;el.querySelector('#callLocal').srcObject=this.local;
  el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
   if(b.hasAttribute('data-call-mini')){el.classList.toggle('minimized');b.textContent=el.classList.contains('minimized')?'Ampliar':'Minimizar'}
   if(b.hasAttribute('data-call-end'))await this.end();
   if(b.hasAttribute('data-call-mic')){const tracks=this.local?.getAudioTracks()||[],enabled=!tracks[0]?.enabled;tracks.forEach(t=>t.enabled=enabled);b.textContent=enabled?'Microfone ligado':'Microfone desligado';b.setAttribute('aria-pressed',String(enabled))}
   if(b.hasAttribute('data-call-camera')){const tracks=this.local?.getVideoTracks()||[],enabled=!tracks[0]?.enabled;tracks.forEach(t=>t.enabled=enabled);b.textContent=enabled?'Câmera ligada':'Câmera desligada';b.setAttribute('aria-pressed',String(enabled))}
   if(b.hasAttribute('data-call-screen'))await this.shareScreen();
  }catch(error){this.toast(error.message||'Não foi possível alterar a chamada.')}});
 }
 status(value){const el=this.surface?.querySelector('#callStatus');if(el)el.textContent=value}
 async preparePeer(caller){
  this.cursor=0;this.ice=[];this.attempts=0;this.seen.clear();const pc=new RTCPeerConnection({iceServers:[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}],iceCandidatePoolSize:2});this.pc=pc;this.remote=new MediaStream();
  const remoteVideo=this.surface.querySelector('#callRemote');remoteVideo.srcObject=this.remote;
  this.local.getTracks().forEach(t=>pc.addTrack(t,this.local));
  pc.ontrack=event=>{const tracks=event.streams[0]?.getTracks()||[event.track];for(const track of tracks)if(!this.remote.getTracks().some(t=>t.id===track.id))this.remote.addTrack(track);if(this.call?.mode==='video')this.surface.querySelector('#callAudioLabel').hidden=true;remoteVideo.play().catch(()=>this.status('Toque no vídeo para ativar o áudio.'))};
  remoteVideo.onclick=()=>remoteVideo.play().catch(()=>{});
  pc.onicecandidate=event=>{if(event.candidate)this.signal('ice',event.candidate.toJSON()).catch(e=>this.status(e.message))};
  pc.onconnectionstatechange=()=>{
   if(pc!==this.pc)return;
   if(pc.connectionState==='connected'){this.status('Conectado · chamada privada');this.attempts=0;clearTimeout(this.connectionTimeout)}
   if(['disconnected','failed'].includes(pc.connectionState)){this.status('Reconectando…');if(caller&&this.attempts++<2){pc.restartIce()}else if(pc.connectionState==='failed')this.status('A conexão falhou. Esta rede pode precisar de um servidor TURN. Encerre e tente novamente.')}
  };
  pc.onnegotiationneeded=async()=>{if(caller&&pc.signalingState==='stable'){try{await pc.setLocalDescription(await pc.createOffer());await this.signal('offer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}catch(e){this.status(e.message)}}};
  this.channel=db.channel('lx-call-'+this.call.id+'-'+this.userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_call_signals',filter:'call_id=eq.'+this.call.id},event=>{if(event.new.sender_id!==this.userId)this.receive(event.new).catch(e=>this.status(e.message))}).subscribe();
  this.connectionTimeout=setTimeout(()=>{if(this.pc===pc&&pc.connectionState!=='connected')this.status('A rede não estabeleceu a conexão. O serviço TURN ainda precisa ser configurado para redes restritas.')},30000);
 }
 async signal(kind,payload){if(!this.call)return;await checked(db.from('lx_call_signals').insert({call_id:this.call.id,sender_id:this.userId,kind,payload}))}
 receive(signal){
  const pc=this.pc;if(!pc||this.seen.has(String(signal.id)))return Promise.resolve();this.seen.add(String(signal.id));
  this.signalQueue=(this.signalQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(pc===this.pc)return this.applySignal(signal,pc)});return this.signalQueue;
 }
 async applySignal(signal,pc){
  if(signal.kind==='offer'){await pc.setRemoteDescription(signal.payload);for(const ice of this.ice.splice(0))await pc.addIceCandidate(ice);await pc.setLocalDescription(await pc.createAnswer());await this.signal('answer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}
  else if(signal.kind==='answer'&&pc.signalingState==='have-local-offer'){await pc.setRemoteDescription(signal.payload);for(const ice of this.ice.splice(0))await pc.addIceCandidate(ice)}
  else if(signal.kind==='ice'){if(pc.remoteDescription)await pc.addIceCandidate(signal.payload);else this.ice.push(signal.payload)}
 }
 async shareScreen(){
  if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Compartilhamento de tela não disponível neste navegador.');
  if(this.screen){await this.stopSharing();return}
  const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const track=stream.getVideoTracks()[0],sender=this.pc?.getSenders().find(s=>s.track?.kind==='video');
  if(!sender){stream.getTracks().forEach(t=>t.stop());throw Error('Inicie uma chamada de vídeo para compartilhar a tela.')}
  await sender.replaceTrack(track);this.screen=stream;this.surface.querySelector('#callLocal').srcObject=stream;this.surface.querySelector('[data-call-screen]').textContent='Parar compartilhamento';track.onended=()=>this.stopSharing().catch(()=>{});
 }
 async stopSharing(){if(!this.screen)return;const stream=this.screen;this.screen=null;stream.getTracks().forEach(t=>{t.onended=null;t.stop()});const sender=this.pc?.getSenders().find(s=>s.track?.kind==='video');await sender?.replaceTrack(this.local?.getVideoTracks()[0]||null);if(this.surface){this.surface.querySelector('#callLocal').srcObject=this.local;this.surface.querySelector('[data-call-screen]').textContent='Compartilhar tela'}}
 async end(){const id=this.call?.id;this.call=null;this.disposeMedia();this.removeSurface();if(id)await checked(db.rpc('lx_end_call',{p_call_id:id}))}
 disposeMedia(){clearTimeout(this.connectionTimeout);this.pc?.close();this.pc=null;this.local?.getTracks().forEach(t=>t.stop());this.screen?.getTracks().forEach(t=>t.stop());this.local=null;this.remote=null;this.screen=null;if(this.channel){db.removeChannel(this.channel);this.channel=null}}
 removeSurface(){this.surface?.remove();this.surface=null}
 destroy(){this.closed=true;clearInterval(this.pollTimer);const id=this.call?.id;this.call=null;this.disposeMedia();this.removeSurface();if(id)db.rpc('lx_end_call',{p_call_id:id}).catch(()=>{})}
}
