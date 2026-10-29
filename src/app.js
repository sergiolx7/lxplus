import {db,categories,safeUrl,getCatalog,findDiscovery,getProfile,getUserState,isAdmin,switchToRecoveryLogin,saveUserField,saveMyProfile,notices,publicMembers,sourceFor,getRanking} from './data.js';
import {VERSION} from './config.js';
import {classifyLink,attachPlayer} from './universal-player.js';
import {scanDriveFolder,publishMatches} from './drive-import.js';
import {makeDemoDriveScan,simulateDemoPublish} from './drive-import-demo.js';
import {renderPremiumCatalog} from './premium-ui.js';
import {studioOverview,studioSources,studioPreview} from './studio-ui.js';

const root=document.querySelector('#app');
const A={user:null,profile:null,admin:false,stored:{},items:[],extra:[],members:[],notices:[],ranking:{season:null,rows:[]},page:'Início',term:'',filter:'Todos',auth:'login',modal:null,playerCleanup:null,busy:false,loadGeneration:0,catalogStatus:'loading',drive:{folder:'',scan:null,progress:'',rightsConfirmed:false,working:false,lastResult:null}};
const pages=[['Início','⌂'],['Filmes','▣'],['Séries','▤'],['Músicas','♫'],['Livros','▥'],['Minha Lista','♡'],['Comunidade','◎'],['Ranking','★'],['Avisos','♧'],['Perfil','◉']];
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const id=x=>String(x??'');
const saved=()=>new Set((Array.isArray(A.stored.list)?A.stored.list:[]).map(id));
const label=x=>x==='Filme'?'Filme':x==='Música'?'Música':x==='Livro'?'Livro':x==='Ao Vivo'?'Ao vivo':x||'Catálogo';
const approved=()=>A.admin||A.profile?.approved===true||A.profile?.approval_status==='approved';
const initials=x=>String(x||'LX').trim().split(/\s+/).slice(0,2).map(v=>v[0]||'').join('').toUpperCase();
const brand=()=>'<span class="brand-logo">LX</span><span class="brand-title"><b>Plus</b><small>by LX Group</small></span>';
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=String(message);document.body.appendChild(el);setTimeout(()=>el.remove(),5000)}
function formAuth(){
 if(A.auth==='reset')return '<form class="form" id="reset"><label class="field">E-mail<input name="email" type="email" autocomplete="email" required></label><button class="btn primary wide">Enviar recuperação</button><button type="button" class="link" data-auth="login">Voltar ao login</button></form>';
 if(A.auth==='password')return '<form class="form" id="newPassword"><label class="field">Nova senha<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="field">Confirmar senha<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn primary wide">Salvar nova senha</button></form>';
 if(A.auth==='signup')return '<form class="form" id="signup"><label class="field">Nome<input name="name" minlength="2" maxlength="60" autocomplete="name" required></label><label class="field">E-mail<input name="email" type="email" autocomplete="email" required></label><label class="field">Senha<input name="password" type="password" autocomplete="new-password" minlength="8" required></label><button class="btn primary wide">Criar conta</button><small>O acesso pode exigir confirmação por e-mail e aprovação administrativa.</small></form>';
 return '<form class="form" id="signin"><label class="field">E-mail<input name="email" type="email" autocomplete="email" required></label><label class="field">Senha<input name="password" type="password" autocomplete="current-password" required></label><button class="btn primary wide">Entrar</button><div class="actions"><button type="button" class="link" data-auth="reset">Esqueci minha senha</button><button type="button" class="link" id="resend">Reenviar confirmação</button></div></form>';
}
function renderAuth(){
 root.innerHTML='<section class="auth"><div class="auth-left"><div class="brand">'+brand()+'</div><div><span class="eyebrow">UMA NOVA FASE DA LX PLUS</span><h1>Uma experiência.<br>Tudo o que você gosta.</h1><p>Filmes, séries, músicas e livros em uma plataforma moderna. Seus favoritos continuam vinculados à sua conta.</p><div class="pills"><span>▶ Cinema</span><span>♫ LX Music</span><span>▤ LX Books</span><span>♡ Minha Lista</span></div></div><small>© 2026 LX Group. Todos os direitos reservados.</small></div><div class="auth-right"><div class="auth-card"><span class="eyebrow">BEM-VINDO À LX PLUS</span><h2>'+({login:'Entre na sua conta',signup:'Crie seu cadastro',reset:'Recuperar acesso',password:'Definir nova senha'}[A.auth]||'Entrar')+'</h2><p>Acesse com seu e-mail LX Plus. Nenhum usuário antigo precisa perder o cadastro.</p><div class="auth-tabs"><button class="'+(A.auth==='login'?'active':'')+'" type="button" data-auth="login">Entrar</button><button class="'+(A.auth==='signup'?'active':'')+'" type="button" data-auth="signup">Criar conta</button></div>'+formAuth()+'</div></div></section>';
}
function showGate(){
 root.innerHTML='<div class="full-screen"><div class="brand" style="justify-content:center">'+brand()+'</div><div class="panel" style="max-width:480px"><span class="badge">Aguardando aprovação</span><h2 style="margin-top:18px">Seu cadastro foi encontrado</h2><p>O acesso ao catálogo depende da aprovação da equipe LX Group. Seus dados antigos continuam preservados.</p><div class="actions" style="justify-content:center"><button class="btn primary" id="retry">Verificar novamente</button><button class="btn" id="signout">Sair</button></div></div></div>';
}
function showError(message){
 root.innerHTML='<div class="full-screen"><div class="brand" style="justify-content:center">'+brand()+'</div><div class="panel" style="max-width:510px"><h2>Não foi possível concluir a conexão</h2><p>'+escapeHtml(message)+'</p><p class="muted">Se sua sessão antiga ficou bloqueada, você pode entrar novamente com o mesmo e-mail e senha. Seu cadastro não será excluído.</p><div class="actions"><button class="btn primary" id="retry">Tentar novamente</button><button class="btn" id="manualLogin">Entrar com e-mail e senha</button></div></div></div>';
}
function navButton(name,icon,cls='nav-btn'){
 return '<button class="'+cls+(A.page===name?' active':'')+'" type="button" data-page="'+escapeHtml(name)+'"><span class="symbol">'+icon+'</span>'+escapeHtml(name)+'</button>';
}
function shell(){
 const nav=pages.map(x=>navButton(...x)).join('')+(A.admin?navButton('Administração','⚙'):'');
 const mobile=pages.filter(x=>['Início','Filmes','Músicas','Minha Lista','Perfil'].includes(x[0])).map(x=>navButton(...x,'mobile-button')).join('');
 root.innerHTML='<div class="shell"><aside class="aside"><div class="brand">'+brand()+'</div><nav class="nav-group"><span class="nav-label">EXPLORAR</span>'+nav+'</nav><div class="aside-foot"><b>LX Group</b>Uma plataforma reconstruída com foco em estabilidade e privacidade.</div></aside><div class="content"><header class="topbar"><div class="top-name"><strong id="pageTitle">'+escapeHtml(A.page)+'</strong><small>'+escapeHtml(VERSION)+'</small></div><input type="search" id="search" class="search" placeholder="Buscar filmes, músicas, livros…" aria-label="Buscar no catálogo" value="'+escapeHtml(A.term)+'"><details class="compact-menu"><summary aria-label="Mais seções da LX Plus">☰</summary><div class="compact-menu-panel"><span class="nav-label">NAVEGAR</span>'+nav+'</div></details><button class="avatar-button" type="button" data-page="Perfil" aria-label="Abrir perfil"><span class="avatar">'+escapeHtml(initials(A.profile?.name))+'</span></button></header><main id="pageArea" class="page"></main></div></div><nav class="mobile-nav">'+mobile+'</nav><div id="layer"></div>';
}
function picture(item){
 const src=safeUrl(item.cover);
 return '<div class="cover">'+(src?'<img src="'+escapeHtml(src)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<div class="placeholder">LX</div>')+'<span class="type-tag">'+escapeHtml(label(item.type))+'</span></div>';
}
function card(item){
 return '<button class="card" type="button" data-item="'+escapeHtml(item.id)+'" aria-label="Ver '+escapeHtml(item.title)+'">'+picture(item)+'<strong>'+escapeHtml(item.title)+'</strong><small>'+escapeHtml(item.year||item.artist||item.author||label(item.type))+'</small></button>';
}
function filtered(){
 const q=A.term.trim().toLocaleLowerCase('pt-BR');
 let list=A.items;
 if(A.page==='Minha Lista'){const selection=saved();list=list.filter(x=>selection.has(id(x.id)))}
 else if(categories[A.page])list=list.filter(x=>categories[A.page].includes(x.type));
 if(A.filter!=='Todos')list=list.filter(x=>x.type===A.filter);
 if(q){
  list=list.filter(x=>[x.title,x.artist,x.author,x.genre].join(' ').toLocaleLowerCase('pt-BR').includes(q));
  if(['Início','Buscar'].includes(A.page))list=[...list,...A.extra.filter(x=>!list.some(y=>id(x.id)===id(y.id)))];
 }
 return list;
}
function hero(){
 const item=A.items.find(x=>x.featured&&x.cover)||A.items.find(x=>x.cover)||A.items[0];
 if(!item)return '';
 const image=safeUrl(item.banner||item.cover);
 return '<div class="hero">'+(image?'<img class="hero-image" style="object-fit:cover;right:0;width:65%;height:100%" src="'+escapeHtml(image)+'" alt="">':'')+'<div class="hero-text"><span class="eyebrow">EM DESTAQUE NA LX PLUS</span><h1>'+escapeHtml(item.title)+'</h1><p>'+escapeHtml(item.description||'Descubra filmes, livros e músicas selecionados para você.')+'</p><div class="actions"><button class="btn primary" type="button" data-item="'+escapeHtml(item.id)+'">▶ Ver detalhes</button><button class="btn" type="button" data-page="Minha Lista">♡ Minha Lista</button></div></div></div>';
}
function catalog(){
 return renderPremiumCatalog({
  items:A.page==='Início'&&!A.term?A.items:filtered(),
  page:A.page,filter:A.filter,term:A.term,
  history:A.stored.history||{},
  list:Array.isArray(A.stored.list)?A.stored.list:[],
  catalogStatus:A.catalogStatus
 });
}
function otherPage(){
 if(A.page==='Perfil')return '<div class="heading"><div><span class="eyebrow">MINHA CONTA</span><h1>Meu perfil</h1><p>Sua identidade e seus dados permanecem na nuvem.</p></div><button class="btn" id="signout">Sair da conta</button></div><div class="panel-grid"><div class="panel"><span class="badge">'+(A.profile?.verified?'Verificado':'Membro LX Plus')+'</span><h2 style="margin-top:16px">'+escapeHtml(A.profile?.name||'Usuário')+'</h2><p>'+escapeHtml(A.user?.email||'')+'</p><form id="profileForm" class="form"><label class="field">Nome<input name="name" maxlength="60" required value="'+escapeHtml(A.profile?.name||'')+'"></label><label class="field">Biografia<textarea name="bio" maxlength="280">'+escapeHtml(A.profile?.bio||'')+'</textarea></label><button class="btn primary">Salvar perfil</button></form></div><div class="panel"><span class="eyebrow">MINHA LISTA</span><p class="big">'+saved().size+'</p><p>Itens salvos na sua conta.</p><button class="btn" data-page="Minha Lista">Abrir lista</button><hr style="border:0;border-top:1px solid #383747;margin:25px 0"><p>Seu histórico, preferências e assinatura continuam no banco de dados original.</p></div></div>';
 if(A.page==='Avisos')return '<div class="heading"><div><span class="eyebrow">LX GROUP</span><h1>Avisos</h1></div></div><div class="panel">'+(A.notices.length?A.notices.map(x=>'<div class="notice"><strong>'+escapeHtml(x.title)+'</strong><p>'+escapeHtml(x.message)+'</p></div>').join(''):'<p>Sem novos avisos.</p>')+'</div>';
 if(A.page==='Comunidade')return '<div class="heading"><div><span class="eyebrow">LX SOCIAL</span><h1>Comunidade</h1><p>Encontre outros membros da plataforma.</p></div></div><div class="panel-grid"><div class="panel"><h2>Membros públicos</h2>'+(A.members.length?A.members.map(x=>'<div class="notice"><strong>'+escapeHtml(x.name||'Membro')+(x.verified?' ✓':'')+'</strong><p>'+escapeHtml(x.bio||'Membro LX Plus')+'</p></div>').join(''):'<p>Nenhum membro público encontrado.</p>')+'</div><div class="panel"><span class="badge">Em preparação</span><h2 style="margin-top:18px">Chamadas e mensagens</h2><p>A comunidade completa só será liberada depois dos testes de privacidade e estabilidade. Suas conversas antigas não foram apagadas.</p></div></div>';
 if(A.page==='Ranking'){
 const season=A.ranking?.season,rows=A.ranking?.rows||[];
 const prize=season?.prize_cents?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(season.prize_cents/100):'A definir';
 const table=rows.length?rows.map((row,i)=>{
  const p=A.members.find(m=>m.user_id===row.user_id);
  const name=p?.name||(row.user_id===A.user?.id?A.profile?.name:'Participante com perfil privado');
  return '<div class="notice" style="display:flex;align-items:center;gap:14px"><span class="badge">'+(i+1)+'º</span><div style="flex:1"><strong>'+escapeHtml(name)+'</strong><p>'+escapeHtml(season?.season_key||'')+'</p></div><strong>'+Number(row.monthly_score||0).toLocaleString('pt-BR')+' pts</strong></div>';
 }).join(''):'<p>Ainda não há pontuações nesta temporada.</p>';
 return '<div class="heading"><div><span class="eyebrow">RANKING LX</span><h1>Temporada '+escapeHtml(season?.season_key||'atual')+'</h1><p>Pontuação atual registrada pela plataforma.</p></div><span class="badge">Prêmio: '+escapeHtml(prize)+'</span></div><div class="panel-grid"><div class="panel"><h2>Classificação</h2>'+table+'</div><div class="panel"><h2>Informações</h2><p>Resultados e premiações são validados pela equipe LX Group. Perfis privados não têm os nomes expostos.</p><span class="badge">'+escapeHtml(season?.status||'Temporada')+'</span></div></div>';
 }
 if(A.page==='Administração'){
  const scan=A.drive.scan,rows=scan?.files||[];
  const ready=rows.filter(x=>x.qualifies),needsReview=rows.filter(x=>!x.qualifies);
  const preview=scan?'<div class="panel" style="grid-column:1/-1"><div class="heading"><div><h2>'+(scan.demo?'SIMULAÇÃO · Pasta fictícia':'Resultado da verificação')+'</h2><p>'+rows.length+' arquivos · '+ready.length+' prontos · '+needsReview.length+' para revisão</p></div></div><div class="drive-review">'+rows.slice(0,120).map(row=>{
    const cover=safeUrl(row.match?.cover),title=row.match?.title||row.parsed?.title||row.name||'Sem título';
    return '<div class="drive-row"><div class="drive-thumb">'+(cover?'<img loading="lazy" src="'+escapeHtml(cover)+'" alt="">':'<span>▶</span>')+'</div><div class="drive-desc"><strong>'+escapeHtml(title)+'</strong><small>'+escapeHtml(row.name)+' · '+(Number(row.confidence||0)*100).toFixed(0)+'% de correspondência</small><span class="'+(row.qualifies?'drive-ok':'drive-review-needed')+'">'+escapeHtml(row.reason)+'</span></div></div>';
   }).join('')+'</div>'+
   (scan.demo?'<div class="drive-demo-banner"><strong>AMBIENTE DE DEMONSTRAÇÃO</strong><p>Todos os nomes, capas e arquivos são fictícios. Nada é enviado ao Drive ou ao catálogo real.</p></div>':'<label class="drive-confirm"><input type="checkbox" id="driveRights" '+(A.drive.rightsConfirmed?'checked':'')+'> Confirmo que possuo autorização para distribuir os vídeos na LX Plus.</label>')+
   '<div class="actions"><button class="btn primary" type="button" id="drivePublish" '+(!ready.length||A.drive.working?'disabled':'')+'>'+(scan.demo?'Simular publicação de ':'Publicar ')+ready.length+' filmes</button>'+
   (scan.demo?'<button class="btn" type="button" id="driveDemoReset">Limpar demonstração</button>':'')+
   '</div><p class="muted">Duplicatas, episódios e correspondências incertas ficam para revisão.</p></div>':'';
  const summary=A.drive.lastResult?'<div class="panel" style="grid-column:1/-1"><h2>'+(A.drive.lastResult.demo?'Resultado da simulação · zero envios reais':'Última importação')+'</h2><p>'+A.drive.lastResult.published.length+(A.drive.lastResult.demo?' simulados · ':' publicados · ')+A.drive.lastResult.duplicates.length+' repetidos · '+A.drive.lastResult.errors.length+' com erro</p></div>':'';
  return studioOverview({catalog:A.items,scan:A.drive.scan})+'<div class="heading"><div><span class="eyebrow">LX GROUP · PAINEL ADMINISTRATIVO</span><h1>Automação do catálogo</h1><p>Importe filmes de uma pasta do Google Drive e complete os dados automaticamente.</p></div></div>'+
    '<div class="panel-grid"><div class="panel"><span class="eyebrow">GOOGLE DRIVE</span><h2>Conectar uma pasta</h2><p>Informe uma pasta compartilhada. O importador procura os vídeos e tenta identificar o filme usando o título do arquivo.</p><form class="form" id="driveScanForm"><label class="field">Link da pasta<input type="url" name="folder" required placeholder="https://drive.google.com/drive/folders/..." value="'+escapeHtml(A.drive.folder)+'"></label><label class="field">Limite por verificação<input type="number" name="limit" min="1" max="300" value="100"></label><button class="btn primary" '+(A.drive.working?'disabled':'')+'>Buscar filmes e capas</button></form><div class="actions" style="margin-top:14px"><button class="btn" type="button" id="driveDemo" '+(A.drive.working?'disabled':'')+'>▶ Testar pasta fictícia</button></div><p id="driveStatus" role="status" class="muted">'+escapeHtml(A.drive.progress||'O Google Drive e TMDb precisam estar configurados no Supabase.')+'</p></div>'+
    '<div class="panel"><span class="eyebrow">ETAPAS DA AUTOMAÇÃO</span><h2>Como funciona</h2><p>1. Arquivo novo na pasta → 2. Nome e ano → 3. Capa e descrição → 4. Verificação de qualidade → 5. Publicação.</p><p>Na primeira fase, você pode verificar e publicar com um clique. A sincronização recorrente só será ativada após configurar as chaves, a pasta e os direitos de distribuição.</p><span class="badge">Publicação automática ainda não ativada</span></div>'+
    '<div class="panel"><h2>Testar link no player</h2><p>Cole um link HTTPS de vídeo ou áudio e faça uma pré-visualização. O teste não altera o catálogo.</p><form id="previewLinkForm" class="form"><label class="field">Link para testar<input type="url" name="url" required maxlength="3000" placeholder="https://drive.google.com/file/d/..."></label><button class="btn">Testar reprodução</button></form></div>'+
    '<div class="panel"><span class="eyebrow">CATÁLOGO ATUAL</span><p class="big">'+A.items.length+'</p><p>Itens publicados visíveis pela sua conta. O catálogo original não será apagado.</p></div>'+summary+preview+'</div>';
 }
 return catalog();
}
function draw(){
 if(!A.user){renderAuth();return}if(!approved()){showGate();return}
 if(!document.querySelector('.shell'))shell();
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===A.page));
 const title=document.querySelector('#pageTitle');if(title)title.textContent=A.page;
 document.querySelector('#pageArea').innerHTML=['Início','Filmes','Séries','Músicas','Livros','Minha Lista','Buscar','Ao vivo'].includes(A.page)?catalog():otherPage();
}
function find(idValue){return [...A.items,...A.extra].find(x=>id(x.id)===id(idValue))}
function modal(item,player=null){
 if(A.playerCleanup){try{A.playerCleanup()}catch{}A.playerCleanup=null}
 A.modal={item,player};
 const liked=saved().has(id(item.id));
 const img=safeUrl(item.cover);
 let body='';
 if(player){
  const iframe=player.kind==='iframe';
  if(iframe){
   const origin=safeUrl(player.source||'');
   body='<div class="embed-wrap"><iframe id="lxEmbed" class="player embed" src="'+escapeHtml(player.url)+'" title="'+escapeHtml(item.title)+'" loading="eager" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>'+
    '<p class="muted">A reprodução depende das permissões do '+escapeHtml(player.provider||'provedor')+'. Links privados ou sem incorporação permitida podem não abrir.</p>'+
    (origin?'<a class="btn small" href="'+escapeHtml(origin)+'" target="_blank" rel="noopener noreferrer">Abrir no serviço original ↗</a>':'');
  }else if(['video','audio','hls','dash'].includes(player.kind)){
   const audio=player.kind==='audio';
   body='<'+(audio?'audio':'video')+' id="mediaPlayer" class="player" controls playsinline preload="metadata" '+(!audio&&img?'poster="'+escapeHtml(img)+'" ':'')+'></'+(audio?'audio':'video')+'>'+
    '<div class="player-status" id="playerStatus" role="status" aria-live="polite"></div>'+
    '<p class="muted">MP4, áudio, HLS e DASH funcionam conforme o navegador, codec e regras CORS da origem.</p>';
  }else body='<p>Este link não fornece um formato compatível. Verifique a origem.</p>';
 }else{
  body='<div class="details"><div>'+(img?'<img src="'+escapeHtml(img)+'" alt="">':'<div class="cover"><div class="placeholder">LX</div></div>')+'</div><div><span class="eyebrow">'+escapeHtml(label(item.type))+' · '+escapeHtml(item.year||'')+'</span><h2>'+escapeHtml(item.title)+'</h2><p>'+escapeHtml(item.description||'Descrição indisponível.')+'</p><small>'+escapeHtml(item.artist||item.author||item.genre||'')+'</small><div class="actions" style="margin-top:20px"><button class="btn primary" data-play="'+escapeHtml(item.id)+'">▶ '+(item.type==='Música'?'Ouvir':item.type==='Livro'?'Abrir':'Assistir')+'</button><button class="btn" data-like="'+escapeHtml(item.id)+'">'+(liked?'♥ Remover da lista':'♡ Minha Lista')+'</button></div></div></div>';
 }
 document.querySelector('#layer').innerHTML='<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="'+escapeHtml(item.title)+'"><div class="modal-head"><h2>'+escapeHtml(player?'Reproduzindo '+item.title:'Detalhes')+'</h2><button type="button" class="close" data-close aria-label="Fechar">✕</button></div><div class="modal-body">'+body+'</div></div></div>';
 const media=document.querySelector('#mediaPlayer');
 if(media){
  const m=A.modal;let previous=0;
  media.addEventListener('timeupdate',()=>{if(!A.user||media.currentTime-previous<20)return;previous=media.currentTime;saveProgress(item,media.currentTime,media.duration)});
  media.addEventListener('ended',()=>{if(A.user)saveProgress(item,media.duration,media.duration)});
  const onError=message=>{const box=document.querySelector('#playerStatus');if(box)box.textContent=message};
  attachPlayer(media,player,{onError}).then(cleanup=>{
   if(A.modal===m){A.playerCleanup=cleanup}else cleanup();
  }).catch(error=>onError(error.message||'Falha ao iniciar reprodução.'));
 }
}

