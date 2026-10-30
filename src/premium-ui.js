import {displaySizeControls,readDisplay} from './display-preferences.js';
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
 '<div class="premium-image-fallback" aria-hidden="true">LX<span>PLUS</span></div>'+
 (url?'<img width="'+(variant==='landscape'?640:320)+'" height="'+(variant==='landscape'?360:480)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+html(url)+'" alt="">':'<div class="premium-image-fallback">LX<span>PLUS</span></div>')+
 '<div class="premium-image-shade"></div><span class="premium-play">▶</span></div>';
}
export function premiumCard(x,variant='poster'){
 return '<button class="premium-card '+(variant==='landscape'?'wide':'')+'" type="button" data-item="'+setItem(x)+'" aria-label="Abrir '+safeTitle(x)+'">'+poster(x,variant)+
 '<div class="premium-card-copy"><strong>'+safeTitle(x)+'</strong><small>'+html([x.year,x.genre||x.type].filter(Boolean).join(' · '))+'</small></div></button>';
}
function row(title,subtitle,items,key,variant='poster'){
 const picks=(items||[]).filter(Boolean).slice(0,readDisplay().performance==='light'?8:16);
 if(!picks.length)return '';
 return '<section class="premium-section" aria-label="'+html(title)+'"><div class="premium-row-title"><div><span class="premium-overline">'+html(subtitle)+'</span><h2>'+html(title)+'</h2></div><div class="rail-actions"><button data-scroll="'+html(key)+'" data-direction="-1" aria-label="Voltar '+html(title)+'">‹</button><button data-scroll="'+html(key)+'" data-direction="1" aria-label="Avançar '+html(title)+'">›</button></div></div>'+
 '<div class="premium-rail" data-rail="'+html(key)+'">'+picks.map(x=>premiumCard(x,variant)).join('')+'</div></section>';
}
function feature(item){
 if(!item)return '<div class="premium-welcome"><div class="premium-overline">SEU UNIVERSO LX PLUS</div><h1>Histórias que ficam.<br>Conexões que importam.</h1><p>Descubra novas histórias, organize sua biblioteca e encontre sua comunidade.</p><div class="actions"><button class="btn primary" data-page="Séries">Explorar histórias ↗</button><button class="btn" data-page="Comunidade">Conhecer a comunidade</button></div></div>';
 const light=readDisplay().performance==='light',url=light?'':mediaUrl(item.banner||item.cover),mobile=light?'':mediaUrl(item.bannerMobile),position=Math.max(0,Math.min(100,Number(item.focalX)||50));
 return '<section class="premium-feature"><div class="premium-feature-image">'+(url?'<picture>'+(mobile?'<source media="(max-width:600px)" srcset="'+html(mobile)+'">':'')+'<img src="'+html(url)+'" style="object-position:'+position+'% center" alt="" fetchpriority="high" referrerpolicy="no-referrer"></picture>':'')+'</div><div class="premium-feature-grad"></div>'+
 '<div class="premium-feature-text"><span class="premium-overline">✦ ESCOLHA LX PLUS</span><h1>'+safeTitle(item)+'</h1><p>'+html((item.description||item.desc||'Descubra uma nova história na LX Plus.').slice(0,230))+'</p><div class="premium-meta"><span>'+html(item.year||'Destaque')+'</span><span>'+html(fmtKind(item.type))+'</span><span>Na LX Plus</span></div>'+
 '<div class="premium-feature-actions"><button class="btn primary" data-play="'+setItem(item)+'">▶ Assistir agora</button><button class="btn premium-secondary" data-item="'+setItem(item)+'">+ Ver detalhes</button></div></div><span class="premium-feature-bottom">DESENVOLVIDO PELA LX GROUP</span></section>';
}
function categoryStats(items){
 const labels=[['Filmes','Filme','▣'],['Séries','Série','▤']];
 return '<section class="premium-quick">' + labels.map(([page,kind,icon])=>{
 const n=items.filter(x=>x.type===kind || (page==='Séries'&&['Dorama','Anime'].includes(x.type))).length;
 return '<button class="premium-quick-tile" data-page="'+page+'"><span class="quick-icon">'+icon+'</span><span><strong>'+page+'</strong><small>'+(n?'Explore os títulos':'Novos títulos em breve')+'</small></span><i>↗</i></button>';
 }).join('')+'</section>';
}
function home({items,history,list}){
 const current=(items||[]).filter(isCinema),withArt=current.filter(x=>x.banner||x.cover);
 const fav=new Set((list||[]).map(String));
 const seen=Object.entries(history||{}).filter(([,h])=>h?.position>0&&(!h.duration||h.position<h.duration-15)).sort((a,b)=>String(b[1]?.updatedAt||'').localeCompare(String(a[1]?.updatedAt||'')))
 .map(([k])=>current.find(x=>String(x.id)===k&&['Filme','Série','Dorama','Anime'].includes(x.type))).filter(Boolean).slice(0,10);
 const cinema=withArt.filter(x=>['Filme','Série','Dorama','Anime'].includes(x.type));
 const featured=cinema.find(x=>x.featured&&x.banner)||cinema.find(x=>x.banner)||cinema[0];
 const recent=[...current].sort((a,b)=>String(b.updatedAt||b.importedAt||'').localeCompare(String(a.updatedAt||a.importedAt||''))).filter(x=>x.cover||x.banner).slice(0,22);
 const movies=current.filter(x=>x.type==='Filme'), shows=current.filter(x=>['Série','Dorama','Anime'].includes(x.type));
 const favorites=current.filter(x=>fav.has(String(x.id)));
 const preferredGenres=new Set(current.filter(x=>history[String(x.id)]).map(x=>x.genre).filter(Boolean));
 const unseen=current.filter(x=>!history[String(x.id)]),personalized=unseen.filter(x=>preferredGenres.has(x.genre));
 const recommendations=(personalized.length?personalized:unseen).slice(0,16);
 const selected=current.filter(x=>x.topRank||x.featured||x.trending).sort((a,b)=>(Number(a.topRank)||99)-(Number(b.topRank)||99)||Number(b.priority||0)-Number(a.priority||0));
 const top=[...selected,...current.filter(x=>!selected.includes(x))].slice(0,10);
 return '<div class="home-display-toolbar">'+displaySizeControls()+'</div>'+feature(featured)+categoryStats(current)+
 row('Continue assistindo','RETOME DE ONDE PAROU',seen,'continue','landscape')+
 row('Recomendados para você','COM BASE NAS SUAS DESCOBERTAS',recommendations,'recommended')+
 topTen(top)+
 row('Novidades do catálogo','SELEÇÃO DA LX PLUS',recent,'recent','landscape')+
 row('Sua lista','SALVOS PARA VOCÊ',favorites,'saved')+
 row('Filmes para explorar','CINEMA',movies,'movies')+
 row('Séries e doramas','TEMPORADAS E HISTÓRIAS',shows,'series');
}

