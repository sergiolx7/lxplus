import {esc,icon,avatar,verifiedBadge} from './ui.js';
import {nexusArtwork,musicFeatureSelection} from './nexus-ui.js';
import {cinemaOriginalPoster} from './cinema-original-poster.js';

export const LX5_PAGES=[['Início','home'],['Filmes','film'],['Séries','series'],['Doramas','heart'],['Animes','sparkles'],['Músicas','music'],['Livros','book'],['Ao vivo','screen'],['Comunidade','social']];
export const lx5Section=(eyebrow,title,body='')=>'<div class="lx5-section-heading"><span class="premium-overline">'+esc(eyebrow)+'</span><h2>'+esc(title)+'</h2>'+(body?'<p>'+esc(body)+'</p>':'')+'</div>';
export function lx5Brand(){return '<span class="brand-logo"><img src="./assets/lx5-play-mark.svg" width="42" height="42" alt=""></span><span class="brand-title"><b>LX <em>PLUS</em></b><small>MAIS DO SEU UNIVERSO.</small></span>'}
export function lx5Navigation(name,symbol,current,mobile=false){
 const label=name==='Músicas'?'LX Music':name==='Avisos'?'Notificações':name;
 return '<button type="button" class="'+(mobile?'mobile-button':'nav-btn')+(current===name?' active':'')+'" data-page="'+esc(name)+'" aria-label="'+esc(label)+'" title="'+esc(label)+'"'+(current===name?' aria-current="page"':'')+'>'+icon(symbol)+'<span>'+esc(label)+'</span>'+(name==='Premium'?'<i class="lx5-nav-gem" aria-hidden="true">✦</i>':'')+'</button>';
}
export function lx5Shell({profile={},admin=false,page='Início',term=''}){
 const nav=(name,symbol,mobile=false)=>lx5Navigation(name,symbol,page,mobile);
 const explore=LX5_PAGES.map(([name,symbol])=>nav(name,symbol)).join('');
 const library=[['Minha Lista','heart'],['Playlists','list'],['Ranking','trophy']].map(([name,symbol])=>nav(name,symbol)).join('');
 const account=[['Perfil','user'],['LX IA','sparkles'],['Avisos','bell'],['Suporte','support'],['Mural dos Fundadores','users'],['Novidades','clock']].map(([name,symbol])=>nav(name,symbol)).join('')+(admin?nav('Administração','sliders'):'');
 const premium=profile.is_premium===true;
 return `<a class="orbit-skip" href="#pageArea">Pular para o conteúdo</a>
 <div class="lx-ambient" aria-hidden="true"><i class="lx-led left"></i><i class="lx-led right"></i></div>
 <div class="shell nexus-shell lx5-shell">
  <aside class="aside lx5-sidebar" id="lxSidebar">
   <button type="button" class="brand brand-button" data-page="Início" aria-label="LX Plus · Início">${lx5Brand()}</button>
   <div class="sidebar-scroll">
    <nav class="nav-group" aria-label="Explorar LX Plus"><span class="nav-label">DESCOBRIR</span>${explore}</nav>
    <nav class="nav-group" aria-label="Sua biblioteca"><span class="nav-label">SEU UNIVERSO</span>${library}</nav>
    <details class="nexus-nav-more lx5-account-menu"><summary>${icon('settings')}<span>Conta e ferramentas</span></summary><nav>${account}<button type="button" class="performance-toggle" data-performance-toggle aria-label="Alternar modo leve" aria-pressed="false">Modo leve</button></nav></details>
   </div>
   <button class="orbit-sidebar-premium lx5-sidebar-premium" type="button" data-page="Premium"><span class="lx5-premium-star" aria-hidden="true">✦</span><span><strong>${premium?'Seu mundo Premium':'O próximo nível é seu.'}</strong><small>${premium?'Personalize sua experiência':'Conheça o LX Premium'}</small></span>${icon('arrow')}</button>
   <button type="button" class="sidebar-profile" data-page="Perfil" aria-label="Abrir perfil da conta">${avatar(profile,'sidebar-avatar')}<span><strong id="sidebarProfileName"><span class="profile-name-text">${esc(profile.name||'Membro LX')}</span>${verifiedBadge(profile)}</strong><small>${esc(profile.username?'@'+profile.username:'Seu espaço na LX Plus')}</small></span>${icon('arrow')}</button>
  </aside>
  <div class="content">
   <header class="topbar lx5-topbar">
    <button type="button" class="sidebar-toggle icon-button" data-sidebar-toggle aria-controls="lxSidebar" aria-expanded="true" aria-label="Recolher menu lateral">${icon('list')}</button>
    <div class="top-context"><img class="header-brand" src="./assets/lx5-play-mark.svg" alt="" width="34" height="34"><b class="nexus-mobile-wordmark">LX PLUS</b><strong id="headerGreeting" class="sr-only"></strong><span id="pageTitle" class="sr-only">${esc(page)}</span></div>
    <label class="header-search">${icon('search')}<input id="search" type="search" placeholder="O que combina com você hoje?" aria-label="Buscar títulos, músicas, pessoas e recursos" value="${esc(term)}"><kbd>Ctrl K</kbd></label>
    <span class="header-presence sr-only" id="headerPresence"></span>
    <button type="button" class="header-upgrade ${premium?'active':''}" data-page="Premium" aria-label="${premium?'Abrir seu Premium':'Conhecer o LX Premium'}">${icon('sparkles')}<span>${premium?'Seu Premium':'Fazer upgrade'}</span></button>
    <button type="button" class="header-notifications icon-button" data-page="Avisos" aria-label="Abrir notificações">${icon('bell')}<span id="noticeBadge" hidden></span></button>
    <details class="compact-menu"><summary aria-label="Abrir menu de páginas">${icon('list')}</summary><nav class="compact-menu-panel"><span class="nav-label">DESCOBRIR</span>${explore}<span class="nav-label">SEU UNIVERSO</span>${library}<span class="nav-label">SUA CONTA</span>${account}</nav></details>
    <button type="button" class="avatar-button" data-page="Perfil" aria-label="Abrir seu perfil">${avatar(profile,'header-avatar')}</button>
   </header>
   <main id="pageArea" class="page" tabindex="-1"></main>
   <footer class="site-footer"><span>LX <b>PLUS</b> <i>Um universo de possibilidades.</i></span><div><button class="link" data-page="Novidades">Novidades</button><button class="link" data-page="Suporte">Central de ajuda</button></div><small>Uma experiência LX Group</small></footer>
  </div>
 </div>
 <nav class="mobile-nav" aria-label="Navegação principal">${[['Início','home'],['Músicas','music'],['Comunidade','social'],['Minha Lista','heart'],['Perfil','user']].map(([name,symbol])=>nav(name,symbol,true)).join('')}</nav><div id="layer"></div>`;
}
export function lx5QuickNavigation(){
 return '<nav class="lx5-universe-tabs" aria-label="Explore os universos da LX Plus">'+[['Filmes','film','Cinema','Histórias que ficam.'],['Séries','series','Séries','Seu próximo episódio.'],['Doramas','heart','Doramas','Uma nova paixão.'],['Animes','sparkles','Animes','Além da imaginação.'],['Músicas','music','LX Music','Encontre seu ritmo.'],['Livros','book','Livros','Vire a próxima página.']].map(([page,symbol,label,description],index)=>'<button type="button" data-page="'+page+'"><span class="lx5-universe-index" aria-hidden="true">0'+(index+1)+'</span><span class="lx5-universe-icon">'+icon(symbol)+'</span><span class="lx5-universe-copy"><strong>'+label+'</strong><small>'+description+'</small></span><span class="lx5-universe-arrow" aria-hidden="true">'+icon('arrow')+'</span></button>').join('')+'</nav>';
}
export function lx5HomeIntro(profile={}){
 const first=String(profile?.name||'').trim().split(' ')[0];
 return '<div class="lx5-home-intro"><div><span class="premium-overline">SEU UNIVERSO. SEU MOMENTO.</span><h1>'+(first?'Bem-vindo, '+esc(first)+'.':'Seu próximo favorito está aqui.')+'</h1><p>Boas histórias, novos sons e conexões que ficam.</p></div><button type="button" class="btn ghost" data-page="Minha Lista">'+icon('heart')+' Minha biblioteca</button></div>';
}
export function lx5EmptyHero(){return '<section class="lx5-universe-hero"><div><span class="lx5-live-tag">'+icon('sparkles')+' INFINITAS POSSIBILIDADES</span><h2>Todos os seus<br>universos. <em>Um só lugar.</em></h2><p>O seu próximo filme. A sua próxima música favorita. A conversa que faz o dia.</p><div class="actions"><button type="button" class="btn primary" data-page="Filmes">'+icon('play')+' Explorar cinema</button><button type="button" class="btn" data-page="Comunidade">'+icon('users')+' Encontrar minha turma</button></div></div><img src="./assets/lx5-portal.svg" alt="" width="720" height="540" fetchpriority="high"></section>'}
export function lx5HomeFriends(members=[],presence=[]){
 const online=presence.filter(p=>p.status==='online'&&Date.now()-Date.parse(p.updated_at)<90000).map(p=>{const member=members.find(m=>m.user_id===p.user_id&&m.relation==='accepted');return member?{...member,...p}:null}).filter(Boolean).slice(0,4);
 const header=(symbol,title,page)=>'<header><h2>'+icon(symbol)+esc(title)+'</h2><button type="button" class="lx5-see-all" data-page="'+page+'" aria-label="Abrir '+title+'">'+icon('arrow')+'</button></header>';
 const friends='<section class="lx5-widget lx5-friends-widget">'+header('users','Seu círculo online','Comunidade')+(online.length?'<div class="lx5-friend-rows">'+online.map(person=>'<button type="button" data-home-member="'+esc(person.user_id)+'">'+avatar(person,'lx5-friend-avatar')+'<span><strong>'+esc(person.name||'Membro LX')+'</strong><small><i></i>'+esc(person.activity_title||'Disponível para conversar')+'</small></span></button>').join('')+'</div>':'<div class="lx5-widget-empty">'+icon('users')+'<p>Seus amigos aparecem aqui quando estiverem online.</p><button class="link" type="button" data-page="Comunidade">Encontrar conexões '+icon('arrow')+'</button></div>')+'</section>';
 return friends;
}
export function lx5HomeAside({items=[],musicHistory={},members=[],presence=[],overview=null,profile={}}={}){
 const {featured}=musicFeatureSelection(items,musicHistory);
 const header=(symbol,title,page)=>'<header><h2>'+icon(symbol)+esc(title)+'</h2><button type="button" class="lx5-see-all" data-page="'+page+'" aria-label="Abrir '+title+'">'+icon('arrow')+'</button></header>';
 const friends=lx5HomeFriends(members,presence);
 const music='<section class="lx5-widget lx5-music-widget">'+header('music','No seu ritmo','Músicas')+(featured?'<div class="lx5-widget-track">'+(nexusArtwork(featured.cover)?'<img src="'+esc(nexusArtwork(featured.cover))+'" alt="" width="68" height="68" loading="lazy">':'<span class="lx5-music-placeholder">'+icon('music')+'</span>')+'<div><strong>'+esc(featured.title)+'</strong><small>'+esc(featured.artist||'LX Music')+'</small></div></div><button class="btn primary wide" type="button" data-play="'+esc(featured.id)+'">'+icon('play')+' Ouvir agora</button><p>Da sua biblioteca LX Music</p>':'<div class="lx5-widget-empty"><p>Álbuns, playlists e descobertas. Encontre o som do seu dia.</p><button class="btn small" type="button" data-page="Músicas">Explorar música</button></div>')+'</section>';
 const scores=Array.isArray(overview?.leaders)?overview.leaders:[],season=overview?.season;
 const ranking='<section class="lx5-widget lx5-ranking-widget">'+header('trophy','LX League','Ranking')+(season?'<div class="lx5-season-name">TEMPORADA '+esc(String(season.season_key||'').split('-').reverse().join('/'))+'</div>'+(scores.length?'<ol>'+scores.slice(0,3).map((person,i)=>'<li><span class="lx5-rank-number">'+(Number(person.rank)||i+1)+'</span>'+avatar(person,'lx5-rank-avatar')+'<strong>'+esc(person.name||'Participante LX')+'</strong><span>'+Number(person.monthly_score||0).toLocaleString('pt-BR')+'<small> pts</small></span></li>').join('')+'</ol>':'<p>Acompanhe os participantes e sua posição no ranking.</p>')+(Number(season.prize_cents)>0?'<div class="lx5-prize-teaser">'+icon('sparkles')+'<span>Prêmio da temporada<strong>'+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(season.prize_cents)/100)+'</strong></span></div>':''):'<div class="lx5-widget-empty"><p>Uma nova conquista começa com o seu próximo play.</p><button class="link" type="button" data-page="Ranking">Ver temporada '+icon('arrow')+'</button></div>')+'</section>';
 const premium='<section class="lx5-widget lx5-premium-widget"><span class="lx5-gem" aria-hidden="true">✦</span><span class="premium-overline">LX PREMIUM</span><h2>'+ (profile?.is_premium?'Seu universo, ainda mais seu.':'Um universo de possibilidades.')+'</h2><p>Perfis com personalidade. Estilos exclusivos. A experiência no seu ritmo.</p><button class="btn primary wide" type="button" data-page="Premium">'+(profile?.is_premium?'Personalizar meu estilo':'Conhecer os benefícios')+icon('arrow')+'</button></section>';
 return '<aside class="lx5-home-side" aria-label="Seu universo LX Plus">'+friends+music+ranking+premium+'</aside>';
}
export function lx5CommunityActivity(overview){
 const posts=Array.isArray(overview?.posts)?overview.posts:[];
 return '<section class="lx5-community-preview"><div><span class="premium-overline">QUANDO O PLAY VIRA CONVERSA</span><h2>A história continua<br>na comunidade.</h2><p>Compartilhe descobertas, encontre sua turma e aproveite cada universo em boa companhia.</p><button class="btn" type="button" data-page="Comunidade">'+icon('chat')+' Explorar a comunidade</button></div><div class="lx5-community-cards">'+(posts.length?posts.slice(0,2).map(post=>'<article><span>'+icon('chat')+' Na comunidade LX</span><p>'+esc(String(post.body||'').slice(0,170))+'</p><button type="button" class="link" data-page="Comunidade">Ver conversa '+icon('arrow')+'</button></article>').join(''):'<article><span>'+icon('users')+' SEU CÍRCULO LX</span><h3>O melhor do seu universo<br>fica ainda melhor junto.</h3><p>Conversas, chamadas e momentos compartilhados em um só lugar.</p></article>')+'</div></section>';
}
export function lx5RouteSkeleton(page='Seu universo'){
 return '<div class="lx5-route-skeleton" aria-busy="true" role="status"><span class="sr-only">Carregando '+esc(page)+'</span><div class="lx5-skeleton-title"></div><div class="lx5-skeleton-line"></div><div class="lx5-skeleton-banner"></div><div class="lx5-skeleton-grid">'+Array.from({length:6},()=>'<span></span>').join('')+'</div></div>';
}
export function lx5Details(item,{liked=false}={}){
 const cover=nexusArtwork(item.cover),banner=nexusArtwork(item.bannerDesktop||item.banner||item.cover);
 const coming=!!(item.metadataOnly||item.catalogOnly||item.availability==='coming_soon');
 const cinema=['Filme','Série','Dorama','Anime'].includes(item.type);
 const credits=item.artist||item.author||(Array.isArray(item.cast)?item.cast.slice(0,5).join(' · '):'');
 return '<div class="overlay"><section class="modal lx5-detail detail-modal'+(item.type==='Música'?' music-detail':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(item.title)+'"><div class="lx5-detail-hero">'+(banner?'<img src="'+esc(banner)+'" alt="" decoding="async">':'')+'<header class="modal-head"><span class="lx5-live-tag">'+icon(item.type==='Música'?'music':item.type==='Livro'?'book':'film')+esc(item.type)+' · LX PLUS</span><button class="close" data-close aria-label="Fechar detalhes">'+icon('close')+'</button></header><span class="lx5-detail-caption">ALÉM DO PLAY.</span></div><div class="modal-body details"><div class="lx5-detail-cover">'+(cover?'<img class="detail-poster" src="'+esc(cover)+'" alt="Capa de '+esc(item.title)+'">':cinemaOriginalPoster(item))+'</div><div class="lx5-detail-copy"><div class="lx5-detail-meta">'+[item.year,item.genre,Number(item.duration)>0?item.duration+' min':''].filter(Boolean).map(value=>'<span>'+esc(value)+'</span>').join('')+'</div><h2>'+esc(item.title)+'</h2><p>'+esc(item.description||item.desc||'Uma nova descoberta no seu universo LX Plus.')+'</p>'+(credits?'<small class="lx5-detail-credits">'+esc(credits)+'</small>':'')+'<div class="actions">'+(coming?'<span class="lx-cinema-modal-coming">'+icon('clock')+' Em breve · Reprodução ainda indisponível para este título.</span>':'<button class="btn primary" data-modal-play>'+icon('play')+' '+(item.type==='Música'?'Ouvir agora':item.type==='Livro'?'Ler agora':'Assistir agora')+'</button>')+'<button class="btn '+(liked?'is-saved':'')+'" data-modal-save aria-pressed="'+liked+'">'+icon('heart')+' '+(liked?'Na sua lista':'Minha lista')+'</button>'+(cinema&&!coming?'<button class="btn ghost" data-watch-start>'+icon('users')+' Assistir juntos</button>':'')+'</div><p id="detailStatus" role="status" class="muted"></p></div></div></section></div>';
}
