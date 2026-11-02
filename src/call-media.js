// Audio and video sharing remain independent from the microphone.
// The native browser picker decides what the user shares. These values are hints,
// not a way to bypass browser permission or select a game without user consent.
export const captureSurfaces=['browser','window','monitor'];
export function captureSurface(value){return captureSurfaces.includes(value)?value:'browser'}
export function displayCaptureOptions(withAudio=false,quality={width:1920,height:1080,fps:30},kind='browser'){
 const surface=captureSurface(kind),audio=!!withAudio&&surface!=='monitor';
 return {
  video:{displaySurface:surface,frameRate:{ideal:quality.fps,max:quality.fps},width:{ideal:quality.width},height:{ideal:quality.height}},
  audio,systemAudio:'exclude',
  // A window can expose only that window's audio on supported browsers; never
  // ask for unrestricted desktop audio, which could feed back the call voice.
  windowAudio:surface==='window'&&audio?'window':'exclude',
  monitorTypeSurfaces:surface==='monitor'?'include':'exclude',
  selfBrowserSurface:'exclude',preferCurrentTab:false,surfaceSwitching:'exclude'
 };
}
export function captureAudioMessage({surface,track,unavailable},requested=false,kind='browser'){
 if(!requested)return 'Compartilhando vídeo sem som do computador. A voz da chamada continua separada.';
 if(surface==='monitor')return 'Tela inteira compartilhada sem capturar o áudio geral do computador, evitando retorno da chamada.';
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
 const allowed=!!withAudio&&source===surface&&(surface==='browser'||surface==='window');
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
 if(surface==='monitor')return {kind:'no-system-audio',text:'Tela inteira transmitida sem som geral do computador.'};
 if(surface&&surface!=='browser'&&surface!=='window')return {kind:'unsupported',text:'Fonte de áudio não reconhecida. Solicite uma aba ou janela.'};
 if(!track||track.readyState==='ended')return {kind:'missing',text:surface==='window'?'A janela não enviou áudio. O vídeo continua funcionando.':'Nenhum áudio da aba foi recebido. Ative Compartilhar áudio da guia.'};
 if(track.muted)return {kind:'waiting',text:'Faixa de áudio recebida, aguardando o navegador liberar o som…'};
 if(!listenerEnabled)return {kind:'muted',text:'Você desativou Ouvir som da tela. Ative para escutar.'};
 return {kind:'ready',text:'Áudio isolado recebido. Ajuste o volume ou clique em Ativar som.'};
}
export function setRemoteScreenAudio(element,enabled=true){
 if(!element)return false;
 element.muted=!enabled;
 return !!element.srcObject&&enabled;
}
