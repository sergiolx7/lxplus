/* LX Plus v40 — Reference UI orchestration.
   Keeps the existing data/player/community engines and upgrades their presentation. */
(function(){
'use strict';
var BUILD='V40-REFERENCE-20260925';
window.__LX_REFERENCE_BUILD=BUILD;
document.documentElement.dataset.lxReference=BUILD;

function $(id){return document.getElementById(id)}
function q(sel,root){return (root||document).querySelector(sel)}
function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
function esc(v){
  if(window.LX&&LX.ui&&LX.ui.esc)return LX.ui.esc(String(v==null?'':v));
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
}
function clean(v){return String(v==null?'':v).trim()}
function initials(v){var a=clean(v||'LX').split(/\s+/).slice(0,2);return (a.map(function(x){return x.charAt(0)}).join('')||'LX').toUpperCase()}
function fmt(n){try{return new Intl.NumberFormat('pt-BR').format(Math.round(Number(n)||0))}catch(_){return String(Math.round(Number(n)||0))}}
function daypart(){
  var h=new Date().getHours();
  return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
}
function user(){
  var U=window.LX&&LX.ui;
  return (U&&U.state&&U.state.profile)||(U&&U.state&&U.state.user)||(LX&&LX.cloud&&LX.cloud.profile&&LX.cloud.profile())||(LX&&LX.cloud&&LX.cloud.user&&LX.cloud.user())||{};
}
function userName(){
  var u=user();
  return clean(u.name||u.full_name||u.display_name||u.user_metadata&&u.user_metadata.name||u.email&&String(u.email).split('@')[0]||'Sergio');
}
function routeExisting(selector){
  var el=q(selector);
  if(el){el.click();return true}
  return false;
}
function setCategory(name){
  var nav=$('categoryNav');
  if(nav){
    var b=qa('button',nav).find(function(x){return clean(x.textContent).toLowerCase()===clean(name).toLowerCase()});
    if(b){b.click();return}
  }
  if(window.LX&&LX.ui&&LX.ui.state){
    LX.ui.state.mode='Assistir';
    LX.ui.state.category=name;
    if(LX.ui.renderApp)LX.ui.renderApp();
  }
}
function home(){if(!routeExisting('#brandHome')&&window.LX&&LX.ui&&LX.ui.state){LX.ui.state.mode='Assistir';LX.ui.state.category='Início';LX.ui.renderApp&&LX.ui.renderApp()}}
function music(){if(!routeExisting('[data-shell-mode="Ouvir"]')&&window.LX&&LX.ui&&LX.ui.state){LX.ui.state.mode='Ouvir';LX.ui.state.category='Início';LX.ui.renderApp&&LX.ui.renderApp()}}
function community(){if(window.LX&&LX.social&&LX.social.open)LX.social.open('friends');else window.LXOpenCommunity&&window.LXOpenCommunity('friends')}
function scrollNamed(re){
  var sections=qa('#homeContent section');
  var hit=sections.find(function(s){return re.test(clean(s.textContent))});
  if(hit){hit.scrollIntoView({behavior:'smooth',block:'start'});return true}
  return false;
}

function installTopNav(){
  var row=q('#app .topbar-row');
  if(!row||q('.lx-ref-topnav',row))return;
  var nav=document.createElement('nav');
  nav.className='lx-ref-topnav';
  nav.setAttribute('aria-label','Navegação LX Plus');
  nav.innerHTML=
    '<button type="button" data-ref-top="home" class="active">Início</button>'+
    '<button type="button" data-ref-top="Filmes">Filmes</button>'+
    '<button type="button" data-ref-top="Séries">Séries</button>'+
    '<button type="button" data-ref-top="Animes">Animes</button>'+
    '<button type="button" data-ref-top="Doramas">Doramas</button>'+
    '<button type="button" data-ref-top="music">Música <i class="lx-ref-new">NOVO</i></button>'+
    '<button type="button" data-ref-top="Minha Lista">Minha Lista</button>';
  var brand=$('brandHome');
  if(brand&&brand.nextSibling)row.insertBefore(nav,brand.nextSibling);else row.insertBefore(nav,row.firstChild);
  nav.addEventListener('click',function(e){
    var b=e.target.closest('[data-ref-top]');if(!b)return;
    var v=b.getAttribute('data-ref-top');
    if(v==='home')home();else if(v==='music')music();else setCategory(v);
    qa('[data-ref-top]',nav).forEach(function(x){x.classList.toggle('active',x===b)});
  });
}
function syncTopNav(){
  var nav=q('.lx-ref-topnav');if(!nav||!window.LX||!LX.ui||!LX.ui.state)return;
  var mode=LX.ui.state.mode||'Assistir',cat=LX.ui.state.category||'Início';
  var key=mode==='Ouvir'?'music':(cat==='Início'?'home':cat);
  qa('[data-ref-top]',nav).forEach(function(x){x.classList.toggle('active',x.getAttribute('data-ref-top')===key)});
}

function installLeftNav(){
  var nav=q('#app .lx-desktop-rail .lx-shell-primary');
  if(!nav||nav.dataset.lxReference==='1')return;
  nav.dataset.lxReference='1';
  nav.innerHTML=
    '<button type="button" data-ref-left="home" class="active"><span>⌂</span><b>Início</b></button>'+
    '<button type="button" data-ref-left="explore"><span>◈</span><b>Explorar</b></button>'+
    '<button type="button" data-ref-left="trending"><span>♨</span><b>Em alta</b></button>'+
    '<button type="button" data-ref-left="releases"><span>▣</span><b>Lançamentos</b></button>'+
    '<button type="button" data-ref-left="music"><span>♫</span><b>LX Music</b></button>'+
    '<button type="button" data-ref-left="community"><span>◎</span><b>Comunidade</b></button>';
  nav.addEventListener('click',function(e){
    var b=e.target.closest('[data-ref-left]');if(!b)return;
    var v=b.getAttribute('data-ref-left');
    if(v==='home')home();
    else if(v==='music')music();
    else if(v==='community')community();
    else if(v==='explore'){var input=$('searchInput');if(input){input.focus();input.select&&input.select()}}
    else if(v==='trending'){if(!scrollNamed(/Em alta|bombando|Top 10/i))home()}
    else if(v==='releases'){setCategory('Lançamentos');setTimeout(function(){scrollNamed(/Lançamentos|Recentemente/i)},80)}
    qa('[data-ref-left]',nav).forEach(function(x){x.classList.toggle('active',x===b)});
  });
}

function greeting(){
  var app=$('app');if(!app||app.classList.contains('hidden'))return;
  var g=q('.lx-ref-greeting-card',app);
  if(!g){g=document.createElement('div');g.className='lx-ref-greeting-card';app.appendChild(g)}
  g.innerHTML='<strong><i>✦</i>'+esc(daypart()+', '+userName().toLowerCase()+'!')+' 👋</strong><small>Pronto para descobrir algo incrível hoje?</small>';
}

function decorateCommunity(){
  var drawer=$('lxCommunityDrawer');if(!drawer)return;
  var head=q('.lx-community-head',drawer);if(!head)return;
  var title=q('.lx261-social-title',head)||q('div',head);
  if(title&&!title.dataset.lxReference){
    title.dataset.lxReference='1';
    var span=q('span',title),h=q('h2',title),p=q('p',title);
    if(span)span.textContent='LX COMMUNITY';
    if(h)h.textContent='LX Community';
    if(p)p.textContent='Converse, compartilhe e viva o universo LX.';
  }
  if(!q('.lx-ref-community-search',drawer)){
    var tools=q('.lx40-community-tools',drawer);
    if(tools){
      var search=document.createElement('button');
      search.type='button';search.className='lx-ref-community-search';
      search.innerHTML='⌕ &nbsp; Buscar conversas, pessoas, grupos ou mensagens…';
      search.onclick=function(){var old=qa('button',tools).find(function(x){return /Pesquisar/i.test(x.textContent)});old&&old.click()};
      tools.parentNode.insertBefore(search,tools);
    }
  }
}

function decorateMusic(){
  var isMusic=!!(window.LX&&LX.ui&&LX.ui.state&&LX.ui.state.mode==='Ouvir');
  var app=$('app');if(app)app.classList.toggle('lx-music-mode',isMusic);
  if(!isMusic)return;
  var side=q('.lx-music-sidebar,.lx-music-side');
  if(side){
    var brand=q('.lx40-music-brand',side);
    if(brand){var txt=q('span',brand);if(txt)txt.innerHTML='LX Music<small>Seu universo musical</small>'}
  }
}

function adminRoute(page){if(window.LX&&LX.admin&&LX.admin.render)LX.admin.render(page)}
function adminTop(){
  var m=$('adminMain');if(!m)return null;
  var bar=q('.lx-ref-admin-top',m);
  if(bar)return bar;
  bar=document.createElement('div');bar.className='lx-ref-admin-top';
  bar.innerHTML=
    '<label class="lx-ref-admin-search"><span>⌕</span><input id="lxRefAdminSearch" placeholder="Buscar no admin..." autocomplete="off"><kbd>Ctrl + K</kbd></label>'+
    '<div class="lx-ref-admin-user"><button class="bell" type="button" aria-label="Notificações">♧</button><div class="avatar">'+esc(initials(userName()))+'</div><div><strong>'+esc(userName())+'</strong><small>Administrador</small></div></div>';
  m.prepend(bar);
  var input=$('lxRefAdminSearch');
  if(input)input.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return;
    var v=clean(input.value).toLowerCase();
    if(/filme/.test(v))adminRoute('movies');else if(/serie|série|anime|dorama/.test(v))adminRoute('series');
    else if(/music|música/.test(v))adminRoute('music');else if(/livro/.test(v))adminRoute('books');
    else if(/erro/.test(v))adminRoute('v40errors');else if(/ranking/.test(v))adminRoute('v40ranking');
    else if(/import/.test(v))adminRoute('importer');else if(/usu|aprova|comun/.test(v))adminRoute('community');
  });
  return bar;
}
function score(u){
  return Number(u.monthly_score!=null?u.monthly_score:u.monthlyScore!=null?u.monthlyScore:(Number(u.watched||0)+Number(u.listened||0)+Number(u.read||0)*6))||0;
}
function renderAdminReference(){
  if(!window.LX||!LX.data)return;
  var m=$('adminMain');if(!m)return;
  var D=LX.data,c=D.catalog?D.catalog():[],users=D.users?D.users():[],events=D.analytics?D.analytics():[],req=D.requests?D.requests():[];
  var movies=c.filter(function(x){return x.type==='Filme'}).length;
  var musicCount=c.filter(function(x){return x.type==='Música'}).length;
  var lives=c.filter(function(x){return x.type==='Ao Vivo'&&x.published!==false}).length;
  var ranked=users.slice().sort(function(a,b){return score(b)-score(a)}).slice(0,3);
  var now=new Date(),month=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(now).replace(/^./,function(x){return x.toUpperCase()});
  var end=new Date(now.getFullYear(),now.getMonth()+1,1),diff=Math.max(0,end-now),days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000);
  var activities=events.slice(-5).reverse();
  var openReq=req.filter(function(x){return !['Concluído','Fechado','Recusado'].includes(x.status)}).length;
  var pendingUsers=users.filter(function(x){return !x.approved&&!x.admin&&x.approvalStatus!=='rejected'}).length;

  m.innerHTML=
    '<div class="lx-ref-admin-top">'+
      '<label class="lx-ref-admin-search"><span>⌕</span><input id="lxRefAdminSearch" placeholder="Buscar no admin..." autocomplete="off"><kbd>Ctrl + K</kbd></label>'+
      '<div class="lx-ref-admin-user"><button class="bell" type="button" aria-label="Notificações">♧</button><div class="avatar">'+esc(initials(userName()))+'</div><div><strong>'+esc(userName())+'</strong><small>Administrador</small></div></div>'+
    '</div>'+
    '<section class="lx-ref-admin-hero"><div><h1>'+esc(daypart()+', '+userName()+'!')+' 👋</h1><p>Aqui está o resumo da sua plataforma hoje.</p></div><div class="lx-ref-admin-quote">“Mais conteúdo para mais pessoas, sempre.”<br><small>LX Admin</small></div></section>'+
    '<section class="lx-ref-kpis">'+
      kpi('♟','Usuários',users.length,'base cadastrada')+
      kpi('▣','Filmes',movies,'catálogo')+
      kpi('♫','Músicas',musicCount,'LX Music')+
      kpi('◉','Lives',lives,'ativas/publicadas')+
      kpi('△','Erros','—','carregando','errors')+
      kpi('☁','Importações','—','carregando','imports')+
    '</section>'+
    '<section class="lx-ref-admin-grid">'+
      '<article class="lx-ref-box">'+
        '<div class="lx-ref-box-head"><div><h2>☁ &nbsp; LX Smart Import</h2><p>Importe filmes, séries, músicas e mais de forma inteligente.</p></div><button type="button" data-ref-admin-route="importer">Ver histórico</button></div>'+
        '<div class="lx-ref-import-tabs"><button class="active" type="button" data-ref-admin-route="importer">◭ Google Drive</button><button type="button" data-ref-admin-route="importer">▤ CSV</button><button type="button" data-ref-admin-route="importer">{ } JSON</button><button type="button" data-ref-admin-route="importer">↗ URL(s)</button></div>'+
        '<div class="lx-ref-import-input"><div class="ico">◭</div><input value="" placeholder="Cole o link da pasta ou arquivo do Google Drive" aria-label="Link para importação"><button type="button" data-ref-admin-route="importer">Importar agora</button></div>'+
        '<div class="lx-ref-queue"><div class="lx-ref-queue-line"><strong>Fila de importação</strong><span id="lxRefImportState">Pronta para nova importação</span></div><div class="lx-ref-progress"><i id="lxRefImportProgress"></i></div><div class="lx-ref-queue-line"><span>Detecção · validação · duplicados · processamento</span><span>Smart Import</span></div></div>'+
      '</article>'+
      '<article class="lx-ref-box lx-ref-rank-card">'+
        '<div class="lx-ref-box-head"><div><h2>🏆 &nbsp; Ranking da Comunidade</h2><p>Engajamento que recompensa. Top usuários do mês.</p></div><button type="button" data-ref-admin-route="v40ranking">Gerenciar ranking</button></div>'+
        '<div class="lx-ref-rank-banner"><div><small>TEMPORADA ATUAL</small><strong>'+esc(month)+'</strong></div><div class="lx-ref-rank-prize"><small>PRÊMIO DO MÊS</small><strong>R$100</strong></div><div><small>TERMINA EM</small><strong>'+days+'d '+hours+'h</strong></div></div>'+
        '<div class="lx-ref-podium">'+podium(ranked[1],2)+podium(ranked[0],1)+podium(ranked[2],3)+'</div>'+
      '</article>'+
    '</section>'+
    '<section class="lx-ref-admin-bottom">'+
      '<article class="lx-ref-box"><div class="lx-ref-box-head"><div><h2>◷ &nbsp; Atividades Recentes</h2><p>Últimas ações registradas no sistema.</p></div><button type="button" data-ref-admin-route="analytics">Ver todas</button></div><div class="lx-ref-activity">'+
        (activities.length?activities.map(activityRow).join(''):'<div class="lx-ref-activity-row"><time>Agora</time><span>Sistema pronto para registrar atividades.</span><small>LX</small></div>')+
      '</div></article>'+
      '<article class="lx-ref-box"><div class="lx-ref-box-head"><div><h2>◇ &nbsp; Moderação e Auditoria</h2><p>Itens que podem precisar de atenção.</p></div></div><div class="lx-ref-attention">'+
        attention('Contas pendentes de aprovação',pendingUsers,'community')+
        attention('Pedidos e problemas em aberto',openReq,'requests')+
        attention('Erros recentes no sistema','…','v40errors')+
        attention('Links e fontes cadastradas','↗','v40linkhealth')+
      '</div></article>'+
      '<article class="lx-ref-box"><div class="lx-ref-box-head"><div><h2>⚡ &nbsp; Ações Rápidas</h2><p>Acesso direto às funções principais.</p></div></div><div class="lx-ref-action-grid">'+
        '<button type="button" data-ref-admin-route="importer">☁ Nova Importação</button>'+
        '<button type="button" data-ref-admin-edit="Filme">▣ Adicionar Filme</button>'+
        '<button type="button" data-ref-admin-edit="Série">▤ Adicionar Série</button>'+
        '<button type="button" data-ref-admin-edit="Música">♫ Adicionar Música</button>'+
        '<button type="button" data-ref-admin-route="community">♟ Gerenciar Usuários</button>'+
        '<button type="button" data-ref-admin-route="v40errors">△ Ver Erros</button>'+
      '</div></article>'+
    '</section>';
  bindAdminReference(m);
  hydrateAdminCloud();
}
function kpi(icon,label,value,note,key){
  return '<article class="lx-ref-kpi"><span><i>'+icon+'</i>'+esc(label)+'</span><strong'+(key?' data-ref-kpi="'+key+'"':'')+'>'+esc(String(value))+'</strong><small>'+esc(note)+'</small></article>';
}
function podium(u,place){
  if(!u)return '<article class="'+(place===1?'first':'')+'"><div class="av">LX</div><b>Em aberto</b><small>'+place+'º lugar</small></article>';
  return '<article class="'+(place===1?'first':'')+'"><div class="av">'+esc(initials(u.name))+'</div><b>'+esc(u.name||'Usuário')+'</b><small>'+fmt(score(u))+' pontos · '+place+'º</small></article>';
}
function activityRow(e){
  var d=new Date(e.at||Date.now()),time=isNaN(+d)?'—':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  var title=clean(e.event||e.type||'Atividade'),detail=e.data&&e.data.title?e.data.title:(e.data&&e.data.detail?e.data.detail:'LX Plus');
  return '<div class="lx-ref-activity-row"><time>'+esc(time)+'</time><span>'+esc(title)+'</span><small>'+esc(detail)+'</small></div>';
}
function attention(label,n,page){
  return '<button type="button" data-ref-admin-route="'+esc(page)+'"><span>'+esc(label)+'</span><b>'+esc(String(n))+' ›</b></button>';
}
function bindAdminReference(root){
  qa('[data-ref-admin-route]',root).forEach(function(b){b.onclick=function(){adminRoute(b.getAttribute('data-ref-admin-route'))}});
  qa('[data-ref-admin-edit]',root).forEach(function(b){b.onclick=function(){var type=b.getAttribute('data-ref-admin-edit');if(LX.admin&&LX.admin.edit)LX.admin.edit(null,type)}});
  var input=$('lxRefAdminSearch');
  if(input)input.onkeydown=function(e){
    if(e.key!=='Enter')return;var v=clean(input.value).toLowerCase();
    if(/filme/.test(v))adminRoute('movies');else if(/serie|série|anime|dorama/.test(v))adminRoute('series');
    else if(/music|música/.test(v))adminRoute('music');else if(/livro/.test(v))adminRoute('books');
    else if(/erro/.test(v))adminRoute('v40errors');else if(/ranking/.test(v))adminRoute('v40ranking');
    else if(/import/.test(v))adminRoute('importer');else if(/link/.test(v))adminRoute('v40linkhealth');else if(/usu|aprova|comun/.test(v))adminRoute('community');
  };
}
async function countTable(table){
  try{
    var db=LX.cloud&&LX.cloud.db&&LX.cloud.db();if(!db)return null;
    var r=await db.from(table).select('id',{head:true,count:'exact'});
    return r.error?null:Number(r.count||0);
  }catch(_){return null}
}
async function hydrateAdminCloud(){
  var err=await countTable('lx_client_errors'),imp=await countTable('lx_import_batches');
  var e=q('[data-ref-kpi="errors"]'),i=q('[data-ref-kpi="imports"]');
  if(e)e.textContent=err==null?'0':fmt(err);
  if(i)i.textContent=imp==null?'0':fmt(imp);
}

