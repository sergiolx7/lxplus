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
  let palette=null;
  function ensurePalette(){
    if(palette)return palette;
    installToastStyles();
    palette=document.createElement('section');palette.className='lx40-command-palette hidden';palette.setAttribute('role','dialog');palette.setAttribute('aria-modal','true');palette.setAttribute('aria-label','Comandos do LX Admin');
    palette.innerHTML='<div class="lx40-command-box"><div class="lx40-command-head"><span>LX ADMIN</span><kbd>ESC</kbd></div><input type="search" class="lx40-command-search" placeholder="O que você quer fazer?" aria-label="Buscar comando"><div class="lx40-command-results" role="listbox"></div><small>Use Ctrl + K para abrir esta paleta.</small></div>';
    document.body.appendChild(palette);
    palette.addEventListener('click',event=>{if(event.target===palette)closePalette()});
    palette.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closePalette()} });
    palette.querySelector('.lx40-command-search').addEventListener('input',renderCommands);
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
    results.innerHTML=commands.map((item,index)=>({item,index})).filter(({item})=>!q||`${item.label} ${item.hint}`.toLocaleLowerCase('pt-BR').includes(q)).map(({item,index})=>`<button type="button" role="option" class="lx40-command-item" data-command="${index}"><span class="lx40-command-icon" aria-hidden="true">${item.icon}</span><span><strong>${item.label}</strong><small>${item.hint}</small></span><kbd>↵</kbd></button>`).join('')||'<p class="lx40-command-empty">Nenhum comando encontrado.</p>';
  }
  function openPalette(){
    if(!isAdmin())return false;
    const el=ensurePalette();el.classList.remove('hidden');el.querySelector('.lx40-command-search').value='';renderCommands();requestAnimationFrame(()=>el.querySelector('.lx40-command-search').focus());return true;
  }
  function closePalette(){if(!palette)return;palette.classList.add('hidden')}
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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchRanking,{once:true});else watchRanking();
  document.addEventListener('lx:music-closed',()=>setExpanded(false));
})();
