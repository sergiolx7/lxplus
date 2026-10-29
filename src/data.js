// LX Plus startup: two independent CDNs and a network timeout prevent an endless black loader.
// Both URLs point to the same pinned version of the official Supabase JS SDK.
async function loadSupabaseModule(url,timeoutMs=6500){
  let timer;
  try{
    return await Promise.race([
      import(url),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo limite ao carregar a biblioteca de autenticação.')),timeoutMs)})
    ]);
  }finally{clearTimeout(timer)}
}
let supabaseModule;
try{
  supabaseModule=await loadSupabaseModule('https://esm.sh/@supabase/supabase-js@2.57.4?bundle');
}catch(firstFailure){
  console.warn('LX Plus: primeiro CDN indisponível; usando fonte alternativa.',firstFailure);
  supabaseModule=await loadSupabaseModule('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm',9000);
}
const {createClient}=supabaseModule;
if(typeof createClient!=='function')throw Error('Biblioteca de autenticação indisponível.');
import {BACKEND} from './config.js';
import {resolveItem} from './universal-player.js';

// Keep existing sessions on the original key. If a legacy browser session blocks
// initialization, the explicit login recovery mode uses a separate persistent key.
const RECOVERY_FLAG='lxplus_next_login_recovery_v1';
const RECOVERY_KEY='lxplus-next-auth-v1';
const authOptions=()=>{
 const recovery=(()=>{try{return localStorage.getItem(RECOVERY_FLAG)==='1'}catch{return false}})();
 return {persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,...(recovery?{storageKey:RECOVERY_KEY}:{})};
};
export let db=createClient(BACKEND.url,BACKEND.key,{auth:authOptions()});
export function switchToRecoveryLogin(){
 try{localStorage.setItem(RECOVERY_FLAG,'1')}catch{}
 db=createClient(BACKEND.url,BACKEND.key,{auth:authOptions()});
 return db;
}
export const categories={'Início':null,'Filmes':['Filme'],'Séries':['Série','Dorama','Anime'],'Músicas':['Música'],'Livros':['Livro'],'Ao vivo':['Ao Vivo']};
export const safeUrl=s=>{
 if(typeof s!=='string'||!s.trim())return '';
 try{const u=new URL(s,location.origin);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}
};
export const itemFrom=r=>{
 const p=r?.payload||r||{};
 return {...p,id:r.id??p.id,title:String(p.title||'Sem título'),type:String(p.type||p.media_kind||'Conteúdo'),cover:safeUrl(p.cover||p.cover_url||''),banner:safeUrl(p.banner||p.heroArt||''),description:String(p.desc||p.description||'')};
};
export async function getCatalog(){
 const all=[],limit=150;
 for(let n=0;n<18;n++){
  const {data,error}=await db.from('lx_catalog').select('id,payload,published,updated_at').eq('published',true).order('updated_at',{ascending:false}).order('id',{ascending:false}).range(n*limit,(n+1)*limit-1);
  if(error)throw error;
  all.push(...(data||[]).map(itemFrom));
  if((data||[]).length<limit)break;
 }
 return all;
}
export async function findDiscovery(term){
 const q=String(term||'').trim().replace(/[%,_]/g,'').slice(0,60);
 if(q.length<3)return [];
 const {data,error}=await db.from('lx_auto_discovery').select('id,title,year,description,cover_url,media_kind,source_url').eq('published',true).ilike('title','%'+q+'%').limit(24);
 return error?[]:(data||[]).map(x=>({...itemFrom(x),metadataOnly:true}));
}
export async function getProfile(id){
 const {data,error}=await db.from('lx_profiles').select('user_id,name,username,approved,approval_status,verified,bio,avatar_url,ranking_visible').eq('user_id',id).maybeSingle();
 if(error)throw error;
 return data;
}
export async function getUserState(id){
 const {data,error}=await db.from('lx_user_state').select('data').eq('user_id',id).maybeSingle();
 if(error)throw error;
 return data?.data||{};
}
export async function isAdmin(){
 const {data,error}=await db.rpc('lx_am_i_admin');return !error&&data===true;
}
export async function saveUserField(id,key,value){
 // Read and merge: never replace unrelated fields, including old history/preference formats.
 const {data,error}=await db.from('lx_user_state').select('data').eq('user_id',id).maybeSingle();
 if(error)throw error;
 const combined={...(data?.data||{}),[key]:value};
 const result=await db.from('lx_user_state').upsert({user_id:id,data:combined,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(result.error)throw result.error;
 return combined;
}
export async function saveMyProfile(id,name,bio){
 const {error}=await db.from('lx_profiles').update({name:String(name).slice(0,60),bio:String(bio).slice(0,280)}).eq('user_id',id);
 if(error)throw error;
}
export async function notices(){
 const {data,error}=await db.from('lx_notifications').select('id,title,message,created_at').eq('published',true).order('created_at',{ascending:false}).limit(30);
 return error?[]:data;
}
export async function publicMembers(){
 // The existing RLS policy only exposes opted-in public profiles.
 const {data,error}=await db.from('lx_profiles').select('user_id,name,verified,bio,username,avatar_url,social_visible').eq('ranking_visible',true).eq('social_visible',true).limit(50);
 return error?[]:(data||[]);
}
export async function sourceFor(item){
 return resolveItem(item,{signStorage:async key=>{
  if(!/^cloud:media\//.test(key))return null;
  // A signed URL is scoped to an authenticated session; not an arbitrary proxy.
  const {data,error}=await db.storage.from(BACKEND.mediaBucket).createSignedUrl(key.slice(6),900);
  if(error)return null;
  return data?.signedUrl||null;
 }});
}

export async function getRanking(){
 const {data:seasons,error:seasonError}=await db.from('lx_rank_seasons').select('season_key,prize_cents,status,starts_at,ends_at').order('starts_at',{ascending:false}).limit(1);
 if(seasonError||!seasons?.length)return{season:null,rows:[]};
 const season=seasons[0];
 const {data,error}=await db.from('lx_rank_scores').select('user_id,season_key,monthly_score,lifetime_score').eq('season_key',season.season_key).order('monthly_score',{ascending:false}).limit(50);
 return{season,rows:error?[]:(data||[])};
}

export async function ownFriendships(userId){
 const {data,error}=await db.from('lx_friendships').select('id,user_low,user_high,requested_by,status,updated_at')
 .or('user_low.eq.'+userId+',user_high.eq.'+userId).limit(80);
 if(error)throw error;
 return data||[];
}
export async function requestFriendship(otherId){
 const {data,error}=await db.rpc('lx_friend_request',{p_other:otherId});
 if(error)throw error;
 return data;
}
export async function respondToFriend(otherId,accept){
 const {data,error}=await db.rpc('lx_friend_respond',{p_other:otherId,p_accept:!!accept});
 if(error)throw error;
 return data;
}
export async function getAdminDiagnostics(){
 // Read existing logs as authorized by the database RLS. Never send secret payloads.
 const [errors,activity]=await Promise.all([
  db.from('lx_client_errors').select('id,error_type,page,message,created_at,device,browser').order('created_at',{ascending:false}).limit(50),
  db.from('lx_analytics').select('id,event,created_at').order('created_at',{ascending:false}).limit(100)
 ]);
 return {
  errors:errors.error?[]:(errors.data||[]),
  activity:activity.error?[]:(activity.data||[]),
  partial:Boolean(errors.error||activity.error),
  errorsUnavailable:Boolean(errors.error),
  activityUnavailable:Boolean(activity.error)
 };
}
export async function getSupportTickets(){
 const {data,error}=await db.from('lx_support_tickets').select('id,user_id,topic,status,created_at').order('created_at',{ascending:false}).limit(25);
 if(error)throw error;
 return data||[];
}
export async function openSupportTicket(userId,topic){
 const value=String(topic||'').trim().slice(0,180);
 if(value.length<10)throw Error('Descreva o problema com pelo menos 10 caracteres.');
 const {data,error}=await db.from('lx_support_tickets').insert({user_id:userId,topic:value,status:'open'}).select('id').single();
 if(error)throw error;
 return data;
}
