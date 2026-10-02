import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const validId=(v:string)=>/^[A-Za-z0-9_-]{10,256}$/.test(v);
function parseQuery(body:string){
 const p=new URLSearchParams(body),sizes=new Map();
 for(const row of (p.get('fmt_list')||'').split(',')){const [code,size]=row.split('/'),[width,height]=(size||'0x0').split('x').map(Number);if(code)sizes.set(code,{width:width||0,height:height||0});}
 const streams=(p.get('fmt_stream_map')||p.get('url_encoded_fmt_stream_map')||'').split(',').filter(Boolean).flatMap(entry=>{
  try{const pipe=entry.indexOf('|'),q=new URLSearchParams(entry),code=pipe>0?entry.slice(0,pipe):(q.get('itag')||q.get('fmt')||''),url=pipe>0?decodeURIComponent(entry.slice(pipe+1)):(q.get('url')||'');
   if(!/^https?:\/\//i.test(url))return [];return [{code,url,type:q.get('type')||'',...(sizes.get(code)||{width:0,height:0})}];
  }catch{return []}
 });
 return {status:p.get('status')||'',reason:p.get('reason')||'',streams};
}
function selectAudioStream(streams){
 const priorities=new Map([['140',0],['18',1],['22',2],['37',3],['38',4]]);
 const compatible=streams.filter(s=>priorities.has(s.code)||(/(?:audio\/(?:mp4|x-m4a)|video\/mp4)/i.test(s.type)&&(!/codecs/i.test(s.type)||/mp4a/i.test(s.type))));
 return compatible.sort((a,b)=>(priorities.get(a.code)??20)-(priorities.get(b.code)??20)||(a.height||99999)-(b.height||99999))[0]||null;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 let payload;try{payload=await req.json()}catch{return json({error:'INVALID_JSON'},400)}
 const driveId=String(payload?.driveId||'').trim();if(!validId(driveId))return json({error:'INVALID_DRIVE_ID'},400);
 try{
  const u=new URL('https://docs.google.com/get_video_info');u.searchParams.set('docid',driveId);
  const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 LXPlus/1.0','accept':'text/plain,*/*'},redirect:'follow',signal:AbortSignal.timeout(12000)});
  if(!r.ok)return json({error:'DRIVE_INFO_HTTP_'+r.status},502);
  const parsed=parseQuery(await r.text());if(parsed.status&&parsed.status!=='ok')return json({error:'DRIVE_TRANSCODE_UNAVAILABLE'},424);
  const chosen=selectAudioStream(parsed.streams);if(!chosen)return json({error:'NO_COMPATIBLE_AUDIO'},424);
  return json({ok:true,url:chosen.url,quality:chosen.code==='140'?'AAC':chosen.height?`${chosen.height}p · AAC`:'MP4 compatível',streamCount:parsed.streams.length});
 }catch(error){return json({error:error?.name==='TimeoutError'?'RESOLVER_TIMEOUT':'RESOLVER_FAILED'},504)}
});
