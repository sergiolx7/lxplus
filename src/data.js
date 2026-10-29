import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';
import {BACKEND} from './config.js';
import {resolveItem} from './universal-player.js';

export const db=createClient(BACKEND.url,BACKEND.key,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
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
 const {data,error}=await db.from('lx_profiles').select('user_id,name,approved,approval_status,verified,bio,avatar_url,ranking_visible').eq('user_id',id).maybeSingle();
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
 const {data,error}=await db.from('lx_profiles').select('user_id,name,verified,bio').eq('ranking_visible',true).limit(35);
 return error?[]:data;
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
