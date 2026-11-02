import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {chooseArtist,normalize,supportedGenres,youtubeCandidates,youtubeIdFromURL} from './logic.mjs';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Max-Age':'600'};
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, max-age=0'}});
const endpoint=Deno.env.get('SUPABASE_URL')||'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=endpoint&&service?createClient(endpoint,service,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const MAX_REQUEST=900;
const expired=when=>!when||Date.now()-new Date(when).getTime()>12*60*60*1000;

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
 if(!db||!endpoint||!anon)return respond({error:'SERVICE_UNAVAILABLE'},503);
 if(Number(req.headers.get('content-length')||0)>MAX_REQUEST)return respond({error:'INVALID_REQUEST'},400);
 try{
  const raw=await req.text();
  if(raw.length>MAX_REQUEST)return respond({error:'INVALID_REQUEST'},400);
  let input;
  try{input=JSON.parse(raw)}catch{return respond({error:'INVALID_JSON'},400)}
  const genre=String(input?.genre||'').toLowerCase();
  if(!supportedGenres.includes(genre))return respond({items:[],status:'genre_not_supported'});
  if(typeof input?.artist!=='string'||input.artist.length>90)return respond({error:'INVALID_ARTIST'},400);
  const artist=input.artist;
  const rotation=Math.max(0,Math.min(6,Math.floor(Number(input.rotation)||0)));
  const target=chooseArtist(genre,artist,rotation);
  if(!target)return respond({items:[],status:'genre_not_supported'});
  const auth=(req.headers.get('authorization')||'').match(/^Bearer (\S+)$/i)?.[1]||'';
  if(!auth)return respond({error:'AUTH_REQUIRED'},401);
  const userClient=createClient(endpoint,anon,{global:{headers:{Authorization:'Bearer '+auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await userClient.auth.getUser(auth);
  if(userError||!userData?.user?.id)return respond({error:'AUTH_REQUIRED'},401);
  const {data:profile,error:profileError}=await db.from('lx_profiles').select('approved').eq('user_id',userData.user.id).maybeSingle();
  if(profileError||profile?.approved!==true)return respond({error:'APPROVAL_REQUIRED'},403);
  const excludes=new Set((Array.isArray(input.exclude)?input.exclude:[]).slice(0,80).map(v=>youtubeIdFromURL(v)||(/^[-\w]{11}$/.test(String(v))?String(v):'')).filter(Boolean));
  const key='v2:'+genre+':'+normalize(target);
  const {data:cached}=await db.from('lx_youtube_next_cache').select('items,updated_at').eq('cache_key',key).maybeSingle();
  const serveItems=(rows,status)=>respond({items:(Array.isArray(rows)?rows:[]).filter(item=>!excludes.has(youtubeIdFromURL(item.sourceUrl))).slice(0,24),status,artist:target,provider:'YouTube'});
  if(cached&&!expired(cached.updated_at))return serveItems(cached.items,'cached');
  const claim=await db.rpc('lx_youtube_next_claim',{p_user:userData.user.id});
  if(claim.error||claim.data!==true)return cached?serveItems(cached.items,'cached_limit'):respond({items:[],status:'quota_limited'});
  const {data:credentials,error:credError}=await db.from('lx_integrations').select('secret').eq('key','youtube_music_api_key').maybeSingle();
  const apiKey=String(credentials?.secret||'').trim();
  if(credError||!apiKey)return respond({items:[],status:'provider_not_configured'},503);
  const q=target+' musica oficial '+(genre==='trap'?'trap brasileiro':genre==='sertanejo'?'sertanejo':genre==='forro'?'forro':genre==='funk'?'funk brasileiro':'pagode');
  const params=new URLSearchParams({part:'snippet',q,type:'video',videoCategoryId:'10',videoEmbeddable:'true',regionCode:'BR',relevanceLanguage:'pt',maxResults:'30',safeSearch:'moderate',key:apiKey});
  let timer;
  const controller=new AbortController();
  try{
   timer=setTimeout(()=>controller.abort(),9500);
   const res=await fetch('https://www.googleapis.com/youtube/v3/search?'+params,{signal:controller.signal});
   if(!res.ok)return cached?serveItems(cached.items,'cached_provider_error'):respond({items:[],status:'provider_unavailable'});
   const body=await res.json();
   const rows=youtubeCandidates(body?.items,genre,target);
   // This cache is private server metadata, not a music file or audio stream.
   await db.from('lx_youtube_next_cache').upsert({cache_key:key,items:rows,updated_at:new Date().toISOString()},{onConflict:'cache_key'});
   return serveItems(rows,'ok');
  }catch{return cached?serveItems(cached.items,'cached_provider_error'):respond({items:[],status:'provider_unavailable'})}
  finally{clearTimeout(timer)}
 }catch{
  return respond({items:[],status:'temporarily_unavailable'},503);
 }
});
