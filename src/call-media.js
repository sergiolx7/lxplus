// Audio capture is tab-only: never mix the microphone, system audio, other apps,
// or audio from the LX Plus calling tab into the shared media track.
// Browser options are hints, so we also discard any non-tab audio tracks.
export function displayCaptureOptions(withAudio=false,quality={width:1920,height:1080,fps:30}){
 return {
  video:{displaySurface:'browser',frameRate:{ideal:quality.fps,max:quality.fps},width:{ideal:quality.width},height:{ideal:quality.height}},
  // A simple boolean is supported by more browsers than getDisplayMedia audio
  // constraint dictionaries; the browser's tab-audio checkbox remains authoritative.
  audio:!!withAudio,
  systemAudio:'exclude',windowAudio:'exclude',monitorTypeSurfaces:'exclude',selfBrowserSurface:'exclude',preferCurrentTab:false,surfaceSwitching:'exclude'
 };
}
export function captureAudioMessage({surface,track,unavailable},requested=false){
 if(!requested)return 'Compartilhando apenas a imagem. Marque áudio antes de iniciar para transmitir o som da aba.';
 if(track)return 'Transmitindo somente o áudio da aba selecionada, separado do microfone. A pessoa pode precisar clicar em Ativar som. Não escolha outra aba da LX Plus para evitar eco.';
 if(surface==='window')return 'Esta janela não enviou áudio. Para ouvir a transmissão, pare e compartilhe uma ABA do navegador, ativando Compartilhar áudio da guia.';
 if(surface==='monitor')return 'A tela inteira não envia áudio isolado nesta chamada. Selecione uma ABA do navegador e ative Compartilhar áudio.';
 return 'O navegador não disponibilizou o som da aba. Pare, selecione uma aba e ative Compartilhar áudio da guia na janela de seleção.';
}
export function isolateDisplayAudio(stream,withAudio=false){
 const surface=stream.getVideoTracks()[0]?.getSettings?.().displaySurface;
 const tracks=stream.getAudioTracks(),candidate=tracks.find(t=>t.readyState!=='ended');
 const keep=withAudio&&surface==='browser'?candidate:null;
 for(const track of tracks)if(track!==keep){stream.removeTrack(track);track.stop()}
 if(keep){try{keep.contentHint='music'}catch{/* Optional browser hint. */}}
 return {track:keep||null,surface,unavailable:withAudio&&!keep};
}

// Browser autoplay policy can block a late-arriving remote audio track.
// Return a distinct result so the UI offers an explicit user-gesture unlock.
export async function activateReceivedAudio(element){
 if(!element?.srcObject)return 'not-ready';
 element.muted=false;
 try{await element.play();return 'playing'}catch{return 'blocked'}
}

export function audioSharingState({requested=false,surface='',track=null,listenerEnabled=true}={}){
 if(!requested)return {kind:'video-only',text:'A pessoa está compartilhando somente imagem.'};
 if(surface&&surface!=='browser')return {kind:'not-tab',text:'O navegador selecionou uma janela ou tela inteira. Para som isolado, escolha uma aba e ative Compartilhar áudio da guia.'};
 if(!track||track.readyState==='ended')return {kind:'missing',text:'Nenhum áudio foi capturado. Pare e compartilhe uma aba com Compartilhar áudio da guia ativado.'};
 if(track.muted)return {kind:'waiting',text:'Faixa de áudio recebida, aguardando o navegador liberar o som…'};
 if(!listenerEnabled)return {kind:'muted',text:'Você desativou Ouvir som da tela. Ative para escutar.'};
 return {kind:'ready',text:'Faixa de áudio da aba disponível. Ajuste o volume ou clique em Ativar som.'};
}
export function setRemoteScreenAudio(element,enabled=true){
 if(!element)return false;
 element.muted=!enabled;
 return !!element.srcObject&&enabled;
}
