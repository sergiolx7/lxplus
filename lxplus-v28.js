/* LX Plus v28.1 — Modern Core + Visual Polish
   Additive modernization layer. Keeps v27.3 data contracts and external services intact. */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{};
  if(LX.__v28Booted)return;
  LX.__v28Booted=true;
  const BUILD='28.1';
  const $=id=>document.getElementById(id);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>LX.ui?.esc?LX.ui.esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const toast=m=>LX.toast?.(m);
  const now=()=>Date.now();
  const safeText=(v,max=160)=>String(v??'').trim().slice(0,max);
  const state={paletteOpen:false,healthTimer:null,observer:null,errors:[],lastEnhance:0};
  LX.v28={build:BUILD,state};
  window.__LX_MODULES=window.__LX_MODULES||{};
  window.__LX_MODULES.v28=BUILD;

  /* ---------------- diagnostics / resilience ---------------- */
  const ERR_KEY='lx_v28_runtime_errors';
  function loadErrors(){try{return JSON.parse(localStorage.getItem(ERR_KEY)||'[]').slice(-24)}catch{return[]}}
  function saveErrors(){try{localStorage.setItem(ERR_KEY,JSON.stringify(state.errors.slice(-24)))}catch{}}
  state.errors=loadErrors();
  function recordError(kind,value){
    const message=safeText(value?.message||value||'Erro desconhecido',220);
    if(!message||/ResizeObserver loop/i.test(message))return;
    state.errors.push({at:new Date().toISOString(),kind:safeText(kind,40),message});saveErrors();
  }
  addEventListener('error',e=>recordError('runtime',e.error||e.message));
  addEventListener('unhandledrejection',e=>recordError('promise',e.reason));
  LX.v28.errors=()=>[...state.errors];
  LX.v28.clearErrors=()=>{state.errors=[];saveErrors();renderHealth();toast('Registro local de erros limpo.')};

  function ensureOfflineBanner(){
    let el=$('lxV28Offline');
    if(!el){el=document.createElement('div');el.id='lxV28Offline';el.className='lx-v28-offline hidden';el.innerHTML='<span></span><b>Sem conexão</b><small>Alguns recursos ficarão disponíveis novamente quando a internet voltar.</small>';document.body.appendChild(el)}
    el.classList.toggle('hidden',navigator.onLine);
  }
  addEventListener('online',()=>{ensureOfflineBanner();toast('Conexão restaurada. A LX Plus voltou a sincronizar.')});
  addEventListener('offline',ensureOfflineBanner);

  /* ---------------- provider hardening ---------------- */
  function detectProvider(value){
    const v=String(value||'').trim();
    if(!v)return'';
    if(/(?:music\.)?youtube\.com|youtu\.be/i.test(v))return'youtube';
    if(/open\.spotify\.com|^spotify:/i.test(v))return'spotify';
    if(/drive\.google\.com/i.test(v))return'gdrive';
    if(/dropbox\.com/i.test(v))return'dropbox';
    if(/soundcloud\.com|on\.soundcloud\.com/i.test(v))return'soundcloud';
    if(/onedrive\.live\.com/i.test(v))return'onedrive';
    if(/archive\.org/i.test(v))return'archive';
    if(/^https:\/\//i.test(v))return'direct';
    return'';
  }
  LX.v28.detectProvider=detectProvider;
  function hardenMediaSources(){
    const M=LX.mediaSources;if(!M||M.__v28)return;M.__v28=true;
    M.detectMode=detectProvider;
    const baseNormalize=M.normalize.bind(M);
    M.normalize=(provider,value)=>baseNormalize(provider==='auto'?(detectProvider(value)||'direct'):provider,value);
    const basePreview=M.preview.bind(M);
    M.preview=(provider,value)=>basePreview(provider==='auto'?(detectProvider(value)||'direct'):provider,value);
    const oldYouTube=M.info?.youtube;if(oldYouTube)oldYouTube.help='Aceita YouTube, YouTube Music, Shorts e playlists. A LX Plus detecta o link e usa o player oficial do YouTube.';
    const oldSpotify=M.info?.spotify;if(oldSpotify)oldSpotify.help='Aceita links públicos open.spotify.com de faixa, álbum, playlist, artista, episódio ou show. A reprodução usa o player oficial do Spotify.';
  }

  function enhanceMediaEditor(root=document){
    const sw=root.querySelector?.('.media-source-switch');if(!sw||sw.dataset.lxV28==='1')return;
    sw.dataset.lxV28='1';
    const helper=document.createElement('div');helper.className='lx-v28-provider-auto';helper.innerHTML='<span>Detecção automática</span><small>Cole um link do YouTube Music, YouTube, Spotify, Drive ou outro provedor compatível. A fonte certa será selecionada automaticamente.</small>';
    sw.after(helper);
    const input=root.querySelector?.('#cExternalMedia');
    if(input){
      const choose=()=>{const mode=detectProvider(input.value);if(!mode)return;const b=root.querySelector(`[data-media-source="${mode}"]`);if(b&&!b.disabled&&!b.classList.contains('active'))b.click();helper.dataset.provider=mode;helper.querySelector('span').textContent=`Detectado: ${mode==='youtube'?'YouTube / YouTube Music':mode==='spotify'?'Spotify':mode}`};
      input.addEventListener('input',choose,{passive:true});input.addEventListener('paste',()=>setTimeout(choose,0));choose();
    }
  }

  /* ---------------- visible Requests & Help center ---------------- */
  function myRequests(){
    const D=LX.data;if(!D)return[];const email=LX.ui?.state?.user?.email||'';
    return (D.requests?.()||[]).filter(x=>(x.voters||[]).includes(email)||x.userEmail===email).sort((a,b)=>(b.created||0)-(a.created||0));
  }
  function requestStatusClass(s){const v=String(s||'Novo').toLowerCase();return /conclu|fechado/.test(v)?'done':/recus/.test(v)?'rejected':/análise|analise|aprov/.test(v)?'progress':'new'}
  function submitRequest(kind,mediaType,title,message){
    const D=LX.data,U=LX.ui?.state;if(!D?.addOrVoteRequest)return toast('A Central LX ainda está carregando.');
    const r={id:Date.now(),kind,mediaType:safeText(mediaType,60),title:safeText(title,120),message:safeText(message,800),status:'Novo',created:Date.now(),userEmail:U?.user?.email||'',userName:U?.profile?.name||U?.user?.name||'Usuário'};
    if(!r.title)return toast('Informe o nome ou assunto.');
    const out=D.addOrVoteRequest(r);D.track?.('request',{kind,mediaType:r.mediaType,title:r.title,merged:out?.merged});
    toast(out?.merged?'Esse pedido já existia e seu voto foi somado.':kind==='Pedido'?'Pedido enviado ao ADM.':'Mensagem enviada ao ADM.');
  }
  function openSupportCenter(tab='request'){
    const modal=$('modal'),overlay=$('overlay');if(!modal||!overlay)return openSupportCenter.legacy?.();
    modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page lx-v28-support"><header class="lx-v28-support-head"><div><span class="eyebrow">CENTRAL LX</span><h2>Pedidos, ajuda e reclamações</h2><p>Faltou um filme, série ou música? Encontrou um erro? Mande aqui. O pedido chega ao painel do ADM e pedidos repetidos somam votos.</p></div><div class="lx-v28-support-badge">SUPORTE V28</div></header><nav class="lx-v28-support-tabs"><button data-support-tab="request" class="${tab==='request'?'active':''}">＋ Pedir conteúdo</button><button data-support-tab="problem" class="${tab==='problem'?'active':''}">! Relatar problema</button><button data-support-tab="feedback" class="${tab==='feedback'?'active':''}">✦ Sugestão / reclamação</button><button data-support-tab="mine" class="${tab==='mine'?'active':''}">◷ Minhas solicitações</button></nav><section id="lxV28SupportBody"></section></div>`;
    overlay.classList.remove('hidden');
    const render=t=>{
      $$('.lx-v28-support-tabs button',modal).forEach(b=>b.classList.toggle('active',b.dataset.supportTab===t));
      const host=$('lxV28SupportBody');if(!host)return;
      if(t==='request')host.innerHTML=`<div class="lx-v28-support-form"><div class="lx-v28-form-intro"><b>Peça um título</b><span>Use para filmes, séries, animes, doramas, livros ou músicas que ainda não estão no catálogo.</span></div><form id="lxV28RequestForm" class="request-form"><label>Tipo de conteúdo<select id="lxV28ReqMedia"><option>Filme</option><option>Série</option><option>Anime</option><option>Dorama</option><option>Livro</option><option>Música</option></select></label><label>Nome do título<input id="lxV28ReqTitle" maxlength="120" required placeholder="Ex.: nome do filme ou música"></label><label>Detalhes opcionais<textarea id="lxV28ReqMsg" maxlength="800" rows="4" placeholder="Ano, temporada, artista ou qualquer detalhe que ajude o ADM"></textarea></label><button class="primary-btn">Enviar pedido</button></form></div>`;
      else if(t==='problem')host.innerHTML=`<div class="lx-v28-support-form"><div class="lx-v28-form-intro"><b>Relatar um problema</b><span>Informe onde aconteceu e o que você estava tentando fazer.</span></div><form id="lxV28ProblemForm" class="request-form"><label>Área<select id="lxV28ProblemArea"><option>Filme / player</option><option>Série / episódio</option><option>Música / player</option><option>Livro / leitor</option><option>Comunidade / mensagens</option><option>Conta / perfil</option><option>Login / cadastro</option><option>Outro</option></select></label><label>Assunto<input id="lxV28ProblemTitle" maxlength="120" required placeholder="Ex.: Episódio 4 não abre"></label><label>O que aconteceu?<textarea id="lxV28ProblemMsg" maxlength="800" required rows="5" placeholder="Explique o erro para o ADM conseguir reproduzir"></textarea></label><button class="primary-btn">Enviar problema</button></form></div>`;
      else if(t==='feedback')host.innerHTML=`<div class="lx-v28-support-form"><div class="lx-v28-form-intro"><b>Sugestão ou reclamação</b><span>Esse espaço é para melhorar a LX Plus. A mensagem também aparece em Pedidos & Problemas no ADM.</span></div><form id="lxV28FeedbackForm" class="request-form"><label>Tipo<select id="lxV28FeedbackKind"><option>Sugestão</option><option>Reclamação</option><option>Elogio</option></select></label><label>Assunto<input id="lxV28FeedbackTitle" maxlength="120" required></label><label>Mensagem<textarea id="lxV28FeedbackMsg" maxlength="800" required rows="5"></textarea></label><button class="primary-btn">Enviar mensagem</button></form></div>`;
      else {const mine=myRequests();host.innerHTML=`<div class="lx-v28-request-history">${mine.length?mine.map(x=>`<article><span class="lx-v28-request-icon">${x.kind==='Pedido'?'＋':'!'}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.kind)} · ${esc(x.mediaType)} · ${x.votes||1} voto${(x.votes||1)===1?'':'s'}</small>${x.message?`<p>${esc(x.message)}</p>`:''}</div><b class="${requestStatusClass(x.status)}">${esc(x.status||'Novo')}</b></article>`).join(''):'<div class="lx-v28-empty"><b>Nenhuma solicitação ainda</b><span>Quando você pedir um conteúdo ou relatar um problema, ele aparecerá aqui.</span></div>'}</div>`;}
      const a=$('lxV28RequestForm');if(a)a.onsubmit=e=>{e.preventDefault();submitRequest('Pedido',$('lxV28ReqMedia').value,$('lxV28ReqTitle').value,$('lxV28ReqMsg').value);render('mine')};
      const b=$('lxV28ProblemForm');if(b)b.onsubmit=e=>{e.preventDefault();submitRequest('Problema',$('lxV28ProblemArea').value,$('lxV28ProblemTitle').value,$('lxV28ProblemMsg').value);render('mine')};
      const c=$('lxV28FeedbackForm');if(c)c.onsubmit=e=>{e.preventDefault();const kind=$('lxV28FeedbackKind').value;submitRequest('Problema',kind,`[${kind}] ${$('lxV28FeedbackTitle').value}`,$('lxV28FeedbackMsg').value);render('mine')};
    };
    $$('.lx-v28-support-tabs button',modal).forEach(b=>b.onclick=()=>render(b.dataset.supportTab));render(tab);
  }
  LX.v28.openSupport=openSupportCenter;

  function ensureSupportEntrypoints(){
    const rail=document.querySelector('.lx-shell-primary');if(rail&&!rail.querySelector('[data-shell-support]')){const b=document.createElement('button');b.type='button';b.dataset.shellSupport='1';b.innerHTML='<span>✦</span><b>Pedidos & Ajuda</b>';b.onclick=()=>openSupportCenter();const community=rail.querySelector('[data-shell-community]');community?.after(b)}
    const request=$('requestBtn');if(request){request.setAttribute('title','Pedidos, ajuda e reclamações');request.setAttribute('aria-label','Pedidos, ajuda e reclamações');request.onclick=()=>openSupportCenter();if(!request.querySelector('.lx-v28-request-label'))request.insertAdjacentHTML('beforeend','<span class="lx-v28-request-label">Pedidos</span>')}
    if(!$('lxSupportFab')){const f=document.createElement('button');f.id='lxSupportFab';f.className='lx-v28-support-fab';f.type='button';f.setAttribute('aria-label','Abrir Pedidos e Ajuda');f.innerHTML='<span>＋</span><b>Ajuda</b>';f.onclick=()=>openSupportCenter();document.body.appendChild(f)}
    const footer=$('legalFooter');if(footer&&!footer.querySelector('[data-lx-v28-support]')){const b=document.createElement('button');b.dataset.lxV28Support='1';b.textContent='Pedidos & Ajuda';b.onclick=()=>openSupportCenter();footer.appendChild(b)}
  }

  /* ---------------- universal command search ---------------- */
  function palette(){
    let el=$('lxV28Palette');if(el)return el;
    el=document.createElement('div');el.id='lxV28Palette';el.className='lx-v28-palette hidden';el.innerHTML=`<div class="lx-v28-palette-backdrop" data-close-palette></div><section role="dialog" aria-modal="true" aria-label="Busca universal"><header><span>⌕</span><input id="lxV28PaletteInput" autocomplete="off" placeholder="Buscar filmes, séries, músicas, livros, pessoas ou ações"><kbd>ESC</kbd></header><div id="lxV28PaletteBody"></div><footer><span>↵ abrir</span><span>⌘/Ctrl + K buscar de qualquer tela</span></footer></section>`;document.body.appendChild(el);el.querySelector('[data-close-palette]').onclick=closePalette;el.addEventListener('click',e=>{const hit=e.target.closest('[data-palette-action]');if(hit)runPaletteAction(hit.dataset.paletteAction,hit.dataset.paletteId)});$('lxV28PaletteInput').addEventListener('input',e=>renderPalette(e.target.value));return el;
  }
  function openPalette(q=''){const el=palette();el.classList.remove('hidden');state.paletteOpen=true;document.documentElement.classList.add('lx-v28-palette-open');const input=$('lxV28PaletteInput');input.value=q;renderPalette(q);setTimeout(()=>input.focus(),20)}
  function closePalette(){palette().classList.add('hidden');state.paletteOpen=false;document.documentElement.classList.remove('lx-v28-palette-open')}
  function iconForType(t){return t==='Música'?'♫':t==='Livro'?'▥':['Série','Anime','Dorama'].includes(t)?'▤':'▶'}
  function renderPalette(q=''){
    const D=LX.data;if(!D)return;const host=$('lxV28PaletteBody');if(!host)return;const needle=String(q).trim().toLocaleLowerCase('pt-BR');
    const catalog=(D.catalog?.()||[]).filter(x=>x.published!==false&&(!needle||[x.title,x.genre,x.artist,x.author,x.director,x.creator,x.studio,x.type].join(' ').toLocaleLowerCase('pt-BR').includes(needle))).slice(0,10);
    const users=needle?(D.users?.()||[]).filter(x=>[x.name,x.email].join(' ').toLocaleLowerCase('pt-BR').includes(needle)).slice(0,4):[];
    const actions=[['support','Pedidos & Ajuda','Pedir conteúdo, relatar problema ou reclamar','✦'],['community','Comunidade','Conversas, amigos, grupos e chamadas','◎'],['notifications','Notificações','Abrir central de notificações','◌'],['profile','Meu perfil','Perfil, preferências e atividade','●'],['theme','Aparência','Tema, cor e instalação','◈']].filter(a=>!needle||`${a[1]} ${a[2]}`.toLocaleLowerCase('pt-BR').includes(needle));
    host.innerHTML=`${catalog.length?`<div class="lx-v28-palette-group"><span>CATÁLOGO</span>${catalog.map(x=>`<button data-palette-action="content" data-palette-id="${x.id}"><i>${iconForType(x.type)}</i><div><b>${esc(x.title)}</b><small>${esc(x.type)} · ${esc(x.genre||'LX Plus')}</small></div><em>›</em></button>`).join('')}</div>`:''}${users.length?`<div class="lx-v28-palette-group"><span>PESSOAS</span>${users.map(x=>`<button data-palette-action="person" data-palette-id="${esc(x.user_id||x.id||'')}"><i>●</i><div><b>${esc(x.name||'Usuário')}</b><small>${x.verified?'Verificado · ':''}Perfil LX</small></div><em>›</em></button>`).join('')}</div>`:''}<div class="lx-v28-palette-group"><span>AÇÕES</span>${actions.map(a=>`<button data-palette-action="${a[0]}"><i>${a[3]}</i><div><b>${a[1]}</b><small>${a[2]}</small></div><em>›</em></button>`).join('')}</div>${!catalog.length&&!users.length&&!actions.length?'<div class="lx-v28-empty"><b>Nada encontrado</b><span>Tente outro título, artista, autor ou ação.</span></div>':''}`;
  }
  function runPaletteAction(action,id){closePalette();if(action==='content'){const x=LX.data?.catalog?.().find(z=>String(z.id)===String(id));if(!x)return;if(x.type==='Música')LX.music?.(x.id,0);else if(x.type==='Livro')LX.read?.(x.id);else LX.detail?.(x.id)}else if(action==='person'&&id)LX.social?.openProfile?.(id);else if(action==='support')openSupportCenter();else if(action==='community')LX.social?.open?.('friends');else if(action==='notifications')LX.openNotifications?.();else if(action==='profile')LX.openProfile?.();else if(action==='theme')LX.openTheme?.()}
  LX.v28.search=openPalette;

  /* ---------------- home / community / profile modernization ---------------- */
  function enhanceHome(){
    const app=$('app');if(!app||app.classList.contains('hidden'))return;const welcome=$('welcome');if(!welcome)return;
    let bar=$('lxV28Smartbar');if(!bar){bar=document.createElement('section');bar.id='lxV28Smartbar';bar.className='lx-v28-smartbar';welcome.after(bar)}
    const h=LX.data?.history?.()||{},continueCount=Object.values(h).filter(v=>(v.progress||0)>2&&(v.progress||0)<96).length,req=myRequests().filter(x=>!['Concluído','Fechado','Recusado'].includes(x.status)).length;
    bar.innerHTML=`<button data-v28-go="search"><span>⌕</span><div><b>Busca universal</b><small>Filmes, músicas, livros e pessoas</small></div><kbd>⌘K</kbd></button><button data-v28-go="continue"><span>▶</span><div><b>Continuar</b><small>${continueCount?`${continueCount} item${continueCount===1?'':'s'} em andamento`:'Retome de onde parou'}</small></div></button><button data-v28-go="support"><span>✦</span><div><b>Pedidos & Ajuda</b><small>${req?`${req} solicitação${req===1?'':'ões'} aberta${req===1?'':'s'}`:'Peça um título ou relate erro'}</small></div></button><button data-v28-go="community"><span>◎</span><div><b>Comunidade</b><small>Mensagens, fogo e chamadas</small></div></button>`;
    bar.querySelector('[data-v28-go="search"]').onclick=()=>openPalette();bar.querySelector('[data-v28-go="support"]').onclick=()=>openSupportCenter();bar.querySelector('[data-v28-go="community"]').onclick=()=>LX.social?.open?.('friends');bar.querySelector('[data-v28-go="continue"]').onclick=()=>{const c=[...document.querySelectorAll('.home-content .section-block,.home-content section')].find(x=>/continuar/i.test(x.textContent||''));c?.scrollIntoView({behavior:'smooth',block:'start'});if(!c)toast('Seu progresso aparece automaticamente quando você começa um conteúdo.')};
    $$('#homeContent img').forEach(img=>{img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{img.classList.add('lx-v28-img-error')},{once:true})});
  }
  function enhanceCommunity(root=document){
    const drawer=root.querySelector?.('.lx-community-drawer')||document.querySelector('.lx-community-drawer');if(!drawer)return;drawer.dataset.lxV28='1';
    const head=drawer.querySelector('.lx-community-head');if(head&&!head.querySelector('.lx-v28-social-actions')){const a=document.createElement('div');a.className='lx-v28-social-actions';a.innerHTML='<button type="button" data-v28-social-support>✦ Pedidos & Ajuda</button><button type="button" data-v28-social-search>⌕ Buscar</button>';head.appendChild(a);a.querySelector('[data-v28-social-support]').onclick=()=>{LX.social?.close?.();setTimeout(()=>openSupportCenter(),80)};a.querySelector('[data-v28-social-search]').onclick=()=>document.querySelector('#lxCommunitySearch')?.focus()}
    const profileActions=drawer.querySelector('.lx-community-profile-actions');if(profileActions&&!profileActions.querySelector('[data-v28-report]')){const b=document.createElement('button');b.type='button';b.className='lx-community-big';b.dataset.v28Report='1';b.textContent='Denunciar / pedir ajuda';b.onclick=()=>{LX.social?.close?.();setTimeout(()=>openSupportCenter('problem'),80)};profileActions.appendChild(b)}
    const footer=drawer.querySelector('.lx-community-footer');if(footer&&!footer.querySelector('[data-v28-safety]')){const b=document.createElement('button');b.dataset.v28Safety='1';b.textContent='Ajuda';b.onclick=()=>openSupportCenter('problem');footer.appendChild(b)}
  }
  function enhanceChat(root=document){
    const chat=root.querySelector?.('.lx-chat-shell,.lx-chat-page,.lx-chat-panel')||document.querySelector('.lx-chat-shell,.lx-chat-page,.lx-chat-panel');if(!chat)return;chat.classList.add('lx-v28-chat');
    const input=chat.querySelector('textarea,input[id*="ChatInput"]');if(input){input.setAttribute('enterkeyhint','send');input.setAttribute('autocomplete','off')}
    $$('.lx-chat-msg',chat).forEach(m=>m.setAttribute('tabindex','0'));
  }
  function enhanceProfile(){
    const modal=$('modal');if(!modal||modal.querySelector('.lx-v28-profile-extra'))return;const page=modal.querySelector('.profile-page-v25');if(!page)return;const extra=document.createElement('section');extra.className='profile-personalization lx-v28-profile-extra';extra.innerHTML='<div class="profile-section-head"><div><h3>Central rápida</h3><p>Atalhos para as áreas mais usadas da sua conta.</p></div><span class="v19-pill">V28</span></div><div class="lx-v28-profile-actions"><button type="button" data-v28-profile="support"><span>✦</span><b>Pedidos & Ajuda</b><small>Peça títulos ou reporte erros</small></button><button type="button" data-v28-profile="community"><span>◎</span><b>Comunidade</b><small>Conversas e amigos</small></button><button type="button" data-v28-profile="search"><span>⌕</span><b>Busca universal</b><small>Encontre tudo rápido</small></button></div>';page.appendChild(extra);extra.querySelector('[data-v28-profile="support"]').onclick=()=>openSupportCenter();extra.querySelector('[data-v28-profile="community"]').onclick=()=>{LX.ui?.close?.();LX.social?.open?.('friends')};extra.querySelector('[data-v28-profile="search"]').onclick=()=>{LX.ui?.close?.();openPalette()}
  }

  /* ---------------- player refinements ---------------- */
  function enhanceCinema(root=document){
    const host=root.querySelector?.('#lxGlobalCinema')||$('lxGlobalCinema');
    if(!host||host.dataset.lxV28==='1')return;
    const shadow=host.shadowRoot;
    if(!shadow){setTimeout(()=>enhanceCinema(document),24);return}
    host.dataset.lxV28='1';host.classList.add('lx-v28-cinema');
    const shell=shadow.querySelector('#root,.wrap');if(!shell)return;
    const style=document.createElement('style');style.dataset.lxV28='1';style.textContent=`
      .lx28-hints{position:absolute;z-index:35;left:50%;bottom:max(82px,calc(env(safe-area-inset-bottom) + 70px));transform:translateX(-50%);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;pointer-events:none;opacity:.72;transition:.2s}.lx28-hints span{font:700 9px/1.2 Inter,Arial,sans-serif;letter-spacing:.04em;color:#e9edf1;padding:6px 9px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,5,5,.52);backdrop-filter:blur(14px)}
      .lx28-skip{position:absolute;z-index:36;right:clamp(14px,4vw,62px);bottom:132px;min-height:43px;padding:0 17px;border:1px solid rgba(255,255,255,.34);border-radius:10px;background:rgba(6,6,6,.84);color:#fff;font:800 12px/1 Inter,Arial,sans-serif;letter-spacing:.02em;cursor:pointer;box-shadow:0 12px 38px rgba(0,0,0,.35);backdrop-filter:blur(16px);transition:.16s}.lx28-skip:hover{background:#fff;color:#090909;transform:translateY(-1px)}.lx28-skip.hide{display:none!important}
      .lx28-gesture{position:absolute;z-index:34;top:50%;transform:translateY(-50%);padding:10px 13px;border-radius:999px;background:rgba(0,0,0,.62);color:white;font:800 11px Inter,Arial,sans-serif;opacity:0;pointer-events:none;transition:opacity .15s}.lx28-gesture.show{opacity:1}.lx28-gesture.left{left:12%}.lx28-gesture.right{right:12%}
      @media(max-width:760px){.lx28-hints{display:none}.lx28-skip{right:12px;bottom:92px;min-height:40px;font-size:11px;padding:0 14px}}
    `;shadow.appendChild(style);
    const hints=document.createElement('div');hints.className='lx28-hints';hints.innerHTML='<span>Espaço/K · pausar</span><span>←/→ · 10s</span><span>F · tela cheia</span><span>M · mudo</span><span>N · próximo</span>';shell.appendChild(hints);
    const video=shadow.querySelector('#video');
    if(!video)return;
    const title=String(host.getAttribute('aria-label')||'').replace(/^Reproduzindo\s+/i,'').trim(),contentId=host.dataset.lxContentId;
    const content=(LX.data?.catalog?.()||[]).find(x=>contentId&&String(x.id)===String(contentId))||(LX.data?.catalog?.()||[]).find(x=>String(x.title||'').trim()===title);
    const windows=[];
    const addWindow=(kind,label,start,end)=>{start=+start;end=+end;if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)windows.push({kind,label,start,end})};
    addWindow('recap','Pular recapitulação',content?.recapStart,content?.recapEnd);
    addWindow('intro','Pular abertura',content?.introStart,content?.introEnd);
    const skip=document.createElement('button');skip.type='button';skip.className='lx28-skip hide';skip.setAttribute('aria-label','Pular trecho');shell.appendChild(skip);
    let active=null;
    const syncSkip=()=>{const t=video.currentTime||0,next=windows.find(w=>t>=w.start&&t<w.end-.35);active=next||null;if(next){skip.textContent=`${next.label}  ›`;skip.dataset.kind=next.kind;skip.classList.remove('hide')}else skip.classList.add('hide')};
    skip.onclick=()=>{if(!active)return;video.currentTime=Math.min(active.end,Number.isFinite(video.duration)?video.duration:active.end);skip.classList.add('hide');toast(active.kind==='intro'?'Abertura pulada.':'Recapitulação pulada.')};
    video.addEventListener('timeupdate',syncSkip,{passive:true});video.addEventListener('loadedmetadata',syncSkip,{passive:true});
    const stage=shadow.querySelector('#stage,.stage');
    if(stage){
      const gl=document.createElement('span'),gr=document.createElement('span');gl.className='lx28-gesture left';gr.className='lx28-gesture right';gl.textContent='↶ 10s';gr.textContent='10s ↷';shell.append(gl,gr);
      let lastTap=0,lastX=0,gestureTimer=0;
      stage.addEventListener('touchend',e=>{if(e.changedTouches?.length!==1)return;const t=Date.now(),touch=e.changedTouches[0],r=stage.getBoundingClientRect(),x=touch.clientX-r.left;if(t-lastTap<330&&Math.abs(x-lastX)<90){const left=x<r.width/2;video.currentTime=Math.max(0,Math.min(video.duration||Infinity,(video.currentTime||0)+(left?-10:10)));const badge=left?gl:gr;badge.classList.add('show');clearTimeout(gestureTimer);gestureTimer=setTimeout(()=>badge.classList.remove('show'),520);lastTap=0}else{lastTap=t;lastX=x}},{passive:true});
    }
  }

  /* ---------------- admin health / request productivity ---------------- */
  async function healthSnapshot(){
    const cloud=LX.cloud?.status?.()||{};let r2={configured:false};try{r2=await LX.r2?.status?.()||r2}catch(e){recordError('r2-health',e)}
    const sw=!!navigator.serviceWorker?.controller;const spotify=!!LX.v27;const requests=(LX.data?.requests?.()||[]).length;return {online:navigator.onLine,cloud,r2,sw,spotify,requests,errors:state.errors.slice(-8).reverse()};
  }
  async function renderHealth(){
    const main=$('adminMain');if(!main)return;main.dataset.lxV28Health='1';main.innerHTML='<header class="admin-head"><div><span class="eyebrow">OPERAÇÃO V28</span><h1>Saúde do sistema</h1><p>Diagnóstico rápido da interface, nuvem, mídia, cache e erros locais.</p></div><button id="lxV28HealthRefresh" class="primary-btn">Executar diagnóstico</button></header><div id="lxV28HealthBody" class="lx-v28-health-loading"><div class="lx-v28-skeleton"></div><div class="lx-v28-skeleton"></div><div class="lx-v28-skeleton"></div></div>';
    $('lxV28HealthRefresh').onclick=renderHealth;const s=await healthSnapshot();const body=$('lxV28HealthBody');if(!body)return;
    const card=(name,ok,detail)=>`<article class="lx-v28-health-card ${ok?'ok':'warn'}"><span>${ok?'●':'!'}</span><div><small>${esc(name)}</small><strong>${ok?'Operacional':'Atenção'}</strong><p>${esc(detail)}</p></div></article>`;
    body.className='lx-v28-health';body.innerHTML=`<section class="lx-v28-health-grid">${card('Internet',s.online,s.online?'Dispositivo online':'Sem conexão com a internet')}${card('Supabase',!!s.cloud.configured,s.cloud.configured?'Nuvem configurada e sincronização disponível':'Configuração da nuvem não detectada')}${card('Armazenamento R2',!!s.r2.configured,s.r2.configured?`Bucket ${s.r2.bucket||'conectado'}`:'R2 não configurado ou indisponível')}${card('Service Worker',s.sw,s.sw?'PWA controlado pelo cache v28':'Abra/recarregue uma vez para ativar o cache')}${card('Música',s.spotify,'YouTube Music e Spotify usam players oficiais quando o link é compatível')}${card('Central LX',true,`${s.requests} solicitação${s.requests===1?'':'ões'} registrada${s.requests===1?'':'s'}`)}</section><section class="admin-card lx-v28-errors"><header><div><span>LOG LOCAL</span><h2>Erros recentes desta instalação</h2></div><button type="button" onclick="LX.v28.clearErrors()">Limpar</button></header>${s.errors.length?s.errors.map(e=>`<article><b>${esc(e.kind)}</b><span>${new Date(e.at).toLocaleString('pt-BR')}</span><p>${esc(e.message)}</p></article>`).join(''):'<div class="lx-v28-empty"><b>Nenhum erro registrado</b><span>Ótimo sinal. Serviços externos ainda devem ser validados no domínio real.</span></div>'}</section>`;
  }
  LX.v28.renderHealth=renderHealth;
  function ensureHealthNav(){
    const nav=$('adminNav');if(!nav||nav.querySelector('[data-v28-health]'))return;const b=document.createElement('button');b.type='button';b.dataset.v28Health='1';b.innerHTML='<i>◉</i><span>Saúde do sistema</span>';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();$$('#adminNav button').forEach(x=>x.classList.toggle('active',x===b));renderHealth()},{capture:true});nav.appendChild(b)
  }
  function enhanceAdminRequests(){
    if(LX.ui?.state?.adminPage!=='requests')return;const main=$('adminMain');if(!main||main.querySelector('.lx-v28-request-tools'))return;const grid=main.querySelector('.request-grid');if(!grid)return;const tools=document.createElement('div');tools.className='lx-v28-request-tools';tools.innerHTML='<button class="active" data-v28-reqfilter="all">Todos</button><button data-v28-reqfilter="Novo">Novos</button><button data-v28-reqfilter="Em análise">Em análise</button><button data-v28-reqfilter="Aprovado">Aprovados</button><button data-v28-reqfilter="Concluído">Concluídos</button><input id="lxV28ReqSearch" placeholder="Buscar pedido ou problema">';grid.before(tools);
    const apply=()=>{const f=tools.querySelector('.active')?.dataset.v28Reqfilter||'all',q=String($('lxV28ReqSearch')?.value||'').toLowerCase();$$('.request-card',grid).forEach(c=>{const txt=(c.textContent||'').toLowerCase(),statusMatch=f==='all'||txt.includes(f.toLowerCase());c.classList.toggle('hidden',!statusMatch||(q&&!txt.includes(q)))})};
    $$('[data-v28-reqfilter]',tools).forEach(b=>b.onclick=()=>{$$('[data-v28-reqfilter]',tools).forEach(x=>x.classList.toggle('active',x===b));apply()});$('lxV28ReqSearch').oninput=apply;
  }

  /* ---------------- notifications, images, skeletons ---------------- */
  function enhanceModal(){
    enhanceProfile();const modal=$('modal');if(!modal)return;
    if(/Notifica/i.test(modal.textContent||''))modal.classList.add('lx-v28-notification-modal');
    $$('img',modal).forEach(img=>{img.loading='lazy';img.decoding='async'});
  }
  function installImageFallbacks(){
    document.addEventListener('error',e=>{const img=e.target;if(!(img instanceof HTMLImageElement)||img.dataset.lxFallback==='1')return;img.dataset.lxFallback='1';img.classList.add('lx-v28-img-error');img.alt=img.alt||'Imagem indisponível'},true)
  }

  /* ---------------- wrapping existing entrypoints ---------------- */
  function wrapEntrypoints(){
    if(LX.openRequests&&!LX.openRequests.__v28){const legacy=LX.openRequests;openSupportCenter.legacy=legacy;LX.openRequests=openSupportCenter;LX.openRequests.__v28=true}
    if(LX.openProfile&&!LX.openProfile.__v28){const base=LX.openProfile.bind(LX);const fn=()=>{base();setTimeout(enhanceProfile,0)};fn.__v28=true;LX.openProfile=fn}
    if(LX.openNotifications&&!LX.openNotifications.__v28){const base=LX.openNotifications.bind(LX);const fn=()=>{base();setTimeout(enhanceModal,0)};fn.__v28=true;LX.openNotifications=fn}
    if(LX.ui?.renderApp&&!LX.ui.renderApp.__v28){const base=LX.ui.renderApp.bind(LX.ui);const fn=(...a)=>{const r=base(...a);queueMicrotask(()=>{enhanceHome();ensureSupportEntrypoints()});return r};fn.__v28=true;LX.ui.renderApp=fn}
    if(LX.ui?.renderHome&&!LX.ui.renderHome.__v28){const base=LX.ui.renderHome.bind(LX.ui);const fn=(...a)=>{const r=base(...a);queueMicrotask(enhanceHome);return r};fn.__v28=true;LX.ui.renderHome=fn}
    if(LX.admin?.render&&!LX.admin.render.__v28){const base=LX.admin.render.bind(LX.admin);const fn=(page='dashboard')=>{if(page==='health')return renderHealth();const r=base(page);setTimeout(()=>{ensureHealthNav();enhanceAdminRequests()},0);return r};fn.__v28=true;LX.admin.render=fn}
  }

  /* ---------------- global bindings ---------------- */
  function keyBindings(){
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();state.paletteOpen?closePalette():openPalette()}else if(e.key==='Escape'&&state.paletteOpen){e.preventDefault();closePalette()}else if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();openPalette()}})
  }
  function bindSearchButton(){const b=$('searchBtn');if(b&&!b.dataset.lxV28){b.dataset.lxV28='1';b.addEventListener('dblclick',e=>{e.preventDefault();openPalette()},true)}const s=$('searchInput');if(s&&!s.dataset.lxV28){s.dataset.lxV28='1';s.setAttribute('placeholder','Buscar na LX Plus…  Ctrl/⌘ K para busca universal')}}

  function observe(){
    state.observer=new MutationObserver(records=>{let relevant=false;for(const rec of records){for(const node of rec.addedNodes){if(node.nodeType!==1)continue;relevant=true;enhanceMediaEditor(node);enhanceCommunity(node);enhanceChat(node);enhanceCinema(node)}}if(!relevant)return;const t=performance.now();if(t-state.lastEnhance<30)return;state.lastEnhance=t;ensureSupportEntrypoints();ensureHealthNav();enhanceAdminRequests();enhanceModal()});
    state.observer.observe(document.documentElement,{subtree:true,childList:true});
  }

  function boot(){
    hardenMediaSources();wrapEntrypoints();ensureOfflineBanner();ensureSupportEntrypoints();ensureHealthNav();bindSearchButton();keyBindings();installImageFallbacks();enhanceHome();enhanceCommunity();enhanceChat();enhanceCinema();enhanceMediaEditor();observe();
    document.documentElement.dataset.lxBuild='28.1';document.body?.classList.add('lx-v28');
    // Prompt the active service worker to take over after an update without deleting account data.
    if('serviceWorker'in navigator){navigator.serviceWorker.ready.then(reg=>{if(reg.waiting)reg.waiting.postMessage('SKIP_WAITING')}).catch(()=>{})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
