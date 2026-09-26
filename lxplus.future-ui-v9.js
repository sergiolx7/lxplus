/* LX Plus Future UI V9
   Safe post-login UI layer. Never mutates auth/bootstrap.
   - Lazy-loads Books V8 only after user enters Books
   - Lazy-loads Watch Together V10 only after app is visible
   - Loads Mini Floating Player V11 only after app is visible
   - Tracks current surface for scoped CSS
   - Adds full-screen control to LX Music Now Playing
   - Modernizes navigation/detail chrome without touching core logic */
(()=>{'use strict';
  const STYLE_ID='lxFutureUiV9Css',MINI_STYLE_ID='lxMiniFloatingPlayerV11Css',BOOKS_SCRIPT_ID='lxBooksV8LazyScript',BOOKS_STYLE_ID='lxBooksV8LazyStyle',WATCH_SCRIPT_ID='lxWatchTogetherV10Script';
  let booksLoading=false,lastSurface='',timer=0;
  const byId=id=>document.getElementById(id);
  const state=()=>window.LX?.ui?.state||{};
  const visible=el=>!!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none';
  const appVisible=()=>visible(byId('app'));
  const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const icons={
    home:icon('<path d="m3 11 9-7 9 7v9H5v-9"/><path d="M9 20v-6h6v6"/>'),
    movie:icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
    series:icon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    music:icon('<path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>'),
    book:icon('<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>'),
    community:icon('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c.6-4 2.8-6 6-6s5.4 2 6 6M15 14c3 0 5 1.8 5.8 5"/>'),
    heart:icon('<path d="M20.8 8.7c0 5-8.8 10.9-8.8 10.9S3.2 13.7 3.2 8.7a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3z"/>'),
    live:icon('<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/>')
  };

  function loadStyle(){
    if(!appVisible())return;
    let link=byId(STYLE_ID);
    if(!link){link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.future-ui-v9.css?v=20260926-1';
    let mini=byId(MINI_STYLE_ID);
    if(!mini){mini=document.createElement('link');mini.id=MINI_STYLE_ID;mini.rel='stylesheet';document.head.appendChild(mini)}
    mini.href='lxplus.mini-floating-player-v11.css?v=20260926-1';
  }

  function surface(){
    if(!appVisible())return'';
    const s=state(),mode=String(s.mode||'');
    if(mode==='Ouvir'||byId('app')?.classList.contains('lx-music-mode'))return'music';
    if(mode==='Ler')return'books';
    if(mode==='Ao vivo')return'live';
    return'watch';
  }

  function setSurface(){
    const next=surface();
    if(next===lastSurface)return;
    lastSurface=next;
    if(next)document.body.dataset.lxSurface=next;else delete document.body.dataset.lxSurface;
    if(next)loadStyle();
    const hero=byId('hero');
    if(next==='books'){
      if(hero){hero.classList.add('hidden');hero.style.setProperty('display','none','important')}
      lazyBooks();
    }else if(hero){
      hero.style.removeProperty('display');
      if(hero.children.length)hero.classList.remove('hidden');
    }
  }

  function lazyBooks(){
    if(!appVisible()||surface()!=='books'||booksLoading||window.LXBooksV8)return;
    booksLoading=true;
    let css=byId(BOOKS_STYLE_ID);
    if(!css){css=document.createElement('link');css.id=BOOKS_STYLE_ID;css.rel='stylesheet';css.href='lxplus.books-v8.css?v=20260926-2';document.head.appendChild(css)}
    let script=byId(BOOKS_SCRIPT_ID);
    if(script){booksLoading=false;return}
    script=document.createElement('script');script.id=BOOKS_SCRIPT_ID;script.src='lxplus.books-v8.js?v=20260926-2';script.async=true;
    script.onload=()=>{booksLoading=false;setTimeout(()=>{try{window.LXBooksV8?.sync?.()}catch{}},80)};
    script.onerror=()=>{booksLoading=false;console.warn('LX Future UI: Books V8 lazy load failed')};
    document.body.appendChild(script);
  }

  function lazyWatchTogether(){
    if(!appVisible()||window.LXWatchTogetherV10||byId(WATCH_SCRIPT_ID))return;
    const script=document.createElement('script');
    script.id=WATCH_SCRIPT_ID;script.src='lxplus.watch-together-v10.js?v=20260926-1';script.async=true;
    script.onerror=()=>console.warn('LX Future UI: Watch Together V10 load failed');
    document.body.appendChild(script);
  }

  function enhanceDetail(){
    if(!appVisible())return;
    const shell=document.querySelector('#overlay:not(.hidden) .detail-shell-v256');
    if(!shell||shell.dataset.lx9Enhanced==='1')return;
    shell.dataset.lx9Enhanced='1';
    const copy=shell.querySelector('.detail-copy'),poster=shell.querySelector('.detail-poster');
    const type=shell.className.match(/detail-kind-([^\s]+)/)?.[1]||'';
    if(copy&&!copy.querySelector('.lx9-detail-kicker')){
      const label=type==='livro'?'LX BOOKS':type==='música'||type==='musica'?'LX MUSIC':'LX CINEMA';
      const badge=document.createElement('span');
      badge.className='lx9-detail-kicker';badge.textContent=label;
      badge.style.cssText='display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent,#8a2be2) 34%,rgba(255,255,255,.08));background:color-mix(in srgb,var(--accent,#8a2be2) 10%,rgba(255,255,255,.025));color:color-mix(in srgb,var(--accent,#8a2be2) 54%,white 46%);font-size:9px;font-weight:850;letter-spacing:.12em';
      copy.prepend(badge);
    }
    if(type==='livro'){
      const eyebrow=shell.querySelector('.detail-description-card .eyebrow');if(eyebrow)eyebrow.textContent='SOBRE ESTE LIVRO';
      shell.querySelectorAll('.detail-side-info>div').forEach(row=>{const key=row.querySelector('small');if(key?.textContent?.trim()==='Criador')key.textContent='Autor'});
    }
    if(poster)poster.setAttribute('role','img');
  }

  function addFullscreenButton(){
    if(!appVisible())return;
    const panel=document.querySelector('#overlay:not(.hidden) .lx-now-playing-v6');
    if(!panel)return;
    const art=panel.querySelector('.lx-now-playing-art img');
    if(art?.src&&!panel.dataset.lx9Ambient){
      panel.dataset.lx9Ambient='1';
      panel.style.setProperty('background',`linear-gradient(155deg,rgba(10,12,18,.88),rgba(4,5,9,.98)),radial-gradient(circle at 18% 18%,color-mix(in srgb,var(--accent,#8a2be2) 20%,transparent),transparent 58%),url(${JSON.stringify(art.src)}) center/cover no-repeat`,'important');
    }
    if(panel.querySelector('.lx9-fullscreen-btn'))return;
    const btn=document.createElement('button');
    btn.type='button';btn.className='lx9-fullscreen-btn';btn.title='Preencher a tela';btn.setAttribute('aria-label','Preencher a tela');
    btn.innerHTML=icon('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>');
    const svg=btn.querySelector('svg');if(svg)svg.style.cssText='width:18px;height:18px;display:block';
    btn.addEventListener('click',async()=>{
      const target=byId('overlay')||panel;
      try{
        if(document.fullscreenElement){await document.exitFullscreen();document.documentElement.classList.remove('lx9-music-fullscreen');return}
        document.documentElement.classList.add('lx9-music-fullscreen');
        if(target.requestFullscreen)await target.requestFullscreen();
      }catch{
        document.documentElement.classList.toggle('lx9-music-fullscreen');
      }
    });
    panel.appendChild(btn);
  }

  function fitIconHost(el,size=20){
    if(!el)return;
    el.style.setProperty('width',size+'px');el.style.setProperty('height',size+'px');el.style.setProperty('min-width',size+'px');
    el.style.setProperty('display','grid');el.style.setProperty('place-items','center');
    const svg=el.querySelector('svg');if(svg)svg.style.cssText=`width:${size}px;height:${size}px;display:block`;
  }

  function modernizeShellIcons(){
    const map=[
      ['[data-shell-category="Início"] > span',icons.home],['[data-shell-category="Filmes"] > span',icons.movie],['[data-shell-category="Séries"] > span',icons.series],
      ['[data-shell-mode="Ouvir"] > span',icons.music],['[data-shell-mode="Ler"] > span',icons.book],['[data-shell-community="1"] > span',icons.community],
      ['[data-shell-category="Minha Lista"] > span',icons.heart]
    ];
    map.forEach(([sel,svg])=>document.querySelectorAll(sel).forEach(el=>{if(el.dataset.lx9Icon!=='1'){el.dataset.lx9Icon='1';el.innerHTML=svg}fitIconHost(el,20)}));
    document.querySelectorAll('#modeSwitch [data-mode]').forEach(btn=>{const span=btn.querySelector('span');if(!span)return;if(span.dataset.lx9Icon!=='1'){span.dataset.lx9Icon='1';span.innerHTML=btn.dataset.mode==='Ouvir'?icons.music:btn.dataset.mode==='Ler'?icons.book:btn.dataset.mode==='Ao vivo'?icons.live:icons.movie}fitIconHost(span,15)});
  }

  function polishIcons(){
    document.querySelectorAll('#overlay:not(.hidden) .detail-tabs button').forEach(btn=>btn.classList.add('lx9-tab-btn'));
    const effects=byId('musicEffectsBtn');if(effects&&!effects.dataset.lx9Icon){effects.dataset.lx9Icon='1';effects.title='Equalizador e qualidade'}
    modernizeShellIcons();
  }

  function sync(){
    if(!appVisible()){
      delete document.body.dataset.lxSurface;lastSurface='';
      document.documentElement.classList.remove('lx9-music-fullscreen');
      return;
    }
    loadStyle();setSurface();enhanceDetail();addFullscreenButton();polishIcons();lazyWatchTogether();
  }

  function queue(){clearTimeout(timer);timer=setTimeout(sync,0)}

  function boot(){
    const app=byId('app'),overlay=byId('overlay');
    if(app&&'MutationObserver'in window)new MutationObserver(queue).observe(app,{attributes:true,attributeFilter:['class']});
    if(overlay&&'MutationObserver'in window)new MutationObserver(queue).observe(overlay,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(sync,0),true);
    document.addEventListener('lx:music-changed',()=>setTimeout(sync,0));
    document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.documentElement.classList.remove('lx9-music-fullscreen')});
    window.addEventListener('resize',queue,{passive:true});
    setInterval(sync,900);
    sync();
    window.LXFutureUIV9={sync,lazyBooks,lazyWatchTogether,toggleMusicFullscreen:()=>document.querySelector('.lx9-fullscreen-btn')?.click()};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
