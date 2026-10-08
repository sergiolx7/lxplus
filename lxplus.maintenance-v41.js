/* Maintenance is a presentation gate; account permissions remain enforced by the database. */
(()=>{'use strict';
 const root=document.documentElement,LX=window.LX=window.LX||{};
 let login=false,previous='',wrapped=false;
 const active=()=>!(location.hostname==='127.0.0.1'&&window.__LX_QA_MAINTENANCE_DISABLED===true)&&LX.data?.branding?.()?.maintenance?.enabled!==false;
 const admin=()=>LX.cloud?.isAdmin?.()===true&&!!LX.cloud?.user?.();
 function sync(){const locked=active()&&!admin();
  root.classList.toggle('lx-maintenance-active',locked);root.classList.toggle('lx-maintenance-login',locked&&login&&LX.state?.screen==='auth');
  const key=String(locked)+':'+String(login);if(key!==previous){previous=key;window.dispatchEvent(new CustomEvent('lx:maintenance-state',{detail:{active:locked}}));}
  if(!wrapped&&LX.ui?.show){wrapped=true;const original=LX.ui.show;LX.ui.show=function(id){if(id!=='auth')login=false;const out=original.call(this,id);sync();return out;};LX.show=LX.ui.show;}
 }
 function signIn(){login=true;LX.ui?.show?.('auth');LX.ui?.authTab?.('login');sync();document.getElementById('loginEmail')?.focus();}
 document.getElementById('lxMaintenanceSignIn')?.addEventListener('click',signIn);
 document.getElementById('lx41MaintenanceBack')?.addEventListener('click',()=>{login=false;sync();});
 async function setEnabled(enabled){if(!admin())return LX.toast?.('Entre com uma conta ADM.');
  const value={...(LX.data.branding?.()||{}),maintenance:{enabled:!!enabled,updatedAt:new Date().toISOString()}};
  try{await LX.cloud.saveBranding(value);sync();document.querySelector('[data-lx41-maintenance]')?.remove();mountAdmin();LX.toast?.(enabled?'Manutenção ativada.':'Site reaberto.');}catch{LX.toast?.('Não foi possível salvar. Tente novamente.');}
 }
 function mountAdmin(){const main=document.getElementById('adminMain');if(!admin()||!main||LX.state?.adminPage!=='settings'||main.querySelector('[data-lx41-maintenance]'))return;
  const box=document.createElement('section');box.className='lx41-maint-admin-card';box.dataset.lx41Maintenance='';box.innerHTML=`<h2>Manutenção LX Plus</h2><p>${active()?'A tela de manutenção está ativa para os visitantes. O ADM e as importações automáticas continuam funcionando.':'O site está aberto para os usuários.'}</p><button type="button">${active()?'Reabrir o site':'Ativar manutenção'}</button>`;box.querySelector('button').onclick=()=>setEnabled(!active());main.appendChild(box);
 }
 LX.maintenance={active,sync,setEnabled};sync();setInterval(()=>{sync();mountAdmin();},750);
 window.addEventListener('lx:catalog-state',sync);window.addEventListener('storage',sync);
})();
