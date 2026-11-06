import {esc,icon,duration} from './ui.js';

// Presentation uses only the supplied catalogue and the member's own history.
// A discovery selection is never labelled as the player's actual queue.
export function nexusArtwork(value){
 if(!String(value||'').trim())return '';
 try{const u=new URL(String(value),globalThis.location?.origin);return !u.username&&!u.password&&(u.protocol==='https:'||u.protocol==='http:'&&u.origin===globalThis.location?.origin)?u.href:''}catch{return ''}
}
export function musicFeatureSelection(items=[],history={}){
 const tracks=items.filter(x=>x?.type==='Música'&&x.id!==null&&x.id!==undefined);
 const recent=tracks.filter(x=>history[String(x.id)]).sort((a,b)=>String(history[String(b.id)]).localeCompare(String(history[String(a.id)])));
 const featured=recent[0]||tracks.find(x=>x.featured&&nexusArtwork(x.cover))||tracks.find(x=>nexusArtwork(x.cover))||tracks[0]||null;
 return {featured,selection:tracks.filter(x=>String(x.id)!==String(featured?.id)).slice(0,3)};
}
const cover=(track,cls='')=>'<span class="nexus-track-art '+cls+'">'+(nexusArtwork(track?.cover)?'<img src="'+esc(nexusArtwork(track.cover))+'" width="240" height="240" alt="" loading="lazy" decoding="async">':icon('music'))+'</span>';
export function nexusMusicFeature(items=[],history={}){
 const {featured,selection}=musicFeatureSelection(items,history);
 const heading='<header class="nexus-music-heading"><div><span class="premium-overline">LX MUSIC</span><h1>Sua trilha, seu momento.</h1></div><button type="button" class="btn" data-new-playlist>'+icon('plus')+' Criar playlist</button></header>';
 if(!featured)return heading+'<section class="nexus-music-stage nexus-music-empty"><div><span class="premium-overline">DÊ PLAY NO SEU DIA</span><h2>Um lugar para cada som.</h2><p>Suas músicas, álbuns e playlists se encontram aqui.</p><button type="button" class="btn" data-music-tab="Buscar">'+icon('search')+' Explorar biblioteca</button></div></section>';
 return heading+'<div class="nexus-music-stage"><section class="nexus-music-feature">'+cover(featured,'nexus-feature-cover')+'<div class="nexus-feature-copy"><span class="premium-overline">'+(history[String(featured.id)]?'VOLTE PARA O SEU SOM':'NA SUA BIBLIOTECA')+'</span><h2>'+esc(featured.title||'Sua próxima faixa')+'</h2><p>'+esc(featured.artist||'LX Music')+'</p>'+(featured.album?'<small>'+esc(featured.album)+'</small>':'')+'<div class="actions"><button type="button" class="btn music-primary" data-track="'+esc(featured.id)+'">'+icon('play')+' Reproduzir</button><button type="button" class="btn ghost" data-music-tab="Mix">'+icon('shuffle')+' Seu Mix</button></div></div></section>'+(selection.length?'<section class="nexus-music-selection" aria-label="Mais músicas na sua seleção"><div class="heading"><h3>Na sua seleção</h3>'+icon('music')+'</div>'+selection.map(x=>'<button type="button" class="nexus-selection-track" data-track="'+esc(x.id)+'">'+cover(x)+'<span><strong>'+esc(x.title)+'</strong><small>'+esc(x.artist||'LX Music')+'</small></span><time>'+((Number(x.duration)>0)?duration(x.duration):'')+'</time><i aria-hidden="true">'+icon('play')+'</i></button>').join('')+'</section>':'')+'</div>';
}
export function nexusHomeMusic(items=[],history={}){
 const {featured}=musicFeatureSelection(items,history);
 if(!featured)return '';
 return '<aside class="nexus-home-music"><div class="nexus-home-music-art">'+(nexusArtwork(featured.cover)?'<img src="'+esc(nexusArtwork(featured.cover))+'" alt="" width="360" height="480" loading="lazy" decoding="async">':'')+'</div><div><span class="premium-overline">MÚSICA · NO SEU RITMO</span><h2>Seu dia pede<br>um novo som.</h2><p>'+esc(featured.title)+'</p><small>'+esc(featured.artist||'LX Music')+'</small><div class="actions"><button type="button" class="nexus-round-play" data-play="'+esc(featured.id)+'" aria-label="Ouvir '+esc(featured.title)+'">'+icon('play')+'</button><button type="button" class="link" data-page="Músicas">Explorar música '+icon('arrow')+'</button></div></div></aside>';
}
export function resumeProgress(history){
 const position=Number(history?.position),total=Number(history?.duration);
 if(!Number.isFinite(position)||!Number.isFinite(total)||position<=0||total<=0)return null;
 return {percent:Math.max(0,Math.min(100,position/total*100)),remaining:Math.max(0,Math.ceil((total-position)/60))};
}
