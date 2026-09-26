(()=>{'use strict';
const root=document.getElementById('lxRoot');
if(!root)return;
const current=()=>new URLSearchParams(location.search).get('view')||'home';
const route=v=>{const u=new URL(location.href);u.searchParams.set('preview','1');u.searchParams.set('view',v);location.href=u.pathname+'?'+u.searchParams.toString()};
function mobileDock(){
  if(document.querySelector('.lx-mobile-dock'))return;
  const cur=current();
  const dock=document.createElement('nav');
  dock.className='lx-mobile-dock';
  dock.setAttribute('aria-label','Navegação mobile');
  dock.innerHTML=[['home','⌂','Início'],['films','▣','Filmes'],['series','▤','Séries'],['music','♫','Música'],['community','◎','Comunidade']].map(([v,i,l])=>`<button type="button" data-v42-route="${v}" class="${cur===v?'active':''}"><span>${i}</span>${l}</button>`).join('');
  document.body.appendChild(dock);
}
function overflowGuard(){
  const bad=document.documentElement.scrollWidth>window.innerWidth+12;
  document.documentElement.classList.toggle('lx-overflow-guard',bad);
  document.documentElement.style.overflowX=bad?'hidden':'';
}
function syncViewState(){
  const cur=current();
  document.body.dataset.lxView=cur;
  const drawer=document.querySelector('.lx-community');
  document.body.classList.toggle('lx-community-open',!!drawer);
  if(drawer){drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-hidden','false')}
  const logo=document.querySelector('.lx-music-top [data-view="home"]');
  if(logo){logo.title='Voltar para a LX Plus';logo.setAttribute('aria-label','Voltar para a LX Plus')}
  const circles=[...document.querySelectorAll('.lx-music-top .lx-circle')];
  if(circles[0]){circles[0].title='Voltar para Início';circles[0].setAttribute('aria-label','Voltar para Início')}
  if(circles[1]&&!circles[1].dataset.view){circles[1].dataset.v42Route='films';circles[1].title='Ir para Filmes';circles[1].setAttribute('aria-label','Ir para Filmes')}
  document.querySelectorAll('.lx-mobile-dock [data-v42-route]').forEach(b=>b.classList.toggle('active',b.dataset.v42Route===(drawer?'community':cur)));
}
function wire(){mobileDock();syncViewState();overflowGuard()}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-v42-route]');if(!b)return;
  e.preventDefault();
  const v=b.dataset.v42Route;
  if(v==='community'){
    const existing=document.querySelector('[data-community]');
    if(existing){existing.click();requestAnimationFrame(syncViewState);return}
  }
  route(v);
});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){
    e.preventDefault();
    const i=document.querySelector('.lx-search input,.lx-music-search input,.lx-admin-search input');
    if(i)i.focus();
  }
  if(e.key==='Escape'){
    const close=document.querySelector('.lx-community [data-close]');if(close)close.click();
  }
});
window.addEventListener('popstate',()=>location.reload());
window.addEventListener('resize',()=>requestAnimationFrame(overflowGuard),{passive:true});
new MutationObserver(()=>requestAnimationFrame(wire)).observe(root,{childList:true,subtree:true});
wire();
})();