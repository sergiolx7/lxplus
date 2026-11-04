export function audioCounters(stats){
 const value={sent:0,received:0,samples:0};
 stats?.forEach(row=>{if((row.kind||row.mediaType)!=='audio')return;if(row.type==='outbound-rtp'&&!row.isRemote)value.sent+=Number(row.bytesSent)||0;if(row.type==='inbound-rtp'&&!row.isRemote){value.received+=Number(row.bytesReceived)||0;value.samples+=Number(row.totalSamplesReceived)||0}});
 return value;
}
export function voiceDiagnostics({track,sender,outgoing,incoming,previous,playback='not-ready',capturing=false,analyserAvailable=true}={}){
 const live=track?.readyState==='live',muted=track?.enabled===false;
 return {
  capture:!live?'Microfone desconectado':muted?'Microfone silenciado':track.muted?'Entrada bloqueada pelo navegador':!analyserAvailable?'Medidor pausado · clique em Testar microfone':capturing?'Sua voz está sendo captada':'Entrada ativa · aguardando fala',
  send:!live||!sender||sender.track!==track?'Microfone sem canal de envio':muted?'Envio silenciado':previous&&outgoing?.sent>previous.sent?'Pacotes de voz enviados':'Aguardando pacotes de voz',
  receive:previous&&incoming?.received>previous.received?'Pacotes de voz recebidos':'Aguardando voz do participante',
  playback:playback==='blocked'?'Reprodução bloqueada · clique em Ativar som':playback==='playing'?'Reprodução liberada neste aparelho':'Aguardando áudio remoto'
 };
}