function wrapAdmin(){
  if(!window.LX||!LX.admin||!LX.admin.render||LX.admin.render.__lxReference)return;
  var old=LX.admin.render.bind(LX.admin);
  var wrapped=function(page){
    page=page||'dashboard';
    if(page==='dashboard'){
      if(LX.ui&&LX.ui.state)LX.ui.state.adminPage='dashboard';
      renderAdminReference();
      qa('#adminNav [data-admin]').forEach(function(b){b.classList.toggle('active',b.dataset.admin==='dashboard')});
      return;
    }
    var r=old(page);
    setTimeout(function(){adminTop()},0);
    return r;
  };
  wrapped.__lxReference=true;
  LX.admin.render=wrapped;
}
function syncAdmin(){
  if(!window.LX||!LX.ui||!LX.ui.state)return;
  if(LX.ui.state.screen==='admin'){
    wrapAdmin();
    if((LX.ui.state.adminPage||'dashboard')==='dashboard'&&!q('.lx-ref-admin-hero',$('adminMain')))renderAdminReference();
    else adminTop();
  }
}

function wrapApp(){
  if(!window.LX||!LX.ui||!LX.ui.renderApp||LX.ui.renderApp.__lxReference)return;
  var old=LX.ui.renderApp.bind(LX.ui);
  var wrapped=function(){
    var out=old.apply(null,arguments);
    queueMicrotask(enhance);
    setTimeout(enhance,50);
    return out;
  };
  wrapped.__lxReference=true;
  LX.ui.renderApp=wrapped;
}
function enhance(){
  if(!window.LX||!LX.ui)return;
  installTopNav();
  installLeftNav();
  syncTopNav();
  greeting();
  decorateMusic();
  decorateCommunity();
  syncAdmin();
  var meta=q('meta[name="lxplus-build"]');if(meta)meta.content=BUILD;
  if(LX.config)LX.config.version=BUILD;
}
function commandShortcut(e){
  if(!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=='k')return;
  if(LX&&LX.v40&&LX.v40.openCommandPalette)return;
  var a=$('lxRefAdminSearch');if(a&&LX.ui&&LX.ui.state&&LX.ui.state.screen==='admin'){e.preventDefault();a.focus();a.select&&a.select();return}
  var s=$('searchInput');if(s){e.preventDefault();s.focus();s.select&&s.select()}
}
document.addEventListener('keydown',commandShortcut);

function wait(){
  if(!window.LX||!LX.ui||!LX.data){setTimeout(wait,80);return}
  wrapApp();wrapAdmin();enhance();
  var mo=new MutationObserver(function(records){
    var relevant=records.some(function(r){return r.addedNodes&&r.addedNodes.length});
    if(relevant)requestAnimationFrame(enhance);
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',function(){setTimeout(enhance,0)});
  window.addEventListener('resize',function(){requestAnimationFrame(decorateMusic)},{passive:true});
  console.info('[LX Plus]',BUILD,'reference UI ready');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();