// Explicitly attach the ANSWERING participant's microphone to the audio
// transceiver created by the incoming offer. Prior releases could establish
// a WebRTC connection while sending no audio from the called participant.
export async function bindAnsweringMicrophone(transceivers,localStream){
 const microphone=localStream?.getAudioTracks?.()[0]||null;
 const voice=transceivers?.filter(t=>t?.receiver?.track?.kind==='audio')?.[0];
 if(!voice?.sender||!microphone||microphone.readyState!=='live'){
  throw new Error('Não foi possível enviar sua voz. Confira o microfone e reconecte a chamada.');
 }
 voice.direction='sendrecv';
 await voice.sender.replaceTrack(microphone);
 return voice.sender;
}
export function outgoingVoiceState(sender,track){
 if(!track||track.readyState!=='live')return 'device-lost';
 if(!sender||sender.track!==track)return 'not-sending';
 if(track.muted)return 'blocked';
 if(track.enabled===false)return 'muted';
 return 'sending';
}

export async function replaceMicrophoneTrack({stream,sender,next,isCurrent=()=>true}){
 const previous=stream.getAudioTracks()[0];
 if(!next||next.readyState!=='live')throw Error('Nenhuma entrada de microfone foi encontrada.');
 next.enabled=previous?.enabled!==false;
 try{
  if(!isCurrent()){next.stop();return false}
  if(sender)await sender.replaceTrack(next);
  if(!isCurrent()){next.stop();return false}
  for(const old of stream.getAudioTracks()){stream.removeTrack(old);old.stop()}
  stream.addTrack(next);return true;
 }catch(error){next.stop();throw error}
}
