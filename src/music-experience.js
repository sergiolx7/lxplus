import {esc,https,icon} from './ui.js';
import {featuredMusicShelves} from './music-organize.js';
import {listeningMarkup} from './music-friend-activity.js';
const tabIcon={'Início':'home','Buscar':'search','Playlists':'list','Álbuns':'music','Artistas':'user','Curtidas':'heart','Recentes':'clock','Mix':'shuffle','Retrospectiva':'chart'};
export const musicTabs=['Início','Buscar','Playlists','Álbuns','Artistas','Curtidas','Recentes','Mix','Retrospectiva'];
const artwork=(cover,alt='')=>https(cover)?'<img loading="lazy" src="'+esc(cover)+'" alt="'+esc(alt)+'">':'<span class="lx-music-art-fallback">'+icon('music')+'</span>';
function albumTile(group,kind='album'){
 return '<button class="lx-music-album-tile" data-music-group="'+esc(group.name)+'" data-group-key="'+kind+'" data-group-artist="'+esc(group.artist||'')+'"><span class="lx-music-album-art '+(kind==='artist'?'is-artist':'')+'">'+artwork(group.cover)+'</span><strong>'+esc(group.name)+'</strong><small>'+(kind==='album'&&group.artist?esc(group.artist)+' · ':'')+group.count+' faixas</small></button>';
}
const trackTile=item=>'<button class="lx-music-mini-track" data-track="'+esc(item.id)+'">'+artwork(item.cover)+'<span><strong>'+esc(item.title)+'</strong><small>'+esc(item.artist||'Artista não informado')+'</small></span><span class="lx-mini-play">▶</span></button>';
export function musicSidebar({active='Início',playlists=[]}={}){
 return '<aside class="lx-music-nav" aria-label="Biblioteca LX Music"><div class="lx-music-nav-brand"><span>♫</span><div><strong>LX MUSIC</strong><small>Seu universo musical</small></div></div><p class="lx-music-nav-label">EXPLORAR</p><nav>'+musicTabs.map(t=>'<button data-music-tab="'+esc(t)+'" aria-current="'+(t===active?'page':'false')+'">'+icon(tabIcon[t]||'music')+'<span>'+esc(t)+'</span></button>').join('')+'</nav><div class="lx-music-nav-lists"><div><strong>SUAS PLAYLISTS</strong><button type="button" data-new-playlist aria-label="Criar playlist">+</button></div>'+playlists.slice(0,12).map(p=>'<button data-playlist="'+esc(p.id)+'">'+icon('music')+' '+esc(p.name)+'</button>').join('')+(!playlists.length?'<small>Crie a sua primeira playlist</small>':'')+'</div></aside>';
}
export function musicHomeShelves(tracks,history,likes){
 const shelves=featuredMusicShelves(tracks,history,likes),rows=[];
 const section=(title,note,button,label)=>'<div class="lx-music-shelf-heading"><div><h2>'+title+'</h2><small>'+note+'</small></div>'+(button?'<button class="link" data-music-tab="'+button+'">'+(label||'Ver tudo')+' →</button>':'')+'</div>';
 if(shelves.recent.length)rows.push('<section class="lx-music-shelf">'+section('Volte para o seu som','Continue de onde parou','Recentes')+'<div class="lx-music-mini-grid">'+shelves.recent.slice(0,6).map(trackTile).join('')+'</div></section>');
 if(shelves.albums.length)rows.push('<section class="lx-music-shelf">'+section('Álbuns na sua biblioteca','Organizados por artista e lançamento','Álbuns')+'<div class="lx-music-album-grid">'+shelves.albums.slice(0,6).map(x=>albumTile(x)).join('')+'</div></section>');
 if(shelves.artists.length)rows.push('<section class="lx-music-shelf">'+section('Seus artistas','Explore as músicas de cada artista','Artistas')+'<div class="lx-music-album-grid">'+shelves.artists.slice(0,6).map(x=>albumTile(x,'artist')).join('')+'</div></section>');
 if(shelves.favorites.length)rows.push('<section class="lx-music-shelf">'+section('Você curtiu','As faixas que marcaram seu dia','Curtidas')+'<div class="lx-music-mini-grid">'+shelves.favorites.slice(0,6).map(trackTile).join('')+'</div></section>');
 return rows.join('');
}
export function friendListeningShelf(friends=[]){
 if(!friends.length)return '';
 return '<section class="lx-music-shelf lx-friends-listening"><div class="lx-music-shelf-heading"><div><h2>Seus amigos estão ouvindo</h2><small>Somente quem permitiu compartilhar a atividade</small></div></div><div class="lx-music-friend-list">'+friends.slice(0,8).map(({person,activity})=>'<article class="lx-music-friend-item"><strong>'+esc(person.name||person.username||'Amigo LX')+'</strong>'+listeningMarkup(activity)+'</article>').join('')+'</div></section>';
}
export function musicGroupHeading(group,rows){
 const kind=group.kind==='artist'?'Artista':'Álbum',cover=rows.find(x=>https(x.cover))?.cover;
 return '<section class="lx-music-group-hero"><button class="link" data-music-group-back>← Voltar para '+(group.kind==='artist'?'artistas':'álbuns')+'</button><div class="lx-music-group-intro"><span class="lx-music-group-art '+(group.kind==='artist'?'is-artist':'')+'">'+artwork(cover)+'</span><div><span class="premium-overline">'+kind.toUpperCase()+' · LX MUSIC</span><h1>'+esc(group.name)+'</h1><p>'+(group.kind==='album'&&group.artist?esc(group.artist)+' · ':'')+rows.length+' faixas</p><button class="btn music-primary" data-play-group '+(!rows.length?'disabled':'')+'>'+icon('play')+' Reproduzir '+(group.kind==='album'?'álbum':'artista')+'</button></div></div></section>';
}
