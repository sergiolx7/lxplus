import {rtcConfig} from './rtc-config.js';
import {displayCaptureOptions,isolateDisplayAudio} from './call-media.js';
import {db} from './data.js';
import {checked,esc,avatar} from './ui.js';

// Media permissions are requested only after the member presses Call or Accept.
export class Calls {
 constructor({userId,toast,directory=()=>[]}){this.userId=userId;this.toast=toast;this.directory=directory;this.call=null;this.pc=null;this.local=null;this.remote=null;this.screen=null;this.channel=null;this.cursor=0;this.ice=[];this.polling=false;this.closed=false;this.attempts=0;this.seen=new Set();this.incoming=null;this.starting=false;this.pollTimer=setInterval(()=>this.poll().catch(()=>{}),3000);this.poll().catch(()=>{})}
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
 async start(person,mode='audio'){
  if(this.call||this.starting)throw Error('Encerre a chamada atual primeiro.');if(!['audio','video'].includes(mode))throw Error('Tipo de chamada inválido.');
  this.starting=true;let stream;try{stream=await this.capture(mode)}catch(error){this.starting=false;throw error}if(this.closed){stream.getTracks().forEach(t=>t.stop());this.starting=false;return}
  try{const id=await checked(db.rpc('lx_start_call',{p_other:person.user_id,p_mode:mode}));this.call={id,caller_id:this.userId,callee_id:person.user_id,mode,status:'ringing',created_at:new Date().toISOString()};this.local=stream;this.openSurface(person);await this.preparePeer(true)}catch(e){const id=this.call?.id;stream.getTracks().forEach(t=>t.stop());this.call=null;this.disposeMedia();this.removeSurface();if(id)await db.rpc('lx_end_call',{p_call_id:id}).catch(()=>{});throw e}finally{this.starting=false}
 }
 async accept(call){
  if(this.call||this.starting)return;this.starting=true;let stream;try{stream=await this.capture(call.mode)}catch(error){this.starting=false;throw error}if(this.closed){stream.getTracks().forEach(t=>t.stop());this.starting=false;return}
  try{await checked(db.rpc('lx_respond_call',{p_call_id:call.id,p_accept:true}));this.call={...call,status:'accepted'};this.local=stream;this.incoming=null;this.openSurface(this.directory().find(p=>p.user_id===call.caller_id)||{name:'Membro LX'});await this.preparePeer(false);await this.poll()}catch(e){const id=this.call?.id;stream.getTracks().forEach(t=>t.stop());this.call=null;this.disposeMedia();this.removeSurface();if(id)await db.rpc('lx_end_call',{p_call_id:id}).catch(()=>{});throw e}finally{this.starting=false}
 }
 openSurface(person){
  this.removeSurface();const el=document.createElement('section');el.className='call-surface';el.setAttribute('role','dialog');el.setAttribute('aria-label','Chamada com '+person.name);
  el.classList.toggle('voice-call',this.call.mode==='audio');el.innerHTML='<header><div>'+avatar(person)+'<div><strong>'+esc(person.name)+'</strong><small id="callStatus">Conectando…</small><small id="callQuality"></small></div></div><button class="btn small" data-call-mini>Minimizar</button></header><div class="call-stage">'+'<audio id="callRemote" autoplay></audio><audio id="callShareAudio" autoplay></audio><video id="callRemoteVideo" autoplay muted playsinline hidden></video>'+'<div id="callAudioLabel">'+avatar(person)+'<p>Chamada de '+(this.call.mode==='audio'?'voz':'vídeo')+'</p></div>'+'<video id="callLocal" autoplay muted playsinline '+(this.call.mode==='audio'?'hidden':'')+'></video>'+'</div><footer><button class="btn" data-call-unlock hidden>Ativar som da chamada</button><button class="btn" data-call-retry>Reconectar</button><button class="btn" data-call-mic aria-pressed="true">Microfone ligado</button>'+(this.call.mode==='video'?'<button class="btn" data-call-camera aria-pressed="true">Câmera ligada</button>':'')+'<button class="btn" data-call-screen>Compartilhar tela</button><label class="call-share-option"><input type="checkbox" data-call-screen-audio> Som só da aba escolhida</label><small class="call-share-help">Para enviar apenas o som do conteúdo, escolha uma aba e ative o áudio no seletor. Janelas sem áudio isolado compartilham só a imagem.</small><p data-call-share-status role="status" hidden></p><button class="btn danger" data-call-end>Encerrar</button></footer>';
  document.body.appendChild(el);this.surface=el;if(el.querySelector('#callLocal'))el.querySelector('#callLocal').srcObject=this.local;
  el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
   if(b.hasAttribute('data-call-mini')){el.classList.toggle('minimized');b.textContent=el.classList.contains('minimized')?'Ampliar':'Minimizar'}
   if(b.hasAttribute('data-call-end'))await this.end();
   if(b.hasAttribute('data-call-unlock')){await Promise.all([...el.querySelectorAll('audio')].filter(a=>a.srcObject).map(a=>a.play()));b.hidden=true}
   if(b.hasAttribute('data-call-retry'))await this.restart();
   if(b.hasAttribute('data-call-mic')){const tracks=this.local?.getAudioTracks()||[],enabled=!tracks[0]?.enabled;tracks.forEach(t=>t.enabled=enabled);b.textContent=enabled?'Microfone ligado':'Microfone desligado';b.setAttribute('aria-pressed',String(enabled))}
   if(b.hasAttribute('data-call-camera')){const tracks=this.local?.getVideoTracks()||[],enabled=!tracks[0]?.enabled;tracks.forEach(t=>t.enabled=enabled);b.textContent=enabled?'Câmera ligada':'Câmera desligada';b.setAttribute('aria-pressed',String(enabled));if(!this.screen)await this.signal('ice',{media:{video:enabled}})}
   if(b.hasAttribute('data-call-screen'))await this.shareScreen();
  }catch(error){this.toast(error.message||'Não foi possível alterar a chamada.')}});
 }
 status(value){const el=this.surface?.querySelector('#callStatus');if(el)el.textContent=value}
 async preparePeer(caller){
  this.cursor=0;this.ice=[];this.attempts=0;this.seen.clear();const id=this.call.id,config=await rtcConfig('call',id);if(this.closed||this.call?.id!==id)return;this.turnConfigured=config.turnConfigured;const pc=new RTCPeerConnection({iceServers:config.iceServers,iceCandidatePoolSize:2});this.pc=pc;this.remote=new MediaStream();
  const remoteVideo=this.surface.querySelector('#callRemote');remoteVideo.srcObject=this.remote;
  const mic=this.local.getAudioTracks()[0];if(mic)pc.addTrack(mic,this.local);
  if(caller){this.videoSender=pc.addTransceiver(this.local.getVideoTracks()[0]||'video',{direction:'sendrecv',streams:[this.local]}).sender;this.shareAudioSender=pc.addTransceiver('audio',{direction:'sendrecv',streams:[this.local]}).sender}
  pc.ontrack=event=>{if(pc!==this.pc||!this.surface)return;const track=event.track,audios=pc.getTransceivers().filter(t=>t.receiver.track.kind==='audio'),shared=track.kind==='audio'&&audios.indexOf(event.transceiver)>0,element=this.surface.querySelector(track.kind==='video'?'#callRemoteVideo':shared?'#callShareAudio':'#callRemote');element.srcObject=new MediaStream([track]);if(track.kind==='video'){const show=()=>{if(pc!==this.pc||!this.surface)return;element.hidden=track.muted;this.surface.querySelector('#callAudioLabel').hidden=!track.muted;this.surface.classList.toggle('receiving-screen',!track.muted)};track.onunmute=show;track.onmute=show;show()}element.play().catch(()=>{if(track.kind==='audio'){const b=this.surface?.querySelector('[data-call-unlock]');if(b)b.hidden=false}})};
  remoteVideo.onclick=()=>remoteVideo.play().catch(()=>{});
  let candidates=0;pc.onicecandidate=event=>{if(event.candidate){++candidates;this.signal('ice',event.candidate.toJSON()).catch(e=>this.status(e.message))}else if(!candidates)this.status('O navegador não encontrou uma rota de mídia. Verifique a rede e a configuração TURN.')};
  pc.onsignalingstatechange=()=>{const node=this.surface?.querySelector('#callQuality');if(node&&pc.connectionState!=='connected')node.textContent=pc.signalingState==='have-local-offer'?'Aguardando resposta do amigo…':'Negociando a conexão privada…'};
  pc.onconnectionstatechange=()=>{
   if(pc!==this.pc)return;
   if(pc.connectionState==='connected'){this.status('Conectado · chamada privada');this.attempts=0;clearTimeout(this.connectionTimeout)}
   if(['disconnected','failed'].includes(pc.connectionState)){this.status('Reconectando…');if(caller&&this.attempts<3){this.restart().catch(()=>{})}else if(pc.connectionState==='failed')this.status('A conexão falhou. Esta rede pode precisar de um servidor TURN. Encerre e tente novamente.')}
  };
  pc.onnegotiationneeded=async()=>{if(caller&&!this.negotiating&&pc.signalingState==='stable'){this.negotiating=true;try{await pc.setLocalDescription(await pc.createOffer());await this.signal('offer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}catch(e){this.status('Não foi possível negociar a chamada. Tente reconectar.')}finally{this.negotiating=false}}};
  this.channel=db.channel('lx-call-'+this.call.id+'-'+this.userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_call_signals',filter:'call_id=eq.'+this.call.id},event=>{if(event.new.sender_id!==this.userId)this.receive(event.new).catch(e=>this.status(e.message))}).subscribe();
  this.signalTimer=setInterval(()=>this.poll().catch(()=>{}),900);this.metricsTimer=setInterval(()=>this.quality().catch(()=>{}),4000);
  if(config.turnConfigured)this.renewTimer=setInterval(async()=>{if(this.call?.id!==id)return;const fresh=await rtcConfig('call',id);if(this.pc===pc&&fresh.turnConfigured){pc.setConfiguration({iceServers:fresh.iceServers});if(caller)pc.restartIce()}},3000000);
  this.connectionTimeout=setTimeout(()=>{if(this.pc===pc&&this.call?.status==='accepted'&&pc.connectionState!=='connected')this.status(config.turnConfigured?'A rede não estabeleceu a conexão. Tente reconectar ou usar outra rede.':'A rede não estabeleceu a conexão. O serviço TURN ainda precisa ser configurado para redes restritas.')},30000);
 }
 async signal(kind,payload){if(!this.call)return;await checked(db.from('lx_call_signals').insert({call_id:this.call.id,sender_id:this.userId,kind,payload}))}
 receive(signal){
  if(signal.kind==='hangup'){this.call=null;this.disposeMedia();this.removeSurface();return Promise.resolve()}const pc=this.pc;if(!pc||this.seen.has(String(signal.id)))return Promise.resolve();this.seen.add(String(signal.id));
  this.signalQueue=(this.signalQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(pc===this.pc)return this.applySignal(signal,pc)});return this.signalQueue;
 }
 async applySignal(signal,pc){
  if(signal.kind==='offer'){await pc.setRemoteDescription(signal.payload);const transceivers=pc.getTransceivers(),audios=transceivers.filter(t=>t.receiver.track.kind==='audio');this.videoSender=transceivers.find(t=>t.receiver.track.kind==='video')?.sender;this.shareAudioSender=audios[1]?.sender;for(const t of transceivers)t.direction='sendrecv';await this.videoSender?.replaceTrack(this.screen?.getVideoTracks()[0]||this.local?.getVideoTracks()[0]||null);await this.shareAudioSender?.replaceTrack(this.screen?.getAudioTracks()[0]||null);for(const ice of this.ice.splice(0))await pc.addIceCandidate(ice);await pc.setLocalDescription(await pc.createAnswer());await this.signal('answer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}
  else if(signal.kind==='answer'&&pc.signalingState==='have-local-offer'){await pc.setRemoteDescription(signal.payload);for(const ice of this.ice.splice(0))await pc.addIceCandidate(ice)}
  else if(signal.kind==='ice'){if(signal.payload?.media){const shown=signal.payload.media.video===true,video=this.surface?.querySelector('#callRemoteVideo');if(video){video.hidden=!shown;this.surface.querySelector('#callAudioLabel').hidden=shown;this.surface.classList.toggle('receiving-screen',shown)}return}if(signal.payload?.restart){if(this.call?.caller_id===this.userId)await this.restart();return}if(pc.remoteDescription)await pc.addIceCandidate(signal.payload);else this.ice.push(signal.payload)}
 }
 async restart(){const pc=this.pc;if(!pc||!this.call)return;if(this.call.caller_id!==this.userId){await this.signal('ice',{restart:true});return}if(this.restarting||this.attempts>=3){this.status('A rede não reconectou. Encerre e tente novamente.');return}this.restarting=true;++this.attempts;try{const config=await rtcConfig('call',this.call.id);if(pc!==this.pc)return;pc.setConfiguration({iceServers:config.iceServers});pc.restartIce();this.status('Reconectando…')}finally{this.restarting=false}}
 async quality(){const pc=this.pc;if(!pc||pc.connectionState!=='connected')return;const stats=await pc.getStats();let pair;stats.forEach(r=>{if(r.type==='candidate-pair'&&r.state==='succeeded'&&(r.nominated||r.selected))pair=r});if(!pair)return;const local=stats.get(pair.localCandidateId),rtt=Number(pair.currentRoundTripTime);const node=this.surface?.querySelector('#callQuality');if(node)node.textContent=(local?.candidateType==='relay'?'Conexão por relay':'Conexão direta')+(Number.isFinite(rtt)?' · '+Math.round(rtt*1000)+' ms':'')}
 async shareScreen(){
  if(this.screen){await this.stopSharing();return}
  if(this.sharing)return;
  if(!this.videoSender||!this.shareAudioSender||!this.pc)throw Error('Aguarde a chamada conectar antes de compartilhar.');
  if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Compartilhamento de tela não disponível neste navegador. Use um navegador de computador em HTTPS.');
  this.sharing=true;const pc=this.pc,withAudio=this.surface.querySelector('[data-call-screen-audio]').checked;let stream;
  try{
   stream=await navigator.mediaDevices.getDisplayMedia(displayCaptureOptions(withAudio));
   if(this.pc!==pc||!this.call){stream.getTracks().forEach(t=>t.stop());return}
   const video=stream.getVideoTracks()[0];if(!video)throw Error('Nenhuma janela ou aba foi selecionada.');
   const audio=isolateDisplayAudio(stream,withAudio);this.screen=stream;
   await this.videoSender.replaceTrack(video);await this.shareAudioSender.replaceTrack(audio.track);
   if(this.pc!==pc||this.screen!==stream){stream.getTracks().forEach(t=>t.stop());return}
   const preview=this.surface.querySelector('#callLocal');preview.srcObject=stream;preview.hidden=false;
   this.surface.querySelector('[data-call-screen]').textContent='Parar compartilhamento';this.surface.querySelector('[data-call-screen-audio]').disabled=true;this.surface.classList.add('sharing-screen');
   const status=this.surface.querySelector('[data-call-share-status]');status.hidden=false;status.textContent=audio.track?'Compartilhando imagem e som da aba selecionada.':audio.unavailable?'Compartilhando só a imagem. Para áudio isolado, selecione uma aba e marque compartilhar áudio.':'Compartilhando só a imagem. O microfone tem seu controle separado.';
   video.onended=()=>this.stopSharing().catch(()=>{});await this.signal('ice',{media:{video:true}});
  }catch(error){if(this.screen===stream)await this.stopSharing().catch(()=>{});else stream?.getTracks().forEach(t=>t.stop());if(!['NotAllowedError','AbortError'].includes(error.name))throw error}finally{this.sharing=false}
 }
 async stopSharing(){
  const stream=this.screen;if(!stream)return;this.screen=null;stream.getTracks().forEach(t=>{t.onended=null;t.stop()});
  await this.videoSender?.replaceTrack(this.local?.getVideoTracks()[0]||null);await this.shareAudioSender?.replaceTrack(null);
  if(this.surface){const preview=this.surface.querySelector('#callLocal');preview.srcObject=this.local;preview.hidden=this.call?.mode==='audio';this.surface.querySelector('[data-call-screen]').textContent='Compartilhar tela';this.surface.querySelector('[data-call-screen-audio]').disabled=false;this.surface.querySelector('[data-call-share-status]').hidden=true;this.surface.classList.remove('sharing-screen')}
  await this.signal('ice',{media:{video:!!this.local?.getVideoTracks().some(t=>t.enabled)}});
 }
 async end(){const id=this.call?.id;this.call=null;this.disposeMedia();this.removeSurface();if(id)await checked(db.rpc('lx_end_call',{p_call_id:id}))}
 disposeMedia(){clearTimeout(this.connectionTimeout);clearInterval(this.signalTimer);clearInterval(this.metricsTimer);clearInterval(this.renewTimer);this.negotiating=false;this.restarting=false;this.signalQueue=null;this.cursor=0;this.ice=[];this.seen.clear();this.pc?.close();this.pc=null;this.local?.getTracks().forEach(t=>t.stop());this.screen?.getTracks().forEach(t=>t.stop());this.local=null;this.remote=null;this.screen=null;this.videoSender=null;this.shareAudioSender=null;this.sharing=false;if(this.channel){db.removeChannel(this.channel);this.channel=null}}
 removeSurface(){this.surface?.remove();this.surface=null}
 destroy(){this.closed=true;clearInterval(this.pollTimer);const id=this.call?.id;this.call=null;this.disposeMedia();this.removeSurface();if(id)db.rpc('lx_end_call',{p_call_id:id}).catch(()=>{})}
}
