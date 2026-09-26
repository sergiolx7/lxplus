/* LX Plus Future UI V9
   Safe post-login UI layer. Never mutates auth/bootstrap.
   - Lazy-loads Books V8 only after user enters Books
   - Tracks current surface for scoped CSS
   - Adds full-screen control to LX Music Now Playing
   - Keeps all changes isolated from Supabase/data/player engine */
(()=>{'use strict';
  const STYLE_ID='lxFutureUiV9Css',BOOKS_SCRIPT_ID='lxBooksV8LazyScript',BOOKS_STYLE_ID='lxBooksV8LazyStyle';
  let booksLoading=false,lastSurface='',timer=0;
  const byId=id=>document.getElementById(id);
  const state=()=>window.LX?.ui?.state||{};
  const visible=el=>!!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none';
  const appVisible=()=>visible(byId('app'));
  const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  function loadStyle(){
    if(!appVisible())return;
    let link=byId(STYLE_ID);
    if(!link){link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.future-ui-v9.css?v=20260926-1';
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

  function enhanceDetail(){
    if(!appVisible())return;
    const shell=document.querySelector('#overlay:not(.hidden) .detail-shell-v256');
    if(!shell||shell.dataset.lx9Enhanced==='1')return;
    shell.dataset.lx9Enhanced='1';
    const copy=shell.querySelector('.detail-copy'),poster=shell.querySelector('.detail-poster');
    if(copy&&!copy.querySelector('.lx9-detail-kicker')){
      const type=shell.className.match(/detail-kind-([^\s]+)/)?.[1]||'';
      const label=type==='livro'?'LX BOOKS':type==='música'||type==='musica'?'LX MUSIC':'LX CINEMA';
      const badge=document.createElement('span');
      badge.className='lx9-detail-kicker';badge.textContent=label;
      badge.style.cssText='display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent,#8a2be2) 34%,rgba(255,255,255,.08));background:color-mix(in srgb,var(--accent,#8a2be2) 10%,rgba(255,255,255,.025));color:color-mix(in srgb,var(--accent,#8a2be2) 54%,white 46%);font-size:9px;font-weight:850;letter-spacing:.12em';
      copy.prepend(badge);
    }
    if(poster)poster.setAttribute('role','img');
  }

  function addFullscreenButton(){
    if(!appVisible())return;
    const panel=document.querySelector('#overlay:not(.hidden) .lx-now-playing-v6');
    if(!panel||panel.querySelector('.lx9-fullscreen-btn'))return;
    const btn=document.createElement('button');
    btn.type='button';btn.className='lx9-fullscreen-btn';btn.title='Preencher a tela';btn.setAttribute('aria-label','Preencher a tela');
    btn.innerHTML=icon('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>');
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

  function polishIcons(){
    const art=window.LX?.artwork;if(!art?.icon)return;
    document.querySelectorAll('#overlay:not(.hidden) .detail-tabs button').forEach(btn=>btn.classList.add('lx9-tab-btn'));
    const effects=byId('musicEffectsBtn');if(effects&&!effects.dataset.lx9Icon){effects.dataset.lx9Icon='1';effects.title='Equalizador e qualidade'}
  }

  function sync(){
    if(!appVisible()){
      delete document.body.dataset.lxSurface;lastSurface='';
      document.documentElement.classList.remove('lx9-music-fullscreen');
      return;
    }
    loadStyle();setSurface();enhanceDetail();addFullscreenButton();polishIcons();
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
    window.LXFutureUIV9={sync,lazyBooks,toggleMusicFullscreen:()=>document.querySelector('.lx9-fullscreen-btn')?.click()};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();