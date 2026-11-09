import {driveViewUrl} from '../../../src/drive-source.js';

const cache=new Map();
export function safeDriveStream(input,driveId){
 try{
  const url=new URL(input);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/videoplayback')return null;
  if(!url.hostname.endsWith('.c.drive.google.com')&&!url.hostname.endsWith('.googlevideo.com'))return null;
  if(url.searchParams.get('driveid')!==driveId)return null;
  return url.href;
 }catch{return null}
}
export function parseDrivePlayback(data,driveId){
 const formats=data?.mediaStreamingData?.formatStreamingData?.progressiveTranscodes;
 if(!Array.isArray(formats))return [];
 const seen=new Set();
 return formats.flatMap(format=>{
  const meta=format?.transcodeMetadata||{},id=Number(format?.itag),width=Number(meta.width),height=Number(meta.height);
  const url=safeDriveStream(format?.url,driveId);
  // Adaptive video-only formats must never be offered without their audio track.
  if(!url||!Number.isInteger(id)||id<1||id>9999||seen.has(id)||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192)return [];
  if(meta.mimeType!=='video/mp4'||!/^avc1\./.test(meta.videoCodecString||'')||!/^mp4a\.40\./.test(meta.audioCodecString||''))return [];
  seen.add(id);
  const tier=width>=1920?'Full HD':width>=1280?'HD':'Economia';
  return [{id,url,width,height,label:tier+' · '+width+' × '+height,bitrate:Number(meta.maxContainerBitrate)||0,audioCodec:meta.audioCodecString,videoCodec:meta.videoCodecString}];
 }).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,8);
}
export async function loadDrivePlayback(ref,{fetcher=fetch,refresh=false}={}){
 const cacheKey=ref.driveId+':'+(ref.resourceKey||''),previous=cache.get(cacheKey);
 if(fetcher===fetch&&!refresh&&previous?.expires>Date.now())return previous.promise;
 const promise=(async()=>{
  const page=await fetcher(driveViewUrl(ref),{signal:AbortSignal.timeout(10000)});
  if(!page.ok){await page.body?.cancel();throw Error('DRIVE_PLAYBACK_UNAVAILABLE')}
  const html=await page.text();
  // This is the public viewer configuration, not the user's integration secret.
  const key=/https:\/\/clients6\.google\.com",null,"(AIza[\w-]{35})"/.exec(html)?.[1];
  if(!key)throw Error('DRIVE_PLAYBACK_UNAVAILABLE');
  const url=new URL('https://content-workspacevideo-pa.googleapis.com/v1/drive/media/'+encodeURIComponent(ref.driveId)+'/playback');
  url.searchParams.set('key',key);
  const headers={Referer:'https://drive.google.com/'};
  if(ref.resourceKey)headers['X-Goog-Drive-Resource-Keys']=ref.driveId+'/'+ref.resourceKey;
  const result=await fetcher(url.href,{headers,signal:AbortSignal.timeout(10000)});
  if(!result.ok){await result.body?.cancel();throw Error('DRIVE_PLAYBACK_UNAVAILABLE')}
  return parseDrivePlayback(await result.json(),ref.driveId);
 })();
 if(fetcher===fetch){
  if(cache.size>=64)cache.delete(cache.keys().next().value);
  const entry={promise,expires:Date.now()+180000};cache.set(cacheKey,entry);
  promise.catch(()=>{if(cache.get(cacheKey)===entry)cache.delete(cacheKey)});
 }
 return promise;
}
export async function fetchDriveVariant(ref,itag,range,{fetcher=fetch,signal}={}){
 let formats=await loadDrivePlayback(ref,{fetcher});
 for(let attempt=0;attempt<2;attempt++){
  const variant=formats.find(format=>format.id===itag);
  if(!variant)return null;
  const response=await fetcher(variant.url,{headers:{Range:range,Referer:'https://drive.google.com/'},redirect:'follow',signal});
  if(response.status!==403||attempt)return response;
  await response.body?.cancel();
  formats=await loadDrivePlayback(ref,{fetcher,refresh:true});
 }
 return null;
}
