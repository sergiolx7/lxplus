import {db,categories,getCatalog,getProfile,getUserState,isAdmin,switchToRecoveryLogin,saveUserField,sourceFor} from './data.js';
import {renderPremiumCatalog} from './premium-ui.js';
import {attachPlayer} from './universal-player.js';
import {MusicDock} from './music-dock.js';
import {Calls} from './calls.js';
import {createTelemetry,socialDirectory} from './services.js';
import {uuid,esc,https,avatar,empty,icon,duration} from './ui.js';
import {showAuthError} from './auth-feedback.js';

const root=document.querySelector('#app');
const A={user:null,profile:null,admin:false,stored:{},items:[],members:[],page:'Início',term:'',auth:'login',catalogStatus:'loading',generation:0,routeGeneration:0,routeKey:'',controller:null,modal:null,playerCleanup:null,unread:0,presence:0,activity:null,telemetry:null,calls:null,noticeChannel:null,heartbeatTimer:null,initializing:false};
const pages=[['Início','home'],['Filmes','film'],['Séries','series'],['Músicas','music'],['Livros','book'],['Comunidade','social'],['Minha Lista','heart'],['Playlists','list'],['Ranking','trophy'],['Avisos','bell'],['Perfil','user'],['Suporte','support']];
const routeFiles={Filmes:['catalog','mount'],Séries:['catalog','mount'],Livros:['catalog','mount'],'Ao vivo':['catalog','mount'],Buscar:['catalog','mount'],Músicas:['music','mount'],Playlists:['music','mount'],Comunidade:['social','mount'],Perfil:['account','mount'],Suporte:['account','mountSupport'],Avisos:['notifications','mount'],'Minha Lista':['library','mount'],Ranking:['library','mountRanking'],Administração:['studio','mount']};
const timed=(promise,label,ms=12000)=>{let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' demorou para responder. Verifique a conexão e tente novamente.')),ms))]).finally(()=>clearTimeout(timer))};
const brand=()=>'<span class="brand-logo">LX</span><span class="brand-title"><b>plus<span>.</span></b><small>ENTRETENIMENTO & CONEXÕES</small></span>';
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=String(message);document.body.appendChild(el);setTimeout(()=>el.remove(),5500)}
const approved=()=>A.admin||A.profile?.approved===true||A.profile?.approval_status==='approved';
const saved=()=>new Set((Array.isArray(A.stored.list)?A.stored.list:[]).map(String));

