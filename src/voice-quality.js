// LX Voice Studio: browser-native processing, no microphone recordings or uploads.
// Automatic gain can amplify electrical hiss on some devices. Default to OFF.
export const voiceModes=['clear','natural'];
export function voiceMode(mode){return voiceModes.includes(mode)?mode:'clear'}
export function voiceConstraints({mode='clear',deviceId=''}={}){
 const clean=voiceMode(mode)==='clear';
 return {
  echoCancellation:true,
  noiseSuppression:clean,
  autoGainControl:false,
  channelCount:{ideal:1},
  sampleRate:{ideal:48000},
  ...(typeof deviceId==='string'&&deviceId?{deviceId:{exact:deviceId,ideal:deviceId}}:{})
 };
}
export function microphoneLevel(data){
 if(!data?.length)return 0;
 let sum=0;
 for(const sample of data){const amplitude=(sample-128)/128;sum+=amplitude*amplitude}
 const rms=Math.sqrt(sum/data.length);
 return Math.min(100,Math.max(0,Math.round(rms*330)));
}
export function inputHealth(track){
 if(!track)return {ok:false,text:'Nenhum microfone encontrado. Escolha um dispositivo.'};
 if(track.readyState!=='live')return {ok:false,text:'O microfone parou. Clique em Reparar mic.'};
 if(track.muted)return {ok:false,text:'O navegador está silenciando a entrada. Verifique permissões e conexão.'};
 if(track.enabled===false)return {ok:false,text:'Seu microfone está desligado na chamada.'};
 return {ok:true,text:'Entrada ativa. Fale para conferir o nível.'};
}
