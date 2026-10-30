import {db,itemFrom} from './data.js';
import {uuid,checked,https} from './ui.js';

export async function catalogPage({types=[],term='',offset=0,limit=48,admin=false}={}){
 let query=db.from('lx_catalog').select('id,payload,published,updated_at',{count:'exact'}).order('updated_at',{ascending:false}).order('id',{ascending:false});
 if(!admin)query=query.eq('published',true);
 if(types.length)query=query.in('payload->>type',types);
 const clean=String(term).trim().replace(/[%,_()]/g,' ').slice(0,90);
 if(clean)query=query.ilike('payload->>title','%'+clean+'%');
 const result=await query.range(offset,offset+Math.min(60,limit)-1);
 if(result.error)throw result.error;
 return {items:(result.data||[]).map(row=>({...itemFrom(row),published:row.published})),total:result.count||0};
}
export async function profileMap(ids){
const unique=[...new Set(ids)].filter(Boolean).slice(0,100);if(!unique.length)return new Map();
 const people=await checked(db.rpc('lx_plus_directory'));
 return new Map((people||[]).filter(p=>unique.includes(p.user_id)).map(p=>[p.user_id,p]));
}
export async function socialDirectory(){return await checked(db.rpc('lx_plus_directory'))||[]}
export async function uploadSocial(file,{userId,kind,target}){
 const accepted=/^(image\/(jpeg|png|webp)|video\/(mp4|webm)|audio\/(webm|ogg|mpeg|mp4|wav)|application\/(pdf|zip)|text\/plain)$/;
 const mime=String(file?.type||'').split(';')[0];
 if(!file||!file.size||file.size>25*1024*1024)throw Error('Envie um arquivo de até 25 MB.');
 if(!accepted.test(mime))throw Error('Formato não permitido. Use imagem, vídeo, áudio, PDF, TXT ou ZIP.');
 if(!['dm','group','post'].includes(kind)||!/^[-a-f0-9]{36}$/.test(String(target)))throw Error('Destino do arquivo inválido.');
 const exts={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','audio/webm':'webm','audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','application/pdf':'pdf','application/zip':'zip','text/plain':'txt'};
 const path=userId+'/'+kind+'/'+target+'/'+uuid()+'.'+exts[mime];
 await checked(db.storage.from('lx-social').upload(path,file,{contentType:mime,upsert:false,cacheControl:'300'}));
 return path;
}
export async function socialMediaUrl(path){
 if(!path)return '';
 if(https(path))return https(path); // Compatibility with existing externally hosted attachments.
 const prefix=String(path).startsWith('social:')?String(path).slice(7):String(path);
 if(prefix.startsWith('cloud:')){const {data,error}=await db.storage.from('lx-media').createSignedUrl(prefix.slice(6),300);if(error)throw error;return data.signedUrl}
 const {data,error}=await db.storage.from('lx-social').createSignedUrl(prefix,300);
 if(error)throw error;return data.signedUrl;
}
export async function readPlaylists(userId){
 const lists=await checked(db.from('lx_playlists').select('*').eq('owner_id',userId).order('created_at',{ascending:false}));
 if(!lists?.length)return [];
 const tracks=await checked(db.from('lx_playlist_tracks').select('playlist_id,track_id,position').in('playlist_id',lists.map(p=>p.id)).order('position'));
 return lists.map(p=>({...p,tracks:(tracks||[]).filter(t=>t.playlist_id===p.id)}));
}
export async function playlistItems(playlistId){
 const tracks=await checked(db.from('lx_playlist_tracks').select('track_id,position').eq('playlist_id',playlistId).order('position').limit(500));
 if(!tracks?.length)return [];
 const rows=await checked(db.from('lx_catalog').select('id,payload,published').in('id',tracks.map(t=>t.track_id)).eq('published',true));
 const map=new Map((rows||[]).map(r=>[String(r.id),itemFrom(r)]));
 return tracks.map(t=>map.get(String(t.track_id))).filter(Boolean);
}
export async function writeStudio(item,published){
 const payload={...item};delete payload.published;delete payload.updatedAt;
 const id=Number(item.id)||Date.now()*1000+crypto.getRandomValues(new Uint16Array(1))[0]%1000;
 if(!Number.isSafeInteger(id)||id<1)throw Error('Identificador de conteúdo inválido.');
 await checked(db.rpc('lx_catalog_upsert_item',{p_id:id,p_payload:{...payload,id},p_published:!!published}));
 return id;
}
export async function personalNotices(){return await checked(db.from('lx_user_notifications').select('id,kind,title,message,data,read_at,created_at').order('created_at',{ascending:false}).limit(60))||[]}

export function createTelemetry(userId){
 let last=0,active=true;const pending=[];
 const clean=s=>String(s||'').replace(/https?:\/\/[^\s)]+/g,'[endereço omitido]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/ig,'[e-mail omitido]').replace(/(?:Bearer\s+|sb_secret_)[\w.-]+/ig,'[credencial omitida]').slice(0,450);
 async function record(category,feature,message='',durationMs=null){
  if(!active||Date.now()-last<1000)return;last=Date.now();
  const entry={user_id:userId,category,feature:String(feature).slice(0,80),message:clean(message),duration_ms:durationMs===null?null:Math.max(0,Math.min(600000,Math.round(durationMs)))};
  pending.push(entry);if(pending.length>20)pending.shift();
  try{await checked(db.from('lx_telemetry').insert(entry))}catch{/* Monitoring must never block the application. */}
 }
 const error=e=>record('error','browser',e.message||'Erro no navegador');
 const rejection=e=>record('error','promise',e.reason?.message||'Operação interrompida');
 window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);
 return {record,diagnostics:()=>({release:'2026.10.30',path:location.pathname,screen:{width:innerWidth,height:innerHeight},online:navigator.onLine,recent:pending.slice(-10)}),destroy(){active=false;window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection)}};
}
