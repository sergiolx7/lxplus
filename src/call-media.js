// Audio and video sharing remain independent from the microphone.
// The native browser picker decides what the user shares. These values are hints,
// not a way to bypass browser permission or select a game without user consent.
export const captureSurfaces=['browser','window','monitor'];
export function captureSurface(value){return captureSurfaces.includes(value)?value:'browser'}
export function displayCaptureOptions(withAudio=false,quality={width:1920,height:1080,fps:30},kind='browser'){
 const surface=captureSurface(kind),audio=!!withAudio;
 return {
  video:{displaySurface:surface,frameRate:{ideal:quality.fps,max:quality.fps},width:{ideal:quality.width},height:{ideal:quality.height}},
  audio,systemAudio:surface==='monitor'&&audio?'include':'exclude',
  // A window can expose only that window's audio on supported browsers; never
  // ask for unrestricted desktop audio, which could feed back the call voice.
  windowAudio:surface==='window'&&audio?'window':'exclude',
  monitorTypeSurfaces:surface==='monitor'?'include':'exclude',
  selfBrowserSurface:'exclude',preferCurrentTab:false,surfaceSwitching:surface==='browser'?'include':'exclude'
 };
}
export function captureAudioMessage({surface,track,unavailable},requested=false,kind='browser'){
 if(!requested)return 'Compartilhando vídeo sem som do computador. A voz da chamada continua separada.';
 if(surface==='monitor'&&!requested)return 'Tela inteira sendo transmitida sem áudio do computador.';
 if(surface==='monitor'&&track&&track.readyState!=='ended')return 'Áudio do computador em transmissão com sua autorização. Para evitar eco, use fones de ouvido e evite transmitir o áudio da LX Plus.';
 if(surface==='monitor')return 'Tela transmitida, mas o navegador não disponibilizou áudio do computador. Isso depende do navegador e sistema operacional.';
 if(track&&track.readyState!=='ended'&&track.muted)return 'Áudio capturado, mas silenciado pelo navegador. Reproduza o conteúdo e confira as permissões de som.';
 if(track&&track.readyState!=='ended'&&surface==='window')return 'Áudio isolado da janela enviado quando suportado pelo navegador. Microfone da chamada separado.';
 if(track&&track.readyState!=='ended'&&surface==='browser')return 'Transmitindo somente o áudio da aba selecionada, separado do microfone.';
 if(surface==='window')return 'Esta janela não enviou áudio. O vídeo do jogo ou aplicativo continua compartilhado; a captura isolada de som depende do navegador.';
 if(surface==='browser')return 'O navegador não disponibilizou o som da aba. Marque Compartilhar áudio da guia no seletor.';
 return kind==='window'?'Selecione uma janela no seletor do navegador para tentar incluir áudio isolado.':'A fonte escolhida não disponibilizou áudio isolado.';
}
export function isolateDisplayAudio(stream,withAudio=false,kind='browser'){
 const surface=stream.getVideoTracks()[0]?.getSettings?.().displaySurface;
 const source=captureSurface(kind),tracks=stream.getAudioTracks(),candidate=tracks.find(t=>t.readyState!=='ended');
 // Never forward audio for entire-screen capture or a mismatched source. Window
 // capture is accepted only when explicitly requested as window capture.
 // Desktop audio is forwarded only when explicitly opted in by the user.
 const allowed=!!withAudio&&source===surface&&['browser','window','monitor'].includes(surface);
 const keep=allowed?candidate:null;
 for(const track of tracks)if(track!==keep){stream.removeTrack(track);track.stop()}
 if(keep){try{keep.contentHint=surface==='browser'?'music':'music'}catch{/* Browser hint only. */}}
 return {track:keep||null,surface,unavailable:!!withAudio&&!keep};
}
export async function activateReceivedAudio(element){
 if(!element?.srcObject)return 'not-ready';
 element.muted=false;
 try{await element.play();return 'playing'}catch{return 'blocked'}
}
export function audioSharingState({requested=false,surface='',track=null,listenerEnabled=true}={}){
 if(!requested)return {kind:'video-only',text:'A pessoa está compartilhando somente imagem.'};
 if(surface==='monitor'&&!track)return {kind:'no-system-audio',text:'Tela inteira transmitida sem som do computador.'};
 if(surface&&surface!=='browser'&&surface!=='window'&&surface!=='monitor')return {kind:'unsupported',text:'Fonte de áudio não reconhecida. Solicite uma aba ou janela.'};
 if(!track||track.readyState==='ended')return {kind:'missing',text:surface==='monitor'?'O navegador não disponibilizou som do computador.':surface==='window'?'A janela não enviou áudio. O vídeo continua funcionando.':'Nenhum áudio da aba foi recebido. Ative Compartilhar áudio da guia.'};
 if(track.muted)return {kind:'waiting',text:'Faixa de áudio recebida, aguardando o navegador liberar o som…'};
 if(!listenerEnabled)return {kind:'muted',text:'Você desativou Ouvir som da tela. Ative para escutar.'};
 return {kind:'ready',text:'Áudio isolado recebido. Ajuste o volume ou clique em Ativar som.'};
}
export function setRemoteScreenAudio(element,enabled=true){
 if(!element)return false;
 element.muted=!enabled;
 return !!element.srcObject&&enabled;
}