function topTen(items){
 if(!items.length)return '';
 return '<section class="premium-section top-ten-section" aria-label="Top 10 da LX Plus"><div class="premium-row-title"><div><span class="premium-overline">ESCOLHAS DA CURADORIA LX</span><h2>Top 10 da LX Plus</h2><p>Seleção editorial · até 10 títulos disponíveis</p></div><div class="rail-actions"><button data-scroll="top-ten" data-direction="-1" aria-label="Voltar Top 10">‹</button><button data-scroll="top-ten" data-direction="1" aria-label="Avançar Top 10">›</button></div></div><div class="premium-rail top-ten-rail" data-rail="top-ten">'+items.map((item,i)=>'<div class="top-ten-item"><span class="top-ten-number" aria-hidden="true">'+(i+1)+'</span>'+premiumCard(item)+'</div>').join('')+'</div></section>';
}
function listing({items,page,filter,term}){
 const options=['Todos','Filme','Série','Dorama','Anime','Música','Livro'];
 return '<div class="premium-listing-head"><span class="premium-overline">EXPLORE O UNIVERSO LX</span><h1>'+html(term?'Resultados para “'+term+'”':page)+'</h1><p>'+items.length+' resultados · Escolha o que combina com seu momento.</p></div>'+
 '<div class="filters premium-filters">'+options.map(x=>'<button type="button" class="chip '+(filter===x?'active':'')+'" data-filter="'+html(x)+'">'+html(x)+'</button>').join('')+'</div>'+
 (items.length?'<div class="premium-grid">'+items.slice(0,100).map(x=>premiumCard(x)).join('')+'</div>'+(items.length>100?'<p class="muted premium-result-note">Mostrando os primeiros 100 resultados. Refine sua busca para localizar outros títulos.</p>':''):'<div class="panel premium-empty"><h2>Nenhum resultado encontrado</h2><p>Tente outra palavra ou categoria.</p><button id="clear" class="btn">Limpar pesquisa</button></div>');
}
export function renderPremiumCatalog({items,page,filter='Todos',term='',history={},list=[],catalogStatus='ready'}={}){
 if(catalogStatus==='loading'&&!items?.length)return '<div class="premium-skeleton"><div class="premium-skeleton-feature"></div><div class="premium-skeleton-row"></div><div class="premium-skeleton-row"></div><p>Preparando sua biblioteca LX Plus…</p></div>';
 if(catalogStatus==='error'&&!items?.length)return '<div class="premium-listing-head"><h1>Catálogo indisponível</h1><p>Seu login continua conectado; os títulos não responderam.</p><button class="btn primary" id="retryCatalog">Tentar novamente</button></div>';
 if(page==='Início'&&!term)return home({items,history,list});
 return listing({items,page,filter,term});
}
