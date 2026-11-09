import {test} from 'node:test';
import assert from 'node:assert/strict';
import {automaticVariant,attachProgressiveQuality} from '../src/progressive-quality.js';
import {parseDrivePlayback,safeDriveStream,loadDrivePlayback} from '../supabase/functions/lx-drive-player/playback.mjs';
import {handleDrivePlayer,readDriveTicket,issueDriveTicket} from '../supabase/functions/lx-drive-player/handler.mjs';

const driveId='1Abcde1234567890xyz',secret='isolated-unit-test-secret';
const url=id=>'https://rr1---sn-test.c.drive.google.com/videoplayback?driveid='+driveId+'&itag='+id;
const metadata=(id,width,height,audioCodecString='mp4a.40.2')=>({itag:id,url:url(id),transcodeMetadata:{width,height,mimeType:'video/mp4',videoCodecString:'avc1.640029',audioCodecString,maxContainerBitrate:id===22?1500000:500000}});
const playback={mediaStreamingData:{formatStreamingData:{progressiveTranscodes:[metadata(18,640,270),metadata(22,1280,538)],adaptiveTranscodes:[metadata(136,1280,538,'')]}}};
const formats=parseDrivePlayback(playback,driveId);
const env=name=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:secret,SUPABASE_ANON_KEY:'public'})[name];
const page='<script>viewerData={configJson:["https://clients6.google.com",null,"AIza'+'x'.repeat(35)+'"]}</script>';
function providerFetch({streamStatus=206}={}){
 const calls=[];
 const fetcher=async(input,options={})=>{
  calls.push({url:input,options});
  if(input.endsWith('/auth/v1/user'))return Response.json({id:'verified-member'});
  if(input.includes('/rest/v1/lx_catalog?'))return Response.json([{payload:{type:'Filme',sourceVerified:true,sourceUrl:'https://drive.google.com/file/d/'+driveId+'/view'}}]);
  if(input.startsWith('https://drive.google.com/file/'))return new Response(page);
  if(input.startsWith('https://content-workspacevideo-pa.googleapis.com/'))return Response.json(playback);
  if(input.startsWith('https://rr1---sn-test.c.drive.google.com/'))return new Response(new Uint8Array([0,0,0,24]),{status:streamStatus,headers:{'content-range':'bytes 0-3/10000','content-type':'video/mp4','content-length':'4'}});
  throw Error('Unexpected provider: '+new URL(input).hostname);
 };
 return {calls,fetcher};
}
test('only real progressive MP4 versions containing both H264 and AAC become quality options',()=>{
 assert.deepEqual(formats.map(x=>x.id),[22,18]);assert.equal(formats[0].label,'HD · 1280 × 538');
 const bad={mediaStreamingData:{formatStreamingData:{progressiveTranscodes:[metadata(136,1280,538,''),metadata(22,1280,538,'ac-3'),{...metadata(18,640,270),url:'https://evil.test/videoplayback?driveid='+driveId}]}}};
 assert.equal(parseDrivePlayback(bad,driveId).length,0);
 assert.equal(safeDriveStream(url(22),'1OtherFile12345678'),null);
 assert.equal(safeDriveStream('https://rr1.c.drive.google.com.evil.test/videoplayback?driveid='+driveId,driveId),null);
});
test('viewer metadata discovery finds current public API configuration and returns audio-bearing sources',async()=>{
 const p=providerFetch();const result=await loadDrivePlayback({driveId,resourceKey:'key123'},{fetcher:p.fetcher});
 assert.deepEqual(result.map(x=>x.id),[22,18]);assert.equal(p.calls[1].options.headers['X-Goog-Drive-Resource-Keys'],driveId+'/key123');
});
test('authenticated resolver issues one signed ticket per available quality and never defaults to silent MKV',async()=>{
 const p=providerFetch();const response=await handleDrivePlayer(new Request('https://test.supabase.co/',{method:'POST',headers:{authorization:'Bearer valid-member','content-type':'application/json'},body:JSON.stringify({catalogId:'123',driveId})}),{env,fetcher:p.fetcher});
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.audioCodec,'AAC');assert.equal(data.mime,'video/mp4');assert.equal(data.warning,'');
 assert.equal(data.url,data.variants[0].url);assert.deepEqual(data.variants.map(v=>v.id),[22,18]);
 for(const variant of data.variants){const ticket=await readDriveTicket(new URL(variant.url).searchParams.get('ticket'),secret);assert.equal(ticket.t,variant.id);assert.equal(ticket.u,'verified-member')}
 assert.equal(p.calls.some(c=>c.url.includes('drive.usercontent.google.com')),false);
});
test('a quality ticket selects that exact audio-bearing rendition and retains byte-range behavior',async()=>{
 const p=providerFetch(),ticket=await issueDriveTicket({d:driveId,t:18,e:Date.now()+60000,u:'verified-member',m:'video/mp4'},secret);
 const response=await handleDrivePlayer(new Request('https://test.supabase.co/?ticket='+ticket,{headers:{Range:'bytes=0-3'}}),{env,fetcher:p.fetcher});
 assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'video/mp4');
 const stream=p.calls.at(-1);assert.equal(new URL(stream.url).searchParams.get('itag'),'18');assert.equal(stream.options.headers.Range,'bytes=0-3');
});
test('automatic quality follows the data saver and available bandwidth',()=>{
 assert.equal(automaticVariant(formats,null).id,22);assert.equal(automaticVariant(formats,{saveData:true,downlink:100}).id,18);assert.equal(automaticVariant(formats,{downlink:1}).id,18);assert.equal(automaticVariant(formats,{downlink:10}).id,22);
});
class Media extends EventTarget{
 constructor(){super();Object.assign(this,{currentTime:123,duration:900,readyState:4,paused:true,volume:.7,muted:false,playbackRate:1.5,src:'',currentSrc:'',loads:0,plays:0})}
 play(){this.paused=false;this.plays++;return Promise.resolve()}
 load(){this.loads++;this.currentSrc=this.src;this.currentTime=0;this.paused=true}
 metadata(){this.dispatchEvent(new Event('loadedmetadata'))}
}
test('switching real quality preserves playback position, volume, mute, speed and paused state',()=>{
 const media=new Media();let select,options;
 const stop=attachProgressiveQuality(media,{variants:formats},{autoplay:false,onQualities:(list,fn)=>{options=list;select=fn},connection:null});
 assert.equal(options.length,2);assert.equal(media.src,url(22));
 select(18);media.metadata();assert.equal(media.currentTime,123);assert.equal(media.paused,true);assert.equal(media.volume,.7);assert.equal(media.playbackRate,1.5);
 media.currentTime=333;media.paused=false;media.muted=true;select(22);media.metadata();assert.equal(media.currentTime,333);assert.equal(media.paused,false);assert.equal(media.muted,true);
 stop();select(18);assert.equal(media.loads,2);
});
test('rapid quality changes retain the original timestamp and cannot resume after closing',()=>{
 const media=new Media();media.paused=false;let select;
 const stop=attachProgressiveQuality(media,{variants:formats},{autoplay:false,onQualities:(_,fn)=>{select=fn},connection:null});
 select(18);select(22);media.metadata();assert.equal(media.currentTime,123);assert.equal(media.plays,1);
 media.currentTime=400;select(18);stop();media.metadata();assert.equal(media.plays,1);
});
test('an initial quality change cannot erase the saved resume position applied on first metadata',()=>{
 const media=new Media();media.currentTime=0;media.readyState=0;let select;
 const stop=attachProgressiveQuality(media,{variants:formats},{autoplay:false,onQualities:(_,fn)=>{select=fn},connection:null});
 select(18);media.currentTime=200;media.metadata();assert.equal(media.currentTime,200);stop();
});
