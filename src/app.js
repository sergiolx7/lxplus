import {db,categories,safeUrl,getCatalog,findDiscovery,getProfile,getUserState,isAdmin,saveUserField,saveMyProfile,notices,publicMembers,sourceFor,getRanking} from './data.js';
import {VERSION} from './config.js';

const root=document.querySelector('#app');
const A={user:null,profile:null,admin:false,stored:{},items:[],extra:[],members:[],notices:[],ranking:{season:null,rows:[]},page:'Início',term:'',filter:'Todos',auth:'login',modal:null,busy:false};
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
 root.innerHTML='<div class="full-screen"><div class="brand" style="justify-content:center">'+brand()+'</div><div class="panel" style="max-width:480px"><h2>Não conseguimos carregar a LX Plus</h2><p>'+escapeHtml(message)+'</p><button class="btn primary" id="retry">Tentar novamente</button> <button class="btn" id="signout">Sair</button></div></div>';
}
function navButton(name,icon,cls='nav-btn'){
 return '<button class="'+cls+(A.page===name?' active':'')+'" type="button" data-page="'+escapeHtml(name)+'"><span class="symbol">'+icon+'</span>'+escapeHtml(name)+'</button>';
}
function shell(){
 const nav=pages.map(x=>navButton(...x)).join('')+(A.admin?navButton('Administração','⚙'):'');
 const mobile=pages.filter(x=>['Início','Filmes','Músicas','Minha Lista','Perfil'].includes(x[0])).map(x=>navButton(...x,'mobile-button')).join('');
 root.innerHTML='<div class="shell"><aside class="aside"><div class="brand">'+brand()+'</div><nav class="nav-group"><span class="nav-label">EXPLORAR</span>'+nav+'</nav><div class="aside-foot"><b>LX Group</b>Uma plataforma reconstruída com foco em estabilidade e privacidade.</div></aside><div class="content"><header class="topbar"><div class="top-name"><strong id="pageTitle">'+escapeHtml(A.page)+'</strong><small>'+escapeHtml(VERSION)+'</small></div><input type="search" id="search" class="search" placeholder="Buscar filmes, músicas, livros…" aria-label="Buscar no catálogo" value="'+escapeHtml(A.term)+'"><button class="avatar-button" type="button" data-page="Perfil" aria-label="Abrir perfil"><span class="avatar">'+escapeHtml(initials(A.profile?.name))+'</span></button></header><main id="pageArea" class="page"></main></div></div><nav class="mobile-nav">'+mobile+'</nav><div id="layer"></div>';
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
 const list=filtered();
 const history=A.stored.history&&typeof A.stored.history==='object'?A.stored.history:{};
 const recently=Object.entries(history).map(([key,record])=>({
  item:A.items.find(x=>id(x.id)===key),
  when:record&&typeof record==='object'?record.updatedAt:''
 })).filter(x=>x.item).sort((a,b)=>String(b.when).localeCompare(String(a.when))).slice(0,6);
 const resume=(A.page==='Início'&&!A.term&&recently.length)?
 '<section style="margin:0 0 30px"><div class="heading"><div><span class="eyebrow">SEU HISTÓRICO</span><h2>Continue de onde parou</h2></div></div><div class="cards">'+recently.map(x=>card(x.item)).join('')+'</div></section>':'';

 const filters=['Todos','Filme','Série','Dorama','Anime','Música','Livro'];
 const chips=['Início','Buscar'].includes(A.page)?'<div class="filters">'+filters.map(x=>'<button type="button" class="chip '+(A.filter===x?'active':'')+'" data-filter="'+escapeHtml(x)+'">'+escapeHtml(x==='Todos'?'Todos':label(x))+'</button>').join('')+'</div>':'';
 return (A.page==='Início'&&!A.term?hero():'')+resume+'<div class="heading"><div><span class="eyebrow">BIBLIOTECA LX</span><h1>'+escapeHtml(A.term?'Busca: '+A.term:A.page==='Início'?'Descubra na LX Plus':A.page)+'</h1><p>Encontre seu próximo filme, livro ou som favorito.</p></div><small>'+list.length+' itens</small></div>'+chips+(list.length?'<div class="cards">'+list.slice(0,180).map(card).join('')+'</div>'+(list.length>180?'<p class="muted">Mostrando 180 resultados. Refine sua busca para encontrar outros títulos.</p>':''):'<div class="empty"><h2>Nada encontrado</h2><p>Tente outra pesquisa ou categoria.</p><button type="button" class="btn" id="clear">Limpar filtros</button></div>');
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
 if(A.page==='Administração')return '<div class="heading"><div><span class="eyebrow">ACESSO RESTRITO</span><h1>Administração</h1></div></div><div class="panel-grid"><div class="panel"><span class="eyebrow">ITENS DISPONÍVEIS</span><p class="big">'+A.items.length+'</p><p>Conteúdos que sua conta pode visualizar.</p></div><div class="panel"><h2>Gestão em reconstrução</h2><p>Ferramentas destrutivas e moderação só serão reativadas depois de testar regras de acesso e rotas de recuperação.</p></div></div>';
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
 A.modal={item,player};
 const liked=saved().has(id(item.id));
 const img=safeUrl(item.cover);
 const body=player?'<'+(player.kind==='audio'?'audio':'video')+' id="mediaPlayer" class="player" controls autoplay playsinline preload="metadata" '+(img?'poster="'+escapeHtml(img)+'" ':'')+'src="'+escapeHtml(player.url)+'"></'+(player.kind==='audio'?'audio':'video')+'><p class="muted">Fontes externas podem estar indisponíveis. Somente fontes autorizadas são abertas.</p>':'<div class="details"><div>'+(img?'<img src="'+escapeHtml(img)+'" alt="">':'<div class="cover"><div class="placeholder">LX</div></div>')+'</div><div><span class="eyebrow">'+escapeHtml(label(item.type))+' · '+escapeHtml(item.year||'')+'</span><h2>'+escapeHtml(item.title)+'</h2><p>'+escapeHtml(item.description||'Descrição indisponível.')+'</p><small>'+escapeHtml(item.artist||item.author||item.genre||'')+'</small><div class="actions" style="margin-top:20px"><button class="btn primary" data-play="'+escapeHtml(item.id)+'">▶ '+(item.type==='Música'?'Ouvir':item.type==='Livro'?'Abrir':'Assistir')+'</button><button class="btn" data-like="'+escapeHtml(item.id)+'">'+(liked?'♥ Remover da lista':'♡ Minha Lista')+'</button></div></div></div>';
 document.querySelector('#layer').innerHTML='<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="'+escapeHtml(item.title)+'"><div class="modal-head"><h2>'+escapeHtml(player?'Reproduzindo '+item.title:'Detalhes')+'</h2><button type="button" class="close" data-close aria-label="Fechar">✕</button></div><div class="modal-body">'+body+'</div></div></div>';
 const media=document.querySelector('#mediaPlayer');if(media){let previous=0;media.addEventListener('timeupdate',()=>{if(media.currentTime-previous<20)return;previous=media.currentTime;saveProgress(item,media.currentTime,media.duration)});media.addEventListener('ended',()=>saveProgress(item,media.duration,media.duration))}
}
let progressTimeout=0;
function saveProgress(item,t,d){const old=A.stored.history&&typeof A.stored.history==='object'?A.stored.history:{};A.stored.history={...old,[id(item.id)]:{position:Math.round(t||0),duration:Math.round(d||0),updatedAt:new Date().toISOString()}};clearTimeout(progressTimeout);progressTimeout=setTimeout(()=>saveUserField(A.user.id,'history',A.stored.history).catch(()=>{}),1300)}
function closeModal(){document.querySelector('#mediaPlayer')?.pause();A.modal=null;const l=document.querySelector('#layer');if(l)l.innerHTML=''}
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
  if(player.kind==='external'){window.open(player.url,'_blank','noopener,noreferrer');return}
  if(!safeUrl(player.url)){toast('Endereço de mídia inválido.');return}
  modal(item,player);
 }catch(e){toast('Erro ao abrir mídia: '+(e.message||'tente novamente'))}
}
async function initialize(){
 root.innerHTML='<div class="loading">Conectando à sua biblioteca LX Plus…</div>';
 try{
  const {data,error}=await db.auth.getSession();if(error)throw error;
  A.user=data.session?.user||null;
  if(!A.user){renderAuth();return}
  if(A.auth==='password'){renderAuth();return}
  const [profile,admin,st]=await Promise.all([getProfile(A.user.id),isAdmin(),getUserState(A.user.id)]);
  A.profile=profile;A.admin=admin;A.stored=st;
  if(!approved()){showGate();return}
  [A.items,A.notices,A.members,A.ranking]=await Promise.all([getCatalog(),notices(),publicMembers(),getRanking()]);
  draw();
 }catch(e){showError(e.message||'Não foi possível conectar ao servidor.')}
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
 if(button.dataset.page){A.page=button.dataset.page;A.term='';A.filter='Todos';A.extra=[];const search=document.querySelector('#search');if(search)search.value='';draw();window.scrollTo({top:0,behavior:'smooth'});return}
 if(button.dataset.filter){A.filter=button.dataset.filter;draw();return}
 if(button.dataset.item){const x=find(button.dataset.item);if(x)modal(x);return}
 if(button.dataset.close!==undefined){closeModal();return}
 if(button.dataset.like){const x=find(button.dataset.like);if(x)await toggle(x);return}
 if(button.dataset.play){const x=find(button.dataset.play);if(x)await play(x);return}
 if(button.id==='clear'){A.term='';A.filter='Todos';A.extra=[];const inp=document.querySelector('#search');if(inp)inp.value='';draw();return}
 if(button.id==='retry'){await initialize();return}
 if(button.id==='signout'){await db.auth.signOut();A.user=null;A.profile=null;A.stored={};A.items=[];A.auth='login';renderAuth();return}
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
  if(f.id==='signin'){const {error}=await db.auth.signInWithPassword({email:String(data.email||'').trim(),password:String(data.password||'')});if(error)throw error;await initialize()}
  if(f.id==='signup'){const {data:created,error}=await db.auth.signUp({email:String(data.email||'').trim(),password:String(data.password||''),options:{data:{name:String(data.name||'').trim()},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;if(created.session)await initialize();else{A.auth='login';renderAuth();toast('Cadastro enviado. Confirme seu e-mail e aguarde a aprovação.')}}
  if(f.id==='reset'){const {error}=await db.auth.resetPasswordForEmail(String(data.email||'').trim(),{redirectTo:location.origin+location.pathname+'?recovery=1'});if(error)throw error;A.auth='login';renderAuth();toast('Se a conta existir, o e-mail de recuperação será enviado.')}
  if(f.id==='newPassword'){if(data.password!==data.confirm)throw Error('As senhas não coincidem.');const {error}=await db.auth.updateUser({password:String(data.password)});if(error)throw error;history.replaceState(null,'',location.pathname);A.auth='login';toast('Senha atualizada.');await initialize()}
  if(f.id==='profileForm'){await saveMyProfile(A.user.id,String(data.name||'').trim(),String(data.bio||'').trim());A.profile={...A.profile,name:data.name,bio:data.bio};draw();toast('Perfil atualizado.')}
 }catch(err){toast(err.message||'Não foi possível realizar essa ação.')}
 finally{if(btn&&btn.isConnected)btn.disabled=false}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
db.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){A.user=session?.user||null;A.auth='password';renderAuth()}
 if(event==='SIGNED_OUT'){A.user=null;A.profile=null;A.stored={};A.items=[];A.auth='login';renderAuth()}
});
if(location.search.includes('recovery=1')||location.hash.includes('type=recovery'))A.auth='password';
initialize();
