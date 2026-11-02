// The LX League awards only completed, measured sessions. Embedded third-party
// services cannot be measured and must not be rewarded (e.g. YouTube policy).
export const leagueRules=[
 {key:'music_valid',name:'Ouvir uma faixa autorizada',points:5,cap:50},
 {key:'watch_valid',name:'Assistir a um vídeo autorizado',points:10,cap:20},
 {key:'read_valid',name:'Ler um livro na LX Plus',points:8,cap:20},
 {key:'streak_daily',name:'Participação diária',points:3,cap:1}
];
export const playbackThreshold=(kind,duration)=>{
 if(!Number.isFinite(duration)||duration<0)return null;
 const d=Math.floor(duration);
 if(kind==='music_valid'&&d>=30)return Math.min(75,Math.max(30,Math.round(d*.32)));
 if(kind==='watch_valid'&&d>=60)return Math.min(180,Math.max(45,Math.round(d*.2)));
 return null;
};
export function eligibleLeaguePlayback(item,source){
 if(!item||!source||!['audio','video','hls','dash'].includes(source.kind))return false;
 if(item.officialEmbedded||source.provider==='YouTube'||source.provider==='Spotify'||source.kind==='iframe')return false;
 return Boolean(item.license?.authorized===true||item.publicDomain===true||item.sourceVerified===true||item.nativeAsset||item.mediaKey);
}
export function createLeagueSession({kind,id,session,report,award,onMessage=()=>{}}){
 let credited=false,pending=false,lastTotal=0;
 return async ({total=0,duration=0}={})=>{
  const threshold=playbackThreshold(kind,duration);
  if(!threshold||credited||pending||!session||!id||total<1)return false;
  // Wait until enough measured, active playback elapsed. Seeking and reloading do
  // not add time to total; the server independently checks credited session time.
  const bounded=Math.max(0,Math.floor(total));
  if(bounded<=lastTotal)return false;
  pending=true;
  try{
   await report(bounded);
   lastTotal=bounded;
   if(bounded<threshold)return false;
   const outcome=await award({kind,session,id,duration:Math.floor(duration),position:bounded});
   if(outcome?.ok&&(outcome.awarded>0||outcome.duplicate===true)){credited=true;if(outcome.awarded>0)onMessage('+'+outcome.awarded+' pontos LX League');return true}
   return false;
  }finally{pending=false}
 };
}
export function rankRuleLegend(){
 return leagueRules.map(x=>({...x}));
}
