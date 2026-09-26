(()=>{'use strict';
const root=document.getElementById('lxRoot');
if(!root)return;
const route=v=>{const u=new URL(location.href);u.searchParams.set('preview','1');u.searchParams.set('view',v);location.href=u.pathname+'?'+u.searchParams.toString()};
const current=()=>new URLSearchParams(location.search).get('view')||'home';
function crossNav(){
  if(current()!=='music')return;
  if(document.querySelector('.lx-cross-nav'))return;
  const host=document.querySelector('.lx-music-main');
  if(!host)return;
  host.classList.add('has-cross-nav');
  const nav=document.createElement('nav');
  nav.className='lx-cross-nav';
  nav.setAttribute('aria-label','Navegação entre áreas da LX Plus');
  const items=[['home','Início'],['films','Filmes'],['series','Séries'],['animes','Animes'],['dramas','Dramas'],['music','Música'],['list','Minha Lista']];
  nav.innerHTML=items.map(([v,l])=>`<button type="button" data-v42-route="${v}" class="${v==='music'?'active':''}">${l}${v==='music'?' <span class="lx-new">NOVO</span>':''}</button>`).join('');
  document.body.appendChild(nav);
}
function mobileDock(){
  if(document.querySelector('.lx-mobile-dock'))return;
  const dock=document.createElement('nav');dock.className='lx-mobile-dock';dock.setAttribute('aria-label','Navegação mobile');
  const cur=current();
  dock.innerHTML=[['home','⌂','Início'],['films','▣','Filmes'],['series','▤','Séries'],['music','♫','Música'],['community','◎','Comunidade']].map(([v,i,l])=>`<button type="button" data-v42-route="${v}" class="${cur===v||(cur==='community'&&v==='community')?'active':''}"><span>${i}</span>${l}</button>`).join('');
  document.body.appendChild(dock);
}
function overflowGuard(){
  const bad=document.documentElement.scrollWidth>window.innerWidth+12;
  document.documentElement.classList.toggle('lx-overflow-guard',bad);
  if(bad)document.documentElement.style.overflowX='hidden';
}
function wire(){
  crossNav();mobileDock();overflowGuard();
  const musicLogo=document.querySelector('.lx-music-top [data-view="home"]');
  if(musicLogo)musicLogo.setAttribute('title','Voltar para a LX Plus');
  const back=document.querySelector('.lx-music-top .lx-circle[data-view="home"]');
  if(back)back.setAttribute('title','Voltar para Início / Filmes');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-v42-route]');if(!b)return;
  e.preventDefault();
  const v=b.dataset.v42Route;
  if(v==='community'){
    const existing=document.querySelector('[data-community]');
    if(existing){existing.click();return;}
    route('community');return;
  }
  route(v);
});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){
    e.preventDefault();
    const i=document.querySelector('.lx-csearch,.lx-search input,.lx-music-search input,.lx-admin-search input');
    if(i&&i.focus)i.focus();
  }
  if(e.key==='Escape'){
    const close=document.querySelector('[data-close]');if(close)close.click();
  }
});
window.addEventListener('popstate',()=>location.reload());
window.addEventListener('resize',()=>requestAnimationFrame(overflowGuard),{passive:true});
new MutationObserver(()=>requestAnimationFrame(wire)).observe(root,{childList:true,subtree:true});
wire();
})();