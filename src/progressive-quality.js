export function progressiveVariants(input){
 const seen=new Set();
 return (Array.isArray(input)?input:[]).flatMap(variant=>{
  try{
   const url=new URL(variant.url),id=Number(variant.id),width=Number(variant.width),height=Number(variant.height);
   if(url.protocol!=='https:'||url.username||url.password||!Number.isInteger(id)||id<0||seen.has(id)||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
   seen.add(id);return [{...variant,id,url:url.href,width,height}];
  }catch{return []}
 }).sort((a,b)=>b.width*b.height-a.width*a.height);
}
export function automaticVariant(variants,connection){
 if(!variants.length)return null;
 if(connection?.saveData)return variants.at(-1);
 const downlink=Number(connection?.downlink);
 if(Number.isFinite(downlink)&&downlink>0)return variants.find(v=>Number(v.bitrate)>0&&Number(v.bitrate)<=downlink*700000)||variants.at(-1);
 return variants[0];
}
export function attachProgressiveQuality(media,source,{onQualities=()=>{},autoplay=true,onError=()=>{},connection=globalThis.navigator?.connection}={}){
 const variants=progressiveVariants(source.variants);
 if(!variants.length)throw Error('As versões de qualidade deste vídeo não estão disponíveis.');
 let closed=false,selection=-1,pending=null,initialized=false;
 let active=automaticVariant(variants,connection);
 const tryPlay=()=>{try{Promise.resolve(media.play()).catch(()=>{})}catch{}};
 const snapshot=()=>({position:Number(media.currentTime)||0,restorePosition:initialized||media.readyState>=1,playing:!media.paused,rate:media.playbackRate,volume:media.volume,muted:media.muted});
 const switchSource=variant=>{
  if(closed||!variant||variant.id===active.id)return;
  pending={...(pending||snapshot()),url:variant.url};active=variant;
  media.src=variant.url;media.load();
 };
 const loaded=()=>{
  initialized=true;
  if(closed||!pending||media.currentSrc&&media.currentSrc!==pending.url)return;
  const saved=pending;pending=null;
  try{
   if(saved.restorePosition)media.currentTime=Math.max(0,Math.min(saved.position,Number.isFinite(media.duration)?media.duration:saved.position));
   media.playbackRate=saved.rate;media.volume=saved.volume;media.muted=saved.muted;
   if(saved.playing)tryPlay();
  }catch{if(!closed)onError('Não foi possível retomar nesta qualidade. Selecione outra qualidade e tente novamente.')}
 };
 const connectionChanged=()=>{if(selection===-1)switchSource(automaticVariant(variants,connection))};
 media.addEventListener('loadedmetadata',loaded);
 connection?.addEventListener?.('change',connectionChanged);
 media.src=active.url;if(autoplay)tryPlay();
 onQualities(variants.map(v=>({id:v.id,label:v.label||v.width+' × '+v.height})),id=>{
  if(closed)return;
  const next=id===-1?automaticVariant(variants,connection):variants.find(v=>v.id===id);
  if(!next)return;selection=id;switchSource(next);
 });
 return ()=>{if(closed)return;closed=true;pending=null;media.removeEventListener('loadedmetadata',loaded);connection?.removeEventListener?.('change',connectionChanged)};
}
