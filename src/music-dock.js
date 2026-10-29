import {attachPlayer} from './universal-player.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageUrl=s=>{try{const u=new URL(String(s||''));return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const playable=k=>['audio','hls','dash'].includes(k);
export class MusicDock {
 constructor({resolve,onError=()=>{}}){
  this.resolve=resolve;this.onError=onError;
  this.tracks=[];this.index=-1;this.element=null;this.cleanup=null;this.request=0;
 }
 ensure(){
  if(this.element?.isConnected)return this.element;
  const el=document.createElement('section');
  el.id='lxMusicDock';el.className='lx-music-dock';el.setAttribute('aria-label','LX Music — reprodução atual');
  el.innerHTML='<div class="music-dock-cover" id="lxDockCover"><span>LX</span></div>'+
    '<div class="music-dock-main"><strong id="lxDockTitle">LX Music</strong><small id="lxDockArtist">Pronto para ouvir</small><audio id="lxDockAudio" controls preload="metadata" aria-label="Controles de reprodução musical"></audio><span id="lxDockStatus" class="music-dock-status" role="status" aria-live="polite"></span></div>'+
    '<div class="music-dock-actions"><button type="button" data-music-step="-1" aria-label="Música anterior" title="Anterior">⏮</button><button type="button" data-music-step="1" aria-label="Próxima música" title="Próxima">⏭</button><button type="button" data-music-close aria-label="Fechar LX Music" title="Fechar">✕</button></div>';
  el.addEventListener('click',event=>{
   const b=event.target.closest('button');if(!b)return;
   if(b.dataset.musicClose!==undefined){this.close();return}
   if(b.dataset.musicStep){this.step(Number(b.dataset.musicStep)).catch(this.onError)}
  });
  document.body.appendChild(el);this.element=el;
  return el;
 }
 async open(item,source,queue=[]){
  if(!playable(source?.kind))throw Error('Esta música não possui arquivo de áudio reproduzível neste player.');
  const genre=String(item.genre||'').trim().toLowerCase();
  const list=(queue||[]).filter(x=>x?.type==='Música');
  const preferred=genre?list.filter(x=>String(x.genre||'').trim().toLowerCase()===genre):[];
  this.tracks=preferred.length>1?preferred:list;
  if(!this.tracks.some(x=>String(x.id)===String(item.id)))this.tracks=[item,...this.tracks];
  this.index=this.tracks.findIndex(x=>String(x.id)===String(item.id));
  await this.load(item,source);
 }
 async load(item,source){
  const request=++this.request;
  const el=this.ensure();
  if(this.cleanup){try{this.cleanup()}catch{}this.cleanup=null}
  const audio=el.querySelector('#lxDockAudio');
  audio.pause();audio.removeAttribute('src');audio.load();
  el.querySelector('#lxDockTitle').textContent=item.title||'Música sem título';
  el.querySelector('#lxDockArtist').textContent=item.artist||item.genre||'LX Music';
  const cover=el.querySelector('#lxDockCover'),url=imageUrl(item.cover);
  cover.textContent='';
  if(url){const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';cover.appendChild(img)}
  else{const label=document.createElement('span');label.textContent='LX';cover.appendChild(label)}
  const status=el.querySelector('#lxDockStatus');status.textContent='Carregando áudio…';
  try{
   const cleanup=await attachPlayer(audio,source,{onError:m=>{if(request===this.request)status.textContent=String(m).slice(0,190)}});
   if(request!==this.request){cleanup();return}
   this.cleanup=cleanup;
   status.textContent='';
   if('mediaSession' in navigator){
    try{
     navigator.mediaSession.metadata=new MediaMetadata({title:item.title||'LX Music',artist:item.artist||'LX Plus',artwork:url?[{src:url}]:[]});
     navigator.mediaSession.setActionHandler('nexttrack',()=>{this.step(1).catch(this.onError)});
     navigator.mediaSession.setActionHandler('previoustrack',()=>{this.step(-1).catch(this.onError)});
    }catch{}
   }
  }catch(err){if(request===this.request){status.textContent=err.message||'Não foi possível carregar este áudio.';throw err}}
 }
 async step(direction){
  if(!this.tracks.length)return;
  const next=(this.index+direction+this.tracks.length)%this.tracks.length;
  const item=this.tracks[next];
  const source=await this.resolve(item);
  if(!playable(source?.kind)){this.onError('Esta faixa não possui fonte de áudio compatível.');return}
  this.index=next;
  await this.load(item,source);
 }
 close(){
  ++this.request;
  if(this.cleanup){try{this.cleanup()}catch{}this.cleanup=null}
  const el=this.element;
  if(el){el.querySelector('audio')?.pause();el.remove()}
  this.element=null;
 }
}
