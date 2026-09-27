import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, max-age=30" },
});
const norm = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const strip = (value: unknown) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const safeUrl = (value: unknown) => { try { const u = new URL(String(value || "")); return /^https?:$/.test(u.protocol) ? u.toString() : ""; } catch { return ""; } };
const freeLicense = (value: unknown) => {
  const s = String(value || "").toLowerCase();
  return /creativecommons\.org\/(?:licenses|publicdomain)\//.test(s) || /\b(?:cc0|public domain|creative commons)\b/.test(s);
};
const scoreText = (q: string, title: unknown, artist: unknown) => {
  const needle = norm(q), text = norm(`${title || ""} ${artist || ""}`), titleN = norm(title);
  if (!needle) return 0;
  let score = text === needle ? 100 : 0;
  if (titleN === needle) score += 70;
  for (const part of needle.split(/\s+/).filter(Boolean)) if (text.includes(part)) score += 8;
  if (text.includes(needle)) score += 30;
  return score;
};

type Source = {
  provider: string; label: string; playable: boolean; streamUrl?: string; externalUrl?: string;
  license?: string; licenseUrl?: string; mediaKey?: string; catalogId?: string | number; note?: string;
};
type Track = {
  key: string; title: string; artist: string; album?: string; cover?: string; duration?: number; year?: string | number;
  score: number; sources: Source[]; metadata?: Record<string, unknown>;
};

function mergeResults(rows: Track[], limit: number) {
  const map = new Map<string, Track>();
  for (const row of rows) {
    const key = row.key || `${norm(row.title)}|${norm(row.artist)}`;
    const existing = map.get(key);
    if (!existing) { map.set(key, { ...row, key, sources: [...row.sources] }); continue; }
    existing.score = Math.max(existing.score, row.score);
    existing.album ||= row.album; existing.cover ||= row.cover; existing.duration ||= row.duration; existing.year ||= row.year;
    for (const source of row.sources) {
      const sig = `${source.provider}|${source.streamUrl || source.externalUrl || source.catalogId || ""}`;
      if (!existing.sources.some(x => `${x.provider}|${x.streamUrl || x.externalUrl || x.catalogId || ""}` === sig)) existing.sources.push(source);
    }
  }
  const priority: Record<string, number> = { lx: 100, jamendo: 80, commons: 70, archive: 60, musicbrainz: 10 };
  for (const row of map.values()) row.sources.sort((a,b)=>(priority[b.provider]||0)-(priority[a.provider]||0));
  return [...map.values()].sort((a,b)=>{
    const ap = a.sources.some(s=>s.playable) ? 25 : 0, bp = b.sources.some(s=>s.playable) ? 25 : 0;
    return (b.score + bp) - (a.score + ap);
  }).slice(0, limit);
}

async function localSearch(admin: ReturnType<typeof createClient>, q: string, limit: number): Promise<Track[]> {
  const { data, error } = await admin.from("lx_catalog").select("id,payload,published").eq("published", true).limit(600);
  if (error) { console.warn("lx music local search", error.message); return []; }
  return (data || []).map((row: any) => ({ row, p: row?.payload || {} }))
    .filter(({p}: any) => p.type === "Música")
    .map(({row,p}: any) => {
      const score = scoreText(q, p.title, p.artist) + (norm(p.album).includes(norm(q)) ? 10 : 0);
      const mediaKey = String(p.mediaKey || p.tracks?.[0]?.mediaKey || "");
      return { key:`${norm(p.title)}|${norm(p.artist)}`, title:String(p.title||"Música"), artist:String(p.artist||"LX Music"), album:String(p.album||""), cover:safeUrl(p.cover)||String(p.cover||""), duration:Number(p.duration||p.tracks?.[0]?.duration||0), year:p.year||"", score, sources:[{provider:"lx",label:"LX Plus",playable:!!mediaKey,mediaKey,catalogId:row.id,note:mediaKey?"Já está no catálogo LX.":"Item sem fonte de áudio."}] } as Track;
    }).filter((x: Track)=>x.score>0).sort((a: Track,b: Track)=>b.score-a.score).slice(0,limit);
}

