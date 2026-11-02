import {playCallSound} from './call-sounds.js';
import {callView} from './call-view.js';
import {premiumCaptureQuality} from './premium-style.js';
import {rtcConfig,stunServers} from './rtc-config.js';
import {fastRtcConfig,shouldUpgradeTurn} from './rtc-fast.js';
import {displayCaptureOptions,isolateDisplayAudio,captureAudioMessage,activateReceivedAudio,audioSharingState,setRemoteScreenAudio} from './call-media.js';
import {db} from './data.js';
import {candidateKind,callHealth,flushIceQueue} from './call-health.js';
import {checked,esc,avatar} from './ui.js';

// Media permissions are requested only after the member presses Call or Accept.
export class Calls {
 constructor({userId,toast,directory=()=>[],profile=()=>({})}){this.profile=profile;this.userId=userId;this.toast=toast;this.directory=directory;this.call=null;this.pc=null;this.local=null;this.remote=null;this.screen=null;this.channel=null;this.cursor=0;this.ice=[];this.polling=false;this.closed=false;this.attempts=0;this.seen=new Set();this.incoming=null;this.starting=false;this.pollTimer=setInterval(()=>this.poll().catch(()=>{}),3000);this.poll().catch(()=>{})}
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
 async capture(mode){
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Este navegador não oferece microfone. Use um navegador atualizado em HTTPS.');
  const audio={echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:{ideal:1}};
  try{return await navigator.mediaDevices.getUserMedia({audio,video:mode==='video'?{width:{ideal:1280},height:{ideal:720},facingMode:'user'}:false})}
  catch(error){if(mode!=='video')throw error;try{const stream=await navigator.mediaDevices.getUserMedia({audio,video:false});this.toast('Câmera indisponível. Entrando com microfone e áudio.');return stream}catch{throw error}}
 }
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
  this.removeSurface();this.person=person;this.remoteScreen=false;this.remoteScreenReady=false;this.remoteCamera=false;this.screenView=null;const el=document.createElement('section');el.className='call-surface lx-call';el.classList.toggle('voice-call',this.call.mode==='audio');el.setAttribute('role','dialog');el.setAttribute('aria-label','Chamada com '+person.name);el.innerHTML=callView(person,this.call.mode,this.profile()?.is_premium===true,this.profile()?.premium_profile?.entrance);document.body.appendChild(el);this.surface=el;el.querySelector('#callLocal').srcObject=this.local;
  if(!this.local?.getVideoTracks().length){
   el.querySelector('#callLocal').hidden=true;
   el.querySelector('[data-call-person-fallback=local]').hidden=false;
   const camera=el.querySelector('[data-call-camera]');
   if(camera){camera.setAttribute('aria-pressed','false');camera.setAttribute('aria-label','Ativar câmera');camera.querySelector('span').textContent='Ativar câmera'}
  }
  el.querySelector('#callShareAudio').volume=.85;this.listenScreenAudio=true;this.remoteScreenAudioDeclared=false;
  this.callAbort=new AbortController();const signal=this.callAbort.signal;el.addEventListener('keydown',e=>{if(e.key==='Escape'&&el.classList.contains('call-theater')){el.classList.remove('call-theater');el.querySelector('[data-call-fullscreen]').textContent='⤢ Tela cheia'}},{signal});
  document.addEventListener('fullscreenchange',()=>{if(this.surface===el){const b=el.querySelector('[data-call-fullscreen]');b.textContent=document.fullscreenElement===el?'⤡ Sair da tela cheia':'⤢ Tela cheia';b.setAttribute('aria-label',document.fullscreenElement===el?'Sair da tela cheia da chamada':'Tela cheia da chamada')}},{signal});
  el.addEventListener('dblclick',e=>{if(e.target.closest('[data-call-stage]'))this.fullscreen().catch(()=>{})},{signal});
  el.addEventListener('input',e=>{const kind=e.target.dataset.callVolume;if(kind)el.querySelector(kind==='voice'?'#callRemote':'#callShareAudio').volume=Number(e.target.value)/100},{signal});
  el.addEventListener('change',e=>{if(e.target.hasAttribute('data-call-screen-kind')){
   const kind=e.target.value,checkbox=el.querySelector('[data-call-screen-audio]'),hint=el.querySelector('[data-call-share-hint]');
   if(checkbox)checkbox.disabled=kind==='monitor';
   if(hint)hint.textContent=kind==='monitor'?'Compartilhe a tela inteira, inclusive jogos. O áudio geral do PC não será capturado para evitar eco.'
    :kind==='window'?'Escolha uma janela de jogo ou aplicativo. Som da janela somente se o navegador disponibilizar captura isolada.'
    :'Selecione uma aba e marque Compartilhar áudio da guia. Sua voz continua separada.';
  }if(e.target.hasAttribute('data-call-quality')&&this.screen)this.applyShareQuality().catch(error=>this.toast(error.message));if(e.target.hasAttribute('data-call-listen-screen')){this.listenScreenAudio=e.target.checked;const media=el.querySelector('#callShareAudio');setRemoteScreenAudio(media,this.listenScreenAudio);if(this.listenScreenAudio){this.playRemoteAudio(media).catch(()=>{});this.audioNotice(this.remoteShareAudio?'Som da tela reativado.':'Aguardando o áudio da aba do amigo…')}else this.audioNotice('O áudio da tela foi silenciado somente para você.')}} ,{signal});
  el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
   if(b.hasAttribute('data-call-mini')){if(document.fullscreenElement===el)await document.exitFullscreen();el.classList.remove('call-theater');el.classList.toggle('minimized');b.textContent=el.classList.contains('minimized')?'Ampliar chamada':'Encaixar na lateral'}
   if(b.hasAttribute('data-call-fullscreen'))await this.fullscreen();
   if(b.dataset.callView){this.screenView=b.dataset.callView;this.syncView()}
   if(b.hasAttribute('data-call-end'))await this.end();
   if(b.hasAttribute('data-call-unlock')){const elements=[...el.querySelectorAll('audio')].filter(a=>a.srcObject&&(a.id!=='callShareAudio'||this.listenScreenAudio));const results=await Promise.allSettled(elements.map(a=>{a.muted=false;return a.play()}));b.hidden=!results.some(x=>x.status==='rejected');if(!b.hidden)this.audioNotice('O navegador bloqueou a reprodução. Clique em Ativar som novamente.');else this.audioNotice(this.remoteShareAudio?'Áudio recebido. Ajuste o volume de Som compartilhado.':'Áudio da chamada ativado.')}
   if(b.hasAttribute('data-call-retry'))await this.restart(true);
   if(b.hasAttribute('data-call-mic-repair'))await this.repairMicrophone();
   if(b.hasAttribute('data-call-mic')){const tracks=this.local?.getAudioTracks()||[];if(!tracks[0]||tracks[0].readyState!=='live'){await this.repairMicrophone();return}const enabled=!tracks[0].enabled;tracks.forEach(t=>t.enabled=enabled);b.querySelector('span').textContent=enabled?'Microfone ligado':'Microfone desligado';b.setAttribute('aria-label',enabled?'Microfone ligado':'Microfone desligado');b.setAttribute('aria-pressed',String(enabled));el.querySelector('[data-call-mic-state]').textContent=enabled?'♫':'⊘'}
   if(b.hasAttribute('data-call-camera')){let tracks=this.local?.getVideoTracks()||[];
    if(!tracks[0]||tracks[0].readyState!=='live'){
     if(!this.videoSender)throw Error('Aguarde a outra pessoa atender para ativar a câmera.');
     let cameraStream;
     try{
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});
      const next=cameraStream.getVideoTracks()[0];if(!next)throw Error('Nenhuma câmera disponível.');
      await this.videoSender.replaceTrack(next);
      for(const old of tracks){this.local.removeTrack(old);old.stop()}
      this.local.addTrack(next);this.surface.querySelector('#callLocal').srcObject=this.local;
      tracks=[next];
     }catch(e){cameraStream?.getTracks().forEach(t=>t.stop());throw Error(e?.name==='NotAllowedError'?'Permita o acesso à câmera.':e.message||'Câmera não disponível')}
    }
    const enabled=!tracks[0].enabled?true:!b.getAttribute('aria-pressed')?.includes('true');
    tracks.forEach(t=>t.enabled=enabled);b.querySelector('span').textContent=enabled?'Câmera ligada':'Câmera desligada';b.setAttribute('aria-label',enabled?'Câmera ligada':'Câmera desligada');b.setAttribute('aria-pressed',String(enabled));el.querySelector('#callLocal').hidden=!enabled;el.querySelector('[data-call-person-fallback=local]').hidden=enabled;await this.signal('ice',{media:{camera:enabled}})}
   if(b.hasAttribute('data-call-screen'))await this.shareScreen();if(b.dataset.callSound){if(this.profile()?.is_premium!==true)throw Error('O painel de sons é exclusivo Premium.');if(Date.now()-(this.lastSound||0)<3000)return;this.lastSound=Date.now();playCallSound(b.dataset.callSound);await this.signal('reaction',{sound:b.dataset.callSound})}
  }catch(error){this.toast(error.message||'Não foi possível alterar a chamada.')}},{signal});this.syncView();
 }
 async repairMicrophone(){
  if(!this.call||!this.local||!this.pc)return false;
  let fresh;
  try{
   fresh=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:{ideal:1}},video:false});
   const next=fresh.getAudioTracks()[0],old=this.local.getAudioTracks()[0];
   if(!next)throw Error('Nenhuma entrada de microfone foi encontrada.');
   const sender=this.micSender||this.pc.getSenders().find(s=>s.track===old);
   if(!sender)throw Error('Canal de voz indisponível. Use Reconectar chamada.');
   await sender.replaceTrack(next);this.micSender=sender;
   for(const track of this.local.getAudioTracks()){this.local.removeTrack(track);track.stop()}
   this.local.addTrack(next);next.enabled=true;
   next.addEventListener('ended',()=>{if(this.call){this.status('Microfone desconectado. Clique em Reparar mic.');this.surface?.querySelector('[data-call-mic-repair]')?.classList.add('needs-attention')}},{once:true});
   const b=this.surface?.querySelector('[data-call-mic]');if(b){b.setAttribute('aria-label','Microfone ligado');b.setAttribute('aria-pressed','true');b.querySelector('span').textContent='Microfone ligado'}
   this.surface?.querySelector('[data-call-mic-repair]')?.classList.remove('needs-attention');
   const s=this.surface?.querySelector('[data-call-mic-state]');if(s)s.textContent='♫';
   this.status('Microfone reconectado · teste sua voz com o amigo');
   this.toast('Microfone recuperado. A chamada foi mantida.');
   return true;
  }catch(e){fresh?.getTracks().forEach(t=>t.stop());this.toast(e?.name==='NotAllowedError'?'Autorize o microfone nas permissões do navegador.':e.message||'Não foi possível recuperar o microfone.');return false}
 }
 async fullscreen(){const el=this.surface;if(!el)return;if(document.fullscreenElement===el){await document.exitFullscreen();return}el.classList.remove('minimized');if(el.requestFullscreen){try{await el.requestFullscreen();return}catch{}}el.classList.toggle('call-theater');const b=el.querySelector('[data-call-fullscreen]');b.textContent=el.classList.contains('call-theater')?'⤡ Reduzir':'⤢ Tela cheia'}
 syncView(){const el=this.surface;if(!el)return;const local=!!this.screen,remote=this.remoteScreen===true;el.classList.toggle('has-share',local||remote);el.classList.toggle('sharing-screen',local);el.classList.toggle('receiving-screen',remote);let view=this.screenView;if(view==='remote'&&!remote||view==='local'&&!local||!view)view=remote?'remote':local?'local':null;el.dataset.screenView=view||'none';el.querySelector('#callScreenRemote').hidden=view!=='remote';el.querySelector('#callScreenLocal').hidden=view!=='local';el.querySelector('.call-screen-placeholder').hidden=!!view&&(view==='local'||this.remoteScreenReady);el.querySelector('.call-screen-placeholder h2').textContent=view==='remote'?'Aguardando a tela do amigo…':'Mais espaço para compartilhar.';el.querySelector('.call-screen-placeholder p').textContent=view==='remote'?'A imagem aparece assim que a conexão de mídia estiver pronta.':'Compartilhe abas, jogos, aplicativos ou o desktop. A câmera fica separada.';el.querySelector('[data-call-screen-title]').textContent=view==='local'?'Você está compartilhando':view==='remote'?'Tela de '+this.person.name:'Tela compartilhada';el.querySelector('[data-call-view=remote]').hidden=!(local&&remote);el.querySelector('[data-call-view=local]').hidden=!(local&&remote);el.querySelector('#callCameraRemote').hidden=!this.remoteCamera;el.querySelector('[data-call-person-fallback=remote]').hidden=this.remoteCamera;}
 async applyShareQuality(){if(!this.screen)return;const value=premiumCaptureQuality(this.surface.querySelector('[data-call-quality]').value,this.profile()?.is_premium===true),track=this.screen.getVideoTracks()[0];await track.applyConstraints({width:{ideal:value.width},height:{ideal:value.height},frameRate:{ideal:value.fps,max:value.fps}});try{const params=this.screenSender.getParameters();if(params.encodings?.length){params.encodings[0].maxBitrate=value.bitrate;params.encodings[0].maxFramerate=value.fps;await this.screenSender.setParameters(params)}}catch{}const actual=track.getSettings();this.surface.querySelector('[data-call-resolution]').textContent=actual.width&&actual.height?actual.width+' × '+actual.height+(actual.frameRate?' · '+Math.round(actual.frameRate)+' FPS':''):'Qualidade adaptada à sua conexão';}
 status(value){const el=this.surface?.querySelector('#callStatus');if(el)el.textContent=value}
 updateNetworkStatus(){const pc=this.pc,node=this.surface?.querySelector('#callNetworkStatus');if(!pc||!node)return;const health=callHealth({state:pc.connectionState,ice:pc.iceConnectionState,signaling:pc.signalingState,turnConfigured:this.turnConfigured,types:[...(this.iceKinds||[])],remoteAnswered:this.remoteAnswered});node.textContent=health.text;node.dataset.health=health.level;}
 audioNotice(value){const node=this.surface?.querySelector('[data-call-audio-notice]');if(node)node.textContent=value||''}
 async playRemoteAudio(element){if(element?.id==='callShareAudio'&&!this.listenScreenAudio){setRemoteScreenAudio(element,false);return}const state=await activateReceivedAudio(element);if(state==='blocked'&&this.surface&&element.isConnected){const button=this.surface.querySelector('[data-call-unlock]');if(button)button.hidden=false;this.audioNotice('Som bloqueado pelo navegador: clique em Ativar som na barra da chamada.')}}
 async preparePeer(caller){
  this.cursor=0;this.ice=[];this.attempts=0;this.iceKinds=new Set();this.remoteAnswered=false;this.seen.clear();const id=this.call.id,fallback={iceServers:stunServers,turnConfigured:false};const {initial:config,ready,provisional}=await fastRtcConfig(()=>rtcConfig('call',id),fallback,900);if(this.closed||this.call?.id!==id)return;this.turnConfigured=config.turnConfigured;const pc=new RTCPeerConnection({iceServers:config.iceServers,iceCandidatePoolSize:0});this.pc=pc;this.remote=new MediaStream();
  const remoteVideo=this.surface.querySelector('#callRemote');remoteVideo.srcObject=this.remote;
  const mic=this.local.getAudioTracks()[0];if(mic){this.micSender=pc.addTrack(mic,this.local);mic.addEventListener('ended',()=>{if(this.pc===pc&&this.call){this.status('Microfone desconectado. Clique em Reparar mic.');this.surface?.querySelector('[data-call-mic-repair]')?.classList.add('needs-attention')}},{once:true})}
  if(caller){this.videoSender=pc.addTransceiver(this.local.getVideoTracks()[0]||'video',{direction:'sendrecv',streams:[this.local]}).sender;this.screenSender=pc.addTransceiver('video',{direction:'sendrecv',streams:[this.local]}).sender;this.shareAudioSender=pc.addTransceiver('audio',{direction:'sendrecv',streams:[this.local]}).sender}
  pc.ontrack=event=>{if(pc!==this.pc||!this.surface)return;const track=event.track,transceivers=pc.getTransceivers(),audios=transceivers.filter(t=>t.receiver.track.kind==='audio'),videos=transceivers.filter(t=>t.receiver.track.kind==='video'),shared=track.kind==='audio'&&audios.indexOf(event.transceiver)>0,isScreen=track.kind==='video'&&videos.indexOf(event.transceiver)>0,element=this.surface.querySelector(track.kind==='video'?isScreen?'#callScreenRemote':'#callCameraRemote':shared?'#callShareAudio':'#callRemote');element.srcObject=new MediaStream([track]);if(track.kind==='audio'){const update=()=>{if(pc!==this.pc||!this.surface)return;if(shared){this.remoteShareAudio=track.readyState!=='ended'&&!track.muted;const state=audioSharingState({requested:this.remoteScreenAudioDeclared,surface:this.remoteShareSurface||'browser',track,listenerEnabled:this.listenScreenAudio});this.audioNotice(state.text)}if(track.readyState==='live'&&!track.muted&&(!shared||this.listenScreenAudio))this.playRemoteAudio(element)};track.addEventListener('unmute',update);track.addEventListener('mute',update);track.addEventListener('ended',update);update()}if(track.kind==='video'){ const show=()=>{if(pc!==this.pc||!this.surface)return;if(isScreen){this.remoteScreenReady=!track.muted;if(!track.muted)this.remoteScreen=true}else this.remoteCamera=!track.muted;this.syncView();if(!track.muted)element.play().catch(()=>{})};track.onunmute=show;track.onmute=show;show()}(track.kind==='video'?element.play():Promise.resolve()).catch(()=>{})};
  remoteVideo.onclick=()=>remoteVideo.play().catch(()=>{});
  let candidates=0;pc.onicecandidate=event=>{if(pc!==this.pc)return;if(event.candidate){++candidates;this.iceKinds.add(candidateKind(event.candidate));this.signal('ice',event.candidate.toJSON()).catch(()=>{this.updateNetworkStatus()})}else if(!candidates)this.status('Nenhuma rota de mídia encontrada. Verifique a rede e a configuração TURN.');this.updateNetworkStatus()};pc.oniceconnectionstatechange=()=>{if(pc===this.pc)this.updateNetworkStatus()};
  pc.onsignalingstatechange=()=>{if(pc!==this.pc)return;const node=this.surface?.querySelector('#callQuality');if(node&&pc.connectionState!=='connected')node.textContent=pc.signalingState==='have-local-offer'?'Aguardando resposta do amigo…':'Negociando a conexão privada…';this.updateNetworkStatus();if(caller&&pc.signalingState==='stable'&&this.pendingNegotiation&&!this.negotiating){this.pendingNegotiation=false;queueMicrotask(()=>negotiate())}};
  pc.onconnectionstatechange=()=>{
   if(pc!==this.pc)return;
   this.updateNetworkStatus();if(pc.connectionState==='connected'){this.status('Conectado · chamada privada');this.attempts=0;clearTimeout(this.connectionTimeout);clearTimeout(this.retryTimer);this.retryTimer=null}
   if(['disconnected','failed'].includes(pc.connectionState)){this.status('Reconectando…');if(!this.retryTimer&&this.attempts<3){this.retryTimer=setTimeout(()=>{this.retryTimer=null;if(this.pc===pc&&['disconnected','failed'].includes(pc.connectionState))this.restart().catch(error=>this.status(error.message||'Falha ao reconectar'))},pc.connectionState==='failed'?400:2400)}else if(this.attempts>=3&&pc.connectionState==='failed')this.status(this.turnConfigured?'A conexão falhou. Tente reconectar manualmente.':'TURN não configurado. O proprietário pode ativá-lo no ADM Studio → Visão geral.')}
  };
  const negotiate=async()=>{if(!caller||pc!==this.pc||this.closed)return;if(this.negotiating||pc.signalingState!=='stable'){this.pendingNegotiation=true;return}this.negotiating=true;this.pendingNegotiation=false;try{const offer=await pc.createOffer();if(pc!==this.pc||pc.signalingState!=='stable')return;await pc.setLocalDescription(offer);await this.signal('offer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}catch(e){this.status('Não foi possível negociar a chamada. Tente reconectar.')}finally{this.negotiating=false;if(this.pendingNegotiation&&pc.signalingState==='stable'&&pc===this.pc){this.pendingNegotiation=false;queueMicrotask(()=>negotiate())}}};pc.onnegotiationneeded=()=>negotiate();
  this.channel=db.channel('lx-call-'+this.call.id+'-'+this.userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_call_signals',filter:'call_id=eq.'+this.call.id},event=>{if(event.new.sender_id!==this.userId)this.receive(event.new).catch(e=>this.status(e.message))}).subscribe();
  this.signalTimer=setInterval(()=>this.poll().catch(()=>{}),900);this.metricsTimer=setInterval(()=>this.quality().catch(()=>{}),4000);
  const upgrade=fresh=>{if(this.call?.id!==id||this.pc!==pc||!shouldUpgradeTurn(this.turnConfigured,fresh))return;pc.setConfiguration({...pc.getConfiguration(),iceServers:fresh.iceServers});this.turnConfigured=true;this.status('Relay TURN disponível. Reforçando a conexão…');this.updateNetworkStatus();if(caller)pc.restartIce()};if(provisional)ready.then(upgrade).catch(()=>{});this.renewTimer=setInterval(async()=>{if(this.call?.id!==id||this.pc!==pc)return;const fresh=await rtcConfig('call',id);if(this.call?.id!==id||this.pc!==pc||!fresh.turnConfigured)return;const previous=this.turnConfigured;pc.setConfiguration({...pc.getConfiguration(),iceServers:fresh.iceServers});this.turnConfigured=true;if(caller&&!previous)pc.restartIce()},3000000);
  this.connectionTimeout=setTimeout(()=>{if(this.pc===pc&&this.call?.status==='accepted'&&pc.connectionState!=='connected'){this.updateNetworkStatus();this.status(this.turnConfigured?'Aguardando rota de mídia. Se continuar, use Reconectar.':'Sem conexão direta. Redes privadas restritas precisam de TURN ativo no ADM Studio → Visão geral.');if(caller&&this.attempts===0)this.restart().catch(()=>{})}},12000);
 }
 async signal(kind,payload){if(!this.call)return;await checked(db.from('lx_call_signals').insert({call_id:this.call.id,sender_id:this.userId,kind,payload}))}
 receive(signal){
  if(signal.kind==='hangup'){this.call=null;this.disposeMedia();this.removeSurface();return Promise.resolve()}const pc=this.pc;if(!pc||this.seen.has(String(signal.id)))return Promise.resolve();this.seen.add(String(signal.id));
  this.signalQueue=(this.signalQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(pc===this.pc)return this.applySignal(signal,pc)});return this.signalQueue;
 }
 async applySignal(signal,pc){
  if(signal.kind==='reaction'){if(['sparkle','chime','pulse'].includes(signal.payload?.sound)&&Date.now()-(this.lastRemoteSound||0)>3000){this.lastRemoteSound=Date.now();playCallSound(signal.payload.sound)}return}
  if(signal.kind==='offer'){await pc.setRemoteDescription(signal.payload);this.remoteAnswered=true;this.updateNetworkStatus();const transceivers=pc.getTransceivers(),audios=transceivers.filter(t=>t.receiver.track.kind==='audio');const videos=transceivers.filter(t=>t.receiver.track.kind==='video');this.videoSender=videos[0]?.sender;this.screenSender=videos[1]?.sender;this.shareAudioSender=audios[1]?.sender;for(const t of transceivers)t.direction='sendrecv';await this.videoSender?.replaceTrack(this.local?.getVideoTracks()[0]||null);await this.screenSender?.replaceTrack(this.screen?.getVideoTracks()[0]||null);await this.shareAudioSender?.replaceTrack(this.screen?.getAudioTracks()[0]||null);await flushIceQueue(pc,this.ice.splice(0));await pc.setLocalDescription(await pc.createAnswer());await this.signal('answer',{type:pc.localDescription.type,sdp:pc.localDescription.sdp})}
  else if(signal.kind==='answer'&&pc.signalingState==='have-local-offer'){await pc.setRemoteDescription(signal.payload);this.remoteAnswered=true;this.updateNetworkStatus();await flushIceQueue(pc,this.ice.splice(0))}
  else if(signal.kind==='ice'){if(signal.payload?.media){const media=signal.payload.media;if(typeof media.screen==='boolean'){this.remoteScreen=media.screen;if(!media.screen){this.remoteScreenReady=false;this.remoteShareAudio=false;this.remoteScreenAudioDeclared=false;this.audioNotice('O compartilhamento de tela foi encerrado.')}else if(typeof media.screenAudio==='boolean'){this.remoteScreenAudioDeclared=media.screenAudio;this.remoteShareSurface=media.screenSurface||'browser';const received=this.surface?.querySelector('#callShareAudio')?.srcObject?.getAudioTracks()?.[0];this.audioNotice(media.screenAudio?audioSharingState({requested:true,surface:this.remoteShareSurface||'browser',track:received,listenerEnabled:this.listenScreenAudio}).text:'A pessoa compartilhou apenas a imagem. Peça para marcar o áudio da guia no seletor.')}}if(typeof media.camera==='boolean')this.remoteCamera=media.camera;else if(typeof media.video==='boolean')this.remoteCamera=media.video;this.syncView();return}if(signal.payload?.restart){if(this.call?.caller_id===this.userId)await this.restart();return}if(pc.remoteDescription){await flushIceQueue(pc,[signal.payload])}else this.ice.push(signal.payload)}
 }
 async restart(manual=false){if(manual){this.attempts=0;clearTimeout(this.retryTimer);this.retryTimer=null}const pc=this.pc;if(!pc||!this.call)return;if(this.call.caller_id!==this.userId){await this.signal('ice',{restart:true});return}if(this.restarting||this.attempts>=3){this.status('A rede não reconectou. Encerre e tente novamente.');return}this.restarting=true;++this.attempts;try{const fallback={iceServers:pc.getConfiguration().iceServers,turnConfigured:this.turnConfigured};const {initial:config,ready,provisional}=await fastRtcConfig(()=>rtcConfig('call',this.call.id),fallback,450);if(pc!==this.pc)return;if(config.turnConfigured){pc.setConfiguration({...pc.getConfiguration(),iceServers:config.iceServers});this.turnConfigured=true}else if(!this.turnConfigured)pc.setConfiguration({...pc.getConfiguration(),iceServers:config.iceServers});pc.restartIce();this.status(this.turnConfigured?'Reconectando usando TURN…':'Reconectando direto. Em redes restritas é necessário configurar TURN.');if(provisional)ready.then(fresh=>{if(pc!==this.pc||!shouldUpgradeTurn(this.turnConfigured,fresh))return;pc.setConfiguration({...pc.getConfiguration(),iceServers:fresh.iceServers});this.turnConfigured=true;pc.restartIce()}).catch(()=>{})}finally{this.restarting=false}}
 async quality(){const pc=this.pc;if(!pc||pc.connectionState!=='connected')return;const stats=await pc.getStats();let pair;stats.forEach(r=>{if(r.type==='candidate-pair'&&r.state==='succeeded'&&(r.nominated||r.selected))pair=r});if(!pair)return;const local=stats.get(pair.localCandidateId),rtt=Number(pair.currentRoundTripTime);const node=this.surface?.querySelector('#callQuality');if(node)node.textContent=(local?.candidateType==='relay'?'Conexão por relay':'Conexão direta')+(Number.isFinite(rtt)?' · '+Math.round(rtt*1000)+' ms':'')}
 async shareScreen(){
  if(this.screen){await this.stopSharing();return}
  if(this.sharing)return;
  if(!this.screenSender||!this.shareAudioSender||!this.pc)throw Error('Aguarde a chamada conectar antes de compartilhar.');
  if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Compartilhamento de tela não disponível neste navegador. Use um navegador de computador em HTTPS.');
  this.sharing=true;const pc=this.pc,kind=this.surface.querySelector('[data-call-screen-kind]')?.value||'browser',withAudio=kind!=='monitor'&&this.surface.querySelector('[data-call-screen-audio]').checked;let stream;
  try{
   stream=await navigator.mediaDevices.getDisplayMedia(displayCaptureOptions(withAudio,premiumCaptureQuality(this.surface.querySelector('[data-call-quality]').value,this.profile()?.is_premium===true),kind));
   if(this.pc!==pc||!this.call){stream.getTracks().forEach(t=>t.stop());return}
   const video=stream.getVideoTracks()[0];if(!video)throw Error('Nenhuma janela ou aba foi selecionada.');
   const audio=isolateDisplayAudio(stream,withAudio,kind);this.screen=stream;
   await this.screenSender.replaceTrack(video);await this.shareAudioSender.replaceTrack(audio.track);
   if(this.pc!==pc||this.screen!==stream){stream.getTracks().forEach(t=>t.stop());return}
   const preview=this.surface.querySelector('#callScreenLocal');preview.srcObject=stream;this.screenView='local';this.syncView();this.applyShareQuality().catch(()=>{const node=this.surface?.querySelector('[data-call-resolution]');if(node)node.textContent='Qualidade automática · adaptada à conexão'});
   this.surface.querySelector('[data-call-screen] span').textContent='Parar compartilhamento';this.surface.querySelector('[data-call-screen]').setAttribute('aria-label','Parar compartilhamento');this.surface.querySelector('[data-call-screen-audio]').disabled=true;this.surface.querySelector('[data-call-screen-kind]').disabled=true;this.surface.classList.add('sharing-screen');
   const status=this.surface.querySelector('[data-call-share-status]');status.hidden=false;status.textContent=captureAudioMessage(audio,withAudio,kind);if(audio.track){const update=()=>{if(this.screen!==stream||!status.isConnected)return;status.textContent=captureAudioMessage({surface:audio.surface,track:audio.track,unavailable:audio.track.readyState==='ended'},withAudio,kind)};audio.track.addEventListener('mute',update);audio.track.addEventListener('unmute',update)}
   if(audio.track)audio.track.addEventListener('ended',()=>{if(this.screen!==stream)return;this.shareAudioSender?.replaceTrack(null).catch(()=>{});const node=this.surface?.querySelector('[data-call-share-status]');if(node)node.textContent='O som da aba foi encerrado pelo navegador. Pare e compartilhe novamente para incluir áudio.';this.signal('ice',{media:{screen:true,screenAudio:false}}).catch(()=>{})},{once:true});video.onended=()=>this.stopSharing().catch(()=>{});await this.signal('ice',{media:{screen:true,screenAudio:!!audio.track,screenSurface:audio.surface||kind}});
  }catch(error){if(this.screen===stream)await this.stopSharing().catch(()=>{});else stream?.getTracks().forEach(t=>t.stop());if(!['NotAllowedError','AbortError'].includes(error.name))throw error}finally{this.sharing=false}
 }
 async stopSharing(){
  const stream=this.screen;if(!stream)return;this.screen=null;stream.getTracks().forEach(t=>{t.onended=null;t.stop()});
  await this.screenSender?.replaceTrack(null);await this.shareAudioSender?.replaceTrack(null);
  if(this.surface){this.surface.querySelector('#callScreenLocal').srcObject=null;this.surface.querySelector('[data-call-screen] span').textContent='Compartilhar tela';this.surface.querySelector('[data-call-screen]').setAttribute('aria-label','Compartilhar tela');this.surface.querySelector('[data-call-screen-audio]').disabled=this.surface.querySelector('[data-call-screen-kind]').value==='monitor';this.surface.querySelector('[data-call-screen-kind]').disabled=false;this.surface.querySelector('[data-call-share-status]').hidden=true;this.screenView=null;this.syncView()}
  await this.signal('ice',{media:{screen:false}});
 }
 async end(){const id=this.call?.id;this.call=null;this.disposeMedia();this.removeSurface();if(id)await checked(db.rpc('lx_end_call',{p_call_id:id}))}
 disposeMedia(){clearTimeout(this.retryTimer);this.retryTimer=null;clearTimeout(this.connectionTimeout);clearInterval(this.signalTimer);clearInterval(this.metricsTimer);clearInterval(this.renewTimer);this.negotiating=false;this.pendingNegotiation=false;this.restarting=false;this.signalQueue=null;this.iceKinds=new Set();this.remoteAnswered=false;this.cursor=0;this.ice=[];this.seen.clear();this.pc?.close();this.pc=null;this.local?.getTracks().forEach(t=>t.stop());this.screen?.getTracks().forEach(t=>t.stop());this.local=null;this.remote=null;this.screen=null;this.micSender=null;this.remoteShareSurface=null;this.videoSender=null;this.screenSender=null;this.shareAudioSender=null;this.remoteShareAudio=false;this.remoteScreenAudioDeclared=false;this.sharing=false;this.listenScreenAudio=true;if(this.channel){db.removeChannel(this.channel);this.channel=null}}
 removeSurface(){this.callAbort?.abort();this.callAbort=null;if(document.fullscreenElement===this.surface)document.exitFullscreen().catch(()=>{});this.surface?.remove();this.surface=null}
 destroy(){this.closed=true;clearInterval(this.pollTimer);const id=this.call?.id;this.call=null;this.disposeMedia();this.removeSurface();if(id)db.rpc('lx_end_call',{p_call_id:id}).catch(()=>{})}
}
