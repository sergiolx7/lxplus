/* LX Plus v40 interaction layer: non-destructive UI upgrades. */
(()=>{
  'use strict';
  const dock=()=>document.getElementById('musicDock');
  const state=()=>window.LX?.ui?.state||{};
  const isAdmin=()=>{
    const user=state().user||{};
    return user.admin===true||user.admin==='true'||['admin','administrator','super_admin'].includes(String(user.role||user.permission||'').toLowerCase());
  };
  function installToastStyles(){
    if(document.getElementById('lx40-command-styles'))return;
    const style=document.createElement('style');style.id='lx40-command-styles';style.textContent=`
      .lx40-command-palette{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:start center;padding:13vh 16px 24px;background:rgba(0,0,0,.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .lx40-command-palette.hidden{display:none}.lx40-command-box{width:min(580px,100%);overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(19,19,24,.97);box-shadow:0 28px 90px rgba(0,0,0,.58),0 0 38px rgba(154,112,255,.12);color:#f5f5f8}
      .lx40-command-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px 7px;color:#a783ff;font-size:10px;font-weight:900;letter-spacing:.16em}.lx40-command-head kbd,.lx40-command-item kbd{padding:3px 7px;border:1px solid rgba(255,255,255,.12);border-radius:7px;color:#a4a4b1;font:600 10px system-ui}
      .lx40-command-search{display:block;width:calc(100% - 28px);margin:5px 14px 12px;padding:13px 14px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.045);color:#fff;font:500 15px system-ui;outline:none}.lx40-command-search:focus{border-color:rgba(167,131,255,.72);box-shadow:0 0 0 3px rgba(167,131,255,.12)}
      .lx40-command-results{max-height:min(54vh,440px);overflow:auto;padding:0 8px 8px}.lx40-command-item{display:grid;width:100%;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:11px;padding:10px;border:0;border-radius:12px;background:transparent;color:inherit;text-align:left;cursor:pointer;transition:background 160ms ease,transform 160ms ease}.lx40-command-item:hover,.lx40-command-item:focus-visible{outline:none;background:rgba(255,255,255,.075)}.lx40-command-item:active{transform:scale(.99)}
      .lx40-command-item>span:nth-child(2){display:grid;gap:3px;min-width:0}.lx40-command-item strong{font-size:13px}.lx40-command-item small{overflow:hidden;color:#a4a4b1;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.lx40-command-icon{display:grid;width:34px;height:34px;place-items:center;border:1px solid rgba(167,131,255,.18);border-radius:10px;background:rgba(167,131,255,.08);color:#c1a9ff;font-size:17px}
      .lx40-command-empty{margin:0;padding:22px;color:#a4a4b1;text-align:center;font-size:13px}.lx40-command-box>small{display:block;padding:10px 18px 13px;border-top:1px solid rgba(255,255,255,.07);color:#858590;font-size:10px}@media(max-width:600px){.lx40-command-palette{padding:9vh 10px 20px}.lx40-command-box{border-radius:16px}.lx40-command-item{padding:9px 7px}}@media(prefers-reduced-motion:reduce){.lx40-command-item{transition:none}}
      #modal .ranking-table{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;align-items:end}
      #modal .ranking-table>.rank-row{position:relative;display:flex;min-width:0;min-height:158px;flex-direction:column;justify-content:flex-end;align-items:center;gap:9px;padding:18px 12px 16px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:linear-gradient(155deg,rgba(255,255,255,.075),rgba(255,255,255,.025));text-align:center;box-shadow:0 14px 35px rgba(0,0,0,.22);transition:transform 180ms ease,border-color 180ms ease,box-shadow 180ms ease}
      #modal .ranking-table>.rank-row:nth-child(1){grid-column:2;grid-row:1;min-height:204px;border-color:rgba(248,205,112,.48);background:radial-gradient(ellipse at 50% 0,rgba(248,205,112,.2),transparent 70%),linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025));box-shadow:0 0 28px rgba(248,205,112,.08),0 18px 40px rgba(0,0,0,.3)}
      #modal .ranking-table>.rank-row:nth-child(2){grid-column:1;grid-row:1;margin-bottom:0;border-color:rgba(204,216,233,.3)}
      #modal .ranking-table>.rank-row:nth-child(3){grid-column:3;grid-row:1;margin-bottom:0;border-color:rgba(196,133,93,.32)}
      #modal .ranking-table>.rank-row:nth-child(n+4){grid-column:1/-1;min-height:62px;flex-direction:row;justify-content:space-between;gap:12px;padding:12px 15px;text-align:left}
      #modal .ranking-table>.rank-row:nth-child(n+4)>div{flex:1;text-align:left}
      #modal .ranking-table>.rank-row:nth-child(-n+3) .position{display:grid;min-width:48px;min-height:48px;place-items:center;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(0,0,0,.22);font-size:20px;font-weight:900}
      #modal .ranking-table>.rank-row:nth-child(1) .position{min-width:60px;min-height:60px;border-color:rgba(248,205,112,.62);color:#ffe4a2;font-size:24px;box-shadow:0 0 20px rgba(248,205,112,.15)}
      #modal .ranking-table>.rank-row:nth-child(2) .position{color:#d8e0ef}#modal .ranking-table>.rank-row:nth-child(3) .position{color:#e9b394}
      #modal .ranking-table>.rank-row:nth-child(-n+3)>div strong{font-size:clamp(13px,2vw,16px);overflow-wrap:anywhere}
      #modal .lx40-podium-avatar{display:grid;place-items:center;width:56px;height:56px;margin-bottom:1px;border-radius:50%;background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.035));box-shadow:0 8px 20px rgba(0,0,0,.28)}
      #modal .lx40-podium-avatar>div{width:52px!important;height:52px!important;min-width:52px!important;border-radius:50%!important;font-size:20px!important}
      #modal .ranking-table>.rank-row:nth-child(1) .lx40-podium-avatar{width:72px;height:72px;background:linear-gradient(145deg,rgba(248,205,112,.36),rgba(248,205,112,.07));box-shadow:0 0 24px rgba(248,205,112,.15)}
      #modal .ranking-table>.rank-row:nth-child(1) .lx40-podium-avatar>div{width:66px!important;height:66px!important;min-width:66px!important;font-size:25px!important}
      #modal .ranking-table>.rank-row:nth-child(1)>b{color:#ffe4a2;font-size:17px}
      #modal .ranking-table>.rank-row:nth-child(n+4):hover{transform:translateY(-2px);border-color:rgba(167,131,255,.28);box-shadow:0 14px 34px rgba(0,0,0,.3)}
      .lx40-admin-catalog{margin:14px 0 18px;padding:17px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(145deg,rgba(25,25,32,.92),rgba(14,14,19,.88));box-shadow:0 14px 38px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.035)}
      .lx40-admin-catalog-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.lx40-admin-catalog-head strong{font-size:14px;letter-spacing:.01em}.lx40-admin-catalog-head small{color:#a4a4b1;font-size:11px}
      .lx40-admin-catalog-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.lx40-admin-catalog-item{min-width:0;padding:12px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.035)}.lx40-admin-catalog-item span{display:block;overflow:hidden;color:#a4a4b1;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.lx40-admin-catalog-item b{display:block;margin-top:6px;color:#f5f5f8;font-size:clamp(18px,2vw,24px);font-variant-numeric:tabular-nums;line-height:1}
      @media(max-width:760px){.lx40-admin-catalog-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:460px){.lx40-admin-catalog{padding:13px}.lx40-admin-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lx40-admin-catalog-head{align-items:flex-start;flex-direction:column;gap:4px}}
      @media(max-width:560px){#modal .ranking-table{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#modal .ranking-table>.rank-row:nth-child(1){grid-column:1/-1;grid-row:1;min-height:156px}#modal .ranking-table>.rank-row:nth-child(2){grid-column:1;grid-row:2;min-height:132px}#modal .ranking-table>.rank-row:nth-child(3){grid-column:2;grid-row:2;min-height:132px}#modal .ranking-table>.rank-row:nth-child(n+4){grid-column:1/-1;min-height:58px}}
      @media(prefers-reduced-motion:reduce){#modal .ranking-table>.rank-row{transition:none}}
    `;document.head.appendChild(style);
  }
  function setExpanded(value){
    const el=dock();if(!el)return false;
    const expanded=!!value;el.classList.toggle('lx40-expanded',expanded);
    el.setAttribute('aria-label',expanded?'LX Floating Player expandido':'LX Floating Player');
    try{localStorage.setItem('lx40:player-expanded',expanded?'1':'0')}catch{}
    return expanded;
  }
  function toggle(){const el=dock();return setExpanded(!el?.classList.contains('lx40-expanded'))}
  function bind(){
    const el=dock();if(!el||el.dataset.lx40Bound)return;el.dataset.lx40Bound='1';
    let expanded=false;try{expanded=localStorage.getItem('lx40:player-expanded')==='1'}catch{}
    setExpanded(expanded);
    const info=el.querySelector('.music-info');
    if(info){
      info.tabIndex=0;info.setAttribute('role','button');info.setAttribute('aria-label','Expandir ou recolher o player');
      info.addEventListener('click',e=>{if(e.target.closest('button'))return;toggle()});
      info.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
    }
    el.addEventListener('keydown',e=>{if(e.key==='Escape'&&el.classList.contains('lx40-expanded'))setExpanded(false)});
  }
  const commands=[
    {label:'Adicionar filme',hint:'Abrir cadastro de filme',type:'Filme',icon:'＋'},
    {label:'Adicionar série',hint:'Abrir cadastro de série',type:'Série',icon:'▣'},
    {label:'Adicionar música',hint:'Abrir cadastro de música',type:'Música',icon:'♫'},
    {label:'Adicionar livro',hint:'Abrir cadastro de livro',type:'Livro',icon:'▤'},
    {label:'Importar Drive e catálogo',hint:'Abrir LX Smart Import',page:'importer',icon:'⇧'},
    {label:'Buscar usuário',hint:'Gerenciar e localizar usuários',page:'admins',icon:'⌕'},
    {label:'Ver saúde e erros',hint:'Abrir dashboard e monitor da plataforma',page:'dashboard',icon:'▦'},
    {label:'Criar LX Live',hint:'Abrir gerenciamento de transmissões',page:'live',icon:'●'}
  ];
  let palette=null,paletteReturnFocus=null,activeCommandIndex=0;
  function ensurePalette(){
    if(palette)return palette;
    installToastStyles();
    palette=document.createElement('section');palette.className='lx40-command-palette hidden';palette.setAttribute('role','dialog');palette.setAttribute('aria-modal','true');palette.setAttribute('aria-label','Comandos do LX Admin');
    palette.innerHTML='<div class="lx40-command-box"><div class="lx40-command-head"><span>LX ADMIN</span><kbd>ESC</kbd></div><input type="search" class="lx40-command-search" placeholder="O que você quer fazer?" aria-label="Buscar comando" aria-controls="lx40-command-results"><div class="lx40-command-results" id="lx40-command-results" role="listbox" aria-label="Ações administrativas"></div><small>Use Ctrl + K para abrir esta paleta.</small></div>';
    document.body.appendChild(palette);
    palette.addEventListener('click',event=>{if(event.target===palette)closePalette()});
    palette.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closePalette()} });
    palette.querySelector('.lx40-command-search').addEventListener('input',()=>{activeCommandIndex=0;renderCommands()});
    palette.querySelector('.lx40-command-search').addEventListener('keydown',event=>{
      const items=Array.from(palette.querySelectorAll('[data-command]'));
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        if(!items.length)return;
        event.preventDefault();activeCommandIndex=(activeCommandIndex+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
        items.forEach((item,index)=>item.setAttribute('aria-selected',index===activeCommandIndex?'true':'false'));
        palette.querySelector('.lx40-command-search').setAttribute('aria-activedescendant',items[activeCommandIndex].id);
      }else if(event.key==='Enter'&&items.length){event.preventDefault();items[activeCommandIndex]?.click()}
    });
    palette.querySelector('.lx40-command-results').addEventListener('click',event=>{
      const button=event.target.closest('[data-command]');if(!button)return;
      const command=commands[Number(button.dataset.command)];closePalette();runCommand(command);
    });
    renderCommands();return palette;
  }
  function renderCommands(){
    if(!palette)return;
    const q=palette.querySelector('.lx40-command-search').value.trim().toLocaleLowerCase('pt-BR');
    const results=palette.querySelector('.lx40-command-results');
    const matches=commands.map((item,index)=>({item,index})).filter(({item})=>!q||`${item.label} ${item.hint}`.toLocaleLowerCase('pt-BR').includes(q));
    activeCommandIndex=Math.max(0,Math.min(activeCommandIndex,matches.length-1));
    results.innerHTML=matches.map(({item,index},position)=>`<button type="button" id="lx40-command-${index}" role="option" aria-selected="${position===activeCommandIndex?'true':'false'}" tabindex="-1" class="lx40-command-item" data-command="${index}"><span class="lx40-command-icon" aria-hidden="true">${item.icon}</span><span><strong>${item.label}</strong><small>${item.hint}</small></span><kbd>↵</kbd></button>`).join('')||'<p class="lx40-command-empty">Nenhum comando encontrado.</p>';
    const search=palette.querySelector('.lx40-command-search');
    if(matches.length)search.setAttribute('aria-activedescendant',`lx40-command-${matches[activeCommandIndex].index}`);else search.removeAttribute('aria-activedescendant');
  }
  function openPalette(){
    if(!isAdmin())return false;
    const el=ensurePalette();paletteReturnFocus=document.activeElement;activeCommandIndex=0;el.classList.remove('hidden');el.querySelector('.lx40-command-search').value='';renderCommands();requestAnimationFrame(()=>el.querySelector('.lx40-command-search').focus());return true;
  }
  function closePalette(){if(!palette)return;palette.classList.add('hidden');palette.querySelector('.lx40-command-search').removeAttribute('aria-activedescendant');if(paletteReturnFocus?.isConnected&&typeof paletteReturnFocus.focus==='function')paletteReturnFocus.focus();paletteReturnFocus=null}
  function runCommand(command){
    if(!command||!isAdmin())return;
    const lx=window.LX;
    if(command.type){lx.openAdmin?.();setTimeout(()=>lx.admin?.edit?.(null,command.type),80);return}
    lx.openAdmin?.();setTimeout(()=>{if(command.page)lx.admin?.render?.(command.page);if(command.page==='dashboard')lx.recovery?.monitor?.()},80);
  }
  function enhanceRanking(){
    const rows=Array.from(document.querySelectorAll('#modal .ranking-table>.rank-row')).slice(0,3);
    if(!rows.length)return;
    const users=window.LX?.data?.users?.()||[];
    rows.forEach(row=>{
      if(row.querySelector('.lx40-podium-avatar'))return;
      const name=row.querySelector('strong')?.textContent?.trim()||'LX';
      const user=users.find(item=>String(item.name||'').trim()===name);
      const holder=document.createElement('span');holder.className='lx40-podium-avatar';holder.setAttribute('aria-hidden','true');
      if(window.LX?.avatarHTML)holder.innerHTML=window.LX.avatarHTML(user?.name||name,user?.email||'','avatar-inline');
      else holder.textContent=name.split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase();
      row.insertBefore(holder,row.firstChild);
    });
  }
  function watchRanking(){
    const modal=document.getElementById('modal');if(!modal||!window.MutationObserver)return;
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceRanking()})}).observe(modal,{childList:true,subtree:true});
    enhanceRanking();
  }
  function enhanceAdminDashboard(){
    const main=document.getElementById('adminMain');if(!main||state().adminPage!=='dashboard'||main.querySelector('.lx40-admin-catalog'))return;
    const stats=main.querySelector('.stats'),catalog=window.LX?.data?.catalog?.();if(!stats||!Array.isArray(catalog))return;
    const count=types=>catalog.filter(item=>types.includes(String(item.type||'').trim())).length;
    const albums=new Set(catalog.filter(item=>item.type==='Música').map(item=>String(item.album||item.albumName||item.releaseTitle||'').trim().toLocaleLowerCase('pt-BR')).filter(Boolean));
    const tiles=[['Filmes',count(['Filme'])],['Séries',count(['Série','Anime','Dorama'])],['Faixas',count(['Música'])],['Álbuns identificados',albums.size],['Livros',count(['Livro'])]];
    const section=document.createElement('section');section.className='lx40-admin-catalog';section.setAttribute('aria-label','Resumo do catálogo LX');
    section.innerHTML='<div class="lx40-admin-catalog-head"><strong>Catálogo por tipo</strong><small>Inclui publicados e rascunhos</small></div><div class="lx40-admin-catalog-grid">'+tiles.map(([label,value])=>`<div class="lx40-admin-catalog-item"><span>${label}</span><b>${value}</b></div>`).join('')+'</div>';
    stats.insertAdjacentElement('afterend',section);
  }
  function watchAdminDashboard(){
    const main=document.getElementById('adminMain');if(!main||!window.MutationObserver)return;
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceAdminDashboard()})}).observe(main,{childList:true});
    enhanceAdminDashboard();
  }
  document.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='k'||event.altKey)return;
    if(!isAdmin())return;
    event.preventDefault();openPalette();
  });
  window.LXFloatingPlayer={expand:()=>setExpanded(true),collapse:()=>setExpanded(false),toggle,bind};
  window.LXCommandPalette={open:openPalette,close:closePalette};
  installToastStyles();
  if(!window.__lx40AlertToast){
    const nativeAlert=window.alert?.bind(window);
    window.alert=message=>{const notify=window.LX?.toast||window.LXShell?.toast;if(notify)notify(String(message??''));else nativeAlert?.(String(message??''))};
    window.__lx40AlertToast=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindPlayerDragging,{once:true});else bindPlayerDragging();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchRanking,{once:true});else watchRanking();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchAdminDashboard,{once:true});else watchAdminDashboard();
  document.addEventListener('lx:music-closed',()=>setExpanded(false));

  /* LX Image Pipeline v40.1: responsive lazy loading, loading state and resilient fallback. */
  function installImagePipeline(){
    if(document.getElementById('lx40-image-styles'))return;
    const style=document.createElement('style');style.id='lx40-image-styles';style.textContent=`
      img.lx40-image-loading{background-color:rgba(255,255,255,.035);background-image:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.085) 45%,transparent 70%);background-size:220% 100%;animation:lx40-image-shimmer 1.35s ease-in-out infinite}
      img.lx40-image-ready{animation:none;background-image:none}
      img.lx40-image-fallback{object-fit:contain!important;padding:12%!important;background:radial-gradient(ellipse at 50% 35%,rgba(167,131,255,.13),rgba(13,13,17,.96) 72%)!important}
      @keyframes lx40-image-shimmer{to{background-position-x:-220%}}
      @media(prefers-reduced-motion:reduce){img.lx40-image-loading{animation:none;background-image:none}}
    `;document.head.appendChild(style);
  }
  const imageFallback='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220"><rect width="160" height="220" rx="14" fill="#111116"/><path d="M80 82a27 27 0 1 0 0-54 27 27 0 0 0 0 54Zm-47 91c2-31 22-48 47-48s45 17 47 48" fill="none" stroke="#8f73c5" stroke-width="8" stroke-linecap="round"/><path d="M48 196h64" stroke="#494052" stroke-width="6" stroke-linecap="round"/></svg>');
  function prepareImage(img){
    if(!(img instanceof HTMLImageElement)||img.dataset.lx40ImageReady)return;
    img.dataset.lx40ImageReady='1';img.decoding='async';
    if(!img.loading&&!img.closest('#hero,.lx-visual-intro335,.music-dock,#playerOverlay'))img.loading='lazy';
    if(img.closest('#hero,.lx-visual-intro335,.music-dock,#playerOverlay'))img.fetchPriority='high';
    img.classList.add('lx40-image-loading');
    const ready=()=>{img.classList.remove('lx40-image-loading');img.classList.add('lx40-image-ready')};
    if(img.complete&&img.naturalWidth>0)ready();else img.addEventListener('load',ready,{once:true});
  }
  function handleImageError(event){
    const img=event.target;if(!(img instanceof HTMLImageElement)||img.dataset.lx40Fallback)return;
    img.dataset.lx40Fallback='1';img.classList.remove('lx40-image-loading','lx40-image-ready');
    img.classList.add('lx40-image-fallback');img.alt=img.alt||'Imagem indisponível';img.src=imageFallback;
  }
  function watchImages(){
    installImagePipeline();document.querySelectorAll('img').forEach(prepareImage);
    document.addEventListener('error',handleImageError,true);
    if(!window.MutationObserver)return;let queued=false;
    new MutationObserver(records=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches?.('img'))prepareImage(node);node.querySelectorAll?.('img').forEach(prepareImage)}})}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchImages,{once:true});else watchImages();

  /* LX Floating Player drag v40.2: desktop position with local persistence. */
  function bindPlayerDragging(){
    const el=dock(),info=el?.querySelector('.music-info');if(!el||!info||info.dataset.lx40DragBound)return;
    info.dataset.lx40DragBound='1';info.classList.add('lx40-player-drag-handle');
    const key='lx40:player-position';
    const place=(x,y,persist=false)=>{
      const rect=el.getBoundingClientRect(),left=Math.max(8,Math.min(innerWidth-rect.width-8,x)),top=Math.max(8,Math.min(innerHeight-rect.height-8,y));
      el.style.setProperty('left',left+'px','important');el.style.setProperty('top',top+'px','important');
      el.style.setProperty('right','auto','important');el.style.setProperty('bottom','auto','important');
      if(persist)try{localStorage.setItem(key,JSON.stringify({x:left,y:top}))}catch{}
    };
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y))place(saved.x,saved.y)}catch{}
    let drag=null,suppressClick=false;
    info.title='Arraste para reposicionar · clique para expandir';
    info.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0||el.classList.contains('lx40-expanded')||event.target.closest('button'))return;
      const rect=el.getBoundingClientRect();drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top,moved:false};
    });
    document.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      if(!drag.moved&&Math.hypot(dx,dy)<6)return;
      drag.moved=true;place(drag.left+dx,drag.top+dy);event.preventDefault();
    },{passive:false});
    const finish=event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(drag.moved){const rect=el.getBoundingClientRect();place(rect.left,rect.top,true);suppressClick=true;setTimeout(()=>{suppressClick=false},350)}
      drag=null;
    };
    document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
    info.addEventListener('click',event=>{if(!suppressClick)return;event.preventDefault();event.stopImmediatePropagation();suppressClick=false},true);
    addEventListener('resize',()=>{const rect=el.getBoundingClientRect();place(rect.left,rect.top,true)});
  }

  /* LX Universal Media Resolver v40.3: one URL/MIME/protocol/provider inspection layer. */
  function vimeoDescriptor(value){
    let url;try{url=new URL(String(value||''))}catch{return null}
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    if(host!=='vimeo.com'&&host!=='player.vimeo.com'&&!host.endsWith('.vimeo.com'))return null;
    const parts=url.pathname.split('/').filter(Boolean),id=(parts.find(part=>/^\d{6,}$/.test(part))||'');
    if(!id)return null;
    const privateHash=url.searchParams.get('h')||(parts[parts.indexOf(id)+1]||'');
    const params=new URLSearchParams({dnt:'1',playsinline:'1'});
    if(privateHash&&/^[a-z0-9]+$/i.test(privateHash))params.set('h',privateHash);
    const openUrl=url.toString();
    return {kind:'embed',provider:'Vimeo',label:'Vimeo',src:`https://player.vimeo.com/video/${id}?${params.toString()}`,openUrl,embedHeight:360,vimeoId:id};
  }
  function installUniversalMediaResolver(){
    const media=window.LX?.mediaSources;if(!media||media.__lx40Resolver)return;
    const originalDescribe=media.describe.bind(media),originalNormalize=media.normalize.bind(media);
    const mimeByExtension={mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',ogv:'video/ogg',mov:'video/quicktime',m3u8:'application/vnd.apple.mpegurl',m3u:'application/vnd.apple.mpegurl',mpd:'application/dash+xml',mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',opus:'audio/ogg',wav:'audio/wav',flac:'audio/flac',vtt:'text/vtt',srt:'application/x-subrip'};
    const extensionOf=value=>{try{return new URL(String(value||''),location.href).pathname.split('.').pop().toLowerCase()}catch{return''}};
    function describe(ref){
      const raw=String(ref||'').trim(),vimeo=vimeoDescriptor(raw);
      if(vimeo)return vimeo;
      const base=originalDescribe(ref)||{},url=base.src||raw,ext=extensionOf(url);
      return {...base,format:ext==='m3u8'||ext==='m3u'?'hls':ext==='mpd'?'dash':ext||'unknown',mimeType:mimeByExtension[ext]||'',sourceUrl:raw,openUrl:base.openUrl||raw};
    }
    function resolve(ref,hints={}){
      const info=describe(ref),url=info.src||String(ref||''),ext=extensionOf(url),mime=String(hints.mimeType||info.mimeType||mimeByExtension[ext]||'').toLowerCase();
      let protocol='';try{protocol=new URL(url,location.href).protocol.replace(':','')}catch{}
      let codec=String(hints.codec||'').trim()||null;const codecMatch=mime.match(/codecs\s*=\s*["']?([^;"']+)/i);if(!codec&&codecMatch)codec=codecMatch[1].trim();
      let native=false;try{const video=document.createElement('video');native=!!mime&&!!video.canPlayType(mime)}catch{}
      return {url,sourceUrl:String(ref||''),mimeType:mime,codec,protocol,provider:info.provider||'Desconhecido',kind:info.kind||'missing',format:info.format||ext||'unknown',origin:(()=>{try{return new URL(url,location.href).origin}catch{return''}})(),canPlayNative:native,openUrl:info.openUrl||url,embedUrl:info.kind==='embed'?info.src:null};
    }
    media.describe=describe;
    media.normalize=(provider,value)=>originalNormalize(provider==='vimeo'?'direct':provider,value);
    media.providers=[...new Set([...(media.providers||[]),'vimeo'])];
    media.__lx40Resolver=true;
    window.LXMediaResolver={resolve,describe,providers:media.providers};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUniversalMediaResolver,{once:true});else installUniversalMediaResolver();
})();
