import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';
import {BACKEND} from './config.js';

export const db=createClient(BACKEND.url,BACKEND.key,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'lxplus-auth-token'}
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
 if(item.type==='Livro'){
  const u=safeUrl(item.externalReadUrl||'');
  return u?{kind:'external',url:u}:{kind:'unavailable'};
 }
 const audio=item.type==='Música';
 const allowed=safeUrl(audio?item.authorizedAudioUrl:item.authorizedVideoUrl);
 if(allowed)return{kind:audio?'audio':'video',url:allowed};
 const native=item.nativeAsset;
 const path=typeof native==='string'?native:(native?.url||native?.path||native?.storagePath||'');
 if(safeUrl(path))return{kind:audio?'audio':'video',url:safeUrl(path)};
 if(typeof path==='string'&&path.startsWith('cloud:')){
  const {data,error}=await db.storage.from(BACKEND.mediaBucket).createSignedUrl(path.slice(6).replace(/^\/+/,''),3600);
  if(!error&&data?.signedUrl)return{kind:audio?'audio':'video',url:data.signedUrl};
 }
 // External links only when the record explicitly indicates authorized or public-domain origin.
 if(item.publicDomain||item.openFilm||item.sourceVerified||item.officialEmbedded||item.license?.authorized){
  const external=safeUrl(item.sourceUrl||item.externalMusicUrl||item.spotifyUrl||'');
  if(external)return{kind:'external',url:external};
 }
 return{kind:'unavailable'};
}
