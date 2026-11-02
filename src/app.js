import {profileName,syncProfileBanners,observePremiumMedia} from './profile-premium.js';
import {WatchParty} from './watch-party.js';
import {mountRoute} from './route-lifecycle.js';
import {bindAmbientLight} from './ambient-light.js';
import {db,categories,getCatalog,getProfile,getUserState,itemFrom,isAdmin,switchToRecoveryLogin,saveUserField,sourceFor} from './data.js';
import {renderPremiumCatalog} from './premium-ui.js';
import {renderFoundersWall} from './founders-wall.js';
import {bindVideoSession,videoControls} from './video-session.js';
import {preferenceSync} from './preference-sync.js';
import {musicMix} from './music-discovery.js';
import {MusicDock} from './music-dock.js';
import {createLeagueSession,eligibleLeaguePlayback,playbackThreshold} from './league-activity.js';
import {Calls} from './calls.js';
import {createTelemetry,socialDirectory,catalogPage} from './services.js';
import {uuid,esc,https,avatar,verifiedBadge,empty,icon,duration} from './ui.js';
import {bindDisplayControls,bindDisplayAccount,writeDisplay,applyDisplay,readDisplay,greetingForHour,reconcileDisplay,markDisplaySynced} from './display-preferences.js';
import {showAuthError} from './auth-feedback.js';

const root=document.querySelector('#app');
const A={user:null,profile:null,admin:false,stored:{},items:[],members:[],page:'Início',term:'',auth:'login',catalogStatus:'loading',generation:0,routeGeneration:0,routeKey:'',controller:null,modal:null,playerCleanup:null,unread:0,presence:0,activity:null,telemetry:null,calls:null,party:null,noticeChannel:null,heartbeatTimer:null,initializing:false};
const pages=[['Início','home'],['Filmes','film'],['Séries','series'],['Músicas','music'],['Livros','book'],['Comunidade','social'],['Minha Lista','heart'],['Playlists','list'],['Ranking','trophy'],['Avisos','bell'],['Perfil','user'],['Suporte','support'],['Mural dos Fundadores','sparkles']];
const routeFiles={'LX IA':['assistant','mount'],Filmes:['catalog','mount'],Séries:['catalog','mount'],Livros:['catalog','mount'],'Ao vivo':['catalog','mount'],Buscar:['search','mount'],Músicas:['music','mount'],Playlists:['music','mount'],Comunidade:['social','mount'],Perfil:['account','mount'],Suporte:['account','mountSupport'],'Mural dos Fundadores':['founders','mount'],Avisos:['notifications','mount'],'Minha Lista':['library','mount'],Ranking:['library','mountRanking'],Administração:['studio','mount']};
const timed=(promise,label,ms=12000)=>{let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' demorou para responder. Verifique a conexão e tente novamente.')),ms))]).finally(()=>clearTimeout(timer))};
const brand=()=>'<span class="brand-logo"><img src="./assets/lx-face-3d.webp" width="44" height="44" alt="Carinha LX Plus: olhos em X"></span><span class="brand-title"><b>plus<span>.</span></b><small>ENTRETENIMENTO & CONEXÕES</small></span>';
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=String(message);document.body.appendChild(el);setTimeout(()=>el.remove(),5500)}
const accountPreferences=preferenceSync({save:saveUserField,onSaved(key,value){A.stored={...A.stored,[key]:value};const status=document.querySelector('[data-display-sync-status]');if(key==='displayPreferences'){markDisplaySynced(value);if(status)status.textContent='Aparência sincronizada com a sua conta.'}if(key==='playbackPreferences'){const playback=document.querySelector('[data-playback-status]');if(playback)playback.textContent='Reprodução sincronizada com a sua conta.'}},onError(_error,key){if(key==='playbackPreferences'){const playback=document.querySelector('[data-playback-status]');if(playback)playback.textContent='Preferências atualizadas nesta sessão. Não foi possível sincronizar agora.'}if(key!=='displayPreferences')return;const status=document.querySelector('[data-display-sync-status]');if(status)status.textContent='Salvo neste aparelho. Não foi possível sincronizar agora.'}});
function savePlaybackPreferences(value){A.stored.playbackPreferences=value;accountPreferences.write('playbackPreferences',value)}
const approved=()=>A.admin||A.profile?.approved===true||A.profile?.approval_status==='approved';
const saved=()=>new Set((Array.isArray(A.stored.list)?A.stored.list:[]).map(String));
let leagueLastInteraction=0,leagueInteractions=0,leagueActiveTicks=0,leagueDailyDone='',leagueDailyBusy=false,leagueTimeBusy=false,leagueLastMotion=0;
const leagueDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function checkDailyParticipation(){
 if(!A.user||!approved()||document.hidden||!document.hasFocus()||leagueDailyBusy)return;
 // Do not reward watching or listening to third-party embeds (e.g. YouTube).
 if(musicDock.embedded||document.querySelector('.embed-wrap iframe'))return;
 const now=Date.now(),today=leagueDay();
 if(leagueDailyDone===today||leagueInteractions<3||now-leagueLastInteraction>35000){leagueActiveTicks=0;return}
 leagueActiveTicks++;
 if(leagueActiveTicks<3)return;
 leagueDailyBusy=true;
 try{
  const r=await db.rpc('lx_rank_record_event',{p_event_type:'streak_daily',p_ref_key:'streak:'+today,p_metadata:{day:today}});
  if(!r.error&&r.data?.status!=='cooldown'){leagueDailyDone=today;if(r.data?.awarded>0)toast('+'+r.data.awarded+' pontos LX League pela participação diária')}
 }finally{leagueDailyBusy=false}
}

