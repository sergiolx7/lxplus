import {icon} from './ui.js';
import {lx5QuickNavigation,lx5HomeIntro,lx5EmptyHero,lx5HomeAside,lx5CommunityActivity} from './lx5-design.js';
import {resumeProgress} from './nexus-ui.js';
import {readDisplay} from './display-preferences.js';
import {cinemaOriginalPoster} from './cinema-original-poster.js';
import {orbitDiscovery} from './orbit-ui.js';
// LX Plus Premium: UI-only view helpers. No network calls or privileged credentials.
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isCinema=x=>['Filme','Série','Dorama','Anime'].includes(x?.type);
const mediaUrl=s=>{if(!String(s||'').trim())return '';try{const u=new URL(String(s),location.origin);return !u.username&&!u.password&&(u.protocol==='https:'||u.protocol==='http:'&&u.origin===location.origin)?u.href:''}catch{return ''}};
const fmtKind=x=>String(x||'Conteúdo');
const safeTitle=x=>html(x?.title||'Sem título');
const setItem=x=>html(String(x?.id??''));
function poster(x,variant='poster'){
 const url=mediaUrl(variant==='landscape'?(x.bannerDesktop||x.banner||x.cover):(x.cover||x.banner));
 const fit=variant==='landscape'&&!x.banner&&!x.bannerDesktop?' poster-letterbox':'';
 return '<div class="premium-cover '+(variant==='landscape'?'landscape':'portrait')+fit+'">'+
 ''+
 (url?'<img width="'+(variant==='landscape'?640:320)+'" height="'+(variant==='landscape'?360:480)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+html(url)+'" alt="">':cinemaOriginalPoster(x,variant==='landscape'))+
 '<div class="premium-image-shade"></div>'+(x.metadataOnly||x.catalogOnly||x.availability==='coming_soon'?'<span class="lx-cinema-coming-badge">EM BREVE</span>':'<span class="premium-play">▶</span>')+'</div>';
}
export function premiumCard(x,variant='poster',history=null){
 if(x?.type==='Música'){
  const url=mediaUrl(x.cover);
  return '<button class="premium-card music-result" type="button" data-item="'+setItem(x)+'" aria-label="Abrir '+safeTitle(x)+'"><span class="music-result-cover">'+(url?'<img width="48" height="48" loading="lazy" decoding="async" src="'+html(url)+'" alt="">':'<span aria-hidden="true">♫</span>')+'</span><span class="music-result-copy"><strong>'+safeTitle(x)+'</strong><small>'+html(x.artist||'Artista não informado')+'</small><small class="music-result-album">'+html(x.album||x.genre||'Música')+'</small></span><span class="music-result-play" aria-hidden="true">▶</span></button>';
 }
 const progress=resumeProgress(history);
 return '<button class="premium-card '+(variant==='landscape'?'wide':'')+'" type="button" data-item="'+setItem(x)+'" aria-label="Abrir '+safeTitle(x)+'">'+poster(x,variant)+(progress?'<span class="nexus-resume-progress" aria-hidden="true"><i style="width:'+progress.percent+'%"></i></span>':'')+
 '<div class="premium-card-copy"><strong>'+safeTitle(x)+'</strong><small>'+html(progress?progress.remaining+' min restantes':[x.year,x.genre||x.type].filter(Boolean).join(' · '))+'</small></div></button>';
}
function row(title,subtitle,items,key,variant='poster',history={}){
 const picks=(items||[]).filter(Boolean).slice(0,readDisplay().performance==='light'?8:16);
 if(!picks.length)return '';
 return '<section class="premium-section" aria-label="'+html(title)+'"><div class="premium-row-title"><div><span class="premium-overline">'+html(subtitle)+'</span><h2>'+html(title)+'</h2></div><div class="rail-actions"><button data-scroll="'+html(key)+'" data-direction="-1" aria-label="Voltar '+html(title)+'">‹</button><button data-scroll="'+html(key)+'" data-direction="1" aria-label="Avançar '+html(title)+'">›</button></div></div>'+
 '<div class="premium-rail" data-rail="'+html(key)+'">'+picks.map(x=>premiumCard(x,variant,history[String(x.id)])).join('')+'</div></section>';
}
function feature(item,eager=true){
 if(!item)return lx5EmptyHero();
 const coming=item.metadataOnly||item.catalogOnly||item.availability==='coming_soon';
 const light=readDisplay().performance==='light',url=light?'':mediaUrl(item.bannerDesktop||item.banner||item.cover),mobile=light?'':mediaUrl(item.bannerMobile),position=Math.max(0,Math.min(100,Number(item.focalX)||50));
 return '<section class="premium-feature"><div class="premium-feature-image">'+(url?'<picture>'+(mobile?'<source media="(max-width:600px)" srcset="'+html(mobile)+'">':'')+'<img src="'+html(url)+'" style="object-position:'+position+'% center" alt="" loading="'+(eager?'eager':'lazy')+'" fetchpriority="'+(eager?'high':'low')+'" referrerpolicy="no-referrer"></picture>':'')+'</div><div class="premium-feature-grad"></div>'+
 '<div class="premium-feature-text"><span class="lx5-live-tag">✦ DESTAQUE DA LX PLUS</span><h2>'+safeTitle(item)+'</h2><p>'+html((item.description||item.desc||'Descubra uma nova história na LX Plus.').slice(0,230))+'</p><div class="premium-meta"><span>'+html(item.year||'Destaque')+'</span><span>'+html(fmtKind(item.type))+'</span><span>Na LX Plus</span></div>'+
 '<div class="premium-feature-actions">'+(coming?'<button class="btn primary" data-item="'+setItem(item)+'">✦ Em breve · ver detalhes</button>':'<button class="btn primary" data-play="'+setItem(item)+'">'+icon('play')+' Assistir agora</button>')+'<button class="btn premium-secondary" data-item="'+setItem(item)+'">'+icon('plus')+' Ver detalhes</button></div></div><span class="premium-feature-bottom">CINEMA · NO SEU UNIVERSO</span></section>';
}
function categoryStats(items){
 const labels=[['Filmes','Filme','▣'],['Séries','Série','▤']];
 return '<section class="premium-quick">' + labels.map(([page,kind,icon])=>{
 const n=items.filter(x=>x.type===kind || (page==='Séries'&&['Dorama','Anime'].includes(x.type))).length;
 return '<button class="premium-quick-tile" data-page="'+page+'"><span class="quick-icon">'+icon+'</span><span><strong>'+page+'</strong><small>'+(n?'Explore os títulos':'Novos títulos em breve')+'</small></span><i>↗</i></button>';
 }).join('')+'</section>';
}
function home({items,history,list,musicHistory={},members=[],presence=[],profile={},overview=null}){
 const current=(items||[]).filter(isCinema),withArt=current.filter(x=>x.banner||x.cover);
 const fav=new Set((list||[]).map(String));
 const seen=Object.entries(history||{}).filter(([,h])=>h?.position>0&&(!h.duration||h.position<h.duration-15)).sort((a,b)=>String(b[1]?.updatedAt||'').localeCompare(String(a[1]?.updatedAt||'')))
 .map(([k])=>current.find(x=>String(x.id)===k&&['Filme','Série','Dorama','Anime'].includes(x.type))).filter(Boolean).slice(0,10);
 const cinema=withArt.filter(x=>['Filme','Série','Dorama','Anime'].includes(x.type));
 const features=[...cinema.filter(x=>x.featured),...cinema.filter(x=>x.banner),...cinema].filter((x,i,a)=>a.findIndex(y=>String(y.id)===String(x.id))===i).slice(0,4);
 const carousel=features.length>1?'<section class="home-carousel" data-home-carousel role="region" aria-roledescription="carrossel" aria-label="Destaques da LX Plus" tabindex="0">'+features.map((x,i)=>'<div data-hero-slide '+(i?'hidden':'')+' role="group" aria-roledescription="slide" aria-label="'+(i+1)+' de '+features.length+'">'+feature(x,i===0)+'</div>').join('')+'<div class="home-carousel-controls"><span data-hero-status aria-live="off">1 de '+features.length+'</span><div class="home-carousel-dots">'+features.map((x,i)=>'<button data-hero-index="'+i+'" aria-label="Destaque '+(i+1)+': '+safeTitle(x)+'" aria-current="'+(i===0)+'"></button>').join('')+'</div><button data-hero-step="-1" aria-label="Destaque anterior">'+icon('arrow')+'</button><button data-hero-step="1" aria-label="Próximo destaque">'+icon('arrow')+'</button><button data-hero-pause aria-label="Pausar destaques" aria-pressed="false">'+icon('pause')+'</button></div></section>':feature(features[0]);
 const recent=[...current].sort((a,b)=>String(b.updatedAt||b.importedAt||'').localeCompare(String(a.updatedAt||a.importedAt||''))).filter(x=>x.cover||x.banner).slice(0,22);
 const movies=current.filter(x=>x.type==='Filme'), shows=current.filter(x=>['Série','Dorama','Anime'].includes(x.type));
 const favorites=current.filter(x=>fav.has(String(x.id)));
 const preferredGenres=new Set(current.filter(x=>history[String(x.id)]).map(x=>x.genre).filter(Boolean));
 const unseen=current.filter(x=>!history[String(x.id)]),personalized=unseen.filter(x=>preferredGenres.has(x.genre));
 const recommendations=(personalized.length?personalized:unseen).slice(0,16);
 const selected=current.filter(x=>x.topRank||x.featured||x.trending).sort((a,b)=>(Number(a.topRank)||99)-(Number(b.topRank)||99)||Number(b.priority||0)-Number(a.priority||0));
 const top=[...selected,...current.filter(x=>!selected.includes(x))].slice(0,10);
 const sections={
 continue:row('Continue de onde parou','SEU PRÓXIMO PLAY',seen,'continue','landscape',history),
 recommended:row('Recomendados para você','COM BASE NAS SUAS DESCOBERTAS',recommendations,'recommended'),
 top:topTen(top),recent:row('Novidades do catálogo','SELEÇÃO DA LX PLUS',recent,'recent','landscape'),
 saved:row('Sua lista','SALVOS PARA VOCÊ',favorites,'saved'),movies:row('Filmes para explorar','CINEMA',movies,'movies'),series:row('Séries em destaque','TEMPORADAS E HISTÓRIAS',shows.filter(x=>x.type==='Série'),'series')+row('Seu próximo dorama','HISTÓRIAS PARA SE APAIXONAR',shows.filter(x=>x.type==='Dorama'),'doramas')+row('Universos de anime','OUTRAS DIMENSÕES',shows.filter(x=>x.type==='Anime'),'animes')
 };
 return lx5HomeIntro(profile)+'<div class="lx5-home-stage">'+carousel+'</div>'+lx5QuickNavigation()+'<div class="lx5-home-layout"><div class="lx5-home-main">'+readDisplay().homeOrder.map(id=>sections[id]).join('')+homeMusic(items||[],musicHistory)+orbitDiscovery()+'</div>'+lx5HomeAside({items,musicHistory,members,presence,overview,profile})+'</div>'+lx5CommunityActivity(overview)+'<section class="home-discover-strip lx5-discover-strip"><div><span class="premium-overline">SEU ESTILO TEM ESPAÇO AQUI</span><h2>Seu universo. Sua assinatura.</h2><p>Decorações, avatares e experiências que combinam com você.</p></div><button class="btn primary" data-page="Premium">Explorar o LX Premium '+icon('sparkles')+'</button></section>';

}

