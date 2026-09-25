/* LX Plus v40 interaction layer: non-destructive UI upgrades. */
(()=>{
  'use strict';
  const dock=()=>document.getElementById('musicDock');
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
  window.LXFloatingPlayer={expand:()=>setExpanded(true),collapse:()=>setExpanded(false),toggle,bind};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  document.addEventListener('lx:music-closed',()=>setExpanded(false));
})();