let progressTimeout=0;
function saveProgress(item,t,d){const old=A.stored.history&&typeof A.stored.history==='object'?A.stored.history:{};A.stored.history={...old,[id(item.id)]:{position:Math.round(t||0),duration:Math.round(d||0),updatedAt:new Date().toISOString()}};clearTimeout(progressTimeout);progressTimeout=setTimeout(()=>saveUserField(A.user.id,'history',A.stored.history).catch(()=>{}),1300)}
function closeModal(){
 if(A.playerCleanup){try{A.playerCleanup()}catch{}A.playerCleanup=null}
 document.querySelector('#mediaPlayer')?.pause();
 A.modal=null;const l=document.querySelector('#layer');if(l)l.innerHTML='';
}
async function toggle(item){
 const before=A.stored.list;const s=saved();s.has(id(item.id))?s.delete(id(item.id)):s.add(id(item.id));
 A.stored.list=[...s].map(v=>/^\d+$/.test(v)?Number(v):v);
 modal(item);if(A.page==='Minha Lista')draw();
 try{await saveUserField(A.user.id,'list',A.stored.list);toast('Sua lista foi atualizada.')}
 catch(e){A.stored.list=before;modal(item);if(A.page==='Minha Lista')draw();toast(e.message||'Não foi possível salvar a lista.')}
}
async function play(item){
 try{const player=await sourceFor(item);
  if(player.kind==='unavailable'){toast('Este título está em breve ou não possui fonte autorizada para reprodução.');return}
  if(player.kind==='external'){toast(player.message||'Abra o conteúdo no provedor original.');if(safeUrl(player.url))window.open(player.url,'_blank','noopener,noreferrer');return}
  if(player.kind==='invalid'||!safeUrl(player.url)){toast(player.message||'Endereço de mídia inválido.');return}
  modal(item,player);
 }catch(e){toast('Erro ao abrir mídia: '+(e.message||'tente novamente'))}
}
// No remote request is allowed to hold the startup screen indefinitely.
function timed(promise,label,ms=9000){
 let timer;
 return Promise.race([
  Promise.resolve(promise),
  new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' demorou para responder. Verifique sua conexão ou use a entrada com e-mail e senha.')),ms)})
 ]).finally(()=>clearTimeout(timer));
}
function loadingStage(message){
 const node=root.querySelector('.loading');
 if(node)node.textContent=message;
}
function loadCatalogInBackground(generation=A.loadGeneration){
 A.catalogStatus='loading';
 if(document.querySelector('.shell'))draw();
 timed(getCatalog(),'O catálogo',24000).then(items=>{
  if(generation!==A.loadGeneration||!A.user)return;
  A.items=items;A.catalogStatus='ready';draw();
 }).catch(err=>{
  console.warn('LX Plus: falha ao sincronizar catálogo:',err);
  if(generation!==A.loadGeneration||!A.user)return;
  A.catalogStatus='error';draw();
 });
}
function loadExtrasInBackground(generation=A.loadGeneration){
 const jobs=[
  timed(notices(),'Avisos',12000),
  timed(publicMembers(),'Membros',12000),
  timed(getRanking(),'Ranking',12000)
 ];
 Promise.allSettled(jobs).then(results=>{
  if(generation!==A.loadGeneration||!A.user)return;
  if(results[0].status==='fulfilled')A.notices=results[0].value;
  if(results[1].status==='fulfilled')A.members=results[1].value;
  if(results[2].status==='fulfilled')A.ranking=results[2].value;
  if(document.querySelector('.shell'))draw();
 });
}
async function initialize(){
 const generation=++A.loadGeneration;
 root.innerHTML='<div class="loading">Verificando sua sessão da LX Plus…</div>';
 try{
  const {data,error}=await timed(db.auth.getSession(),'A autenticação',8500);
  if(generation!==A.loadGeneration)return;
  if(error)throw error;
  A.user=data.session?.user||null;
  if(!A.user){renderAuth();return}
  if(A.auth==='password'){renderAuth();return}
  loadingStage('Carregando seu perfil LX Plus…');
  const [profile,admin,st]=await timed(
   Promise.all([getProfile(A.user.id),isAdmin(),getUserState(A.user.id)]),
   'Seu perfil',10000
  );
  if(generation!==A.loadGeneration)return;
  A.profile=profile;A.admin=admin;A.stored=st;
  if(!approved()){showGate();return}
  A.items=[];A.catalogStatus='loading';
  A.notices=[];A.members=[];A.ranking={season:null,rows:[]};
  draw(); // The member dashboard opens immediately. Extras cannot block access.
  loadCatalogInBackground(generation);
  loadExtrasInBackground(generation);
 }catch(e){
  if(generation!==A.loadGeneration)return;
  console.warn('LX Plus: inicialização não concluída:',e);
  showError(e.message||'Não foi possível conectar ao servidor.');
 }
}
let searchTimer=0;
root.addEventListener('input',e=>{
 if(e.target.id!=='search')return;
 A.term=e.target.value;A.filter='Todos';clearTimeout(searchTimer);
 searchTimer=setTimeout(async()=>{
  const before=A.term;A.extra=before.trim().length>=3?await findDiscovery(before):[];
  if(before!==A.term)return;
  if(!['Início','Buscar'].includes(A.page))A.page='Buscar';
  draw();
 },260);
});
root.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.auth){A.auth=button.dataset.auth;renderAuth();return}
 if(button.dataset.page){const menu=button.closest('details');if(menu)menu.open=false;A.page=button.dataset.page;A.term='';A.filter='Todos';A.extra=[];const search=document.querySelector('#search');if(search)search.value='';draw();window.scrollTo({top:0,behavior:'smooth'});return}
 if(button.dataset.scroll){
  const rail=document.querySelector('[data-rail="'+CSS.escape(button.dataset.scroll)+'"]');
  if(rail){
   const delta=(button.dataset.direction==='-1'?-1:1)*Math.max(200,rail.clientWidth*.8);
   if(rail.scrollBy)rail.scrollBy({left:delta,behavior:'smooth'});
   else rail.scrollLeft+=delta;
  }
  return;
 }
 if(button.dataset.studioPreview!==undefined){
  if(!A.admin)return;
  const index=Number(button.dataset.studioPreview);
  const item=studioSources({catalog:A.items,scan:A.drive.scan})[index];
  if(item){
   document.querySelector('#layer').innerHTML='<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="Prévia de arte"><div class="modal-head"><h2>Prévia de capa e banner</h2><button type="button" class="close" data-close aria-label="Fechar">✕</button></div><div class="modal-body">'+studioPreview(item)+'</div></div></div>';
  }
  return;
 }
 if(button.dataset.filter){A.filter=button.dataset.filter;draw();return}
 if(button.dataset.item){const x=find(button.dataset.item);if(x)modal(x);return}
 if(button.dataset.close!==undefined){closeModal();return}
 if(button.dataset.like){const x=find(button.dataset.like);if(x)await toggle(x);return}
 if(button.dataset.play){const x=find(button.dataset.play);if(x)await play(x);return}
 if(button.id==='driveDemo'){
  if(!A.admin||A.drive.working)return;
  A.drive={folder:'',scan:makeDemoDriveScan(),progress:'Simulação pronta: seis arquivos fictícios encontrados.',rightsConfirmed:false,working:false,lastResult:null};
  draw();toast('Pasta fictícia carregada. Nenhum acesso ao Google Drive ou ao banco de dados.');return;
 }
 if(button.id==='driveDemoReset'){
  if(!A.admin||A.drive.working)return;
  A.drive={folder:'',scan:null,progress:'Simulação encerrada.',rightsConfirmed:false,working:false,lastResult:null};
  draw();return;
 }
 if(button.id==='drivePublish'){
  if(!A.admin||A.drive.working||!A.drive.scan)return;
  if(A.drive.scan.demo){
   A.drive.lastResult=simulateDemoPublish(A.drive.scan);
   A.drive.progress='Simulação concluída: zero publicações reais.';
   draw();toast(A.drive.lastResult.message);return;
  }
  const confirmed=document.querySelector('#driveRights')?.checked===true;
  if(!confirmed){toast('Confirme que você tem direito de distribuir os arquivos antes de publicar.');return}
  A.drive.rightsConfirmed=true;A.drive.working=true;
  try{
   const results=await publishMatches(db,A.drive.scan.files,{rightsConfirmed:true,onProgress:message=>{
    A.drive.progress=message;const status=document.querySelector('#driveStatus');if(status)status.textContent=message;
   }});
   A.drive.lastResult=results;
   toast('Publicados: '+results.published.length+' · Repetidos: '+results.duplicates.length+' · Erros: '+results.errors.length);
   A.items=await getCatalog();
  }catch(e){toast(e.message||'Erro ao importar arquivos.')}
  finally{A.drive.working=false;draw()}
  return;
 }
 if(button.id==='clear'){A.term='';A.filter='Todos';A.extra=[];const inp=document.querySelector('#search');if(inp)inp.value='';draw();return}
 if(button.id==='retry'){await initialize();return}
 if(button.id==='retryCatalog'){loadCatalogInBackground();return}
 if(button.id==='manualLogin'){
  ++A.loadGeneration;
  const client=switchToRecoveryLogin();
  attachAuthListener(client);
  A.user=null;A.profile=null;A.stored={};A.items=[];A.auth='login';
  renderAuth();
  toast('Entre com o e-mail e a senha que você já usava na LX Plus.');
  return;
 }
 if(button.id==='signout'){
  ++A.loadGeneration;
  try{await timed(db.auth.signOut(),'A saída da conta',7000)}catch(err){console.warn('LX Plus: saída demorou:',err)}
  A.user=null;A.profile=null;A.stored={};A.items=[];A.auth='login';renderAuth();return;
 }
 if(button.id==='resend'){
  const email=document.querySelector('#signin input[name="email"]')?.value?.trim();
  if(!email){toast('Digite seu e-mail antes de reenviar.');return}
  const {error}=await db.auth.resend({type:'signup',email});toast(error?error.message:'Se necessário, a confirmação foi reenviada.');
 }
});
root.addEventListener('click',e=>{if(e.target.matches('.overlay'))closeModal()});
root.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target;const btn=f.querySelector('button[type="submit"],button.btn.primary');if(btn)btn.disabled=true;
 const data=Object.fromEntries(new FormData(f).entries());
 try{
  if(f.id==='driveScanForm'){
   if(!A.admin)throw Error('Esta operação exige acesso administrativo.');
   if(A.drive.working)return;
   A.drive.working=true;A.drive.scan=null;A.drive.lastResult=null;A.drive.rightsConfirmed=false;
   A.drive.folder=String(data.folder||'').trim();
   const status=document.querySelector('#driveStatus');
   try{
    const outcome=await scanDriveFolder(db,A.drive.folder,{limit:Number(data.limit||100),onProgress:message=>{
     A.drive.progress=message;if(status)status.textContent=message;
    }});
    A.drive.scan=outcome;A.drive.progress='Análise concluída: '+outcome.files.length+' arquivos.';
    toast('Encontrei '+outcome.files.length+' vídeos. Confira as capas antes de publicar.');
   }catch(e){A.drive.progress=String(e.message||e);toast(A.drive.progress)}
   finally{A.drive.working=false;draw()}
   return;
  }
  if(f.id==='previewLinkForm'){
   if(!A.admin)throw Error('Somente administradores podem testar links.');
   const input=String(data.url||'').trim(),entry=classifyLink(input);
   if(entry.kind==='invalid'){toast(entry.message);return}
   if(entry.kind==='external'){toast(entry.message);return}
   modal({id:'preview',title:'Pré-visualização '+(entry.provider||''),type:'Filme',description:'Link de teste sem gravação no catálogo.'},entry);return;
  }
  if(f.id==='signin'){
   const {error}=await timed(db.auth.signInWithPassword({email:String(data.email||'').trim(),password:String(data.password||'')}),'O login',12000);
   if(error)throw error;
   await initialize();
  }
  if(f.id==='signup'){const {data:created,error}=await db.auth.signUp({email:String(data.email||'').trim(),password:String(data.password||''),options:{data:{name:String(data.name||'').trim()},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;if(created.session)await initialize();else{A.auth='login';renderAuth();toast('Cadastro enviado. Confirme seu e-mail e aguarde a aprovação.')}}
  if(f.id==='reset'){const {error}=await db.auth.resetPasswordForEmail(String(data.email||'').trim(),{redirectTo:location.origin+location.pathname+'?recovery=1'});if(error)throw error;A.auth='login';renderAuth();toast('Se a conta existir, o e-mail de recuperação será enviado.')}
  if(f.id==='newPassword'){if(data.password!==data.confirm)throw Error('As senhas não coincidem.');const {error}=await db.auth.updateUser({password:String(data.password)});if(error)throw error;history.replaceState(null,'',location.pathname);A.auth='login';toast('Senha atualizada.');await initialize()}
  if(f.id==='profileForm'){await saveMyProfile(A.user.id,String(data.name||'').trim(),String(data.bio||'').trim());A.profile={...A.profile,name:data.name,bio:data.bio};draw();toast('Perfil atualizado.')}
 }catch(err){toast(err.message||'Não foi possível realizar essa ação.')}
 finally{if(btn&&btn.isConnected)btn.disabled=false}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
function attachAuthListener(client=db){
 client.auth.onAuthStateChange((event,session)=>{
  if(client!==db)return;
  if(event==='PASSWORD_RECOVERY'){A.user=session?.user||null;A.auth='password';renderAuth()}
  if(event==='SIGNED_OUT'){++A.loadGeneration;A.user=null;A.profile=null;A.stored={};A.items=[];A.auth='login';renderAuth()}
 });
}
attachAuthListener();
if(location.search.includes('recovery=1')||location.hash.includes('type=recovery'))A.auth='password';
initialize();
