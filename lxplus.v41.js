/* LX Plus V41 full rebuild */
(function(){
'use strict';
var BUILD='V41-FULL-REBUILD-20260925';
var $=function(id){return document.getElementById(id)};
var q=function(s,r){return (r||document).querySelector(s)};
var qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var clean=function(v){return String(v==null?'':v).trim()};
var esc=function(v){return window.LX&&LX.ui&&LX.ui.esc?LX.ui.esc(String(v==null?'':v)):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var fmt=function(n){return new Intl.NumberFormat('pt-BR').format(Math.round(Number(n)||0))};
var initials=function(n){return clean(n||'LX').split(/\s+/).slice(0,2).map(function(x){return x.charAt(0)||''}).join('').toUpperCase()};
var hello=function(){var h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'};
var state=function(){return window.LX&&LX.ui&&LX.ui.state?LX.ui.state:{}};
var data=function(){return window.LX&&LX.data?LX.data:null};
var firstName=function(){return clean((state().profile&&state().profile.name)||(state().user&&state().user.name)||'Sergio').split(/\s+/)[0]||'Sergio'};
var mediaTypes={Filme:1,'Série':1,Anime:1,Dorama:1};
window.__LX_V41_BUILD=BUILD;
document.documentElement.dataset.lxBuild=BUILD;

function imgOf(x){return clean(x&&(x.banner||x.carouselImage||x.cover)||'')}
function coverOf(x){return clean(x&&(x.cover||x.banner||x.carouselImage)||'')}
function yearOf(x){return x&&x.year||clean(x&&x.publishedAt).slice(0,4)||''}
function progressOf(x){var d=data(),h=d&&d.history?d.history():{};return Math.max(0,Math.min(100,Math.round(Number(h&&x&&h[x.id]&&h[x.id].progress)||0)))}
function score(x){return (x&&x.trending?500:0)+(x&&x.featured?420:0)+(x&&x.newRelease?260:0)+(Number(x&&x.priority)||0)*25+(Number(x&&(x.views||x.viewCount||x.plays))||0)*.05+(Number(x&&x.rating)||0)*10}
function publishedMedia(){
  var d=data(),now=Date.now();
  return (d&&d.catalog?d.catalog():[]).filter(function(x){return mediaTypes[x&&x.type]&&x.published!==false&&(!x.scheduledAt||+new Date(x.scheduledAt)<=now)});
}
function topItems(items){return items.slice().sort(function(a,b){return score(b)-score(a)||String(a.title||'').localeCompare(String(b.title||''),'pt-BR')}).slice(0,10)}
function newItems(items){return items.slice().sort(function(a,b){return +new Date(b.publishedAt||b.createdAt||0)-+new Date(a.publishedAt||a.createdAt||0)}).slice(0,12)}
function continueItems(items){
  var d=data(),h=d&&d.history?d.history():{};
  return items.filter(function(x){var p=progressOf(x);return p>0&&p<98}).sort(function(a,b){return ((h[b.id]||{}).opened||0)-((h[a.id]||{}).opened||0)}).slice(0,10)
}
function recommended(items){
  try{
    var d=data(),h=d.history(),prefs=(d.preferences()||{})[(state().user&&state().user.email)||'']||{};
    return (d.recommendation(items,h,d.ratings(),prefs)||items).slice(0,12);
  }catch(e){return items.slice(0,12)}
}
function card(x){
  var p=progressOf(x),art=coverOf(x).replace(/'/g,'%27');
  return '<button class="lx41-card" type="button" onclick="LX.detail('+Number(x.id)+')">'+
    '<span class="lx41-card-art" style="background-image:url(\''+esc(art)+'\')"></span>'+
    '<strong>'+esc(x.title||'Sem título')+'</strong>'+
    '<small>'+esc(yearOf(x))+(yearOf(x)&&x.type?' · ':'')+esc(x.type||'')+'</small>'+
    (p>0&&p<98?'<span class="lx41-progress"><i style="width:'+p+'%"></i></span>':'')+
  '</button>';
}
function section(title,subtitle,items,kind,wide){
  if(!items||!items.length)return '';
  var icon=kind==='trend'?'♨':kind==='new'?'✦':'♛';
  return '<section class="lx41-section '+(wide?'lx41-continue':'')+'">'+
    '<div class="lx41-section-head"><div><h2>'+icon+' &nbsp;'+esc(title)+'</h2><p>'+esc(subtitle||'')+'</p></div><button type="button">Ver todos ›</button></div>'+
    '<div class="lx41-row">'+items.map(card).join('')+'</div></section>';
}
function top10(items){
  if(!items.length)return '';
  return '<section class="lx41-section lx41-top10">'+
    '<div class="lx41-section-head"><div><h2>♛ &nbsp;Top 10 na LX Plus</h2><p>Os títulos mais fortes agora na plataforma.</p></div><div class="lx41-top-tabs"><button type="button" class="active">Hoje</button><button type="button">Semana</button><button type="button">Filmes</button><button type="button">Séries</button></div></div>'+
    '<div class="lx41-top10-row">'+items.map(function(x,i){
      return '<button class="lx41-top10-card" type="button" onclick="LX.detail('+Number(x.id)+')"><span class="num">'+(i+1)+'</span><span class="poster" style="background-image:url(\''+esc(coverOf(x).replace(/'/g,'%27'))+'\')"></span><span class="copy"><b>'+esc(x.title||'Sem título')+'</b><small>'+esc(yearOf(x))+(x.type?' · '+esc(x.type):'')+'</small></span></button>';
    }).join('')+'</div></section>';
}
function hero(items){
  if(!items.length)return '<section class="lx41-hero"><div class="lx41-hero-copy"><small>DESTAQUE DA SEMANA</small><h1>LX Plus</h1><p class="lx41-hero-desc">Seu catálogo está pronto para receber novos conteúdos.</p></div></section>';
  var feats=items.filter(function(x){return x.featured}),heroes=(feats.length?feats:topItems(items)).slice(0,6);
  var idx=Math.abs(Number(state().hero)||0)%heroes.length,x=heroes[idx],banner=imgOf(x).replace(/'/g,'%27');
  return '<section class="lx41-hero" style="background-image:url(\''+esc(banner)+'\')">'+
    '<div class="lx41-greeting"><strong>✦ &nbsp;'+esc(hello()+', '+firstName().toLowerCase()+'!')+' 👋</strong><small>Pronto para descobrir algo incrível hoje?</small></div>'+
    '<div class="lx41-hero-copy"><small>DESTAQUE DA SEMANA</small><h1>'+esc(x.title||'LX Plus')+'</h1>'+
    '<div class="lx41-hero-meta"><span>'+esc(yearOf(x))+'</span><span>'+esc(x.ageRating||x.classification||'')+'</span><span>'+esc(x.type||'')+'</span><span>'+esc(x.genre||'')+'</span></div>'+
    '<p class="lx41-hero-desc">'+esc(x.desc||x.description||'Uma nova experiência espera por você na LX Plus.')+'</p>'+
    '<div class="lx41-hero-actions"><button class="play" type="button" onclick="LX.play('+Number(x.id)+')">▶ &nbsp; Assistir agora</button><button class="info" type="button" onclick="LX.toggleList&&LX.toggleList('+Number(x.id)+');LX.ui&&LX.ui.renderApp&&LX.ui.renderApp()">＋ &nbsp; Minha Lista</button><button class="info" type="button" onclick="LX.detail('+Number(x.id)+')">ⓘ &nbsp; Mais informações</button></div>'+
    '</div></section>';
}
var heroTimer=0;
function renderHome(){
  if(!data()||state().screen!=='app'||state().mode!=='Assistir'||state().category!=='Início'||state().query)return;
  var host=$('homeContent');if(!host)return;
  var items=publishedMedia(),cont=continueItems(items),top=topItems(items),trend=items.filter(function(x){return x.trending}).slice(0,12),newest=newItems(items),recs=recommended(items);
  host.innerHTML='<div class="lx41-home">'+hero(items)+top10(top)+section('Continuar assistindo','Retome exatamente de onde você parou.',cont,'continue',true)+section('Em alta na LX Plus','Tendências, novidades e os títulos que todo mundo está comentando.',trend.length?trend:top.slice(0,10),'trend',false)+section('Feito para você','Recomendações personalizadas para o seu perfil.',recs,'normal',false)+section('Lançamentos','Conteúdos adicionados recentemente à plataforma.',newest,'new',false)+'</div>';
  clearInterval(heroTimer);
  var hc=(items.filter(function(x){return x.featured}).length?items.filter(function(x){return x.featured}):top).slice(0,6).length;
  if(hc>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    heroTimer=setInterval(function(){if(state().screen==='app'&&state().mode==='Assistir'&&state().category==='Início'){state().hero=(Number(state().hero)||0)+1;renderHome()}},9000);
  }
}
function installTopNav(){
  var row=q('#app .topbar-row');if(!row||q('.lx-v41-topnav',row))return;
  var nav=document.createElement('nav');nav.className='lx-v41-topnav';
  nav.innerHTML='<button data-v41-top="Início" class="active">Início</button><button data-v41-top="Filmes">Filmes</button><button data-v41-top="Séries">Séries</button><button data-v41-top="Animes">Animes</button><button data-v41-top="Doramas">Doramas</button><button data-v41-top="Música">Música <i class="lx-v41-new">NOVO</i></button><button data-v41-top="Minha Lista">Minha Lista</button>';
  var brand=$('brandHome');if(brand)brand.after(nav);
  nav.onclick=function(e){var b=e.target.closest('[data-v41-top]');if(!b)return;var v=b.dataset.v41Top;if(v==='Música'){state().mode='Ouvir';state().category='Início';state().musicView='home'}else{state().mode='Assistir';state().category=v}state().query='';LX.ui.renderApp()};
}
function syncTopNav(){
  var nav=q('.lx-v41-topnav');if(!nav)return;var key=state().mode==='Ouvir'?'Música':state().category;
  qa('[data-v41-top]',nav).forEach(function(b){b.classList.toggle('active',b.dataset.v41Top===key)});
}
function rebuildLeftNav(){
  var nav=q('#lxDesktopRail .lx-shell-primary');if(!nav||nav.dataset.v41)return;nav.dataset.v41='1';
  nav.innerHTML='<button data-v41-left="Início" class="active"><span>⌂</span><b>Início</b></button><button data-v41-left="Explorar"><span>◈</span><b>Explorar</b></button><button data-v41-left="Em alta"><span>♨</span><b>Em alta</b></button><button data-v41-left="Lançamentos"><span>▣</span><b>Lançamentos</b></button><button data-v41-left="Música"><span>♫</span><b>LX Music</b></button><button data-v41-left="Comunidade"><span>◎</span><b>Comunidade</b></button>';
  nav.onclick=function(e){var b=e.target.closest('[data-v41-left]');if(!b)return;var v=b.dataset.v41Left;
    if(v==='Música'){state().mode='Ouvir';state().category='Início';state().musicView='home';LX.ui.renderApp()}
    else if(v==='Comunidade'){if(LX.social&&LX.social.open)LX.social.open('friends');else if(window.LXOpenCommunity)window.LXOpenCommunity('friends')}
    else if(v==='Explorar'){if($('searchInput'))$('searchInput').focus()}
    else{state().mode='Assistir';state().category='Início';state().query='';LX.ui.renderApp();setTimeout(function(){findSection(v==='Em alta'?/Em alta/i:/Lançamentos/i)},50)}
  };
}
function findSection(re){var hit=qa('#homeContent section').find(function(s){return re.test(clean(s.textContent))});if(hit)hit.scrollIntoView({behavior:'smooth',block:'start'})}
function syncLeftNav(){var music=state().mode==='Ouvir';qa('[data-v41-left]').forEach(function(b){b.classList.toggle('active',music?b.dataset.v41Left==='Música':b.dataset.v41Left==='Início')})}
function decorateMusic(){
  var app=$('app');if(!app)return;
  var musicMode=state().mode==='Ouvir';
  app.classList.toggle('lx-music-mode',musicMode);
  var existing=q('.lx41-music-arrows',app);
  if(!musicMode){if(existing)existing.remove();return}
  var input=$('searchInput');if(input)input.placeholder='Buscar músicas, artistas, álbuns ou playlists...';
  var row=q('#app .topbar-row');
  if(row&&!existing){
    var tools=document.createElement('div');tools.className='lx41-music-arrows';
    tools.innerHTML='<button type="button" aria-label="Voltar">‹</button><button type="button" aria-label="Início da música">›</button>';
    var brand=$('brandHome');if(brand)brand.after(tools);else row.prepend(tools);
    var buttons=qa('button',tools);
    buttons[0].onclick=function(){if(state().musicView&&state().musicView!=='home'){state().musicView='home';state().category='Início';state().query='';LX.ui.renderApp()}else if(history.length>1)history.back()};
    buttons[1].onclick=function(){state().musicView='home';state().category='Início';state().query='';LX.ui.renderApp()};
  }
  var side=q('.lx-music-side-brand');if(side){var b=q('b',side),sub=q('small',side);if(b)b.textContent='LX Music';if(sub)sub.textContent='Música para cada momento da sua vida.'}
}
function decorateCommunity(){
  var drawer=$('lxCommunityDrawer')||q('.lx-community-drawer');if(!drawer)return;
  var h=q('.lx-community-head h2',drawer),p=q('.lx-community-head p',drawer);if(h)h.textContent='LX Community';if(p)p.textContent='Converse, compartilhe e viva o universo LX.';
  if(!q('.lx41-community-search',drawer)){var head=q('.lx-community-head',drawer),input=document.createElement('button');input.type='button';input.className='lx41-community-search';input.textContent='⌕  Buscar conversas, pessoas, grupos ou mensagens...';input.style.cssText='width:calc(100% - 26px);height:38px;margin:9px 13px 3px;padding:0 13px;text-align:left;border-radius:10px;border:1px solid rgba(142,93,255,.22);background:rgba(23,25,50,.78);color:#9ca2bb;font-size:9px';input.onclick=function(){var old=qa('.lx40-community-tools button',drawer).find(function(b){return /Pesquisar/i.test(b.textContent)});if(old)old.click()};if(head)head.after(input)}
}

function musicRows(){
  var d=data(),h=d&&d.history?d.history():{};
  var all=(d&&d.catalog?d.catalog():[]).filter(function(x){return x.type==='Música'&&x.published!==false});
  var recent=all.slice().filter(function(x){return h[x.id]&&h[x.id].opened}).sort(function(a,b){return (h[b.id].opened||0)-(h[a.id].opened||0)});
  var top=all.slice().sort(function(a,b){return score(b)-score(a)}).slice(0,10);
  return {all:all,recent:recent.length?recent.slice(0,10):top.slice(0,10),top:top};
}
function mCard(x){
  return '<button class="lx41-music-card" type="button" onclick="LX.music('+Number(x.id)+',0)">'+
    '<span class="art" style="background-image:url(\''+esc(coverOf(x).replace(/'/g,'%27'))+'\')"><i>▶</i></span>'+
    '<b>'+esc(x.title||'Música')+'</b><small>'+esc(x.album||'Álbum')+' · '+esc(x.artist||'LX Music')+'</small></button>';
}
function renderMusicHomeV41(){
  if(state().screen!=='app'||state().mode!=='Ouvir'||state().query)return;
  if((state().musicView||'home')!=='home'&&state().category!=='Início')return;
  var host=$('homeContent'),rows=musicRows();if(!host||!rows.all.length)return;if(q('.lx41-music-shell',host))return;
  var featured=rows.all.find(function(x){return x.featured})||rows.recent[0]||rows.top[0]||rows.all[0];
  var banner=imgOf(featured)||coverOf(featured);
  var artists=[],seen={};
  rows.all.forEach(function(x){var a=clean(x.artist||'LX Music');if(!seen[a]){seen[a]=1;artists.push(x)}});
  artists=artists.slice(0,7);
  var genres=[],gseen={};
  rows.all.forEach(function(x){var g=clean(x.genre||'Mix LX');if(!gseen[g]){gseen[g]=1;genres.push(g)}});
  var mixes=genres.slice(0,6).map(function(g,i){
    var x=rows.all.find(function(y){return clean(y.genre||'Mix LX')===g})||rows.all[i%rows.all.length];
    return '<button class="lx41-mix" type="button" onclick="LX.music('+Number(x.id)+',0)" style="background-image:url(\''+esc(coverOf(x).replace(/'/g,'%27'))+'\')"><span></span><b>Mix de '+esc(g)+'</b><small>'+esc(x.artist||'Seleção LX')+'</small></button>';
  }).join('');
  host.innerHTML='<i class="lx-music-app-shell lx41-music-sentinel" hidden></i><div class="lx41-music-shell">'+
    '<aside class="lx41-music-side"><div class="lx41-music-side-title"><span class="lx41-wordmark"><b>LX</b><em>Music</em></span></div>'+
      '<nav><button class="active" type="button" onclick="LX.musicSetView&&LX.musicSetView(\'home\')">⌂ <span>Início</span></button><button type="button" onclick="document.getElementById(\'searchInput\')&&document.getElementById(\'searchInput\').focus()">⌕ <span>Buscar</span></button><button type="button" onclick="LX.musicSetView&&LX.musicSetView(\'library\')">▥ <span>Sua Biblioteca</span></button></nav>'+
      '<div class="cap">COLEÇÃO</div><nav><button type="button" onclick="LX.musicSetView&&LX.musicSetView(\'collections\')">♫ <span>Playlists</span></button><button type="button" onclick="LX.musicSetView&&LX.musicSetView(\'collections\')">◉ <span>Álbuns</span></button><button type="button" onclick="LX.musicSetView&&LX.musicSetView(\'explore\')">♙ <span>Artistas</span></button><button type="button" onclick="LX.musicSetView&&LX.musicSetView(\'liked\')">♡ <span>Curtidas</span></button></nav>'+
    '</aside>'+
    '<main class="lx41-music-main">'+
      '<header class="lx41-music-greet"><div><h1>'+esc(hello()+', '+firstName().toLowerCase()+'!')+' 👋</h1><p>Música para cada momento da sua vida.</p></div></header>'+
      '<section class="lx41-music-hero" style="background-image:url(\''+esc(String(banner).replace(/'/g,'%27'))+'\')"><div class="shade"></div><div class="copy"><small>DESTAQUE</small><h2>'+esc(featured.album||featured.title||'LX Music')+'</h2><strong>'+esc(featured.artist||'LX Music')+'</strong><p>'+esc(featured.desc||featured.description||'Um mergulho sonoro escolhido para você.')+'</p><div><button class="play" type="button" onclick="LX.music('+Number(featured.id)+',0)">▶ &nbsp; Ouvir agora</button><button type="button" onclick="LX.musicToggleSavedCurrent&&LX.musicToggleSavedCurrent()">＋ &nbsp; Salvar na biblioteca</button><button type="button">•••</button></div></div></section>'+
      '<section class="lx41-music-section"><div class="head"><h2>◷ &nbsp;Ouvidos recentemente</h2><button type="button" onclick="LX.musicSetView&&LX.musicSetView(\'recent\')">Ver tudo ›</button></div><div class="lx41-music-row">'+rows.recent.map(mCard).join('')+'</div></section>'+
      '<section class="lx41-music-section"><div class="head"><h2>✦ &nbsp;Feito para você <small>Playlists personalizadas baseadas no seu gosto musical.</small></h2><button type="button">Ver tudo ›</button></div><div class="lx41-mixes">'+(mixes||rows.top.slice(0,4).map(function(x){return '<button class="lx41-mix" onclick="LX.music('+Number(x.id)+',0)" style="background-image:url(\''+esc(coverOf(x).replace(/'/g,'%27'))+'\')"><span></span><b>Mix LX</b><small>'+esc(x.artist||'Para você')+'</small></button>'}).join(''))+'</div></section>'+
      '<div class="lx41-music-bottom"><section class="lx41-music-section discover"><div class="head"><h2>♨ &nbsp;Descobertas para você</h2></div><div class="artists">'+artists.map(function(x){return '<button type="button" onclick="LX.music('+Number(x.id)+',0)"><span style="background-image:url(\''+esc(coverOf(x).replace(/'/g,'%27'))+'\')"></span><b>'+esc(x.artist||'LX Music')+'</b></button>'}).join('')+'</div></section>'+
      '<section class="lx41-music-section albums"><div class="head"><h2>♛ &nbsp;Álbuns em destaque</h2></div><div class="album-row">'+rows.top.slice(0,4).map(mCard).join('')+'</div></section>'+
      '<section class="lx41-music-section charts"><div class="head"><h2>▥ &nbsp;Mais tocadas</h2></div><ol>'+rows.top.slice(0,5).map(function(x,i){return '<li><span>'+(i+1)+'</span><button onclick="LX.music('+Number(x.id)+',0)"><i style="background-image:url(\''+esc(coverOf(x).replace(/'/g,'%27'))+'\')"></i><b>'+esc(x.title||'Música')+'</b><small>'+esc(x.artist||'LX Music')+'</small></button><em>♡</em></li>'}).join('')+'</ol></section></div>'+
    '</main></div>';
}
function userScore(u){return Number(u&&(u.monthly_score!=null?u.monthly_score:u.monthlyScore!=null?u.monthlyScore:(Number(u.watched)||0)+(Number(u.listened)||0)+(Number(u.read)||0)*6))||0}
function adminTop(){
  return '<div class="lx41-admin-top"><label class="lx41-admin-search"><span>⌕</span><input id="lx41AdminSearch" placeholder="Buscar no admin..." autocomplete="off"><kbd>Ctrl + K</kbd></label><div class="lx41-admin-user"><span>♧</span><div class="avatar">'+esc(initials(firstName()))+'</div><div><strong>'+esc(firstName())+'</strong><small>Administrador</small></div></div></div>';
}
function adminKpi(icon,label,value,note,key){return '<article class="lx41-kpi"><span><i>'+icon+'</i>'+esc(label)+'</span><strong '+(key?'data-lx41-kpi="'+key+'"':'')+'>'+esc(String(value))+'</strong><small>'+esc(note)+'</small></article>'}
function podium(u,place){return '<article class="'+(place===1?'first':'')+'"><div class="av">'+esc(u?initials(u.name):'LX')+'</div><b>'+esc(u&&u.name||'Em aberto')+'</b><small>'+(u?fmt(userScore(u))+' pontos · ':'')+place+'º lugar</small></article>'}
function activity(e){var d=new Date(e&&e.at||Date.now());return '<div class="lx41-activity-row"><time>'+esc(d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))+'</time><span>'+esc(e&&e.event||e&&e.type||'Atividade')+'</span><small>'+esc(e&&e.data&&(e.data.title||e.data.detail)||'LX Plus')+'</small></div>'}
function attention(label,n,page){return '<button type="button" data-lx41-admin="'+esc(page)+'"><span>'+esc(label)+'</span><b>'+esc(String(n))+' ›</b></button>'}
function renderAdminDashboard(){
  var main=$('adminMain'),d=data();if(!main||!d)return;state().adminPage='dashboard';
  var cat=d.catalog?d.catalog():[],users=d.users?d.users():[],events=d.analytics?d.analytics():[],requests=d.requests?d.requests():[];
  var movies=cat.filter(function(x){return x.type==='Filme'}).length,musics=cat.filter(function(x){return x.type==='Música'}).length,lives=cat.filter(function(x){return x.type==='Ao Vivo'&&x.published!==false}).length;
  var ranked=users.slice().filter(function(x){return x.visible!==false}).sort(function(a,b){return userScore(b)-userScore(a)}).slice(0,3);
  var pending=users.filter(function(x){return !x.admin&&!x.approved&&x.approvalStatus!=='rejected'}).length;
  var openReq=requests.filter(function(x){return ['Concluído','Fechado','Recusado'].indexOf(x.status)<0}).length;
  var now=new Date(),end=new Date(now.getFullYear(),now.getMonth()+1,1),diff=end-now,days=Math.max(0,Math.floor(diff/86400000)),hours=Math.max(0,Math.floor(diff%86400000/3600000));
  var month=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(now).replace(/^./,function(x){return x.toUpperCase()});
  main.innerHTML=adminTop()+'<i class="lx-mass-launch lx41-mass-sentinel" hidden></i>'+ 
    '<section class="lx41-admin-hero"><div><h1>'+esc(hello()+', '+firstName()+'!')+' 👋</h1><p>Aqui está o resumo da sua plataforma hoje.</p></div><div class="lx41-admin-quote">“Mais conteúdo para<br>mais pessoas, sempre.”<br><small>LX Admin</small></div></section>'+
    '<section class="lx41-kpis">'+adminKpi('♟','Usuários',fmt(users.length),'base cadastrada')+adminKpi('▣','Filmes',fmt(movies),'catálogo')+adminKpi('♫','Músicas',fmt(musics),'LX Music')+adminKpi('◉','Lives',fmt(lives),'publicadas')+adminKpi('△','Erros','0','sistema','errors')+adminKpi('☁','Importações','0','histórico','imports')+'</section>'+
    '<section class="lx41-admin-grid">'+
      '<article class="lx41-box"><div class="lx41-box-head"><div><h2>☁ &nbsp;LX Smart Import <small style="color:#c45cff">vNext</small></h2><p>Importe filmes, séries, músicas e muito mais de forma inteligente.</p></div><button data-lx41-admin="importer">Ver histórico</button></div><div class="lx41-import-tabs"><button data-lx41-admin="importer">◭ Google Drive</button><button data-lx41-admin="importer">▤ CSV</button><button data-lx41-admin="importer">{ } JSON</button><button data-lx41-admin="importer">↗ URL(s)</button></div><div class="lx41-import-field"><div class="ico">◭</div><input placeholder="Cole o link da pasta ou do arquivo do Google Drive"><button data-lx41-admin="importer">Importar agora</button></div></article>'+
      '<article class="lx41-box"><div class="lx41-box-head"><div><h2>🏆 &nbsp;Ranking da Comunidade</h2><p>Engajamento que recompensa. Top usuários do mês.</p></div><button data-lx41-admin="v40ranking">Gerenciar ranking</button></div><div class="lx41-rank-banner"><div><small>TEMPORADA ATUAL</small><strong>'+esc(month)+'</strong></div><div class="prize"><small>PRÊMIO DO MÊS</small><strong>R$100</strong></div><div><small>TERMINA EM</small><strong>'+days+'d '+hours+'h</strong></div></div><div class="lx41-podium">'+podium(ranked[1],2)+podium(ranked[0],1)+podium(ranked[2],3)+'</div></article>'+
    '</section>'+
    '<section class="lx41-admin-bottom">'+
      '<article class="lx41-box"><div class="lx41-box-head"><div><h2>◷ &nbsp;Atividades Recentes</h2><p>Últimas ações realizadas no sistema.</p></div><button data-lx41-admin="analytics">Ver todas</button></div>'+(events.slice(-5).reverse().map(activity).join('')||'<div class="lx41-activity-row"><time>Agora</time><span>Sistema operacional</span><small>LX Plus</small></div>')+'</article>'+
      '<article class="lx41-box"><div class="lx41-box-head"><div><h2>◇ &nbsp;Moderação e Auditoria</h2><p>Itens que precisam da sua atenção.</p></div></div><div class="lx41-attention">'+attention('Contas pendentes de aprovação',pending,'community')+attention('Pedidos e problemas',openReq,'requests')+attention('Erros recentes no sistema','0','v40errors')+attention('Links quebrados / Link Health','↗','v40linkhealth')+'</div></article>'+
      '<article class="lx41-box"><div class="lx41-box-head"><div><h2>⚡ &nbsp;Ações Rápidas</h2><p>Acesso direto às funções principais.</p></div></div><div class="lx41-action-grid"><button data-lx41-admin="importer">☁ Nova Importação</button><button data-lx41-edit="Filme">▣ Adicionar Filme</button><button data-lx41-edit="Série">▤ Adicionar Série</button><button data-lx41-edit="Música">♫ Adicionar Música</button><button data-lx41-admin="community">♟ Gerenciar Usuários</button><button data-lx41-admin="v40errors">△ Ver Erros</button></div></article>'+
    '</section>';
  bindAdmin(main);hydrateCounts();
}
async function countTable(t){try{var db=LX.cloud&&LX.cloud.db&&LX.cloud.db();if(!db)return 0;var r=await db.from(t).select('id',{head:true,count:'exact'});return r.error?0:Number(r.count||0)}catch(e){return 0}}
async function hydrateCounts(){var values=await Promise.all([countTable('lx_client_errors'),countTable('lx_import_batches')]),e=q('[data-lx41-kpi="errors"]'),i=q('[data-lx41-kpi="imports"]');if(e)e.textContent=fmt(values[0]);if(i)i.textContent=fmt(values[1])}
function bindAdmin(root){
  qa('[data-lx41-admin]',root).forEach(function(b){b.onclick=function(){LX.admin&&LX.admin.render&&LX.admin.render(b.dataset.lx41Admin)}});
  qa('[data-lx41-edit]',root).forEach(function(b){b.onclick=function(){LX.admin&&LX.admin.edit&&LX.admin.edit(null,b.dataset.lx41Edit)}});
  var input=$('lx41AdminSearch');if(input)input.onkeydown=function(e){if(e.key!=='Enter')return;var v=clean(input.value).toLowerCase();
    if(/filme/.test(v))LX.admin.render('movies');else if(/s[eé]rie|anime|dorama/.test(v))LX.admin.render('series');else if(/m[uú]sica/.test(v))LX.admin.render('music');else if(/livro/.test(v))LX.admin.render('books');else if(/ranking/.test(v))LX.admin.render('v40ranking');else if(/erro/.test(v))LX.admin.render('v40errors');else if(/link/.test(v))LX.admin.render('v40linkhealth');else if(/import/.test(v))LX.admin.render('importer');else if(/usu|aprova|comun/.test(v))LX.admin.render('community');
  }
}
function insertAdminTop(){var main=$('adminMain');if(!main||q('.lx41-admin-top',main))return;main.insertAdjacentHTML('afterbegin',adminTop());bindAdmin(main)}
function installAdminNav(){
  var nav=$('adminNav');if(!nav||nav.dataset.v41)return;nav.dataset.v41='1';
  var map=[['Dashboard','dashboard','⌂'],['Filmes','movies','▣'],['Séries','series','▤'],['Música','music','♫'],['Álbuns','music','◉'],['Livros','books','▥'],['Lives','live','◉'],['Comunidade','community','◎'],['Ranking','v40ranking','♛'],['Smart Import','importer','☁'],['Link Health','v40linkhealth','⌁'],['Erros','v40errors','△'],['Usuários','community','♟'],['Configurações','settings','⚙']];
  var html='<i data-admin="v40diagnostics" class="lx41-v40-sentinel" hidden></i><span class="lx-admin-nav-label">PAINEL</span>';
  map.forEach(function(x,i){
    if(x[0]==='Comunidade')html+='<span class="lx-admin-nav-label">COMUNIDADE</span>';
    if(x[0]==='Smart Import')html+='<span class="lx-admin-nav-label">FERRAMENTAS</span>';
    if(x[0]==='Usuários')html+='<span class="lx-admin-nav-label">GESTÃO</span>';
    html+='<button data-admin="'+x[1]+'" class="'+(i===0?'active':'')+'"><i>'+x[2]+'</i><span>'+x[0]+'</span></button>';
  });
  nav.innerHTML=html;nav.onclick=function(e){var b=e.target.closest('[data-admin]');if(b&&LX.admin&&LX.admin.render)LX.admin.render(b.dataset.admin)};
}
function markAdmin(page){qa('#adminNav [data-admin]').forEach(function(b){b.classList.toggle('active',b.dataset.admin===page)})}
function wrapAdmin(){
  if(!LX.admin||!LX.admin.render||LX.admin.render.__v41)return;
  var old=LX.admin.render.bind(LX.admin);
  var wrapped=function(page){page=page||'dashboard';state().adminPage=page;if(page==='dashboard'){renderAdminDashboard();markAdmin(page);return}var out=old(page);setTimeout(function(){insertAdminTop();markAdmin(page)},0);return out};
  wrapped.__v41=true;LX.admin.render=wrapped;
}
function wrapRender(){
  if(!LX.ui||!LX.ui.renderApp||LX.ui.renderApp.__v41)return;
  var old=LX.ui.renderApp.bind(LX.ui);
  var wrapped=function(){var out=old.apply(null,arguments);queueMicrotask(enhance);setTimeout(enhance,40);return out};
  wrapped.__v41=true;LX.ui.renderApp=wrapped;
}
function v41CleanOldVisuals(){
  var root=$('homeContent');
  if(root){
    ['#lx40Top10','#lx40Pulse','#lx40Premiere','.lx40-top10','.lx40-pulse','.lx40-premiere'].forEach(function(sel){
      qa(sel,root).forEach(function(el){el.remove()});
    });
  }
  qa('.lx40-music-brand').forEach(function(el){el.remove()});
}
function v41Brand(){
  var mode=state().mode;
  var rows=[
    ['#brandHome',mode==='Ouvir'?'LX Music':'LX Plus'],
    ['#auth .brand-lg','LX Plus'],
    ['#auth .auth-mobile-brand','LX Plus'],
    ['#profiles .brand','LX Plus'],
    ['#admin .admin-side>.brand','LX Admin']
  ];
  rows.forEach(function(row){
    var el=q(row[0]);if(!el)return;if(el.dataset.v41Brand===row[1]&&q('.lx41-wordmark',el))return;
    el.dataset.v41Brand=row[1];
    var p=row[1].split(' ');
    el.innerHTML='<span class="lx41-wordmark"><b>'+esc(p[0])+'</b><em>'+esc(p.slice(1).join(' '))+'</em></span>';
  });
}
function enhance(){
  try{if(LX.config&&LX.config.features)LX.config.features.top10V40=false}catch(e){}
  v41Brand();v41CleanOldVisuals();
  installTopNav();rebuildLeftNav();syncTopNav();syncLeftNav();decorateMusic();decorateCommunity();installAdminNav();wrapAdmin();
  if(state().screen==='app'&&state().mode==='Assistir'&&state().category==='Início'&&!state().query){renderHome();v41CleanOldVisuals();setTimeout(v41CleanOldVisuals,120);setTimeout(v41CleanOldVisuals,350);}else if(state().screen==='app'&&state().mode==='Ouvir'&&!state().query){renderMusicHomeV41();setTimeout(renderMusicHomeV41,120);setTimeout(renderMusicHomeV41,360);}
  if(state().screen==='admin'){if((state().adminPage||'dashboard')==='dashboard')renderAdminDashboard();else insertAdminTop()}
  var meta=q('meta[name="lxplus-build"]');if(meta)meta.content=BUILD;if(LX.config)LX.config.version=BUILD;
}
function boot(){
  if(!window.LX||!LX.ui||!LX.data||!LX.admin){setTimeout(boot,80);return}
  wrapRender();wrapAdmin();installAdminNav();enhance();
  var mo=new MutationObserver(function(){requestAnimationFrame(function(){v41Brand();v41CleanOldVisuals();decorateCommunity();decorateMusic();if(state().screen==='app'&&state().mode==='Ouvir'&&!state().query&&!q('.lx41-music-shell',$('homeContent')))renderMusicHomeV41();if(state().screen==='admin')insertAdminTop()})});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',function(){setTimeout(enhance,0)});
  console.info('[LX Plus]',BUILD,'full rebuild active');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();