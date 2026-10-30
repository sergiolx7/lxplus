import {attachPlayer} from './universal-player.js';
import {MusicQueue} from './music-queue.js';
import {esc,https} from './ui.js';
export class MusicDock {
 constructor({resolve,onError=()=>{},onTrack=()=>{},onListening=()=>{}}){this.resolve=resolve;this.onError=onError;this.onTrack=onTrack;this.onListening=onListening;this.queue=new MusicQueue();this.element=null;this.cleanup=null;this.request=0;this.timer=null;this.current=null}
 get tracks(){return this.queue.items}get index(){return this.queue.index}
 ensure(){
  if(this.element?.isConnected)return this.element;
  const el=document.createElement('section');el.id='lxMusicDock';el.className='lx-music-dock';el.setAttribute('aria-label','LX Music — reprodução atual');
  el.innerHTML='<div class="music-dock-cover" id="lxDockCover">LX</div><div class="music-dock-main"><strong id="lxDockTitle">LX Music</strong><small id="lxDockArtist"></small><div id="lxDockMedia"></div><span id="lxDockStatus" role="status" class="music-dock-status"></span></div><div class="music-dock-actions"><button data-music-action="shuffle" aria-label="Ativar modo aleatório" aria-pressed="false">⤨</button><button data-music-action="back" aria-label="Música anterior">⏮</button><button data-music-action="next" aria-label="Próxima música">⏭</button><button data-music-action="repeat" aria-label="Alternar repetição">↻</button><button data-music-action="queue" aria-label="Mostrar fila">☷</button><button data-music-action="close" aria-label="Fechar LX Music">✕</button></div><div id="lxDockQueue" class="dock-queue" hidden></div>';
  el.addEventListener('click',async e=>{
   const button=e.target.closest('button');if(!button)return;
   try{
    const action=button.dataset.musicAction;
    if(action==='close'){this.close();return}
    if(action==='next'||action==='back'){await this.step(action==='back'?-1:1);return}
    if(action==='shuffle'){this.queue.shuffle=!this.queue.shuffle;button.setAttribute('aria-pressed',String(this.queue.shuffle));return}
    if(action==='repeat'){this.queue.repeat={off:'all',all:'one',one:'off'}[this.queue.repeat];button.textContent=this.queue.repeat==='one'?'↻1':'↻';button.setAttribute('aria-label','Repetição: '+({off:'desligada',all:'toda a fila',one:'uma faixa'}[this.queue.repeat]));button.classList.toggle('active',this.queue.repeat!=='off');return}
    if(action==='queue'){const box=el.querySelector('#lxDockQueue');box.hidden=!box.hidden;this.renderQueue();return}
    if(button.dataset.queueIndex!==undefined){const index=Number(button.dataset.queueIndex),item=this.tracks[index];if(item){const source=await this.resolve(item);this.queue.previous.push(this.index);this.queue.index=index;await this.load(item,source)}}
   }catch(error){this.onError(error.message||'Não foi possível mudar a faixa.')}
  });
  document.body.appendChild(el);document.body.classList.add('has-music-dock');this.element=el;return el;
 }
 renderQueue(){if(this.element)this.element.querySelector('#lxDockQueue').innerHTML='<strong>Fila de reprodução · '+this.tracks.length+' faixas</strong>'+this.tracks.slice(0,100).map((x,i)=>'<button data-queue-index="'+i+'" class="'+(i===this.index?'active':'')+'">'+esc(x.title)+'<small>'+esc(x.artist||'')+'</small></button>').join('')}
 async open(item,source,queue=[]){this.queue.set(queue.filter(x=>x?.type==='Música'),item);await this.load(item,source)}
 async load(item,source){
  if(!['audio','hls','dash','iframe'].includes(source?.kind))throw Error(source?.message||'Esta faixa precisa de uma fonte de áudio ou incorporação oficial.');
  const request=++this.request,el=this.ensure();clearTimeout(this.timer);if(this.cleanup){this.cleanup();this.cleanup=null}
  this.current=item;el.querySelector('#lxDockTitle').textContent=item.title||'LX Music';el.querySelector('#lxDockArtist').textContent=item.artist||item.album||'LX Music';
  const cover=https(item.cover);el.querySelector('#lxDockCover').innerHTML=cover?'<img src="'+esc(cover)+'" alt="">':'LX';
  const status=el.querySelector('#lxDockStatus');status.textContent='Preparando faixa…';
  const area=el.querySelector('#lxDockMedia');area.replaceChildren();
  if(source.kind==='iframe'){
   const frame=document.createElement('iframe');frame.src=source.url;frame.title=item.title+' — '+source.provider;frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';frame.className='music-official-embed';area.appendChild(frame);
   status.textContent='Use os controles oficiais de '+source.provider+'.';
   this.cleanup=()=>frame.remove();this.onTrack(item,{embedded:true});this.renderQueue();return;
  }
  const audio=document.createElement('audio');audio.id='lxDockAudio';audio.controls=true;audio.preload='metadata';audio.setAttribute('aria-label','Controles de reprodução musical');area.appendChild(audio);
  let started=false,listened=0,lastTick=performance.now(),lastReport=0;
  const setStatus=message=>{if(request===this.request)status.textContent=message};
  const fail=message=>{clearTimeout(this.timer);setStatus(message);this.onError(message)};
  audio.addEventListener('loadedmetadata',()=>setStatus(''));
  audio.addEventListener('playing',()=>{started=true;lastTick=performance.now();clearTimeout(this.timer);setStatus('')});
  audio.addEventListener('waiting',()=>{setStatus('Aguardando a conexão…');clearTimeout(this.timer);this.timer=setTimeout(()=>{audio.pause();fail('O áudio demorou para responder. Tente outra faixa ou verifique a origem.')},20000)});
  audio.addEventListener('timeupdate',()=>{const now=performance.now();if(started&&!audio.paused&&!audio.seeking)listened+=Math.min(2,(now-lastTick)/1000);lastTick=now;if(listened-lastReport>=15){lastReport=listened;this.onListening(item,Math.floor(listened))}});
  audio.addEventListener('ended',()=>{this.onListening(item,Math.floor(listened));this.step(1,{ended:true}).catch(e=>this.onError(e.message))});
  this.timer=setTimeout(()=>{audio.pause();fail('Não foi possível iniciar este áudio em 20 segundos. Confira o arquivo e as permissões.')},20000);
  try{
   const cleanup=await attachPlayer(audio,source,{onError:fail});
   if(request!==this.request){cleanup();return}this.cleanup=cleanup;
   if(audio.paused){clearTimeout(this.timer);setStatus('Toque em reproduzir para começar.')}
   this.onTrack(item,{embedded:false});
   if('mediaSession' in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:item.title,artist:item.artist||'LX Music',album:item.album||'',artwork:cover?[{src:cover}]:[]});for(const [action,handler] of Object.entries({nexttrack:()=>this.step(1).catch(this.onError),previoustrack:()=>this.step(-1).catch(this.onError),play:()=>audio.play().catch(this.onError),pause:()=>audio.pause()}))navigator.mediaSession.setActionHandler(action,handler)}catch{}}
  }catch(error){clearTimeout(this.timer);setStatus(error.message);throw error}
  this.renderQueue();
 }
 async step(direction,{ended=false}={}){
  const previous=this.queue.index,item=direction<0?this.queue.back():this.queue.next({ended});
  if(!item){const status=this.element?.querySelector('#lxDockStatus');if(status)status.textContent='Fim da fila. Escolha outra faixa para continuar.';return}
  try{const source=await this.resolve(item);await this.load(item,source)}catch(error){this.queue.index=previous;throw error}
 }
 close(){++this.request;clearTimeout(this.timer);if(this.cleanup){this.cleanup();this.cleanup=null}this.element?.remove();this.element=null;this.current=null;document.body.classList.remove('has-music-dock');if('mediaSession' in navigator){try{navigator.mediaSession.metadata=null;for(const a of ['play','pause','nexttrack','previoustrack'])navigator.mediaSession.setActionHandler(a,null)}catch{}}}
}