function homeMusic(items,history){
 const tracks=items.filter(x=>x.type==='Música'&&x.title&&mediaUrl(x.cover));if(!tracks.length)return '';
 const recent=Object.entries(history||{}).sort((a,b)=>String(b[1]).localeCompare(String(a[1]))).map(([id])=>tracks.find(x=>String(x.id)===id)).filter(Boolean);
 const musicRow=(title,rows,key)=>!rows.length?'':'<section class="premium-section home-music-section"><div class="premium-row-title"><div><span class="premium-overline">LX MUSIC</span><h2>'+title+'</h2></div><button class="link" data-page="Músicas">Abrir biblioteca ↗</button></div><div class="premium-rail home-music-rail" data-rail="'+key+'">'+rows.slice(0,12).map(x=>'<button class="home-music-card" data-play="'+setItem(x)+'" aria-label="Ouvir '+safeTitle(x)+'"><span><img src="'+html(mediaUrl(x.cover))+'" alt="" width="180" height="180" loading="lazy" decoding="async"><i aria-hidden="true">▶</i></span><strong>'+safeTitle(x)+'</strong><small>'+html(x.artist||'LX Music')+'</small></button>').join('')+'</div></section>';
 const albums=[...new Map(tracks.filter(x=>x.album).map(x=>[x.album+'|'+x.artist,x])).values()].slice(0,6);
 return musicRow('Continue ouvindo',recent,'music-recent')+musicRow('Mais música para o seu dia',tracks,'music-home')+(albums.length?'<section class="home-albums"><h2>Álbuns para descobrir</h2><div>'+albums.map(x=>'<button data-home-search="'+html(x.album)+'"><img src="'+html(mediaUrl(x.cover))+'" alt="" loading="lazy" width="64" height="64"><span><strong>'+html(x.album)+'</strong><small>'+html(x.artist||'LX Music')+'</small></span></button>').join('')+'</div></section>':'');
}
export function homeConnections(members=[],presence=[]){
 const visible=presence.filter(p=>p.status==='online'&&Date.now()-Date.parse(p.updated_at)<90000).map(p=>members.find(m=>m.user_id===p.user_id&&m.relation==='accepted')).filter(Boolean).slice(0,8);
 return '<section class="home-connections"><div><span class="premium-overline">SEU CÍRCULO LX</span><h2>Boas conexões, por perto.</h2><p>Uma conversa, uma indicação, um novo favorito.</p><button class="btn" data-page="Comunidade">Abrir comunidade ↗</button></div><div class="home-friend-list">'+(visible.length?visible.map(p=>'<button data-home-member="'+html(p.user_id)+'"><span class="home-friend-avatar">'+html((p.name||'LX').slice(0,1))+'<i></i></span><strong>'+html(p.name)+'</strong><small>Online</small></button>').join(''):'<span class="home-connections-empty">Os amigos que compartilham presença aparecem aqui quando estiverem online.</span>')+'</div></section>';
}

