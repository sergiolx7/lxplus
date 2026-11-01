// Only user-selected tab audio is forwarded. Other audio capture sources may
// unexpectedly include the whole computer, even with windowAudio: 'window'.
export function displayCaptureOptions(withAudio=false,quality={width:1920,height:1080,fps:30}){
 return {
  video:{displaySurface:withAudio?'browser':'window',frameRate:{ideal:quality.fps,max:quality.fps},width:{ideal:quality.width},height:{ideal:quality.height}},
  audio:withAudio?{echoCancellation:false,noiseSuppression:false,autoGainControl:false,suppressLocalAudioPlayback:false}:false,
  systemAudio:'exclude',windowAudio:withAudio?'window':'exclude',monitorTypeSurfaces:'exclude',selfBrowserSurface:'exclude',surfaceSwitching:'exclude'
 };
}
export function captureAudioMessage({surface,track,unavailable},requested=false){
 if(!requested)return 'Compartilhando apenas a imagem. Marque áudio antes de iniciar para transmitir o som da aba.';
 if(track)return 'Som da aba selecionada habilitado. O outro participante pode precisar clicar em Ativar som.';
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