function authForm(){
 if(A.auth==='reset')return '<form id="reset" class="form"><label class="field">Seu e-mail<input name="email" type="email" autocomplete="email" required></label><button class="btn primary wide">Enviar recuperação</button><button class="link" type="button" data-auth="login">Voltar para entrar</button></form>';
 if(A.auth==='password')return '<form id="newPassword" class="form"><label class="field">Nova senha<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="field">Confirmar senha<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn primary wide">Salvar nova senha</button></form>';
 if(A.auth==='signup')return '<form id="signup" class="form"><label class="field">Como podemos chamar você?<input name="name" minlength="2" maxlength="60" autocomplete="name" required></label><label class="field">Seu e-mail<input name="email" type="email" autocomplete="email" required></label><label class="field">Crie uma senha<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn primary wide">Criar minha conta</button><small>Confirme seu e-mail para continuar. A aprovação da equipe pode ser necessária.</small></form>';
 return '<form id="signin" class="form"><label class="field">Seu e-mail<input name="email" type="email" autocomplete="email" placeholder="voce@exemplo.com" required></label><label class="field">Sua senha<input name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required></label><button class="btn primary wide">Entrar na LX Plus '+icon('arrow')+'</button><div class="actions"><button class="link" type="button" data-auth="reset">Esqueci minha senha</button><button class="link" type="button" id="resend">Reenviar confirmação</button></div></form>';
}
function renderAuth(){
 root.innerHTML='<main class="auth"><section class="auth-left"><a class="brand" href="#">'+brand()+'</a><div class="auth-art" aria-hidden="true"><div class="auth-ring ring-one"></div><div class="auth-ring ring-two"></div><span class="auth-art-mark">LX<span>PLUS</span></span><span class="auth-art-note">SEU MUNDO, CONECTADO.</span></div><div class="auth-copy"><span class="premium-overline">UMA NOVA FORMA DE VIVER O ENTRETENIMENTO</span><h1>Boas histórias.<br>Melhores conexões.</h1><p>Filmes, séries, música e livros.<br>Um universo que combina com você.</p><div class="auth-categories"><span>'+icon('film')+' Cinema</span><span>'+icon('music')+' Música</span><span>'+icon('book')+' Livros</span><span>'+icon('social')+' Comunidade</span></div></div><footer>Desenvolvido pela <strong>LX Group</strong><span>© 2026 LX Plus</span></footer></section><section class="auth-right"><div class="auth-card"><span class="premium-overline">SEU PRÓXIMO PLAY COMEÇA AQUI</span><h2>'+({login:'Que bom ter você aqui.',signup:'Seu universo começa agora.',reset:'Vamos recuperar seu acesso.',password:'Crie uma nova senha.'}[A.auth])+'</h2><p>'+({login:'Entre para continuar de onde parou.',signup:'Crie sua conta e descubra a LX Plus.',reset:'Enviaremos as instruções para seu e-mail.',password:'Escolha uma senha com pelo menos 8 caracteres.'}[A.auth])+'</p>'+(['login','signup'].includes(A.auth)?'<div class="auth-tabs"><button type="button" data-auth="login" class="'+(A.auth==='login'?'active':'')+'">Entrar</button><button type="button" data-auth="signup" class="'+(A.auth==='signup'?'active':'')+'">Criar conta</button></div>':'')+authForm()+'<div class="auth-secure">'+icon('check')+' Sua conta e suas preferências ficam com você.</div></div><small class="auth-signature">LX PLUS · PELA LX GROUP</small></section></main>';
}
function showError(message){root.innerHTML='<main class="full-screen"><div class="brand">'+brand()+'</div><div class="panel"><h2>Vamos tentar de novo.</h2><p>'+esc(message)+'</p><div class="actions"><button class="btn primary" id="retry">Tentar novamente</button><button class="btn" id="manualLogin">Entrar com e-mail e senha</button></div></div></main>'}
function showGate(){root.innerHTML='<main class="full-screen"><div class="brand">'+brand()+'</div><div class="panel"><span class="badge">Aguardando aprovação</span><h2>Seu cadastro está com a equipe.</h2><p>Depois da confirmação por e-mail e da aprovação, seu acesso será liberado aqui.</p><div class="actions"><button class="btn primary" id="retry">Verificar acesso</button><button class="btn" id="signout">Sair</button></div></div></main>'}
function nav(name,symbol,mobile=false){return '<button type="button" class="'+(mobile?'mobile-button':'nav-btn')+(A.page===name?' active':'')+'" data-page="'+esc(name)+'">'+icon(symbol)+'<span>'+esc(name==='Músicas'?'LX Music':name==='Comunidade'?'LX Social':name==='Avisos'?'Notificações':name)+'</span></button>'}
function shell(){
 const primary=pages.slice(0,6).map(p=>nav(...p)).join(''),collection=pages.slice(6,9).map(p=>nav(...p)).join(''),account=pages.slice(9).map(p=>nav(...p)).join('')+(A.admin?nav('Administração','settings'):'');
 root.innerHTML='<div class="shell"><aside class="aside"><button class="brand brand-button" data-page="Início">'+brand()+'</button><div class="sidebar-scroll"><nav class="nav-group"><span class="nav-label">DESCUBRA</span>'+primary+'</nav><nav class="nav-group"><span class="nav-label">SUA BIBLIOTECA</span>'+collection+'</nav><nav class="nav-group"><span class="nav-label">SEU ESPAÇO</span>'+account+'</nav></div><button class="sidebar-profile" data-page="Perfil">'+avatar(A.profile,'sidebar-avatar')+'<span><strong id="sidebarProfileName">'+esc(A.profile?.name||'Membro LX')+'</strong><small>'+esc(A.profile?.username?'@'+A.profile.username:'Sua conta LX Plus')+'</small></span>'+icon('arrow')+'</button><small class="sidebar-signature">Desenvolvido pela LX Group</small></aside><div class="content"><header class="topbar"><div class="top-context"><span class="top-live-dot"></span><span id="pageTitle">'+esc(A.page)+'</span></div><label class="header-search">'+icon('search')+'<input id="search" type="search" placeholder="Sua próxima descoberta…" aria-label="Buscar filmes, séries, músicas e livros" value="'+esc(A.term)+'"><kbd>Ctrl K</kbd></label><span class="header-presence" id="headerPresence"></span><button class="header-notifications" data-page="Avisos" aria-label="Abrir notificações">'+icon('bell')+'<span id="noticeBadge" hidden></span></button><details class="compact-menu"><summary aria-label="Abrir menu">'+icon('list')+'</summary><nav class="compact-menu-panel">'+primary+collection+account+'</nav></details><button class="avatar-button" data-page="Perfil" aria-label="Abrir seu perfil">'+avatar(A.profile,'header-avatar')+'</button></header><main id="pageArea" class="page"></main><footer class="site-footer"><span>LX PLUS <i>por LX Group</i></span><button class="link" data-page="Suporte">Precisa de ajuda?</button></footer></div></div><nav class="mobile-nav" aria-label="Navegação principal">'+[['Início','home'],['Filmes','film'],['Músicas','music'],['Comunidade','social'],['Minha Lista','heart']].map(p=>nav(...p,true)).join('')+'</nav><div id="layer"></div>';
 refreshBadges();
}
function refreshBadges(){const n=document.querySelector('#noticeBadge');if(n){n.hidden=!A.unread;n.textContent=A.unread>99?'99+':String(A.unread)}const presence=document.querySelector('#headerPresence');if(presence)presence.textContent=A.presence?A.presence+' na comunidade':''}
async function refreshNotifications(){if(!A.user)return;const r=await db.from('lx_user_notifications').select('id',{count:'exact',head:true}).eq('user_id',A.user.id).is('read_at',null);if(!r.error){A.unread=r.count||0;refreshBadges()}}
let listeningSession=null,listeningTrack=null;
const musicDock=new MusicDock({resolve:sourceFor,onError:message=>{toast(message);A.telemetry?.record('playback','music',message)},onTrack(item,{embedded}){
 A.activity={activity_type:'music',activity_title:item.title,activity_subtitle:item.artist||'',activity_cover:item.cover||''};heartbeat().catch(()=>{});
 if(listeningTrack!==String(item.id)){listeningTrack=String(item.id);listeningSession=uuid()}
 if(A.user){const current={...(A.stored.musicHistory||{}),[item.id]:new Date().toISOString()};A.stored.musicHistory=current;saveUserField(A.user.id,'musicHistory',current).then(state=>A.stored=state).catch(()=>{})}
},onListening(item,total){if(A.user&&listeningSession&&total>0)db.rpc('lx_record_listening',{p_session:listeningSession,p_track:String(item.id),p_title:String(item.title).slice(0,200),p_artist:String(item.artist||'').slice(0,200),p_total:total}).then(r=>{if(r.error)console.warn('Histórico musical temporariamente indisponível.')})}});
function context(){return {user:A.user,admin:A.admin,page:A.page,term:A.term,state:()=>A.stored,setState:value=>A.stored=value,profile:()=>A.profile,setProfile:p=>{A.profile=p;const node=document.querySelector('#sidebarProfileName');if(node)node.textContent=p.name},directory:()=>A.members,setDirectory:rows=>A.members=rows,music:musicDock,calls:A.calls,toast,openItem:modal,play,refreshCatalog:()=>loadCatalog(),refreshNotifications,heartbeat,diagnostics:()=>A.telemetry?.diagnostics()||{}}}
function disposeRoute(){A.controller?.destroy?.();A.controller=null;A.routeKey='';++A.routeGeneration}
async function draw(){
 if(!A.user){renderAuth();return}if(!approved()){showGate();return}if(!document.querySelector('.shell'))shell();
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===A.page));
 document.querySelector('#pageTitle').textContent=A.page==='Músicas'?'LX Music':A.page==='Comunidade'?'LX Social':A.page;
 const key=A.page+'|'+A.term;if(A.routeKey===key)return;
 disposeRoute();A.routeKey=key;const generation=A.routeGeneration,area=document.querySelector('#pageArea'),host=document.createElement('div');host.className='route-content';area.replaceChildren(host);
 if(A.page==='Início'&&!A.term){host.innerHTML=renderPremiumCatalog({items:A.items,page:A.page,history:A.stored.history||{},list:A.stored.list||[],catalogStatus:A.catalogStatus});return}
 if(A.page==='Administração'&&!A.admin){host.innerHTML=empty('Esta área é restrita.');return}
 const route=routeFiles[A.page]||routeFiles.Buscar;host.innerHTML='<div class="module-loading"><span class="loading-orbit"></span><p>Preparando seu espaço…</p></div>';
 try{const module=await import('./modules/'+route[0]+'.js'+new URL(import.meta.url).search);const controller=await timed(module[route[1]](host,context()),'Esta seção',25000);if(generation!==A.routeGeneration){controller?.destroy?.();return}A.controller=controller;A.telemetry?.record('page',A.page)}
 catch(error){if(generation===A.routeGeneration){host.innerHTML=empty('Não foi possível abrir esta seção.',error.message,'<button class="btn primary" data-retry-module>Tentar novamente</button>');A.telemetry?.record('error','route:'+A.page,error.message)}}
}
function navigate(page,{term='',push=true}={}){closeModal();A.page=routeFiles[page]||page==='Início'?page:'Início';A.term=term;const search=document.querySelector('#search');if(search)search.value=term;if(push)history.pushState({page:A.page,term},'',location.pathname+location.search+'#'+encodeURIComponent(A.page));draw();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
async function loadCatalog(generation=A.generation){A.catalogStatus='loading';try{const rows=await timed(getCatalog(),'O catálogo',22000);if(generation!==A.generation||!A.user)return;A.items=rows;A.catalogStatus='ready'}catch(error){if(generation!==A.generation)return;A.catalogStatus='error';A.telemetry?.record('error','catalog',error.message)}if(A.page==='Início'){A.routeKey='';draw()}}
async function heartbeat(){
 if(!A.user||!approved())return;const preferences=A.stored.preferences||{},status=preferences.presenceStatus==='offline'?'offline':document.hidden?'away':preferences.presenceStatus||'online',privacy=A.profile?.activity_visible===false?'nobody':preferences.presencePrivacy||'friends';
 const activity=privacy==='nobody'?{activity_type:null,activity_title:null,activity_subtitle:null,activity_cover:null}:A.activity||{activity_type:null,activity_title:null,activity_subtitle:null,activity_cover:null};
 const r=await db.from('lx_presence').upsert({user_id:A.user.id,status,privacy,...activity,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(r.error)return;
 const visible=await db.rpc('lx_presence_for_viewer');if(!visible.error){A.presence=(visible.data||[]).filter(p=>p.status==='online'&&Date.now()-new Date(p.updated_at).valueOf()<90000).length;refreshBadges()}
}
function startMemberServices(){
 A.telemetry?.destroy();A.telemetry=createTelemetry(A.user.id);A.telemetry.record('performance','app_ready','',performance.now());
 A.calls?.destroy();A.calls=new Calls({userId:A.user.id,toast,directory:()=>A.members});clearInterval(A.heartbeatTimer);A.heartbeatTimer=setInterval(()=>heartbeat().catch(()=>{}),25000);heartbeat().catch(()=>{});
 if(A.noticeChannel)db.removeChannel(A.noticeChannel);A.noticeChannel=db.channel('lx-notice-badge-'+A.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_user_notifications',filter:'user_id=eq.'+A.user.id},()=>refreshNotifications().catch(()=>{})).subscribe();refreshNotifications().catch(()=>{});
 socialDirectory().then(rows=>{if(A.user)A.members=rows}).catch(()=>{});
}
function clearMemberServices(){
 disposeRoute();closeModal();musicDock.close();A.calls?.destroy();A.calls=null;A.telemetry?.destroy();A.telemetry=null;clearInterval(A.heartbeatTimer);A.heartbeatTimer=null;if(A.noticeChannel){db.removeChannel(A.noticeChannel);A.noticeChannel=null}
}
async function initialize(){
 const generation=++A.generation;A.initializing=true;root.innerHTML='<div class="loading"><span class="loading-orbit"></span>Preparando seu universo LX…</div>';
 try{
  const {data,error}=await timed(db.auth.getSession(),'A autenticação',9000);if(generation!==A.generation)return;if(error)throw error;A.user=data.session?.user||null;if(!A.user){renderAuth();return}if(A.auth==='password'){renderAuth();return}
  const [profile,admin,state]=await timed(Promise.all([getProfile(A.user.id),isAdmin(),getUserState(A.user.id)]),'Seu perfil',12000);if(generation!==A.generation)return;A.profile=profile;A.admin=admin;A.stored=state;if(!approved()){showGate();return}
  A.routeKey='';shell();draw();startMemberServices();loadCatalog(generation);
 }catch(error){if(generation===A.generation)showError(error.message||'Não foi possível conectar à LX Plus.')}finally{if(generation===A.generation)A.initializing=false}
}
function modal(item){
 if(!item)return;closeModal();A.modal={item,focus:document.activeElement};
 const cover=https(item.cover),liked=saved().has(String(item.id));
 const layer=document.querySelector('#layer');if(!layer)return;
 layer.innerHTML='<div class="overlay"><section class="modal detail-modal" role="dialog" aria-modal="true" aria-label="'+esc(item.title)+'"><header class="modal-head"><span class="premium-overline">'+esc(item.type)+' · LX PLUS</span><button class="close" data-close aria-label="Fechar detalhes">×</button></header><div class="modal-body details"><div>'+(cover?'<img class="detail-poster" src="'+esc(cover)+'" alt="Capa de '+esc(item.title)+'">':'<div class="detail-placeholder">LX<span>PLUS</span></div>')+'</div><div><span class="premium-overline">'+esc([item.year,item.genre].filter(Boolean).join(' · '))+'</span><h2>'+esc(item.title)+'</h2><p>'+esc(item.description||item.desc||'Uma nova descoberta na LX Plus.')+'</p><small>'+esc(item.artist||item.author|| (Array.isArray(item.cast)?item.cast.slice(0,5).join(' · '):''))+'</small><div class="actions"><button class="btn primary" data-modal-play>'+icon('play')+' '+(item.type==='Música'?'Ouvir':item.type==='Livro'?'Ler agora':'Assistir')+'</button><button class="btn" data-modal-save>'+icon('heart')+' '+(liked?'Na sua lista':'Minha lista')+'</button></div><p id="detailStatus" role="status" class="muted"></p></div></div></section></div>';
 document.body.classList.add('modal-open');layer.querySelector('[data-close]')?.focus();
}
function closeModal(){if(A.playerCleanup){try{A.playerCleanup()}catch{}A.playerCleanup=null}const focus=A.modal?.focus;A.modal=null;document.querySelector('#layer')?.replaceChildren();document.body.classList.remove('modal-open');if(focus?.isConnected)focus.focus()}
async function toggleSaved(item){const previous=A.stored.list,list=saved();list.has(String(item.id))?list.delete(String(item.id)):list.add(String(item.id));A.stored.list=[...list].map(x=>/^\d+$/.test(x)?Number(x):x);try{A.stored=await saveUserField(A.user.id,'list',A.stored.list);toast('Sua lista foi atualizada.');modal(item);if(A.page==='Minha Lista'){A.routeKey='';draw()}}catch(error){A.stored.list=previous;toast(error.message)}}
function episodes(item){if(Array.isArray(item.episodes))return item.episodes;if(Array.isArray(item.seasons))return item.seasons.flatMap(s=>(s.episodes||[]).filter(e=>e&&typeof e==='object').map((e,n)=>({...e,season:s.season||s.number||1,episode:e.episode||n+1})));return []}
async function play(item,episodeIndex=null){
 try{
  if(item.type==='Livro'){const url=https(item.externalReadUrl||item.sourceUrl);if(!url)throw Error('Este livro ainda não possui uma fonte de leitura disponível.');if(/\.pdf(?:[?#]|$)/i.test(url)){showBook(item,url);return}window.open(url,'_blank','noopener,noreferrer');toast('Leitura aberta na fonte original.');return}
  const list=episodes(item);if(episodeIndex===null&&list.length)episodeIndex=Number(A.stored.history?.[item.id]?.episodeIndex)||0;
  const entry=episodeIndex!==null&&list[episodeIndex]?{...item,...list[episodeIndex],id:item.id,type:item.type,license:item.license,sourceVerified:item.sourceVerified||item.license?.authorized}:item;
  const source=await timed(sourceFor(entry),'A fonte de reprodução',15000);
  if(['unavailable','invalid'].includes(source.kind))throw Error(source.message||'Este título ainda não possui uma fonte compatível.');
  if(source.kind==='external'){const url=https(source.url);if(url)window.open(url,'_blank','noopener,noreferrer');toast(source.message||'Conteúdo aberto na origem.');return}
  if(item.type==='Música'&&['audio','hls','dash','iframe'].includes(source.kind)){await musicDock.open(item,source,A.items.filter(x=>x.type==='Música'));closeModal();return}
  showVideo(item,entry,source,list,episodeIndex);
 }catch(error){toast(error.message||'Não foi possível iniciar a reprodução.');A.telemetry?.record('playback',item.type==='Música'?'music':'video',error.message)}
}
function showBook(item,url){closeModal();A.modal={item,focus:document.activeElement};document.querySelector('#layer').innerHTML='<div class="overlay"><section class="modal reader-modal" role="dialog" aria-modal="true" aria-label="'+esc(item.title)+'"><div class="modal-head"><h2>'+esc(item.title)+'</h2><button class="close" data-close aria-label="Fechar livro">×</button></div><iframe class="book-reader" src="'+esc(url)+'" title="Leitura de '+esc(item.title)+'"></iframe><p class="muted reader-note">Se o navegador não conseguir abrir o documento, <a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">abra a versão original</a>.</p></section></div>';document.body.classList.add('modal-open');document.querySelector('[data-close]').focus()}
function showVideo(item,entry,source,list,index){
 closeModal();const token={item,focus:document.activeElement};A.modal=token;
 const iframe=source.kind==='iframe',kind=source.kind==='audio'?'audio':'video',layer=document.querySelector('#layer');
 const tracks=(Array.isArray(entry.subtitles)?entry.subtitles:[]).filter(t=>https(t.url)&&/\.vtt(?:[?#]|$)/i.test(t.url));
 layer.innerHTML='<div class="overlay"><section class="modal video-modal" role="dialog" aria-modal="true" aria-label="Reproduzindo '+esc(item.title)+'"><header class="modal-head"><div><small class="premium-overline">AGORA NA LX PLUS</small><h2>'+esc(entry.title||item.title)+'</h2></div><button class="close" data-close aria-label="Fechar reprodução">×</button></header><div class="modal-body">'+(iframe?'<div class="embed-wrap"><iframe class="player embed" src="'+esc(source.url)+'" title="'+esc(entry.title||item.title)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="muted">Os controles e as permissões desta reprodução são fornecidos por '+esc(source.provider)+'. Se a prévia não abrir, confira o compartilhamento ou abra na origem.</p>':'<'+kind+' id="mediaPlayer" class="player" controls playsinline preload="metadata" '+(tracks.length?'crossorigin="anonymous"':'')+' '+(https(item.cover)?'poster="'+esc(item.cover)+'"':'')+'>'+tracks.map(t=>'<track kind="subtitles" src="'+esc(t.url)+'" srclang="'+esc(t.lang||'pt-BR')+'" label="'+esc(t.label||t.lang||'Português')+'">').join('')+'</'+kind+'><div class="player-toolbar"><label>Velocidade <select id="playerSpeed"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label><label>Qualidade <select id="playerQuality" disabled><option value="-1">Automática / fonte original</option></select></label><button class="btn small" id="castMedia" hidden>Transmitir para TV</button><button class="btn small" id="fullscreenMedia">Tela cheia</button></div>')+'<div id="playerStatus" class="player-status" role="status"></div>'+(https(source.source||source.url)?'<a class="link" href="'+esc(source.source||source.url)+'" target="_blank" rel="noopener noreferrer">Abrir na origem ↗</a>':'')+(list.length?'<div class="episode-list"><h3>Temporadas e episódios</h3>'+list.map((e,n)=>'<button class="'+(n===index?'active':'')+'" data-player-episode="'+n+'"><span>T'+Number(e.season||1)+' · EP '+Number(e.episode||n+1)+'</span>'+esc(e.title||'Episódio '+(n+1))+'</button>').join('')+'</div>':'')+'</div></section></div>';
 document.body.classList.add('modal-open');layer.querySelector('[data-close]').focus();
 A.activity={activity_type:['Série','Dorama','Anime'].includes(item.type)?'series':'movie',activity_title:item.title,activity_subtitle:index!==null?'Temporada '+(entry.season||1)+' · Episódio '+(entry.episode||index+1):'',activity_cover:item.cover||''};heartbeat().catch(()=>{});
 const media=layer.querySelector('#mediaPlayer');if(!media)return;
 let previous=0,waitTimer=null,cleanup=null;
 const error=message=>{if(A.modal!==token)return;layer.querySelector('#playerStatus').textContent=message;A.telemetry?.record('playback','video',message)};
 const save=()=>{if(!A.user||!Number.isFinite(media.currentTime)||!Number.isFinite(media.duration)||String(item.id)==='preview')return;const position=Math.floor(media.currentTime),total=Math.floor(media.duration);A.stored.history={...(A.stored.history||{}),[item.id]:{position,duration:total,episodeIndex:index,updatedAt:new Date().toISOString()}};db.rpc('lx_save_watch_progress',{p_content:Number(item.id),p_progress:A.stored.history[item.id]}).then(r=>{if(r.error)console.warn('Progresso temporariamente indisponível.')})};
 media.addEventListener('loadedmetadata',()=>{const old=A.stored.history?.[item.id];if(old&&old.episodeIndex===index&&old.position>0&&old.position<media.duration-5)media.currentTime=old.position;else if(old&&index===null&&old.episodeIndex==null&&old.position>0&&old.position<media.duration-5)media.currentTime=old.position});
 media.addEventListener('timeupdate',()=>{if(media.currentTime-previous>=20){previous=media.currentTime;save()}});
 media.addEventListener('playing',()=>{clearTimeout(waitTimer);layer.querySelector('#playerStatus').textContent=''});
 media.addEventListener('waiting',()=>{clearTimeout(waitTimer);waitTimer=setTimeout(()=>{media.pause();error('A fonte demorou para responder. Verifique a conexão ou abra o arquivo na origem.')},20000)});
 media.addEventListener('ended',()=>{save();if(index!==null&&list[index+1])play(item,index+1)});
 layer.querySelector('#playerSpeed').onchange=e=>media.playbackRate=Number(e.target.value);
 layer.querySelector('#fullscreenMedia').onclick=()=>{if(media.requestFullscreen)media.requestFullscreen().catch(()=>{});else if(media.webkitEnterFullscreen)media.webkitEnterFullscreen()};
 const cast=layer.querySelector('#castMedia');if(media.remote?.prompt){cast.hidden=false;cast.onclick=()=>media.remote.prompt().catch(e=>toast(e.message||'Nenhuma TV compatível encontrada.'))}else if(media.webkitShowPlaybackTargetPicker){cast.hidden=false;cast.onclick=()=>media.webkitShowPlaybackTargetPicker()}
 A.playerCleanup=()=>{save();clearTimeout(waitTimer);cleanup?.();media.pause();media.removeAttribute('src');media.load()};
 attachPlayer(media,source,{onError:error,onQualities:(qualities,setQuality)=>{if(A.modal!==token)return;const select=layer.querySelector('#playerQuality');select.innerHTML='<option value="-1">Automática</option>'+qualities.map(q=>'<option value="'+q.id+'">'+esc(q.label)+'</option>').join('');select.disabled=!qualities.length;select.onchange=()=>setQuality(Number(select.value))}}).then(stop=>{cleanup=stop;if(A.modal!==token)stop()}).catch(e=>error(e.message));
}

let searchTimer;
root.addEventListener('input',event=>{if(event.target.id==='search'){clearTimeout(searchTimer);const value=event.target.value;searchTimer=setTimeout(()=>navigate(value.trim()?'Buscar':'Início',{term:value,push:false}),350)}});
root.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 try{
  if(button.dataset.page){button.closest('details')?.removeAttribute('open');navigate(button.dataset.page);return}
  if(button.dataset.auth){A.auth=button.dataset.auth;renderAuth();return}
  if(button.hasAttribute('data-retry-module')){A.routeKey='';draw();return}
  if(button.dataset.item){const item=A.items.find(x=>String(x.id)===button.dataset.item);if(item)modal(item);return}
  if(button.dataset.play){const item=A.items.find(x=>String(x.id)===button.dataset.play);if(item)await play(item);return}
  if(button.dataset.scroll){const rail=root.querySelector('[data-rail="'+CSS.escape(button.dataset.scroll)+'"]');rail?.scrollBy({left:(button.dataset.direction==='-1'?-1:1)*Math.max(240,rail.clientWidth*.8),behavior:'smooth'});return}
  if(button.hasAttribute('data-close')){closeModal();return}if(button.hasAttribute('data-modal-play')){if(A.modal)await play(A.modal.item);return}if(button.hasAttribute('data-modal-save')){if(A.modal)await toggleSaved(A.modal.item);return}
  if(button.dataset.playerEpisode!==undefined){if(A.modal)await play(A.modal.item,Number(button.dataset.playerEpisode));return}
  if(button.id==='retry'){await initialize();return}if(button.id==='retryCatalog'){await loadCatalog();return}
  if(button.id==='manualLogin'){++A.generation;clearMemberServices();const client=switchToRecoveryLogin();attachAuthListener(client);A.user=null;A.profile=null;A.auth='login';renderAuth();return}
  if(button.id==='signout'){await signout();return}
  if(button.id==='resend'){const email=root.querySelector('#signin [name="email"]')?.value?.trim();if(!email)throw Error('Digite seu e-mail primeiro.');const {error}=await timed(db.auth.resend({type:'signup',email}),'O envio');if(error)throw error;toast('Se necessário, a confirmação será reenviada.');return}
 }catch(error){toast(error.message||'Não foi possível concluir.')}
});
root.addEventListener('click',event=>{if(event.target.classList.contains('overlay'))closeModal()});
root.addEventListener('submit',async event=>{
 if(event.defaultPrevented)return;const form=event.target;if(!['signin','signup','reset','newPassword'].includes(form.id))return;event.preventDefault();const button=form.querySelector('button.btn');if(button.disabled)return;const originalLabel=button.innerHTML;button.disabled=true;button.textContent='Aguarde…';form.setAttribute('aria-busy','true');form.querySelector('[data-auth-error]')?.remove();const data=Object.fromEntries(new FormData(form));
 try{
  if(form.id==='signin'){const {error}=await timed(db.auth.signInWithPassword({email:String(data.email).trim(),password:String(data.password)}),'O login',12000);if(error)throw error;await initialize()}
  if(form.id==='signup'){const {data:created,error}=await timed(db.auth.signUp({email:String(data.email).trim(),password:String(data.password),options:{data:{name:String(data.name).trim()},emailRedirectTo:location.origin+location.pathname}}),'O cadastro');if(error)throw error;if(created.session)await initialize();else{A.auth='login';renderAuth();toast('Cadastro enviado. Confirme seu e-mail para continuar.')}}
  if(form.id==='reset'){const {error}=await timed(db.auth.resetPasswordForEmail(String(data.email).trim(),{redirectTo:location.origin+location.pathname+'?recovery=1'}),'A recuperação');if(error)throw error;A.auth='login';renderAuth();toast('Se a conta existir, você receberá as instruções por e-mail.')}
  if(form.id==='newPassword'){if(data.password!==data.confirm)throw Error('As senhas não coincidem.');const {error}=await timed(db.auth.updateUser({password:String(data.password)}),'A alteração');if(error)throw error;history.replaceState(null,'',location.pathname);A.auth='login';toast('Senha atualizada.');await initialize()}
 }catch(error){if(form.isConnected)showAuthError(form,error);else toast(error.message||'Não foi possível realizar essa ação.')}finally{if(button.isConnected){button.disabled=false;button.innerHTML=originalLabel;form.removeAttribute('aria-busy')}}
});
async function signout(){++A.generation;clearMemberServices();try{await timed(db.auth.signOut({scope:'local'}),'A saída',7000)}catch(error){toast(error.message)}A.user=null;A.profile=null;A.stored={};A.items=[];A.auth='login';renderAuth()}
function attachAuthListener(client=db){client.auth.onAuthStateChange((event,session)=>{
 if(client!==db)return;
 if(event==='PASSWORD_RECOVERY'){++A.generation;A.user=session?.user||null;A.auth='password';renderAuth()}
 if(event==='SIGNED_OUT'){++A.generation;clearMemberServices();A.user=null;A.profile=null;A.stored={};A.auth='login';renderAuth()}
 if(event==='SIGNED_IN'&&!A.initializing&&session?.user&&A.user?.id!==session.user.id&&A.auth!=='password')setTimeout(()=>initialize(),0);
})}
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();root.querySelector('#search')?.focus()}if(event.key==='Escape')closeModal();if(event.key==='Tab'&&A.modal){const modal=root.querySelector('#layer [role="dialog"]'),focusable=modal?.querySelectorAll('button,a[href],input,select,textarea,iframe,video[controls],audio[controls]');if(focusable?.length){const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}}});
document.addEventListener('visibilitychange',()=>heartbeat().catch(()=>{}));
window.addEventListener('popstate',event=>{const page=event.state?.page||decodeURIComponent(location.hash.slice(1))||'Início';navigate(page,{term:event.state?.term||'',push:false})});
window.addEventListener('pagehide',()=>{if(A.user)db.from('lx_presence').update({status:'offline',updated_at:new Date().toISOString()}).eq('user_id',A.user.id).then(()=>{});A.playerCleanup?.()});
attachAuthListener();
if(location.search.includes('recovery=1')||location.hash.includes('type=recovery'))A.auth='password';
else{const hash=decodeURIComponent(location.hash.slice(1));A.page=hash.startsWith('post=')?'Comunidade':routeFiles[hash]?hash:'Início'}
initialize();