async function commonsSearch(q: string, limit: number): Promise<Track[]> {
  const params = new URLSearchParams({
    action:"query", generator:"search", gsrsearch:`${q} filetype:audio`, gsrnamespace:"6", gsrlimit:String(Math.min(limit,12)),
    prop:"imageinfo", iiprop:"url|extmetadata|mime", iiurlwidth:"300", format:"json", origin:"*"
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers:{"User-Agent":"LXPlus/1.0 (https://xn--rifamilionria-deb.api.br/)"} });
  if (!res.ok) throw new Error(`COMMONS_${res.status}`);
  const data:any = await res.json(), pages = Object.values(data?.query?.pages || {}) as any[];
  return pages.flatMap((page:any) => {
    const info = page?.imageinfo?.[0], meta = info?.extmetadata || {}, mime = String(info?.mime || "");
    if (!mime.startsWith("audio/")) return [];
    const license = strip(meta.LicenseShortName?.value || meta.UsageTerms?.value || ""), licenseUrl = safeUrl(meta.LicenseUrl?.value || "");
    if (!freeLicense(`${license} ${licenseUrl}`)) return [];
    const rawTitle = String(meta.ObjectName?.value || page.title || "").replace(/^File:/i,"").replace(/\.[a-z0-9]{2,5}$/i,"");
    const artist = strip(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons");
    const streamUrl = safeUrl(info?.url), externalUrl = page?.pageid ? `https://commons.wikimedia.org/?curid=${page.pageid}` : "https://commons.wikimedia.org/";
    if (!streamUrl) return [];
    return [{ key:`${norm(rawTitle)}|${norm(artist)}`, title:rawTitle || "Áudio do Commons", artist, album:"Wikimedia Commons", cover:safeUrl(info?.thumburl), duration:0, score:scoreText(q,rawTitle,artist), sources:[{provider:"commons",label:"Wikimedia Commons",playable:true,streamUrl,externalUrl,license:license||"Licença livre",licenseUrl}] } as Track];
  });
}

async function archiveSearch(q: string, limit: number): Promise<Track[]> {
  const query = `(${q.replace(/[()]/g," ")}) AND mediatype:audio`;
  const params = new URLSearchParams({ q:query, "fl[]":"identifier,title,creator,licenseurl,year", rows:String(Math.min(limit,6)), page:"1", output:"json" });
  const res = await fetch(`https://archive.org/advancedsearch.php?${params}`, { headers:{"User-Agent":"LXPlus/1.0 (https://xn--rifamilionria-deb.api.br/)"} });
  if (!res.ok) throw new Error(`ARCHIVE_SEARCH_${res.status}`);
  const data:any = await res.json(), docs:any[] = data?.response?.docs || [];
  const rows = await Promise.all(docs.map(async doc => {
    try {
      const id = String(doc.identifier||""); if(!id) return null;
      const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { headers:{"User-Agent":"LXPlus/1.0 (https://xn--rifamilionria-deb.api.br/)"} });
      if(!metaRes.ok) return null; const meta:any = await metaRes.json();
      const md = meta?.metadata || {}, licenseUrl = safeUrl(md.licenseurl || doc.licenseurl || ""), rights = strip(md.rights || "");
      if(!freeLicense(`${licenseUrl} ${rights}`)) return null;
      const files:any[] = Array.isArray(meta?.files) ? meta.files : [];
      const audio = files.find(f=>/^(?:VBR MP3|MP3|64Kbps MP3|Ogg Vorbis)$/i.test(String(f.format||"")) && /\.(?:mp3|ogg|oga)$/i.test(String(f.name||""))) || files.find(f=>/\.(?:mp3|ogg|oga)$/i.test(String(f.name||"")));
      if(!audio?.name) return null;
      const title = String(md.title || doc.title || audio.title || id), artist = String(md.creator || doc.creator || audio.artist || "Internet Archive");
      const streamUrl = `https://archive.org/download/${encodeURIComponent(id)}/${audio.name.split('/').map((x:string)=>encodeURIComponent(x)).join('/')}`;
      const coverFile = files.find(f=>/\.(?:jpg|jpeg|png|webp)$/i.test(String(f.name||"")) && /(?:cover|front|folder|thumb)/i.test(String(f.name||"")));
      const cover = coverFile ? `https://archive.org/download/${encodeURIComponent(id)}/${coverFile.name.split('/').map((x:string)=>encodeURIComponent(x)).join('/')}` : `https://archive.org/services/img/${encodeURIComponent(id)}`;
      return { key:`${norm(title)}|${norm(artist)}`, title, artist, album:String(md.album||"Internet Archive"), cover, duration:Number(audio.length||0), year:md.year||doc.year||"", score:scoreText(q,title,artist), sources:[{provider:"archive",label:"Internet Archive",playable:true,streamUrl,externalUrl:`https://archive.org/details/${encodeURIComponent(id)}`,license:rights||"Licença livre",licenseUrl}] } as Track;
    } catch { return null; }
  }));
  return rows.filter(Boolean) as Track[];
}