function topTen(items){
 if(!items.length)return '';
 return '<section class="premium-section top-ten-section" aria-label="Top 10 da LX Plus"><div class="premium-row-title"><div><span class="premium-overline">SELEÇÃO LX · CINEMA</span><h2>Top 10 da LX Plus</h2><p>Seleção editorial · '+items.length+' '+(items.length===1?'título selecionado':'títulos selecionados')+'.</p></div><div class="top-ten-header-actions"><button class="btn small" type="button" data-share-top aria-label="Compartilhar a seleção Top 10 da LX Plus">↗ Compartilhar</button><div class="rail-actions"><button data-scroll="top-ten" data-direction="-1" aria-label="Voltar Top 10">‹</button><button data-scroll="top-ten" data-direction="1" aria-label="Avançar Top 10">›</button></div></div></div><div class="premium-rail top-ten-rail" data-rail="top-ten">'+items.map((item,i)=>'<article class="top-ten-item"><span class="top-ten-number" aria-hidden="true">'+(i+1)+'</span>'+premiumCard(item)+'<button class="top-ten-share" type="button" data-share-item="'+setItem(item)+'" aria-label="Compartilhar '+safeTitle(item)+'">↗ Compartilhar</button></article>').join('')+'</div></section>';
}
function listing({items,page,filter,term}){
 const options=['Todos','Filme','Série','Dorama','Anime','Música','Livro'];
 return '<div class="premium-listing-head"><span class="premium-overline">EXPLORE O UNIVERSO LX</span><h1>'+html(term?'Resultados para “'+term+'”':page)+'</h1><p>'+items.length+' resultados · Escolha o que combina com seu momento.</p></div>'+
 '<div class="filters premium-filters">'+options.map(x=>'<button type="button" class="chip '+(filter===x?'active':'')+'" data-filter="'+html(x)+'">'+html(x)+'</button>').join('')+'</div>'+
 (items.length?'<div class="premium-grid">'+items.slice(0,100).map(x=>premiumCard(x)).join('')+'</div>'+(items.length>100?'<p class="muted premium-result-note">Mostrando os primeiros 100 resultados. Refine sua busca para localizar outros títulos.</p>':''):'<div class="panel premium-empty"><h2>Nenhum resultado encontrado</h2><p>Tente outra palavra ou categoria.</p><button id="clear" class="btn">Limpar pesquisa</button></div>');
}
export function renderPremiumCatalog({items,page,filter='Todos',term='',history={},list=[],musicHistory={},members=[],presence=[],profile={},overview=null,catalogStatus='ready'}={}){
 if(catalogStatus==='loading'&&!items?.length)return '<div class="premium-skeleton"><div class="premium-skeleton-feature"></div><div class="premium-skeleton-row"></div><div class="premium-skeleton-row"></div><p>Preparando sua biblioteca LX Plus…</p></div>';
 if(catalogStatus==='error'&&!items?.length)return '<div class="premium-listing-head"><h1>Catálogo indisponível</h1><p>Seu login continua conectado; os títulos não responderam.</p><button class="btn primary" id="retryCatalog">Tentar novamente</button></div>';
 if(page==='Início'&&!term)return home({items,history,list,musicHistory,members,presence,profile,overview});
 return listing({items,page,filter,term});
}