async function checkSiteActivePoints(){
 if(!A.user||!approved()||leagueTimeBusy||document.hidden||!document.hasFocus())return;
 if(musicDock.embedded||document.querySelector('.embed-wrap iframe'))return;
 if(leagueInteractions<2||Date.now()-leagueLastInteraction>90000)return;
 leagueTimeBusy=true;
 try{
  // The database, not the browser, measures elapsed time and credits 1 point
  // per 5 verified minutes up to the daily cap, with cross-tab locking.
  const result=await db.rpc('lx_rank_active_heartbeat',{p_route:String(A.page||'Início').slice(0,80)});
  if(result.error){console.warn('LX League: tempo ativo indisponível temporariamente.');return}
  if(result.data?.awarded>0)toast('+'+result.data.awarded+' ponto LX League por 5 minutos de atividade');
 }finally{leagueTimeBusy=false}
}

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
function nav(name,symbol,mobile=false){const label=name==='Músicas'?'LX Music':name==='Comunidade'?'LX Social':name==='Avisos'?'Notificações':name;return '<button type="button" class="'+(mobile?'mobile-button':'nav-btn')+(A.page===name?' active':'')+'" data-page="'+esc(name)+'" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+icon(symbol)+'<span>'+esc(label)+'</span></button>'}
function shell(){
 const primary=pages.slice(0,6).map(p=>nav(...p)).join('')+nav('LX IA','search'),collection=pages.slice(6,9).map(p=>nav(...p)).join(''),account=pages.slice(9).map(p=>nav(...p)).join('')+(A.admin?nav('Administração','settings'):'');
 root.innerHTML='<div class="lx-ambient" aria-hidden="true"><i class="lx-led left"></i><i class="lx-led right"></i></div><div class="shell"><aside class="aside" id="lxSidebar"><button class="brand brand-button" data-page="Início">'+brand()+'</button><div class="sidebar-scroll"><nav class="nav-group"><span class="nav-label">DESCUBRA</span>'+primary+'</nav><nav class="nav-group"><span class="nav-label">SUA BIBLIOTECA</span>'+collection+'</nav><nav class="nav-group"><span class="nav-label">SEU ESPAÇO</span>'+account+'</nav></div><button class="sidebar-profile" data-page="Perfil" aria-label="Abrir perfil da conta">'+avatar(A.profile,'sidebar-avatar')+'<span><strong id="sidebarProfileName">'+'<span class="profile-name-text">'+esc(A.profile?.name||'Membro LX')+'</span>'+verifiedBadge(A.profile)+'</strong><small>'+esc(A.profile?.username?'@'+A.profile.username:'Sua conta LX Plus')+'</small></span>'+icon('arrow')+'</button><small class="sidebar-signature">Desenvolvido pela LX Group</small></aside><div class="content"><header class="topbar"><button type="button" class="sidebar-toggle icon-button" data-sidebar-toggle aria-controls="lxSidebar" aria-expanded="true" aria-label="Recolher menu lateral">'+icon('list')+'</button><div class="top-context"><img class="header-brand" src="./assets/lx-face-3d.webp" alt="LX Plus" width="32" height="32"><strong id="headerGreeting">'+esc(greetingForHour(new Date().getHours()))+', '+esc((A.profile?.name||'Membro LX').split(' ')[0])+'.</strong><span id="pageTitle">'+esc(A.page)+'</span></div><label class="header-search">'+icon('search')+'<input id="search" type="search" placeholder="Sua próxima descoberta…" aria-label="Buscar filmes, séries, músicas e livros" value="'+esc(A.term)+'"><kbd>Ctrl K</kbd></label><span class="header-presence" id="headerPresence"></span><button type="button" class="performance-toggle" data-performance-toggle aria-label="Alternar modo leve" aria-pressed="false">Modo leve</button><button type="button" class="header-ai" data-page="LX IA" aria-label="Abrir LX IA">✦<span>LX IA</span></button><button class="header-notifications" data-page="Avisos" aria-label="Abrir notificações">'+icon('bell')+'<span id="noticeBadge" hidden></span></button><details class="compact-menu"><summary aria-label="Abrir menu">'+icon('list')+'</summary><nav class="compact-menu-panel">'+primary+collection+account+'</nav></details><button class="avatar-button" data-page="Perfil" aria-label="Abrir seu perfil">'+avatar(A.profile,'header-avatar')+'</button></header><main id="pageArea" class="page"></main><footer class="site-footer"><span>LX PLUS <i>por LX Group</i></span><button class="link" data-page="Mural dos Fundadores">Mural dos Fundadores ✦</button><button class="link" data-page="Suporte">Precisa de ajuda?</button></footer></div></div><nav class="mobile-nav" aria-label="Navegação principal">'+[['Início','home'],['Filmes','film'],['Músicas','music'],['Comunidade','social'],['Minha Lista','heart']].map(p=>nav(...p,true)).join('')+'</nav><div id="layer"></div>';
 applyDisplay();refreshBadges();
}
function refreshBadges(){const n=document.querySelector('#noticeBadge');if(n){n.hidden=!A.unread;n.textContent=A.unread>99?'99+':String(A.unread)}const presence=document.querySelector('#headerPresence');if(presence)presence.textContent=A.presence?A.presence+' na comunidade':''}
async function refreshNotifications(){if(!A.user)return;const r=await db.from('lx_user_notifications').select('id',{count:'exact',head:true}).eq('user_id',A.user.id).is('read_at',null);if(!r.error){A.unread=r.count||0;refreshBadges()}}
let listeningSession=null,listeningTrack=null,leagueMusicTracker=null,activeMusicId=null,musicActivityTimer=null;
async function grantVerifiedPoints({kind,session,id,duration,position}){const {data,error}=await db.rpc('lx_rank_record_event',{p_event_type:kind,p_ref_key:(kind==='music_valid'?'music:':'watch:')+session,p_metadata:{content_id:String(id),duration,position}});if(error)throw error;return data;}
function broadcastMusicActivity(item,playing){if(!A.user||!item)return;const id=String(item.id);if(playing){activeMusicId=id;A.activity={activity_type:'music',activity_title:String(item.title||'').slice(0,180),activity_subtitle:String(item.artist||'').slice(0,180),activity_cover:item.cover||''}}else{if(activeMusicId!==id)return;activeMusicId=null;if(A.activity?.activity_type==='music')A.activity=null}clearTimeout(musicActivityTimer);musicActivityTimer=setTimeout(()=>{if(A.user)heartbeat().catch(()=>{})},220)}
const musicDock=new MusicDock({resolve:sourceFor,getPreferences:()=>A.stored.playbackPreferences||{},onPreferences:savePlaybackPreferences,getEffects:()=>A.stored.audioEffects||{},onEffects:value=>{A.stored.audioEffects=value;accountPreferences.write('audioEffects',value)},onMore:async(current,recent)=>{const selection=await catalogPage({types:['Música'],term:current?.genre||current?.artist||'',limit:60});return musicMix(selection.items,{current,likes:A.stored.musicLikes||[],history:A.stored.musicHistory||{},exclude:recent})},onError:message=>{toast(message);A.telemetry?.record('playback','music',message)},onPlayback(item,playing){broadcastMusicActivity(item,playing)},onTrack(item,{embedded,source}){
 if(embedded&&activeMusicId){activeMusicId=null;if(A.activity?.activity_type==='music')A.activity=null;clearTimeout(musicActivityTimer);musicActivityTimer=setTimeout(()=>heartbeat().catch(()=>{}),220)}
 listeningTrack=String(item.id);listeningSession=uuid();const capturedSession=listeningSession;leagueMusicTracker=eligibleLeaguePlayback(item,source)?createLeagueSession({kind:'music_valid',id:String(item.id),session:capturedSession,report:async total=>{const r=await db.rpc('lx_record_listening',{p_session:capturedSession,p_track:String(item.id),p_title:String(item.title).slice(0,200),p_artist:String(item.artist||'').slice(0,200),p_total:total});if(r.error)throw r.error},award:grantVerifiedPoints,onMessage:toast}):null;
 if(A.user){const current={...(A.stored.musicHistory||{}),[item.id]:new Date().toISOString()};A.stored.musicHistory=current;accountPreferences.write('musicHistory',current)}
},onListening(item,total,info={}){if(!A.user||!listeningSession||String(item.id)!==listeningTrack||total<=0)return;if(leagueMusicTracker){leagueMusicTracker({total,duration:info.duration}).catch(()=>{})}else db.rpc('lx_record_listening',{p_session:listeningSession,p_track:String(item.id),p_title:String(item.title).slice(0,200),p_artist:String(item.artist||'').slice(0,200),p_total:total}).then(r=>{if(r.error)console.warn('Histórico musical temporariamente indisponível.')})}});
function context(){const ownerId=A.user.id;return {user:A.user,admin:A.admin,page:A.page,term:A.term,state:()=>A.stored,setState:(value,keys)=>{if(A.user?.id!==ownerId)return;if(keys)for(const key of keys)A.stored[key]=value[key];else A.stored=value},profile:()=>A.profile,setProfile:p=>{if(A.user?.id!==ownerId)return;A.profile=p;document.querySelectorAll('[data-avatar-user="'+CSS.escape(p.user_id||A.user.id)+'"]').forEach(node=>{if(!node.closest('[data-premium-live-preview]'))node.outerHTML=avatar(p,node.dataset.avatarClass||'member-avatar')});const node=document.querySelector('#sidebarProfileName');if(node)node.innerHTML='<span class="profile-name-text">'+profileName(p)+'</span>'+verifiedBadge(p)},directory:()=>A.members,setDirectory:rows=>{if(A.user?.id===ownerId)A.members=rows},music:musicDock,savePreferences:(key,value)=>{A.stored[key]=value;return accountPreferences.write(key,value)},calls:A.calls,toast,navigate,openItem:modal,play,refreshCatalog:()=>loadCatalog(),refreshNotifications,heartbeat,diagnostics:()=>A.telemetry?.diagnostics()||{}}}
function disposeRoute(){A.controller?.destroy?.();A.controller=null;A.routeKey='';++A.routeGeneration}
async function draw(){
 if(!A.user){renderAuth();return}if(!approved()){showGate();return}if(!document.querySelector('.shell'))shell();
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===A.page));
 document.querySelector('#pageTitle').textContent=A.page==='Músicas'?'LX Music':A.page==='Comunidade'?'LX Social':A.page;
 const key=A.page+'|'+A.term;if(A.routeKey===key)return;
 disposeRoute();A.routeKey=key;const generation=A.routeGeneration,area=document.querySelector('#pageArea'),host=document.createElement('div');host.className='route-content';area.replaceChildren(host);
 if(A.page==='Início'&&!A.term){host.innerHTML=renderPremiumCatalog({items:A.items,page:A.page,history:A.stored.history||{},list:A.stored.list||[],catalogStatus:A.catalogStatus})+renderFoundersWall({compact:true});return}
 if(A.page==='Administração'&&!A.admin){host.innerHTML=empty('Esta área é restrita.');return}
 const route=routeFiles[A.page]||routeFiles.Buscar;host.innerHTML='<div class="module-loading"><span class="loading-orbit"></span><p>Preparando seu espaço…</p></div>';
 try{const controller=await mountRoute(async()=>{const module=await import('./modules/'+route[0]+'.js'+new URL(import.meta.url).search);if(generation!==A.routeGeneration)return null;return module[route[1]](host,context())},{isCurrent:()=>generation===A.routeGeneration});if(generation!==A.routeGeneration)return;A.controller=controller}
 catch(error){if(generation===A.routeGeneration){const failure=document.createElement('div');failure.className='route-content';failure.innerHTML=empty('Não foi possível abrir esta seção.',error.message,'<button class="btn primary" data-retry-module>Tentar novamente</button>');host.replaceWith(failure);A.telemetry?.record('error','route:'+A.page,error.message)}}
}
function navigate(page,{term='',push=true}={}){closeModal();A.page=routeFiles[page]||page==='Início'?page:'Início';A.term=term;const search=document.querySelector('#search');if(search)search.value=/^profile:[0-9a-f-]{36}$/i.test(term)?'':term;if(push)history.pushState({page:A.page,term},'',location.pathname+location.search+'#'+encodeURIComponent(A.page));draw();A.telemetry?.record('page',A.page);heartbeat().catch(()=>{});window.scrollTo({top:0,behavior:readDisplay().performance==='light'||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
async function loadCatalog(generation=A.generation){A.catalogStatus='loading';try{const rows=await timed(getCatalog({light:readDisplay().performance==='light'}),'O catálogo',22000);if(generation!==A.generation||!A.user)return;A.items=rows;A.catalogStatus='ready'}catch(error){if(generation!==A.generation)return;A.catalogStatus='error';A.telemetry?.record('error','catalog',error.message)}if(A.page==='Início'){A.routeKey='';draw()}}
async function heartbeat(){
 if(!A.user||!approved())return;const preferences=A.stored.preferences||{},status=preferences.presenceStatus==='offline'?'offline':document.hidden?'away':preferences.presenceStatus||'online',privacy=preferences.presenceStatus==='offline'||A.profile?.activity_visible===false?'nobody':preferences.presencePrivacy||'friends';
 const activity=privacy==='nobody'?{activity_type:null,activity_title:null,activity_subtitle:null,activity_cover:null}:A.activity||{activity_type:null,activity_title:null,activity_subtitle:null,activity_cover:null};
 const stamp=new Date().toISOString();
 // Access statistics are independent of social presence and never expose private activity.
 if(!document.hidden)db.from('lx_active_sessions').upsert({user_id:A.user.id,last_seen:stamp,updated_at:stamp,route:A.page,device:innerWidth<760?'Celular':innerWidth<1200?'Tablet':'Computador'},{onConflict:'user_id'}).then(()=>{}).catch(()=>{});
 const r=await db.from('lx_presence').upsert({user_id:A.user.id,status,privacy,...activity,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(r.error)return;
 const visible=await db.rpc('lx_presence_for_viewer');if(!visible.error){A.presence=(visible.data||[]).filter(p=>p.status==='online'&&Date.now()-new Date(p.updated_at).valueOf()<90000).length;refreshBadges()}
}
function startMemberServices(){
 A.telemetry?.destroy();A.telemetry=createTelemetry(A.user.id);A.telemetry.record('performance','app_ready','',performance.now());A.telemetry.record('page',A.page);
 A.calls?.destroy();A.calls=new Calls({userId:A.user.id,toast,directory:()=>A.members,profile:()=>A.profile});
 A.party?.destroy();A.party=new WatchParty({userId:A.user.id,directory:()=>A.members,toast,calls:()=>A.calls,validate:async(item,index)=>{const ep=episodes(item)[index],source=await sourceFor(ep?{...item,...ep,id:item.id,type:item.type,license:item.license}:item);if(!['video','hls','dash'].includes(source.kind))throw Error('Assistir juntos está disponível para vídeos diretos, HLS e DASH autorizados. Este player externo não permite sincronizar os controles.');if(source.revokeOnCleanup&&source.url?.startsWith('blob:'))URL.revokeObjectURL(source.url)},onOpen:async room=>{const r=await db.from('lx_catalog').select('id,payload,published').eq('id',room.content_id).eq('published',true).maybeSingle();if(r.error||!r.data)throw Error('Este conteúdo não está disponível para sua conta.');const item=itemFrom(r.data);await play(item,episodes(item).length?room.episode_index:null);if(!document.querySelector('#mediaPlayer')||String(A.modal?.item.id)!==String(room.content_id))throw Error('Não foi possível abrir uma fonte compatível. A sessão permanece em espera.')}});clearInterval(A.heartbeatTimer);A.heartbeatTimer=setInterval(()=>{heartbeat().catch(()=>{});checkDailyParticipation().catch(()=>{});checkSiteActivePoints().catch(()=>{})},25000);heartbeat().catch(()=>{});
 if(A.noticeChannel)db.removeChannel(A.noticeChannel);A.noticeChannel=db.channel('lx-notice-badge-'+A.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_user_notifications',filter:'user_id=eq.'+A.user.id},()=>refreshNotifications().catch(()=>{})).subscribe();refreshNotifications().catch(()=>{});
 socialDirectory().then(rows=>{if(A.user)A.members=rows}).catch(()=>{});
}
function clearMemberServices(){
 A.party?.destroy();A.party=null;disposeRoute();closeModal();leagueMusicTracker=null;leagueInteractions=0;leagueActiveTicks=0;leagueLastInteraction=0;leagueDailyDone='';leagueTimeBusy=false;leagueLastMotion=0;musicDock.close();clearTimeout(musicActivityTimer);musicActivityTimer=null;activeMusicId=null;A.activity=null;accountPreferences.bind(null);bindDisplayAccount(null);A.calls?.destroy();A.calls=null;A.telemetry?.destroy();A.telemetry=null;clearInterval(A.heartbeatTimer);A.heartbeatTimer=null;if(A.noticeChannel){db.removeChannel(A.noticeChannel);A.noticeChannel=null}
}
async function initialize(){
 const generation=++A.generation;A.initializing=true;root.innerHTML='<div class="loading"><span class="loading-orbit"></span>Preparando seu universo LX…</div>';
 try{
  const {data,error}=await timed(db.auth.getSession(),'A autenticação',9000);if(generation!==A.generation)return;if(error)throw error;A.user=data.session?.user||null;if(!A.user){renderAuth();return}if(A.auth==='password'){renderAuth();return}
  const [profile,admin,state]=await timed(Promise.all([getProfile(A.user.id),isAdmin(),getUserState(A.user.id)]),'Seu perfil',12000);if(generation!==A.generation)return;A.profile=profile;A.admin=admin;A.stored=state;accountPreferences.bind(A.user.id);bindDisplayAccount(A.user.id);const display=reconcileDisplay(state.displayPreferences);if(display.pending)accountPreferences.write('displayPreferences',display.value);if(!approved()){showGate();return}
  A.routeKey='';shell();draw();startMemberServices();loadCatalog(generation);
 }catch(error){if(generation===A.generation)showError(error.message||'Não foi possível conectar à LX Plus.')}finally{if(generation===A.generation)A.initializing=false}
}
function modal(item){
 if(!item)return;closeModal();A.modal={item,focus:document.activeElement};
 const cover=https(item.cover),liked=saved().has(String(item.id));
 const layer=document.querySelector('#layer');if(!layer)return;
 layer.innerHTML='<div class="overlay"><section class="modal detail-modal'+(item.type==='Música'?' music-detail':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(item.title)+'"><header class="modal-head"><span class="premium-overline">'+esc(item.type)+' · LX PLUS</span><button class="close" data-close aria-label="Fechar detalhes">×</button></header><div class="modal-body details"><div>'+(cover?'<img class="detail-poster" src="'+esc(cover)+'" alt="Capa de '+esc(item.title)+'">':'<div class="detail-placeholder">LX<span>PLUS</span></div>')+'</div><div><span class="premium-overline">'+esc([item.year,item.genre].filter(Boolean).join(' · '))+'</span><h2>'+esc(item.title)+'</h2><p>'+esc(item.description||item.desc||'Uma nova descoberta na LX Plus.')+'</p><small>'+esc(item.artist||item.author|| (Array.isArray(item.cast)?item.cast.slice(0,5).join(' · '):''))+'</small><div class="actions"><button class="btn primary" data-modal-play>'+icon('play')+' '+(item.type==='Música'?'Ouvir':item.type==='Livro'?'Ler agora':'Assistir')+'</button><button class="btn" data-modal-save>'+icon('heart')+' '+(liked?'Na sua lista':'Minha lista')+'</button>'+(['Filme','Série','Dorama','Anime'].includes(item.type)?'<button class="btn" data-watch-start>Assistir juntos</button>':'')+'</div><p id="detailStatus" role="status" class="muted"></p></div></div></section></div>';
 document.body.classList.add('modal-open');layer.querySelector('[data-close]')?.focus();
}
function closeModal(){A.playGeneration=(A.playGeneration||0)+1;if(A.playerCleanup){try{A.playerCleanup()}catch{}A.playerCleanup=null}const focus=A.modal?.focus;A.modal=null;document.querySelector('#layer')?.replaceChildren();document.body.classList.remove('modal-open');if(focus?.isConnected)focus.focus()}
async function toggleSaved(item){const previous=A.stored.list,list=saved();list.has(String(item.id))?list.delete(String(item.id)):list.add(String(item.id));A.stored.list=[...list].map(x=>/^\d+$/.test(x)?Number(x):x);try{const result=await saveUserField(A.user.id,'list',A.stored.list);A.stored.list=result.list;toast('Sua lista foi atualizada.');modal(item);if(A.page==='Minha Lista'){A.routeKey='';draw()}}catch(error){A.stored.list=previous;toast(error.message)}}
function episodes(item){if(Array.isArray(item.episodes))return item.episodes;if(Array.isArray(item.seasons))return item.seasons.flatMap(s=>(s.episodes||[]).filter(e=>e&&typeof e==='object').map((e,n)=>({...e,season:s.season||s.number||1,episode:e.episode||n+1})));return []}
async function play(item,episodeIndex=null){
 if(item?.type==='Música')musicDock.primeEffects();
 const playGeneration=A.playGeneration=(A.playGeneration||0)+1;
 try{
  if(item.type==='Livro'){const url=https(item.epubUrl||item.pdfUrl||item.externalReadUrl||item.sourceUrl);if(!url)throw Error('Este livro ainda não possui uma fonte de leitura disponível.');const format=/\.epub(?:[?#]|$)/i.test(url)||item.bookFormat==='epub'?'epub':/\.pdf(?:[?#]|$)/i.test(url)||item.bookFormat==='pdf'?'pdf':null;if(format){showBook(item,url,format);return}window.open(url,'_blank','noopener,noreferrer');toast('Leitura aberta na fonte original.');return}
  const list=episodes(item);if(episodeIndex===null&&list.length)episodeIndex=Number(A.stored.history?.[item.id]?.episodeIndex)||0;
  const entry=episodeIndex!==null&&list[episodeIndex]?{...item,...list[episodeIndex],id:item.id,type:item.type,license:item.license,sourceVerified:item.sourceVerified||item.license?.authorized}:item;
  const source=await timed(sourceFor(entry),'A fonte de reprodução',15000);
  if(playGeneration!==A.playGeneration)return;
  if(['unavailable','invalid'].includes(source.kind))throw Error(source.message||'Este título ainda não possui uma fonte compatível.');
  if(source.kind==='external'){const url=https(source.url);if(url)window.open(url,'_blank','noopener,noreferrer');toast(source.message||'Conteúdo aberto na origem.');return}
  if(item.type==='Música'&&['audio','hls','dash','iframe'].includes(source.kind)){await musicDock.open(item,source,A.items.filter(x=>x.type==='Música'));closeModal();return}
  showVideo(item,entry,source,list,episodeIndex);
 }catch(error){toast(error.message||'Não foi possível iniciar a reprodução.');A.telemetry?.record('playback',item.type==='Música'?'music':'video',error.message)}
}
function showBook(item,url,format='pdf'){
 closeModal();const token={item,focus:document.activeElement};A.modal=token;
 const key='book_'+String(item.id),owner=A.user?.id,abort=new AbortController();let stop=null;
  const readingSession=uuid();let bookPosition=0,bookTotal=0,readingBusy=false,readingRewarded=false,readingTimer=null;
  async function verifyBookActivity(){
   if(A.modal!==token||!A.user||A.user.id!==owner||document.hidden||readingBusy||readingRewarded||bookPosition<1||bookTotal<3)return;
   readingBusy=true;
   try{
    const recorded=await db.rpc('lx_record_reading',{p_session:readingSession,p_content:String(item.id),p_page:bookPosition,p_pages:bookTotal});
    if(recorded.error||!recorded.data?.eligible)return;
    const awarded=await db.rpc('lx_rank_record_event',{p_event_type:'read_valid',p_ref_key:'read:'+readingSession,p_metadata:{content_id:String(item.id)}});
    if(!awarded.error&&(awarded.data?.awarded>0||awarded.data?.duplicate)){readingRewarded=true;if(awarded.data.awarded>0)toast('+'+awarded.data.awarded+' pontos LX League pela leitura')}
   }finally{readingBusy=false}
  }
  readingTimer=setInterval(()=>verifyBookActivity().catch(()=>{}),15000);
 document.querySelector('#layer').innerHTML='<div class="overlay"><section class="modal reader-modal" role="dialog" aria-modal="true" aria-label="'+esc(item.title)+'"><div class="modal-head"><h2>'+esc(item.title)+'</h2><button class="close" data-close aria-label="Fechar livro">×</button></div><div id="bookReader"></div><p class="muted reader-note"><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir a versão original ↗</a></p></section></div>';
 document.body.classList.add('modal-open');document.querySelector('[data-close]').focus();
 A.playerCleanup=()=>{clearInterval(readingTimer);stop?.();abort.abort()};
 import('./book-reader.js'+new URL(import.meta.url).search).then(async module=>{
  if(A.modal!==token)return;
  stop=await module.openReader(document.querySelector('#bookReader'),{url,format,state:A.stored[key]||{},signal:abort.signal,onSave:value=>{if(A.user?.id!==owner)return;bookPosition=Number(value.position)||0;bookTotal=Number(value.total)||0;A.stored[key]=value;accountPreferences.write(key,value)}});
  if(A.modal!==token)stop?.();
 }).catch(()=>{if(A.modal===token)document.querySelector('#bookReader').innerHTML=empty('Leitor indisponível','Abra a versão original ou tente novamente.')});
}
function showVideo(item,entry,source,list,index){
 closeModal();const together=!!A.party?.room&&String(A.party.room.content_id)===String(item.id);const token={item,episodeIndex:index,focus:document.activeElement};A.modal=token;
 const iframe=source.kind==='iframe',kind=source.kind==='audio'?'audio':'video',layer=document.querySelector('#layer');
 const tracks=(Array.isArray(entry.subtitles)?entry.subtitles:[]).filter(t=>https(t.url)&&/\.vtt(?:[?#]|$)/i.test(t.url));
 layer.innerHTML='<div class="overlay"><section class="modal video-modal" role="dialog" aria-modal="true" aria-label="Reproduzindo '+esc(item.title)+'"><header class="modal-head"><div><small class="premium-overline">AGORA NA LX PLUS</small><h2>'+esc(entry.title||item.title)+'</h2></div><button class="close" data-close aria-label="Fechar reprodução">×</button></header><div class="modal-body">'+(iframe?'<div class="embed-wrap"><iframe class="player embed" src="'+esc(source.url)+'" title="'+esc(entry.title||item.title)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="muted">Os controles e as permissões desta reprodução são fornecidos por '+esc(source.provider)+'. Se a prévia não abrir, confira o compartilhamento ou abra na origem.</p>':'<'+kind+' id="mediaPlayer" class="player" controls playsinline preload="metadata" '+(tracks.length?'crossorigin="anonymous"':'')+' '+(https(item.cover)?'poster="'+esc(item.cover)+'"':'')+'>'+tracks.map(t=>'<track kind="subtitles" src="'+esc(t.url)+'" srclang="'+esc(t.lang||'pt-BR')+'" label="'+esc(t.label||t.lang||'Português')+'">').join('')+'</'+kind+'>'+videoControls(tracks))+(!iframe&&!together?'<div class="party-launch"><button class="btn" data-watch-start>Convidar amigo para assistir juntos</button><small>Play, pausa e posição compartilhados.</small></div>':'')+'<div id="playerStatus" class="player-status" role="status"></div>'+(https(source.source||source.url)?'<a class="link" href="'+esc(source.source||source.url)+'" target="_blank" rel="noopener noreferrer">Abrir na origem ↗</a>':'')+(list.length?'<div class="episode-list"><h3>Temporadas e episódios</h3>'+list.map((e,n)=>'<button class="'+(n===index?'active':'')+'" data-player-episode="'+n+'"><span>T'+Number(e.season||1)+' · EP '+Number(e.episode||n+1)+'</span>'+esc(e.title||'Episódio '+(n+1))+'</button>').join('')+'</div>':'')+'</div></section></div>';
 document.body.classList.add('modal-open');layer.querySelector('[data-close]').focus();
 A.activity={activity_type:['Série','Dorama','Anime'].includes(item.type)?'series':'movie',activity_title:item.title,activity_subtitle:index!==null?'Temporada '+(entry.season||1)+' · Episódio '+(entry.episode||index+1):'',activity_cover:item.cover||''};heartbeat().catch(()=>{});
 const media=layer.querySelector('#mediaPlayer');if(!media)return;
  const rankVideoSession=uuid(),rankContentKey=String(item.id)+(index!==null?':episode:'+String(index):'');
  const leagueWatchTracker=eligibleLeaguePlayback(entry,source)?createLeagueSession({
   kind:'watch_valid',id:rankContentKey,session:rankVideoSession,
   report:async total=>{const r=await db.rpc('lx_record_viewing',{p_session:rankVideoSession,p_content:rankContentKey,p_total:total});if(r.error)throw r.error},
   award:grantVerifiedPoints,onMessage:toast
  }):null;
 const error=message=>{if(A.modal!==token)return;layer.querySelector('#playerStatus').textContent=message;A.telemetry?.record('playback','video',message)};
 musicDock.element?.querySelector('audio')?.pause();
 const stopVideo=bindVideoSession(media,source,{host:layer,autoplay:!together,progress:together?null:A.stored.history?.[item.id],index,hasNext:!together&&index!==null&&!!list[index+1],onNext:()=>play(item,index+1),preferences:A.stored.playbackPreferences||{},savePreferences:savePlaybackPreferences,onError:error,onActiveSeconds:info=>leagueWatchTracker?.(info),saveProgress:async progress=>{
  if(!A.user||String(item.id)==='preview')return;A.stored.history={...(A.stored.history||{}),[item.id]:progress};
  const {error}=await db.rpc('lx_save_watch_progress',{p_content:Number(item.id),p_progress:progress});if(error)throw error;
 }});
 const stopParty=together?A.party.attach(media):null;A.playerCleanup=()=>{stopParty?.();stopVideo()};if(together){for(const id of ['playerSpeed','playerAutoplay']){const node=layer.querySelector('#'+id);if(node)node.disabled=true}for(const id of ['pipMedia','castMedia'])layer.querySelector('#'+id)?.setAttribute('hidden','')}
}

let searchTimer;
root.addEventListener('input',event=>{if(event.target.id==='search'){clearTimeout(searchTimer);const value=event.target.value;searchTimer=setTimeout(()=>navigate(value.trim()?'Buscar':'Início',{term:value,push:false}),350)}});
function noteActiveGesture(){
 if(!A.user||!approved()||musicDock.embedded||document.querySelector('.embed-wrap iframe'))return;
 const now=Date.now();leagueLastInteraction=now;
 if(now-leagueLastMotion>15000){leagueInteractions=Math.min(100,leagueInteractions+1);leagueLastMotion=now}
}
root.addEventListener('pointerdown',noteActiveGesture,{passive:true});
root.addEventListener('pointermove',noteActiveGesture,{passive:true});
root.addEventListener('wheel',noteActiveGesture,{passive:true});
root.addEventListener('keydown',noteActiveGesture);
root.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 try{
  if(button.dataset.page){button.closest('details')?.removeAttribute('open');navigate(button.dataset.page);return}
  if(button.dataset.auth){A.auth=button.dataset.auth;renderAuth();return}
  if(button.hasAttribute('data-retry-module')){A.routeKey='';draw();return}
  if(button.dataset.item){const item=A.items.find(x=>String(x.id)===button.dataset.item);if(item)modal(item);return}
  if(button.dataset.play){const item=A.items.find(x=>String(x.id)===button.dataset.play);if(item)await play(item);return}
  if(button.dataset.scroll){const rail=root.querySelector('[data-rail="'+CSS.escape(button.dataset.scroll)+'"]');rail?.scrollBy({left:(button.dataset.direction==='-1'?-1:1)*Math.max(240,rail.clientWidth*.8),behavior:readDisplay().performance==='light'?'instant':'smooth'});return}
  if(button.hasAttribute('data-close')){closeModal();return}if(button.hasAttribute('data-modal-play')){if(A.modal)await play(A.modal.item);return}if(button.hasAttribute('data-modal-save')){if(A.modal)await toggleSaved(A.modal.item);return}
  if(button.hasAttribute('data-watch-start')){if(A.modal)await A.party?.inviteFriend(A.modal.item,A.modal.episodeIndex||0,document.querySelector('#mediaPlayer')?.currentTime||0);return}
  if(button.dataset.playerEpisode!==undefined){if(A.modal){if(A.party?.room&&String(A.party.room.content_id)===String(A.modal.item.id))await A.party.changeEpisode(Number(button.dataset.playerEpisode));else await play(A.modal.item,Number(button.dataset.playerEpisode))}return}
  if(button.id==='retry'){await initialize();return}if(button.id==='retryCatalog'){await loadCatalog();return}
  if(button.id==='manualLogin'){++A.generation;clearMemberServices();const client=switchToRecoveryLogin();attachAuthListener(client);A.user=null;A.profile=null;A.auth='login';renderAuth();return}
  if(button.id==='signout'){await signout();return}
  if(button.id==='resend'){const email=root.querySelector('#signin [name="email"]')?.value?.trim();if(!email)throw Error('Digite seu e-mail primeiro.');const {error}=await timed(db.auth.resend({type:'signup',email}),'O envio');if(error)throw error;toast('Se necessário, a confirmação será reenviada.');return}
 }catch(error){toast(error.message||'Não foi possível concluir.')}
});
root.addEventListener('click',event=>{if(event.target.classList.contains('overlay'))closeModal()});
root.addEventListener('error',event=>{if(event.target.tagName!=='IMG')return;if(event.target.closest('.music-result-cover,.track-info,.collection-cover,.music-quick-track')){const fallback=document.createElement('span');fallback.className='track-cover-fallback';fallback.textContent='♫';fallback.setAttribute('aria-hidden','true');event.target.replaceWith(fallback)}else if(event.target.closest('.premium-cover,.avatar-frame'))event.target.remove()},true);
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){leagueLastInteraction=0;leagueActiveTicks=0}heartbeat().catch(()=>{})});
window.addEventListener('popstate',event=>{const page=event.state?.page||decodeURIComponent(location.hash.slice(1))||'Início';navigate(page,{term:event.state?.term||'',push:false})});
window.addEventListener('pagehide',()=>{if(A.user)db.from('lx_presence').update({status:'offline',updated_at:new Date().toISOString()}).eq('user_id',A.user.id).then(()=>{});A.playerCleanup?.()});
bindDisplayControls(value=>{if(A.user){A.stored.displayPreferences=value;accountPreferences.write('displayPreferences',value)}if(A.page==='Início'){A.routeKey='';draw()}});
document.addEventListener('lx-display-change',()=>syncProfileBanners());observePremiumMedia();
bindAmbientLight({sample:()=>{const audio=musicDock.element?.querySelector('audio');return audio&&!audio.paused&&!audio.muted?musicDock.effectsEngine?.level()??null:null}});
setInterval(()=>{const greeting=document.querySelector('#headerGreeting');if(greeting)greeting.textContent=greetingForHour(new Date().getHours())+', '+(A.profile?.name||'Membro LX').split(' ')[0]+'.'},60000);
attachAuthListener();
if(location.search.includes('recovery=1')||location.hash.includes('type=recovery'))A.auth='password';
else{const hash=decodeURIComponent(location.hash.slice(1));A.page=hash.startsWith('post=')?'Comunidade':routeFiles[hash]?hash:'Início'}
initialize();