async function musicBrainzSearch(q: string, limit: number): Promise<Track[]> {
  const params = new URLSearchParams({ query:q, fmt:"json", limit:String(Math.min(limit,8)) });
  const res = await fetch(`https://musicbrainz.org/ws/2/recording/?${params}`, { headers:{"User-Agent":"LXPlus/1.0 (https://xn--rifamilionria-deb.api.br/)","Accept":"application/json"} });
  if (!res.ok) throw new Error(`MUSICBRAINZ_${res.status}`);
  const data:any = await res.json();
  return (data?.recordings || []).map((r:any) => {
    const artist = (r["artist-credit"]||[]).map((x:any)=>x?.name||x?.artist?.name).filter(Boolean).join(", ") || "Artista não informado";
    const album = r.releases?.[0]?.title || "";
    return { key:`${norm(r.title)}|${norm(artist)}`, title:String(r.title||"Música"), artist, album, duration:Number(r.length||0)/1000, year:String(r["first-release-date"]||"").slice(0,4), score:scoreText(q,r.title,artist), sources:[{provider:"musicbrainz",label:"MusicBrainz",playable:false,externalUrl:r.id?`https://musicbrainz.org/recording/${encodeURIComponent(r.id)}`:"",note:"Identificação e metadados; não fornece o áudio."}], metadata:{musicBrainzId:r.id} } as Track;
  });
}

async function jamendoSearch(admin: ReturnType<typeof createClient>, q: string, limit: number): Promise<{rows:Track[],configured:boolean}> {
  const {data} = await admin.from("lx_integrations").select("secret").eq("key","jamendo_client_id").maybeSingle();
  const clientId = String(data?.secret || "").trim(); if(!clientId) return {rows:[],configured:false};
  const params = new URLSearchParams({ client_id:clientId, format:"json", limit:String(Math.min(limit,12)), search:q, include:"musicinfo", imagesize:"300", type:"single albumtrack" });
  const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`); if(!res.ok) throw new Error(`JAMENDO_${res.status}`);
  const dataJ:any = await res.json();
  const rows = (dataJ?.results || []).map((r:any)=>({
    key:`${norm(r.name)}|${norm(r.artist_name)}`, title:String(r.name||"Música"), artist:String(r.artist_name||"Jamendo"), album:String(r.album_name||""), cover:safeUrl(r.image||r.album_image), duration:Number(r.duration||0), year:String(r.releasedate||"").slice(0,4), score:scoreText(q,r.name,r.artist_name),
    sources:[{provider:"jamendo",label:"Jamendo",playable:!!safeUrl(r.audio),streamUrl:safeUrl(r.audio),externalUrl:safeUrl(r.shareurl),license:String(r.license_ccurl||"Jamendo"),licenseUrl:safeUrl(r.license_ccurl)}]
  } as Track));
  return {rows,configured:true};
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return json({error:"Método não permitido."},405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!, anonKey = Deno.env.get("SUPABASE_ANON_KEY")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || ""; if(!authorization) return json({error:"Entre na LX Plus para pesquisar músicas."},401);
    const userClient = createClient(supabaseUrl, anonKey, {global:{headers:{Authorization:authorization}}});
    const {data:authData,error:authError} = await userClient.auth.getUser(); if(authError||!authData.user) return json({error:"Sessão inválida."},401);
    const admin = createClient(supabaseUrl, serviceKey, {auth:{persistSession:false}});
    const {data:profile} = await admin.from("lx_profiles").select("approved").eq("user_id",authData.user.id).maybeSingle(); if(!profile?.approved) return json({error:"Conta aguardando aprovação."},403);
    const body = await req.json().catch(()=>({})); const action = String(body.action||"search");
    if(action!=="search") return json({error:"Ação desconhecida."},400);
    const q = String(body.q||"").trim().slice(0,100); if(q.length<2) return json({error:"Digite pelo menos 2 caracteres."},400);
    const limit = Math.max(4,Math.min(Number(body.limit||16),30)), each = Math.max(4,Math.min(Math.ceil(limit/2),10));
    const tasks = await Promise.allSettled([localSearch(admin,q,each),commonsSearch(q,each),archiveSearch(q,each),musicBrainzSearch(q,each),jamendoSearch(admin,q,each)]);
    const local = tasks[0].status==="fulfilled"?tasks[0].value:[], commons=tasks[1].status==="fulfilled"?tasks[1].value:[], archive=tasks[2].status==="fulfilled"?tasks[2].value:[], mb=tasks[3].status==="fulfilled"?tasks[3].value:[], jamendo = tasks[4].status==="fulfilled"?tasks[4].value:{rows:[],configured:false};
    const results = mergeResults([...local,...jamendo.rows,...commons,...archive,...mb],limit);
    const failures = tasks.map((t,i)=>t.status==="rejected"?({source:["lx","commons","archive","musicbrainz","jamendo"][i],error:String(t.reason?.message||t.reason||"Falha").slice(0,120)}):null).filter(Boolean);
    return json({q,results,sources:{lx:{enabled:true,count:local.length},commons:{enabled:true,count:commons.length},archive:{enabled:true,count:archive.length},musicbrainz:{enabled:true,count:mb.length,metadataOnly:true},jamendo:{enabled:jamendo.configured,count:jamendo.rows.length,needsClientId:!jamendo.configured}},failures});
  } catch(error) { console.error("lx-music-sources",error); return json({error:error instanceof Error?error.message:"Falha inesperada na busca."},500); }
});
