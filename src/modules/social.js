import {voiceConstraints} from '../voice-quality.js';
import {expressionToken,renderExpressions} from '../premium-expressions.js';
import {memberProfileCard} from '../member-profile.js';
import {normalizePremiumProfile} from '../premium-style.js';
import {profileImageUrl,profileLedAttributes,profileCover,profileName,premiumBadge,founderBadge,syncProfileBanners} from '../profile-premium.js';
import {presenceSummary,presenceMarkup} from '../social-presence.js';
import {listeningMarkup} from '../music-friend-activity.js';
import {socialDrafts,messageOutbox} from '../social-drafts.js';
import {communityFeed,socialComposerIdeas,socialComposerDraft,communityStats} from '../social-experience.js';
import {engagementPreview,compactSocialCount,publicDemoLabel} from '../social-demo-ui.js';
import {db} from '../data.js';
import {socialDirectory,uploadSocial,socialMediaUrl} from '../services.js';
import {uuid,esc,avatar,verifiedBadge,dateTime,empty,checked,https,icon} from '../ui.js';

export async function mount(host,ctx){
 let voiceDraft=null,voiceUrl='',recordTimer=null,recordStartedAt=0,recordPending=false,recordEpoch=0;
 let expressionAssets=[],expressionOpen=false,expressionPage=0,lastExpressionLookup=0;
 let callRows=[],callsLoading=false,callsError='';
 let alive=true,tab=ctx.term==='calls'?'Chamadas':'Feed',people=[],groups=[],posts=[],messages=[],selected=null,reply=null,feedBefore=null,chatBefore=null,search='',busy=false,recording=null,recordStream=null,recordChunks=[],signed=new Map(),channel=null,feedGeneration=0,chatGeneration=0;
 const me=ctx.user.id,person=id=>{const p=id===me?ctx.profile():people.find(p=>p.user_id===id)||{name:'Membro LX'};return {...p,is_founder:founderIds.has(id)}},friends=()=>people.filter(p=>p.user_id!==me&&p.relation==='accepted');
 const drafts=socialDrafts(me),outbox=messageOutbox(uuid),openComments=new Set();
 const threadKey=target=>target?target.kind+':'+target.id:'';
 let postDraft=drafts.get('post'),postFile=null,postSending=false,loadingThread='';
 let presence=new Map(),feedSearch='',feedSearchTimer=null,feedFilter='all',sponsoredPostIds=new Set(),savedPostIds=new Set(),demoPostCounts=new Map(),demoProfileCounts=new Map(),publicDemoPostCounts=new Map(),publicDemoProfileCounts=new Map(),followStats=new Map(),labMode=false,founderIds=new Set();
 let draft='',sharedPost=/^#post=([-a-f0-9]{36})$/i.exec(location.hash)?.[1]||null,profileReturnFocus=null;
 function dialog(title,body,mode='standard'){const root=host.querySelector('#socialDialog');if(mode==='member'){profileReturnFocus=document.activeElement;root.innerHTML='<div class="inline-dialog lx-member-profile-overlay" role="dialog" aria-modal="true" aria-label="Perfil de '+esc(title)+'"><div class="lx-member-profile-shell"><button class="lx-member-profile-close" data-social-close aria-label="Fechar perfil">×</button>'+body+'</div></div>';root.querySelector('[data-social-close]')?.focus();return}root.innerHTML='<div class="inline-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="panel"><div class="heading"><h2>'+esc(title)+'</h2><button class="close" data-social-close aria-label="Fechar">×</button></div>'+body+'</div></div>';root.querySelector('input,textarea,[data-social-close]')?.focus()}
 async function showMemberProfile(id){
  if(id!==me&&!people.some(p=>p.user_id===id))throw Error('Este perfil não está disponível no diretório.');
  const p={...person(id)};
  const cosmetics=await db.rpc('lx_profile_cosmetics',{p_user:id});
  if(!alive)return;
  if(!cosmetics.error&&cosmetics.data)Object.assign(p,cosmetics.data);
  dialog(p.name,memberProfileCard(p,{viewerId:me,presence:statusLine(p.user_id),nowPlaying:nowPlayingLine(p.user_id),assets:expressionAssets,demoFollowers:demoProfileCounts.get(p.user_id)||0,publicDemoFollowers:publicDemoProfileCounts.get(p.user_id)||0,followStats:followStats.get(p.user_id),labMode}),'member');
  syncProfileBanners(host);
 }
 function closeDialog(){host.querySelector('#socialDialog')?.replaceChildren();const previous=profileReturnFocus;profileReturnFocus=null;if(previous?.isConnected)previous.focus()}
 async function mediaUrl(path){if(!path)return '';const existing=signed.get(path);if(existing&&existing.expires>Date.now())return existing.url;try{const url=await socialMediaUrl(path);signed.set(path,{url,expires:Date.now()+240000});return url}catch{return ''}}
 async function hydrateMedia(area){const nodes=[...area.querySelectorAll('[data-social-media]')];await Promise.all(nodes.map(async node=>{const url=await mediaUrl(node.dataset.socialMedia);if(!alive||!node.isConnected)return;if(!url){node.replaceWith(Object.assign(document.createElement('span'),{className:'muted',textContent:'Arquivo indisponível ou sem permissão de acesso.'}));return}if(node.tagName==='A'){node.href=url}else node.src=url}))}
 function presenceOf(id){return presence.get(id)}
 function statusLine(id){return '<span data-social-presence="'+esc(id)+'">'+presenceMarkup(presenceOf(id))+'</span>'}
 function nowPlayingLine(id){return '<div data-social-now-playing="'+esc(id)+'">'+listeningMarkup(presenceOf(id))+'</div>'}
 function onlineFriends(){const online=friends().filter(p=>['online','away','busy'].includes(presenceSummary(presenceOf(p.user_id)).state));return '<div class="heading"><h3>Seu círculo agora</h3><small>'+online.length+' disponíveis</small></div>'+(online.length?online.slice(0,8).map(p=>'<button class="social-online-friend" data-chat-peer="'+esc(p.user_id)+'">'+avatar(p)+'<span><strong>'+profileName(p)+verifiedBadge(p)+founderBadge(p)+'</strong>'+presenceMarkup(presenceOf(p.user_id))+listeningMarkup(presenceOf(p.user_id))+'</span>'+icon('chat')+'</button>').join(''):'<p class="muted">Seus amigos aparecem aqui quando compartilham a presença.</p>')}
 async function loadPresence(){try{const rows=await checked(db.rpc('lx_presence_for_viewer'));if(!alive)return;presence=new Map((rows||[]).map(p=>[p.user_id,p]));host.querySelectorAll('[data-social-presence]').forEach(node=>node.innerHTML=presenceMarkup(presenceOf(node.dataset.socialPresence)));host.querySelectorAll('[data-social-now-playing]').forEach(node=>node.innerHTML=listeningMarkup(presenceOf(node.dataset.socialNowPlaying)));const circle=host.querySelector('#socialOnlineFriends');if(circle)circle.innerHTML=onlineFriends()}catch{/* Keep previous permitted presence when offline. */}}
 function feedToolbar(){
  const my=followStats.get(me)||{followers:0,following_count:0};
  const filters=[['all','Para você'],['following','Seguindo'],['friends','Amigos'],['popular','Em alta'],['saved','Salvos']];
  return '<div class="feed-toolbar lx-social-v3-toolbar">'+
   '<div class="lx-feed-toolbar-top"><div><span class="premium-overline">SEU ESPAÇO LX</span><h2>Descubra e compartilhe</h2><p class="lx-social-follow-summary"><strong>'+compactSocialCount(Number(my.followers||0)+Number(demoProfileCounts.get(me)||0))+'</strong> seguidores · <strong>'+compactSocialCount(my.following_count||0)+'</strong> seguindo</p>'+(!labMode?publicDemoLabel(publicDemoProfileCounts.get(me),'profile'):'')+'</div>'+
   '<button type="button" class="lx-feed-compose-jump" data-jump-compose>'+icon('plus')+' Criar publicação</button></div>'+
   '<div class="lx-feed-tools"><div class="feed-filters" role="group" aria-label="Filtrar as publicações carregadas">'+filters.map(f=>'<button type="button" data-feed-filter="'+f[0]+'" aria-pressed="'+(feedFilter===f[0])+'">'+esc(f[1])+'</button>').join('')+'</div>'+
   '<label class="lx-feed-search">'+icon('search')+'<input id="feedSearch" type="search" maxlength="160" placeholder="Pesquisar neste feed" aria-label="Pesquisar publicações carregadas" value="'+esc(feedSearch)+'"></label></div>'+
   '<p class="lx-feed-result-note" id="lxFeedShowing" aria-live="polite">'+visiblePosts().length+' publicações nos resultados</p>'+
   '</div>';
 }
 function suggestedProfiles(){
  const candidates=people.filter(p=>p.user_id!==me&&p.relation!=='accepted'&&!followStats.get(p.user_id)?.is_following).slice(0,3);
  if(!candidates.length)return '<p class="muted">Explore perfis para encontrar novas conexões na comunidade.</p>';
  return candidates.map(p=>'<div class="lx-social-suggestion">'+avatar(p,'member-avatar')+'<div class="lx-suggestion-detail"><strong>'+profileName(p)+verifiedBadge(p)+founderBadge(p)+'</strong><small>'+esc(p.username?'@'+p.username:'Membro LX')+'</small></div><button type="button" data-person="'+esc(p.user_id)+'" aria-label="Ver perfil de '+esc(p.name||'membro')+'">'+icon('arrow')+'</button></div>').join('');
 }
 function visiblePosts(){return communityFeed((feedFilter==='saved'?posts.filter(p=>savedPostIds.has(p.id)):posts).map(p=>({...p,author_name:person(p.author_id)?.name,author_username:person(p.author_id)?.username})),{filter:feedFilter==='saved'?'all':feedFilter,search:feedSearch,viewerId:me,friends:friends().map(p=>p.user_id),following:people.filter(p=>followStats.get(p.user_id)?.is_following).map(p=>p.user_id),sponsored:[...sponsoredPostIds]})}
 function feedList(){const items=visiblePosts();return items.length?items.map(feedPost).join(''):empty('Nada encontrado por aqui',feedFilter==='saved'?'Publicações que você salvar aparecerão aqui, respeitando a privacidade dos autores.':feedFilter==='following'?'Siga alguns perfis em Pessoas para acompanhar as publicações deles.':feedSearch?'Tente outro termo de busca ou limpe o filtro.':'Compartilhe uma história para começar a conversa.')}
 function updateFeedResults(){const node=host.querySelector('#feedPosts');if(!node)return;node.innerHTML=feedList();hydrateMedia(node);host.querySelectorAll('[data-feed-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.feedFilter===feedFilter)));const count=host.querySelector('#lxFeedShowing');if(count)count.textContent=visiblePosts().length+(feedFilter==='saved'?' publicações salvas disponíveis':feedFilter==='popular'?' publicações · em alta entre os posts carregados':' publicações nos resultados')}
 function feedPost(post){
  const author=person(post.author_id),mine=post.author_id===me,canOpenProfile=mine||people.some(p=>p.user_id===post.author_id),like=post.likes?.some(x=>x.user_id===me),count=post.likes?.length||0,sponsored=post.visibility==='public'&&sponsoredPostIds.has(post.id);
  return '<article class="feed-post '+(sponsored?'lx-sponsored-post':'')+'" id="post-'+esc(post.id)+'">'+(sponsored?'<div class="lx-sponsored-label">'+icon('megaphone')+' Divulgação patrocinada · LX Plus</div>':'')+'<header>'+(canOpenProfile?'<button type="button" class="lx-feed-author-avatar" data-person="'+esc(post.author_id)+'" aria-label="Abrir perfil de '+esc(author.name||'membro')+'">'+avatar(author)+'</button>':avatar(author))+'<div>'+(canOpenProfile?'<button type="button" class="lx-feed-author-name" data-person="'+esc(post.author_id)+'">'+profileName(author)+verifiedBadge(author)+founderBadge(author)+'</button>':'<strong>'+profileName(author)+verifiedBadge(author)+founderBadge(author)+'</strong>')+'<small>'+esc(author.username?'@'+author.username:'Membro LX')+' · '+dateTime(post.created_at)+' · '+({public:'Comunidade',friends:'Amigos',private:'Só eu'}[post.visibility])+'</small></div><button class="icon-button" data-report-post="'+esc(post.id)+'" aria-label="Denunciar publicação">•••</button></header><p class="post-body">'+esc(post.body)+'</p>'+(post.media_path?(post.media_type==='video'?'<video class="post-media" controls playsinline preload="metadata" data-social-media="'+esc(post.media_path)+'"></video>':'<img class="post-media" loading="lazy" alt="Imagem da publicação" data-social-media="'+esc(post.media_path)+'">'):'')+'<footer><button class="'+(like?'active':'')+'" data-post-like="'+esc(post.id)+'" aria-label="'+(like?'Descurtir':'Curtir')+' publicação">♡ '+engagementPreview(count,demoPostCounts.get(post.id))+'</button>'+(!labMode?publicDemoLabel(publicDemoPostCounts.get(post.id),'post'):'')+'<button data-post-comments="'+esc(post.id)+'">'+icon('chat')+' '+(post.comments?.length||0)+'</button><button data-share-post="'+esc(post.id)+'">↗ Compartilhar</button><button type="button" class="'+(savedPostIds.has(post.id)?'active':'')+'" data-post-bookmark="'+esc(post.id)+'" aria-pressed="'+(savedPostIds.has(post.id)?'true':'false')+'" aria-label="'+(savedPostIds.has(post.id)?'Remover dos salvos':'Salvar publicação')+'">'+(savedPostIds.has(post.id)?'✓ Salvo':'☆ Salvar')+'</button>'+(mine||ctx.admin?'<button class="lx-post-id-button" data-copy-post-id="'+esc(post.id)+'" title="Copiar ID da publicação">'+icon('copy')+' ID</button>':'')+(mine?'<button data-edit-post="'+esc(post.id)+'">Editar</button><button data-delete-post="'+esc(post.id)+'">Excluir</button>':'')+'</footer><div class="post-comments" id="comments-'+esc(post.id)+'" '+(openComments.has(post.id)?'':'hidden')+'>'+((post.comments||[]).map(c=>'<p><strong>'+esc(person(c.user_id).name)+':</strong> '+esc(c.body)+'</p>').join(''))+'<form class="comment-form" data-comment-post="'+esc(post.id)+'"><input name="body" value="'+esc(drafts.get('comment:'+post.id).text)+'" maxlength="1500" placeholder="Escreva um comentário" aria-label="Comentário" required><button class="btn small">Enviar</button></form></div></article>';
 }
 function memberCard(p){const stats=followStats.get(p.user_id)||{followers:0,following_count:0,is_following:false};
  let actions='';
  if(p.relation==='accepted')actions='<button class="btn primary" data-chat-peer="'+esc(p.user_id)+'">'+icon('chat')+' Conversar</button>'+(p.calls_enabled?'<button class="btn" data-voice-peer="'+esc(p.user_id)+'">'+icon('mic')+' Chamada de voz</button>':'');
  else if(p.relation==='pending'&&p.direction==='incoming')actions='<button class="btn primary" data-friend-accept="'+esc(p.user_id)+'">Aceitar</button><button class="btn" data-friend-reject="'+esc(p.user_id)+'">Recusar</button>';
  else if(p.relation==='pending')actions='<span class="badge">Solicitação enviada</span>';
  else actions='<button class="btn" data-friend-request="'+esc(p.user_id)+'">+ Adicionar amigo</button>';
  return '<article class="people-card '+(p.is_founder?'lx-founder-profile':'')+'">'+avatar(p)+'<h3>'+profileName(p)+verifiedBadge(p)+founderBadge(p)+'</h3><small>'+esc(p.username?'@'+p.username:'ID '+p.user_id.slice(0,8))+'</small>'+statusLine(p.user_id)+nowPlayingLine(p.user_id)+'<p>'+esc(p.bio||'Membro da comunidade LX Plus.')+'</p><p class="lx-follow-stats"><strong>'+compactSocialCount(Number(stats.followers||0)+Number(demoProfileCounts.get(p.user_id)||0))+'</strong> seguidores · <strong>'+compactSocialCount(stats.following_count||0)+'</strong> seguindo</p>'+(!labMode?publicDemoLabel(publicDemoProfileCounts.get(p.user_id),'profile'):'')+'<div class="lx-person-id">ID: '+esc(String(p.user_id).slice(0,8).toUpperCase())+' <button type="button" class="link" data-copy-profile-id="'+esc(p.user_id)+'" aria-label="Copiar ID do perfil">'+icon('copy')+' Copiar ID</button></div><div class="actions"><button class="btn '+(stats.is_following?'':'primary')+'" data-social-follow="'+esc(p.user_id)+'">'+(stats.is_following?'✓ Seguindo':'+ Seguir')+'</button>'+actions+'<button class="btn small" data-person="'+esc(p.user_id)+'">Ver perfil</button></div></article>';
 }
 function chatList(){return '<aside class="chat-sidebar"><div class="heading"><h3>Suas conversas</h3><button class="btn small" data-new-group>+ Grupo</button></div><div class="chat-conversations">'+friends().map(p=>'<button class="conversation '+(selected?.kind==='dm'&&selected.id===p.user_id?'active':'')+'" data-chat-peer="'+esc(p.user_id)+'">'+avatar(p)+'<span><strong>'+profileName(p)+verifiedBadge(p)+founderBadge(p)+'</strong><small>'+esc(p.username?'@'+p.username:'Amigo LX')+'</small>'+statusLine(p.user_id)+nowPlayingLine(p.user_id)+'</span></button>').join('')+groups.map(g=>'<button class="conversation '+(selected?.kind==='group'&&selected.id===g.group_id?'active':'')+'" data-chat-group="'+esc(g.group_id)+'"><span class="member-avatar avatar-fallback">'+icon('social')+'</span><span><strong>'+esc(g.name)+'</strong><small>'+g.member_count+' participantes</small></span></button>').join('')+(!friends().length&&!groups.length?'<p class="muted">Adicione amigos para começar uma conversa.</p>':'')+'</div></aside>'}
 function chatPanel(){
  if(!selected)return '<section class="chat-main">'+empty('Suas conversas, seu espaço','Selecione um amigo ou crie um grupo para começar. Mensagens, chamadas e momentos em um só lugar.')+'</section>';
  const target=selected.kind==='dm'?person(selected.id):{name:groups.find(g=>g.group_id===selected.id)?.name||'Grupo LX'};
  return '<section class="chat-main"><header class="chat-header"><button class="icon-button chat-back" data-chat-back aria-label="Voltar às conversas">‹</button>'+avatar(target)+'<div><strong>'+profileName(target)+verifiedBadge(target)+founderBadge(target)+'</strong><small>'+(selected.kind==='dm'?statusLine(selected.id):'Conversa do grupo')+'</small></div>'+(selected.kind==='dm'&&target.calls_enabled?'<button class="icon-button" data-start-call="audio" aria-label="Chamada de voz">'+icon('phone')+'<span>Voz</span></button><button class="icon-button" data-start-call="video" aria-label="Chamada de vídeo">'+icon('video')+'<span>Vídeo</span></button>':'')+'</header><input class="chat-search" id="chatSearch" type="search" placeholder="Pesquisar mensagens carregadas" aria-label="Pesquisar mensagens carregadas"><div id="chatPins" class="chat-pins"></div><div class="chat-messages" data-chat-theme="'+(ctx.profile()?.is_premium?normalizePremiumProfile(ctx.profile().premium_profile).chatTheme:'midnight')+'" id="chatMessages" role="log" aria-live="polite"></div><div id="chatReply" class="chat-reply">'+(reply?'<span>Respondendo: '+esc(reply.body||'Arquivo')+'</span><button class="link" data-cancel-reply>Cancelar</button>':'')+'</div>'+(expressionOpen?'<div class="premium-expression-picker" role="region" aria-label="Coleção de expressões">'+expressionAssets.slice(expressionPage*24,(expressionPage+1)*24).map(a=>'<button type="button" data-insert-expression="'+esc(a.id)+'" title="'+esc(a.label)+'"><img loading="lazy" alt="'+esc(a.label)+'" src="'+esc(profileImageUrl(a.url))+'"></button>').join('')+(expressionAssets.length>24?'<div class="expression-pagination"><button type="button" data-expression-page="-1" '+(!expressionPage?'disabled':'')+'>Anterior</button><small>'+(expressionPage+1)+' / '+Math.ceil(expressionAssets.length/24)+'</small><button type="button" data-expression-page="1" '+((expressionPage+1)*24>=expressionAssets.length?'disabled':'')+'>Próxima</button></div>':'')+(!expressionAssets.length?'<small>Adicione emojis ou figurinhas no Studio Premium do seu perfil.</small>':'')+'</div>':'')+'<div id="voiceMessageStudio" class="voice-message-studio" hidden></div><form id="messageForm" class="chat-composer">'+(ctx.profile()?.is_premium?'<button type="button" class="icon-button" data-expression-picker aria-label="Emojis e figurinhas Premium">✦</button>':'')+'<label class="icon-button" aria-label="Anexar arquivo"><input id="chatFile" type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,audio/*,application/pdf,text/plain,application/zip">+</label><button type="button" class="icon-button" data-record-voice aria-label="Gravar mensagem de voz">'+icon('mic')+'</button><textarea name="body" id="chatDraft" rows="1" maxlength="4000" placeholder="Escreva uma mensagem…" aria-label="Sua mensagem">'+esc(draft)+'</textarea><button class="btn primary" aria-label="Enviar mensagem">'+icon('arrow')+'</button></form><small class="chat-privacy">Somente participantes da conversa têm acesso às mensagens.</small></section>';
 }
 function draw(){
  if(!alive)return;
  let body='';
  if(tab==='Feed')body='<div class="social-columns"><section class="feed-main">'+feedToolbar()+'<form id="postForm" class="feed-compose"><div>'+avatar(ctx.profile())+'<textarea name="body" maxlength="4000" placeholder="Uma indicação, um pensamento, uma nova história…" aria-label="Texto da publicação">'+esc(postDraft.text)+'</textarea></div><div class="lx-compose-ideas" role="group" aria-label="Ideias para publicar"><span>Compartilhe uma dica:</span>'+socialComposerIdeas().map(idea=>'<button type="button" data-post-idea="'+esc(idea.id)+'">'+esc(idea.label)+'</button>').join('')+'</div><footer><label class="btn small">+ Foto ou vídeo<input type="file" name="media" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" hidden></label><select name="visibility" aria-label="Quem pode ver"><option value="public" '+(postDraft.visibility==='public'?'selected':'')+'>Comunidade</option><option value="friends" '+(postDraft.visibility==='friends'?'selected':'')+'>Amigos</option><option value="private" '+(postDraft.visibility==='private'?'selected':'')+'>Só eu</option></select><button class="btn primary">Publicar</button></footer><small id="postFileName" class="muted">'+esc(postFile?.name||'')+'</small><div class="lx-compose-footnote"><small class="social-draft-note">Rascunho salvo nesta sessão</small><small id="lxComposeCount" aria-live="polite">'+postDraft.text.length+' / 4.000</small></div></form><div id="feedPosts">'+feedList()+'</div>'+(posts.length&&feedBefore?'<button class="btn load-more" data-more-posts>Ver mais publicações</button>':'')+'</section><aside class="social-right"><section class="panel social-circle" id="socialOnlineFriends">'+onlineFriends()+'</section><div class="panel lx-social-discover"><span class="premium-overline">PESSOAS PARA CONHECER</span><h3>Conexões que combinam</h3>'+suggestedProfiles()+'<button type="button" class="btn small lx-explore-all" data-social-tab="Pessoas">Ver todos os perfis '+icon('arrow')+'</button></div><div class="panel lx-social-quick-stats"><span class="premium-overline">SEU CÍRCULO LX</span><div class="lx-social-quick-grid"><div><strong>'+communityStats({people,posts,me,follows:followStats}).friends+'</strong><small>amigos</small></div><div><strong>'+communityStats({people,posts,me,follows:followStats}).following+'</strong><small>seguindo</small></div></div><button type="button" class="btn small" data-social-tab="Mensagens">'+icon('chat')+' Abrir conversas</button></div></aside></div>';
  if(tab==='Pessoas'||tab==='Amigos'||tab==='Seguindo'){const rows=people.filter(p=>p.user_id!==me&&(tab!=='Amigos'||['accepted','pending'].includes(p.relation))&&(tab!=='Seguindo'||followStats.get(p.user_id)?.is_following===true)&&[p.name,p.username].join(' ').toLowerCase().includes(search.toLowerCase()));body='<label class="sr-only" for="peopleSearch">Buscar pessoas</label><input id="peopleSearch" class="search people-search" placeholder="Buscar nome ou @identificador" value="'+esc(search)+'"><div class="people-grid" id="peopleResults">'+(rows.length?rows.map(memberCard).join(''):empty('Nenhum perfil encontrado','Tente outro nome ou identificador.'))+'</div>'}
  if(tab==='Grupos')body='<section class="panel"><div class="heading"><div><h2>Seus grupos</h2><p>Conversas com a sua turma, em um só lugar.</p></div><button class="btn primary" data-new-group>+ Criar grupo</button></div><div class="group-discovery-grid">'+(groups.length?groups.map(g=>'<button class="group-discovery-card" data-chat-group="'+esc(g.group_id)+'">'+icon('social')+'<strong>'+esc(g.name)+'</strong><small>'+Number(g.member_count||0)+' participantes</small><span>Abrir conversa ↗</span></button>').join(''):empty('Sua turma começa aqui.','Crie um grupo com seus amigos para conversar.'))+'</div></section>';
  if(tab==='Chamadas')body='<section class="panel call-history-panel"><div class="heading"><div><h2>Suas chamadas</h2><p>Voz e vídeo com seus amigos LX.</p></div><button class="btn small" data-call-history-refresh>Atualizar</button></div>'+(callsError?'<p role="alert">'+esc(callsError)+'</p>':'')+'<div class="call-history-list">'+(callsLoading?'<p role="status">Buscando chamadas…</p>':callRows.length?callRows.map(call=>{const other=call.caller_id===me?call.callee_id:call.caller_id,p=person(other),allowed=p.relation==='accepted'&&p.calls_enabled;return '<article>'+avatar(p)+'<div><strong>'+esc(p.name)+'</strong><small>'+(call.caller_id===me?'Realizada':'Recebida')+' · '+(call.mode==='video'?'Vídeo':'Voz')+' · '+dateTime(call.created_at)+'</small><span>'+esc(({accepted:'Atendida',ended:'Encerrada',rejected:'Recusada',missed:'Não atendida',ringing:'Chamada iniciada',canceled:'Cancelada',expired:'Não atendida'})[call.status]||call.status)+'</span></div>'+(allowed?'<button class="btn small" data-voice-peer="'+esc(other)+'" aria-label="Ligar novamente para '+esc(p.name)+'">'+icon('phone')+' Ligar</button>':'')+'</article>'}).join(''):empty('Nenhuma chamada no seu histórico.','Abra uma conversa com um amigo para iniciar uma chamada.'))+'</div><small>Abra Som e qualidade durante uma chamada para conferir captura, envio, recepção e reprodução.</small></section>';
  if(tab==='Mensagens')body='<div class="chat-layout">'+chatList()+chatPanel()+'</div>';
  host.innerHTML='<section class="social-page"><div class="module-heading social-heading"><div><span class="premium-overline">LX SOCIAL</span><h1>Sua turma.<br><em>Seu universo.</em></h1><p>Compartilhe o que te move. Encontre quem combina com você.</p></div><div class="social-orbit-mark" aria-hidden="true"><span>LX</span><i></i><i></i></div><div class="lx-social-hero-links"><span>'+icon('users')+' Conexões reais</span><span>'+icon('chat')+' Conversas privadas</span><span>'+icon('sparkles')+' Seu espaço, seu estilo</span></div></div>'+(labMode?'<div class="lx-lab-private-banner" role="status">LX LAB · Modo de teste restrito: alguns números incluem contagens simuladas.</div>':'')+'<div class="section-tabs">'+['Feed','Mensagens','Amigos','Grupos','Chamadas','Pessoas','Seguindo'].map(t=>'<button class="'+(tab===t?'active':'')+'" data-social-tab="'+t+'">'+icon({Feed:'home',Pessoas:'search',Seguindo:'users',Amigos:'social',Mensagens:'chat',Grupos:'users',Chamadas:'phone'}[t])+t+(t==='Amigos'&&people.some(p=>p.relation==='pending'&&p.direction==='incoming')?'<span class="tab-count">'+people.filter(p=>p.relation==='pending'&&p.direction==='incoming').length+'</span>':'')+'</button>').join('')+'</div>'+body+'<div id="socialDialog"></div></section>';
  loadPresence();
  if(tab==='Feed')hydrateMedia(host.querySelector('#feedPosts'));
  if(tab==='Mensagens'&&selected){renderMessages();voiceStudio()}
 }
 async function loadPeople(){const rows=await socialDirectory();if(alive){const permission=await db.rpc('lx_demo_social_view_access');labMode=permission.error?false:permission.data===true;const ids=[...new Set([me,...rows.map(p=>p.user_id)])].slice(0,50);const [demos,publicDemos,follows,founders]=await Promise.all([db.rpc('lx_demo_social_visible',{p_posts:[],p_profiles:ids}),db.rpc('lx_demo_social_public',{p_posts:[],p_profiles:ids}),db.rpc('lx_social_follow_stats',{p_users:ids}),db.rpc('lx_official_founder_profiles',{p_users:ids})]);if(!demos.error)demoProfileCounts=new Map((demos.data||[]).filter(x=>x.kind==='profile').map(x=>[x.id,x.demo_count]));if(!publicDemos.error)publicDemoProfileCounts=new Map((publicDemos.data||[]).filter(x=>x.kind==='profile').map(x=>[x.id,x.demo_count]));if(!follows.error)followStats=new Map((follows.data||[]).map(x=>[x.user_id,x]));if(!founders.error)founderIds=new Set(founders.data||[]);people=rows.map(p=>({...p,is_founder:founderIds.has(p.user_id)})).sort((a,b)=>Number(b.is_founder)-Number(a.is_founder));ctx.setDirectory?.(people);try{const result=await db.rpc('lx_premium_assets',{p_users:[...new Set([me,...rows.map(p=>p.user_id)])].slice(0,60)});if(!result.error)expressionAssets=result.data||[]}catch{}}}
 async function loadGroups(){const rows=await checked(db.rpc('lx_group_list'));if(alive)groups=rows||[]}
 async function loadCallHistory(){callsLoading=true;callsError='';draw();try{const rows=await checked(db.from('lx_calls').select('id,caller_id,callee_id,mode,status,created_at').or('caller_id.eq.'+me+',callee_id.eq.'+me).order('created_at',{ascending:false}).limit(30));if(alive)callRows=rows||[]}catch{callsError='Não foi possível consultar as chamadas. Tente novamente.'}finally{callsLoading=false;if(alive&&tab==='Chamadas')draw()}}
 async function loadPosts(append=false){
  const token=++feedGeneration,savedMode=feedFilter==='saved'&&!sharedPost;
  const selection='id,author_id,body,media_path,media_type,visibility,status,created_at';
  let pageRows=[],bookmarkPage=[];
  if(savedMode){
   let q=db.from('lx_post_bookmarks').select('post_id,created_at').eq('user_id',me).order('created_at',{ascending:false}).order('post_id',{ascending:false}).limit(20);
   if(append&&feedBefore)q=q.lt('created_at',feedBefore);
   bookmarkPage=await checked(q);
   if(!alive||token!==feedGeneration)return;
   const ids=(bookmarkPage||[]).map(row=>row.post_id);
   if(ids.length){
    pageRows=await checked(db.from('lx_posts').select(selection).in('id',ids).eq('status','published'));
    pageRows.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
   }
  }else{
   let q=db.from('lx_posts').select(selection).eq('status','published').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(20);
   if(sharedPost)q=q.eq('id',sharedPost);else if(append&&feedBefore)q=q.lt('created_at',feedBefore);
   pageRows=await checked(q);
  }
  if(!alive||token!==feedGeneration)return;
  let rows=pageRows;
  if(!savedMode&&!append&&!sharedPost){
   const featured=await db.rpc('lx_featured_sponsored_posts');
   if(!featured.error&&Array.isArray(featured.data)&&featured.data.length){
    const special=await db.from('lx_posts').select(selection).in('id',featured.data).eq('status','published').eq('visibility','public').limit(5);
    if(!special.error)rows=[...(special.data||[]),...pageRows].filter((post,i,all)=>all.findIndex(other=>other.id===post.id)===i);
   }
  }
  if(!alive||token!==feedGeneration)return;
  const ids=(rows||[]).map(p=>p.id);let likes=[],comments=[],promoted=[],demoRows=[],publicDemoRows=[],bookmarks=[];
  if(ids.length)[likes,comments,promoted,demoRows,publicDemoRows,bookmarks]=await Promise.all([
   checked(db.from('lx_post_likes').select('post_id,user_id').in('post_id',ids).limit(1000)),
   checked(db.from('lx_post_comments').select('id,post_id,user_id,body,created_at').in('post_id',ids).order('created_at').limit(1000)),
   db.rpc('lx_visible_sponsored_posts',{p_post_ids:ids}).then(result=>result.error?[]:result.data||[]).catch(()=>[]),
   db.rpc('lx_demo_social_visible',{p_posts:ids,p_profiles:[]}).then(result=>result.error?[]:result.data||[]).catch(()=>[]),
   db.rpc('lx_demo_social_public',{p_posts:ids,p_profiles:[]}).then(result=>result.error?[]:result.data||[]).catch(()=>[]),
   checked(db.from('lx_post_bookmarks').select('post_id').eq('user_id',me).in('post_id',ids))
  ]);
  if(!alive||token!==feedGeneration)return;
  savedPostIds=append?new Set([...savedPostIds,...bookmarks.map(row=>row.post_id)]):new Set(bookmarks.map(row=>row.post_id));
  const loaded=(rows||[]).map(p=>({...p,likes:(likes||[]).filter(l=>l.post_id===p.id),comments:(comments||[]).filter(c=>c.post_id===p.id)}));
  demoPostCounts=append?new Map([...demoPostCounts,...demoRows.filter(x=>x.kind==='post').map(x=>[x.id,x.demo_count])]):new Map(demoRows.filter(x=>x.kind==='post').map(x=>[x.id,x.demo_count]));
  publicDemoPostCounts=append?new Map([...publicDemoPostCounts,...publicDemoRows.filter(x=>x.kind==='post').map(x=>[x.id,x.demo_count])]):new Map(publicDemoRows.filter(x=>x.kind==='post').map(x=>[x.id,x.demo_count]));
  sponsoredPostIds=append?new Set([...sponsoredPostIds,...promoted]):new Set(promoted);
  posts=[...new Map((append?[...posts,...loaded]:loaded).map(p=>[p.id,p])).values()];
  const pagination=savedMode?bookmarkPage:pageRows;
  feedBefore=pagination?.length===20?pagination.at(-1).created_at:null;
  if(tab==='Feed'){const scroll=window.scrollY;draw();window.scrollTo({top:scroll})}
 }
 async function loadMessages(older=false){
  if(!selected||loadingThread===threadKey(selected))return;busy=true;loadingThread=threadKey(selected);const token=++chatGeneration,target={...selected};
  try{let q=target.kind==='dm'?db.from('lx_messages').select('id,client_id,sender_id,recipient_id,kind,body,media_key,reply_to_client_id,reactions,created_at,read_at,deleted_at').or('sender_id.eq.'+target.id+',recipient_id.eq.'+target.id):db.from('lx_group_messages').select('id,sender_id,body,kind,media_path,created_at').eq('group_id',target.id);
   q=q.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(60);if(older&&chatBefore)q=q.lt('created_at',chatBefore);const rows=await checked(q);if(!alive||token!==chatGeneration||selected?.id!==target.id)return;
   const previous=messages,unique=new Map([...previous,...(rows||[])].map(x=>[String(x.id),x]));messages=[...unique.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at));if(older||!previous.length)chatBefore=rows?.length===60?rows.at(-1).created_at:null;if(messages.some(m=>String(m.body||'').includes('[[lx:'))&&Date.now()-lastExpressionLookup>5000){lastExpressionLookup=Date.now();try{const result=await db.rpc('lx_premium_assets',{p_users:[...new Set([me,...people.map(p=>p.user_id),...messages.map(m=>m.sender_id)])].slice(0,60)});if(!alive||token!==chatGeneration)return;if(!result.error)expressionAssets=result.data||[]}catch{}}renderMessages(!older);
   if(target.kind==='dm'){await checked(db.rpc('lx_mark_messages_read',{p_other:target.id}));await loadPins()}
  }finally{if(token===chatGeneration){busy=false;loadingThread=''}}
 }
 function renderMessages(scroll=true){
  const area=host.querySelector('#chatMessages');if(!area)return;const nearBottom=area.scrollHeight-area.scrollTop-area.clientHeight<100;const term=host.querySelector('#chatSearch')?.value?.toLowerCase()||'';
  area.innerHTML=(chatBefore?'<button class="btn small load-more" data-older-messages>Carregar mensagens anteriores</button>':'')+messages.filter(m=>!term||String(m.deleted_at?'':m.body).toLowerCase().includes(term)).map(m=>{
   const mine=m.sender_id===me,path=m.media_path||m.media_key;let content=m.deleted_at?'<i>Mensagem excluída</i>':'<p>'+renderExpressions(m.body,expressionAssets)+'</p>';
   if(!m.deleted_at&&path){if(m.kind==='image'||m.kind==='sticker')content='<img class="message-image" data-social-media="'+esc(path)+'" alt="Imagem enviada" loading="lazy">'+content;else if(m.kind==='audio')content='<audio controls preload="none" data-social-media="'+esc(path)+'"></audio><select data-voice-speed aria-label="Velocidade da mensagem de voz"><option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select>';else content='<a class="attachment-link" target="_blank" rel="noopener noreferrer" data-social-media="'+esc(path)+'">↓ '+esc(m.body||'Abrir arquivo')+'</a>'}
   const actions=selected.kind==='dm'&&!m.deleted_at?'<div class="message-actions"><button data-reply-message="'+esc(m.client_id)+'">Responder</button><button data-react-message="'+esc(m.client_id)+'">Curtir</button><button data-pin-message="'+esc(m.client_id)+'">Fixar</button>'+(mine?'<button data-delete-message="'+esc(m.client_id)+'">Excluir</button>':'<button data-report-message="'+esc(m.client_id)+'">Denunciar</button>')+'</div>':'';
   return '<article class="message '+(mine?'mine':'')+'" id="message-'+esc(m.client_id||m.id)+'">'+(selected.kind==='group'?'<strong class="message-author">'+esc(person(m.sender_id).name)+'</strong>':'')+(m.reply_to_client_id?'<blockquote>'+esc(messages.find(x=>x.client_id===m.reply_to_client_id)?.deleted_at?'Mensagem excluída':messages.find(x=>x.client_id===m.reply_to_client_id)?.body||'Resposta a uma mensagem anterior')+'</blockquote>':'')+content+'<small>'+dateTime(m.created_at)+(mine?(m.read_at?' · Lida':' · Enviada'):'')+'</small>'+(m.reactions&&Object.keys(m.reactions).length?'<span class="message-reactions">'+esc(Object.keys(m.reactions).join(' '))+'</span>':'')+actions+'</article>';
  }).join('');hydrateMedia(area);if(scroll&&nearBottom)area.scrollTop=area.scrollHeight;
 }
 async function loadPins(){if(selected?.kind!=='dm')return;const thread=[me,selected.id].sort().join('__');const pins=await checked(db.from('lx_message_pins').select('message_client_id').eq('thread_key',thread).limit(10));const node=host.querySelector('#chatPins');if(node)node.innerHTML=(pins||[]).map(p=>'<button data-jump-message="'+esc(p.message_client_id)+'">⌖ '+esc(messages.find(m=>m.client_id===p.message_client_id)?.body||'Mensagem fixada')+'</button>').join('')}
 async function selectChat(id,kind){stopRecording();selected={id,kind};draft=drafts.get(threadKey(selected)).text;reply=null;messages=[];chatBefore=null;++chatGeneration;loadingThread='';tab='Mensagens';draw();await loadMessages();const area=host.querySelector('#chatMessages');if(area)area.scrollTop=area.scrollHeight;host.querySelector('#chatDraft')?.focus()}
 async function send(body='',file=null){
  if(!selected)throw Error('Escolha uma conversa.');
  const target={...selected},text=String(body).trim(),thread=threadKey(target),replyId=reply?.client_id||null;
  if(!text&&!file)return;
  const clientId=outbox.begin(thread,text,(file?String(file.name||'audio')+':'+file.size+':'+file.lastModified:'')+'|reply:'+(replyId||''));let success=false;
  try{
   let kind='text',path=null;
   if(file){path=await uploadSocial(file,{userId:me,kind:target.kind==='dm'?'dm':'group',target:target.id});kind=file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file'}
   if(target.kind==='dm')await checked(db.rpc('lx_send_message',{p_other:target.id,p_kind:kind,p_body:text,p_media_key:path?'social:'+path:null,p_client_id:clientId,p_reply_to_client_id:replyId}));
   else {const result=await db.from('lx_group_messages').insert({id:clientId,group_id:target.id,sender_id:me,body:text,kind,media_path:path});if(result.error){const saved=result.error.code==='23505'?await checked(db.from('lx_group_messages').select('id').eq('id',clientId).eq('group_id',target.id).eq('sender_id',me).maybeSingle()):null;if(!saved)throw result.error}}
   success=true;
   if(drafts.get(thread).text.trim()===text)drafts.clear(thread);
   if(threadKey(selected)===thread){if(draft.trim()===text){draft='';const field=host.querySelector('#chatDraft');if(field)field.value=''}if(reply?.client_id===replyId){reply=null;host.querySelector('#chatReply')?.replaceChildren()}await loadMessages()}
  }finally{outbox.finish(thread,clientId,success)}
 }
 function discardVoice(){voiceDraft=null;if(voiceUrl)URL.revokeObjectURL(voiceUrl);voiceUrl='';host.querySelector('#voiceMessageStudio')?.replaceChildren();const area=host.querySelector('#voiceMessageStudio');if(area)area.hidden=true}
 function voiceStudio(){
  const area=host.querySelector('#voiceMessageStudio');if(!area)return;
  area.hidden=!recording&&!voiceDraft;
  if(recording){area.innerHTML='<div class="voice-recording-status" role="status"><i></i> Gravando <time data-record-duration>0:00</time></div><div class="actions"><button type="button" class="btn small" data-record-stop>Parar e ouvir</button><button type="button" class="link" data-record-cancel>Cancelar</button></div>';return}
  if(voiceDraft)area.innerHTML='<span>Ouça antes de enviar</span><audio controls preload="metadata" src="'+esc(voiceUrl)+'" aria-label="Prévia da mensagem de voz"></audio><div class="actions"><button type="button" class="btn primary small" data-record-send>Enviar áudio</button><button type="button" class="link" data-record-cancel>Descartar</button></div>';
 }
 function stopRecording(cancel=true){
  if(cancel){++recordEpoch;discardVoice()}
  const current=recording;recording=null;clearInterval(recordTimer);recordTimer=null;
  if(current&&current.state!=='inactive'){current._cancelled=cancel;current.stop()}
  recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
  const b=host.querySelector('[data-record-voice]');if(b){b.classList.remove('recording');b.setAttribute('aria-label','Gravar mensagem de voz')}
  if(cancel)voiceStudio();
 }
 async function toggleRecording(){
  if(recording){stopRecording(false);return}if(recordPending)return;
  if(!selected)throw Error('Abra uma conversa antes de gravar.');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Gravação de voz não disponível neste navegador.');
  const target=threadKey(selected),epoch=++recordEpoch;recordPending=true;discardVoice();
  let stream;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:voiceConstraints(),video:false});
   if(!alive||epoch!==recordEpoch||threadKey(selected)!==target){stream.getTracks().forEach(t=>t.stop());return}
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(x=>MediaRecorder.isTypeSupported(x));
   const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{}),chunks=[];
   recordStream=stream;recording=recorder;recordStartedAt=Date.now();
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recorder.onerror=()=>{stopRecording();ctx.toast('A gravação foi interrompida. Confira o microfone e tente novamente.')};
   recorder.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());
    if(!recorder._cancelled&&alive&&epoch===recordEpoch&&threadKey(selected)===target&&chunks.length){
     const blob=new Blob(chunks,{type:recorder.mimeType||mime});
     if(blob.size){voiceDraft={blob,target};voiceUrl=URL.createObjectURL(blob)}
    }
    if(recording===recorder)recording=null;voiceStudio();
   };
   recorder.start(250);voiceStudio();
   const b=host.querySelector('[data-record-voice]');b?.classList.add('recording');b?.setAttribute('aria-label','Parar e ouvir mensagem de voz');
   recordTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-recordStartedAt)/1000),time=host.querySelector('[data-record-duration]');if(time)time.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');if(seconds>=120)stopRecording(false)},250);
  }catch(error){stream?.getTracks().forEach(t=>t.stop());throw Error(error?.name==='NotAllowedError'?'Permita o microfone para gravar uma mensagem.':'Não foi possível iniciar a gravação. Confira o microfone.')}
  finally{recordPending=false}
 }
 host.addEventListener('input',e=>{if(e.target.id==='chatDraft'){draft=e.target.value;drafts.set(threadKey(selected),{text:draft})}if(e.target.closest('#postForm')&&e.target.name==='body'){postDraft.text=e.target.value;drafts.set('post',postDraft);const counter=host.querySelector('#lxComposeCount');if(counter)counter.textContent=e.target.value.length+' / 4.000'}if(e.target.id==='feedSearch'){feedSearch=e.target.value;clearTimeout(feedSearchTimer);feedSearchTimer=setTimeout(()=>{if(alive&&tab==='Feed')updateFeedResults()},140)}if(e.target.closest('[data-comment-post]'))drafts.set('comment:'+e.target.closest('[data-comment-post]').dataset.commentPost,{text:e.target.value});if(e.target.id==='chatSearch')renderMessages(false);if(e.target.id==='peopleSearch'){search=e.target.value;const rows=people.filter(p=>p.user_id!==me&&(tab!=='Amigos'||['accepted','pending'].includes(p.relation))&&(tab!=='Seguindo'||followStats.get(p.user_id)?.is_following===true)&&[p.name,p.username].join(' ').toLowerCase().includes(search.toLowerCase()));host.querySelector('#peopleResults').innerHTML=rows.map(memberCard).join('')}});
 host.addEventListener('change',e=>{if(e.target.hasAttribute('data-voice-speed')){const audio=e.target.parentElement.querySelector('audio');if(audio)audio.playbackRate=Number(e.target.value)}if(e.target.id==='chatFile'&&e.target.files[0]){send(e.target.files[0].name,e.target.files[0]).catch(e=>ctx.toast(e.message));e.target.value=''}if(e.target.closest('#postForm')&&e.target.name==='visibility'){postDraft.visibility=e.target.value;drafts.set('post',postDraft)}if(e.target.name==='media'){postFile=e.target.files[0]||null;const node=host.querySelector('#postFileName');if(node)node.textContent=e.target.files[0]?.name||''}});
 host.addEventListener('keydown',e=>{if(e.target.id==='chatDraft'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();host.querySelector('#messageForm')?.requestSubmit()}});
 host.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.querySelector('#socialDialog .inline-dialog')){e.preventDefault();closeDialog()}});
 host.addEventListener('click',async e=>{
  if(e.target.classList.contains('lx-member-profile-overlay')){closeDialog();return}const b=e.target.closest('button');if(!b)return;if(b.dataset.expressionPage){expressionPage=Math.max(0,Math.min(Math.ceil(expressionAssets.length/24)-1,expressionPage+Number(b.dataset.expressionPage)));draw();renderMessages(false);return}if(b.hasAttribute('data-expression-picker')){expressionOpen=!expressionOpen;draw();renderMessages(false);return}if(b.dataset.insertExpression){const token=expressionToken(b.dataset.insertExpression);if(!token||ctx.profile()?.is_premium!==true)return;const input=host.querySelector('#chatDraft');if(input.value.length-(input.selectionEnd-input.selectionStart)+token.length>4000){ctx.toast('A mensagem chegou ao limite de 4.000 caracteres.');return}input.setRangeText(token,input.selectionStart,input.selectionEnd,'end');draft=input.value;drafts.set(threadKey(selected),{text:draft});input.focus();return}
  try{
   if(b.dataset.feedFilter){const crossingSaved=(feedFilter==='saved')!==(b.dataset.feedFilter==='saved');feedFilter=b.dataset.feedFilter;if(crossingSaved)await loadPosts();else updateFeedResults();return}
    if(b.hasAttribute('data-jump-compose')){const area=host.querySelector('#postForm textarea');area?.scrollIntoView({block:'center',behavior:'smooth'});area?.focus();return}
    if(b.dataset.postIdea){const idea=socialComposerIdeas().find(x=>x.id===b.dataset.postIdea);const area=host.querySelector('#postForm textarea');if(!idea||!area)return;area.value=socialComposerDraft(area.value,idea.prefix);postDraft.text=area.value;drafts.set('post',postDraft);const counter=host.querySelector('#lxComposeCount');if(counter)counter.textContent=area.value.length+' / 4.000';area.focus();area.setSelectionRange(area.value.length,area.value.length);return}
   if(b.dataset.socialTab){stopRecording();tab=b.dataset.socialTab;if(tab==='Feed')sharedPost=null;draw();if(tab==='Feed')await loadPosts();if(tab==='Chamadas')await loadCallHistory();return}
   if(b.hasAttribute('data-social-close')){closeDialog();return}if(b.hasAttribute('data-chat-back')){stopRecording();selected=null;messages=[];draw();return}
   if(b.dataset.socialFollow){const id=b.dataset.socialFollow,inOverlay=Boolean(b.closest('.lx-member-profile-overlay'));if(id===me||!people.some(p=>p.user_id===id))throw Error('Perfil indisponível para seguir.');const was=followStats.get(id)?.is_following===true;await checked(db.rpc('lx_social_follow_toggle',{p_user:id,p_follow:!was}));await loadPeople();draw();ctx.toast(was?'Você deixou de seguir este perfil.':'Agora você segue este perfil.');if(inOverlay){const p={...person(id)};dialog(p.name,memberProfileCard(p,{viewerId:me,presence:statusLine(id),nowPlaying:nowPlayingLine(id),assets:expressionAssets,demoFollowers:demoProfileCounts.get(id)||0,publicDemoFollowers:publicDemoProfileCounts.get(id)||0,followStats:followStats.get(id),labMode}),'member');syncProfileBanners(host)}return}
   if(b.dataset.friendRequest||b.dataset.friendAccept||b.dataset.friendReject){b.disabled=true;const other=b.dataset.friendRequest||b.dataset.friendAccept||b.dataset.friendReject;await checked(db.rpc(b.dataset.friendRequest?'lx_friend_request':'lx_friend_respond',b.dataset.friendRequest?{p_other:other}:{p_other:other,p_accept:!!b.dataset.friendAccept}));await loadPeople();draw();ctx.toast(b.dataset.friendRequest?'Solicitação enviada.':'Solicitação respondida.');return}
   if(b.hasAttribute('data-call-history-refresh')){await loadCallHistory();return}
   if(b.dataset.voicePeer){await ctx.calls.start(person(b.dataset.voicePeer),'audio');return}
   if(b.dataset.chatPeer){await selectChat(b.dataset.chatPeer,'dm');return}if(b.dataset.chatGroup){await selectChat(b.dataset.chatGroup,'group');return}
   if(b.dataset.startCall&&selected?.kind==='dm'){await ctx.calls.start(person(selected.id),b.dataset.startCall);return}
   if(b.hasAttribute('data-record-voice')){await toggleRecording();return}
   if(b.hasAttribute('data-record-stop')){stopRecording(false);return}
   if(b.hasAttribute('data-record-cancel')){stopRecording();return}
   if(b.hasAttribute('data-record-send')){const pending=voiceDraft;if(!pending||pending.target!==threadKey(selected))return;b.disabled=true;await send('',pending.blob);if(voiceDraft===pending)discardVoice();return}
   if(b.hasAttribute('data-older-messages')){await loadMessages(true);return}
   if(b.dataset.replyMessage){reply=messages.find(m=>m.client_id===b.dataset.replyMessage);host.querySelector('#chatReply').innerHTML='<span>Respondendo: '+esc(reply?.body||'Arquivo')+'</span><button class="link" data-cancel-reply>Cancelar</button>';host.querySelector('#chatDraft').focus();return}
   if(b.hasAttribute('data-cancel-reply')){reply=null;host.querySelector('#chatReply').replaceChildren();return}
   if(b.dataset.reactMessage){await checked(db.rpc('lx_react_message',{p_client_id:b.dataset.reactMessage,p_emoji:'❤️'}));await loadMessages();return}
   if(b.dataset.pinMessage){await checked(db.from('lx_message_pins').upsert({thread_key:[me,selected.id].sort().join('__'),message_client_id:b.dataset.pinMessage,pinned_by:me},{onConflict:'thread_key,message_client_id',ignoreDuplicates:true}));await loadPins();ctx.toast('Mensagem fixada.');return}
   if(b.dataset.jumpMessage){const message=host.querySelector('#message-'+CSS.escape(b.dataset.jumpMessage));if(message)message.scrollIntoView({block:'center',behavior:'smooth'});else ctx.toast('Carregue as mensagens anteriores para abrir esta mensagem fixada.');return}
   if(b.dataset.deleteMessage){if(b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent='Confirmar exclusão';return}await checked(db.rpc('lx_delete_message_for_all',{p_client_id:b.dataset.deleteMessage}));await loadMessages();return}
   if(b.dataset.copyPostId){const post=posts.find(p=>p.id===b.dataset.copyPostId);if(!post||!(post.author_id===me||ctx.admin))throw Error('Sem acesso ao ID desta publicação.');await navigator.clipboard.writeText(post.id);ctx.toast('ID da publicação copiado para usar no ADM.');return}
    if(b.dataset.postBookmark){
     const post=posts.find(p=>p.id===b.dataset.postBookmark&&p.status==='published');
     if(!post)throw Error('Publicação indisponível para salvar.');
     const had=savedPostIds.has(post.id);b.disabled=true;
     if(had)await checked(db.from('lx_post_bookmarks').delete().eq('user_id',me).eq('post_id',post.id));
     else await checked(db.from('lx_post_bookmarks').insert({user_id:me,post_id:post.id}));
     if(had)savedPostIds.delete(post.id);else savedPostIds.add(post.id);
     if(feedFilter==='saved')await loadPosts();else updateFeedResults();
     ctx.toast(had?'Publicação removida dos salvos.':'Publicação salva na sua conta.');
     return;
    }
    if(b.dataset.postLike){const post=posts.find(p=>p.id===b.dataset.postLike),liked=post.likes.some(l=>l.user_id===me);await checked(liked?db.from('lx_post_likes').delete().eq('post_id',post.id).eq('user_id',me):db.from('lx_post_likes').insert({post_id:post.id,user_id:me}));if(liked)post.likes=post.likes.filter(l=>l.user_id!==me);else post.likes.push({post_id:post.id,user_id:me});draw();return}
   if(b.dataset.postComments){const node=host.querySelector('#comments-'+CSS.escape(b.dataset.postComments));node.hidden=!node.hidden;if(node.hidden)openComments.delete(b.dataset.postComments);else openComments.add(b.dataset.postComments);node.querySelector('input')?.focus();return}
   if(b.dataset.sharePost){const url=location.origin+location.pathname+'#post='+encodeURIComponent(b.dataset.sharePost);if(navigator.share)await navigator.share({title:'Publicação na LX Plus',url});else{await navigator.clipboard.writeText(url);ctx.toast('Link copiado. A visibilidade da publicação continua protegida.')}return}
   if(b.dataset.editPost){
    const post=posts.find(p=>p.id===b.dataset.editPost&&p.author_id===me&&p.status==='published');
    if(!post)throw Error('Apenas suas publicações disponíveis podem ser editadas.');
    dialog('Editar publicação','<form id="editPostForm" class="form"><input type="hidden" name="postId" value="'+esc(post.id)+'"><label class="field">Texto da publicação<textarea name="body" maxlength="4000" rows="5" placeholder="Escreva sua atualização…">'+esc(post.body)+'</textarea></label><label class="field">Quem pode ver<select name="visibility">'+[['public','Comunidade'],['friends','Amigos'],['private','Só eu']].map(([v,label])=>'<option value="'+v+'" '+(post.visibility===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><p class="muted">Imagem e vídeo existentes serão preservados.</p><button class="btn primary">Salvar alterações</button></form>');return;
   }
   if(b.dataset.deletePost){if(b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent='Confirmar exclusão';return}await checked(db.from('lx_posts').delete().eq('id',b.dataset.deletePost).eq('author_id',me));posts=posts.filter(p=>p.id!==b.dataset.deletePost);draw();return}
   if(b.hasAttribute('data-more-posts')){await loadPosts(true);return}
   if(b.dataset.reportPost||b.dataset.reportMessage||b.dataset.reportProfile){dialog('Denunciar conteúdo','<form id="reportForm" class="form"><input type="hidden" name="kind" value="'+(b.dataset.reportPost?'post':b.dataset.reportProfile?'profile':'message')+'"><input type="hidden" name="target" value="'+esc(b.dataset.reportPost||b.dataset.reportMessage||b.dataset.reportProfile)+'"><label class="field">Conte o que aconteceu<textarea name="reason" minlength="5" maxlength="1500" required></textarea></label><button class="btn primary">Enviar denúncia</button></form>');return}
   if(b.hasAttribute('data-copy-member')){const handle=b.dataset.copyMember||'';if(!/^@[a-zA-Z0-9._-]{1,40}$/.test(handle))throw Error('Identificador público inválido.');await navigator.clipboard.writeText(handle);ctx.toast('Identificador copiado.');return}
   if(b.dataset.copyProfileId){const id=b.dataset.copyProfileId;if(!/^[0-9a-f-]{36}$/i.test(id)||!(id===me||people.some(p=>p.user_id===id)))throw Error('Perfil não disponível.');await navigator.clipboard.writeText(id);ctx.toast('ID completo do perfil copiado.');return}
   if(b.dataset.person){await showMemberProfile(b.dataset.person);return}
   if(b.hasAttribute('data-new-group')){dialog('Criar grupo','<form id="groupForm" class="form"><label class="field">Nome<input name="name" maxlength="42" required></label><div class="friend-picker">'+friends().map(p=>'<label><input name="members" type="checkbox" value="'+esc(p.user_id)+'"> '+esc(p.name)+'</label>').join('')+'</div><small>Escolha de 1 a 5 amigos.</small><button class="btn primary">Criar grupo</button></form>');return}
  }catch(error){ctx.toast(error.message||'Não foi possível concluir esta ação.');if(b.isConnected)b.disabled=false}
 });
 host.addEventListener('submit',async e=>{
  const form=e.target;if(!['postForm','editPostForm','messageForm','groupForm','reportForm'].includes(form.id)&&!form.dataset.commentPost)return;e.preventDefault();const b=form.querySelector('button[type="submit"],button.btn.primary,button.btn');if(form.id==='postForm'&&postSending)return;if(b)b.disabled=true;const data=new FormData(form);
  try{
   if(form.id==='postForm'){postSending=true;const body=String(data.get('body')||'').trim(),file=postFile||data.get('media');if(!body&&!file?.size)throw Error('Escreva algo ou selecione uma imagem ou vídeo.');const id=uuid();let path=null;if(file?.size){if(!/^(image|video)\//.test(file.type))throw Error('Use uma imagem ou um vídeo nesta publicação.');path=await uploadSocial(file,{userId:me,kind:'post',target:id})}await checked(db.from('lx_posts').insert({id,author_id:me,body,media_path:path,media_type:path?(file.type.startsWith('image/')?'image':'video'):null,visibility:data.get('visibility')}));if(postDraft.text===String(data.get('body')||'')){postDraft={text:'',visibility:postDraft.visibility};postFile=null;drafts.clear('post')}await loadPosts();ctx.toast('Publicação enviada.')}
   if(form.id==='editPostForm'){
    const post=posts.find(p=>p.id===String(data.get('postId')||'')&&p.author_id===me&&p.status==='published');
    if(!post)throw Error('Esta publicação não está disponível para edição.');
    const body=String(data.get('body')||'').trim(),visibility=String(data.get('visibility')||'');
    if(!body&&!post.media_path)throw Error('Escreva algum texto ou mantenha um arquivo de mídia na publicação.');
    if(!['public','friends','private'].includes(visibility))throw Error('Visibilidade inválida.');
    const saved=await checked(db.from('lx_posts').update({body,visibility,updated_at:new Date().toISOString()}).eq('id',post.id).eq('author_id',me).eq('status','published').select('id'));
    if(!saved?.length)throw Error('Não foi possível salvar esta edição.');
    closeDialog();await loadPosts();ctx.toast('Publicação atualizada.');
   }
   if(form.id==='messageForm')await send(String(data.get('body')||''));
   if(form.dataset.commentPost){await checked(db.from('lx_post_comments').insert({post_id:form.dataset.commentPost,user_id:me,body:String(data.get('body')||'').trim()}));drafts.clear('comment:'+form.dataset.commentPost);await loadPosts()}
   if(form.id==='groupForm'){const members=data.getAll('members');if(!members.length||members.length>5)throw Error('Selecione de 1 a 5 amigos.');const gid=await checked(db.rpc('lx_group_create',{p_name:String(data.get('name')||'').trim(),p_members:members}));await loadGroups();await selectChat(gid,'group')}
   if(form.id==='reportForm'){await checked(db.from('lx_moderation_reports').insert({user_id:me,target_kind:data.get('kind'),target_id:data.get('target'),reason:String(data.get('reason')||'').trim()}));closeDialog();ctx.toast('Denúncia registrada para análise da moderação.')}
  }catch(error){ctx.toast(error.message||'Não foi possível enviar.')}finally{if(form.id==='postForm')postSending=false;if(b?.isConnected)b.disabled=false}
 });
 // Refresh public genuine counts and distinctly labeled test additions for
 // every approved member. Keep dialogs, post composers and chat undisturbed.
 let countersRefreshing=false,lastCountersRefresh=0;
 async function refreshCommunityCounters(force=false){
  if(!alive||document.hidden||countersRefreshing||postSending)return;
  if(!force&&Date.now()-lastCountersRefresh<20000)return;
  countersRefreshing=true;
  try{
   await loadPeople();
   if(!alive)return;
   if(tab==='Feed'){
    if(!host.querySelector('#socialDialog .inline-dialog')&&!host.querySelector('#postForm:focus-within')&&!host.querySelector('#feedSearch:focus')&&!host.querySelector('.post-comments:focus-within')){
     await loadPosts();
    }
   }else if(['Pessoas','Amigos','Seguindo'].includes(tab)&&!host.querySelector('#socialDialog .inline-dialog')){
    const list=people.filter(p=>p.user_id!==me&&(tab!=='Amigos'||['accepted','pending'].includes(p.relation))&&(tab!=='Seguindo'||followStats.get(p.user_id)?.is_following===true)&&[p.name,p.username].join(' ').toLowerCase().includes(search.toLowerCase()));
    const grid=host.querySelector('#peopleResults');
    if(grid)grid.innerHTML=list.map(memberCard).join('')||empty('Nenhum perfil encontrado','Tente outro nome ou identificador.');
   }
   lastCountersRefresh=Date.now();
  }finally{countersRefreshing=false}
 }
 const onCommunityFocus=()=>refreshCommunityCounters().catch(()=>{});
 window.addEventListener('focus',onCommunityFocus);
 document.addEventListener('visibilitychange',onCommunityFocus);
 draw();await Promise.all([loadPeople(),loadGroups()]);await loadPosts();draw();if(tab==='Chamadas')await loadCallHistory();
 // Open a permitted public member directly from global search; never bypass directory rules.
 const requestedProfile=/^profile:([0-9a-f-]{36})$/i.exec(String(ctx.term||''))?.[1];
 if(requestedProfile&&alive)await showMemberProfile(requestedProfile).catch(e=>ctx.toast(e.message||'Perfil não disponível.'));
 channel=db.channel('lx-social-'+me+'-'+uuid()).on('postgres_changes',{event:'*',schema:'public',table:'lx_messages',filter:'recipient_id=eq.'+me},()=>{if(tab==='Mensagens'&&selected?.kind==='dm')loadMessages().catch(()=>{})}).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_group_messages'},event=>{if(selected?.kind==='group'&&event.new.group_id===selected.id)loadMessages().catch(()=>{})}).subscribe();
 const timer=setInterval(()=>{if(document.hidden)return;if(tab==='Mensagens'&&selected)loadMessages().catch(()=>{});loadPresence();},10000);
 const countersTimer=setInterval(()=>refreshCommunityCounters().catch(()=>{}),30000);
 return {refresh(){refreshCommunityCounters(true).catch(()=>{})},destroy(){alive=false;++feedGeneration;++chatGeneration;clearInterval(timer);clearInterval(countersTimer);clearTimeout(feedSearchTimer);window.removeEventListener('focus',onCommunityFocus);document.removeEventListener('visibilitychange',onCommunityFocus);stopRecording();if(channel)db.removeChannel(channel);signed.clear()}};
}
