import {db,notices} from '../data.js';
import {personalNotices} from '../services.js';
import {notificationOptions,notificationSettings,notificationDestination} from '../notification-settings.js';
import {esc,dateTime,empty,checked,icon} from '../ui.js';
const socialKinds=new Set(['message','group_message','friend','friend_request','friend_accepted','call','mention','comment','like']);
export async function mount(host,ctx){
 let alive=true,rows=[],global=[],filter='Todas',busy=false,settingsBusy=false;
 host.innerHTML='<div class="module-heading"><span class="premium-overline">SUAS CONEXÕES, EM DIA</span><h1>Central de notificações.</h1><p data-notice-count>Carregando notificações…</p></div><details class="panel notification-preferences"><summary>Preferências de notificações</summary><div data-notice-settings role="status">Carregando suas preferências…</div></details><div class="module-toolbar"><div class="section-tabs">'+['Todas','Não lidas','Comunidade','Sistema'].map(t=>'<button data-notice-filter="'+t+'" aria-pressed="false">'+t+'</button>').join('')+'</div><div class="actions"><button class="btn small" data-notice-refresh>Atualizar</button><button class="btn small" data-read-all disabled>Marcar todas como lidas</button></div></div><div class="notifications-list"></div><section class="panel"><span class="premium-overline">DIRETO DA EQUIPE</span><h2>Comunicados da LX Group</h2><div data-global-notices></div></section>';
 function draw(){
  if(!alive)return;
  const unread=rows.filter(r=>!r.read_at).length,visible=rows.filter(r=>filter==='Não lidas'?!r.read_at:filter==='Comunidade'?socialKinds.has(r.kind):filter==='Sistema'?!socialKinds.has(r.kind):true);
  host.querySelector('[data-notice-count]').textContent=unread+' não lidas entre as últimas '+rows.length+' notificações.';
  host.querySelector('[data-read-all]').disabled=!unread;
  host.querySelectorAll('[data-notice-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.noticeFilter===filter);b.setAttribute('aria-pressed',String(b.dataset.noticeFilter===filter))});
  let lastGroup='';
  host.querySelector('.notifications-list').innerHTML=visible.map(n=>{
   const day=new Date(n.created_at),today=new Date();today.setHours(0,0,0,0);const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);const group=day>=today?'Hoje':day>=yesterday?'Ontem':'Anteriores';
   const heading=group!==lastGroup?'<h2 class="notification-date-label">'+group+'</h2>':'';lastGroup=group;
   const target=notificationDestination(n);
   return heading+'<article class="notification-card '+(!n.read_at?'unread':'')+'"><span class="notification-symbol">'+icon(['message','group_message'].includes(n.kind)?'chat':socialKinds.has(n.kind)?'social':'bell')+'</span><div><small class="notice-kind">'+(socialKinds.has(n.kind)?'Comunidade':'LX Plus')+'</small><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><small>'+dateTime(n.created_at)+'</small><div class="notification-actions">'+(target?'<button class="link" data-notice-open="'+n.id+'">'+(['message','group_message'].includes(n.kind)?'Abrir conversa':target.term==='calls'?'Ver chamadas':target.page==='Comunidade'?'Abrir comunidade':'Abrir suporte')+' ↗</button>':'')+'</div></div>'+(!n.read_at?'<button class="btn small" data-notice-read="'+n.id+'">Marcar como lida</button>':'')+'</article>';
  }).join('')||empty('Tudo em dia.','As novas notificações desta categoria aparecerão aqui.');
  host.querySelector('[data-global-notices]').innerHTML=global.length?global.map(n=>'<div class="notice"><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><small>'+dateTime(n.created_at)+'</small></div>').join(''):'<p>Sem novos comunicados.</p>';
 }
 async function load(){if(busy)return;busy=true;try{[rows,global]=await Promise.all([personalNotices(),notices()]);draw();ctx.refreshNotifications?.()}finally{busy=false}}
 async function loadSettings(){
  const area=host.querySelector('[data-notice-settings]');
  try{const result=await notificationSettings();if(!alive)return;
   area.innerHTML='<form id="notificationPreferencesForm"><p class="muted">Estas opções valem para novos avisos em todos os seus aparelhos. Os avisos antigos e os comunicados da equipe continuam disponíveis.</p><fieldset>'+notificationOptions.map(([key,label,description])=>'<label class="notification-option"><span><strong>'+label+'</strong><small>'+description+'</small></span><input type="checkbox" name="'+key+'" '+(result.preferences[key]?'checked':'')+'></label>').join('')+'</fieldset><p class="muted">Você também pode pausar os avisos de uma conversa no cabeçalho do chat.</p><button type="submit" class="btn primary">Salvar preferências</button><p data-settings-status role="status" aria-live="polite"></p></form>';
  }catch{if(alive)area.innerHTML='<p>Não foi possível carregar suas preferências.</p><button class="btn small" data-retry-settings>Tentar novamente</button>'}
 }
 async function mark(id){let q=db.from('lx_user_notifications').update({read_at:new Date().toISOString()}).eq('user_id',ctx.user.id).is('read_at',null);if(id)q=q.eq('id',Number(id));await checked(q)}
 host.addEventListener('submit',async e=>{
  if(e.target.id!=='notificationPreferencesForm')return;e.preventDefault();if(settingsBusy)return;settingsBusy=true;
  const form=e.target,fields=form.querySelector('fieldset'),button=form.querySelector('button'),status=form.querySelector('[data-settings-status]');
  const data=Object.fromEntries(notificationOptions.map(([key])=>[key,form.elements[key].checked]));fields.disabled=true;button.disabled=true;status.textContent='Salvando…';
  try{await notificationSettings('save',data);if(alive)status.textContent='Preferências salvas na sua conta.'}catch(error){if(alive)status.textContent='Não foi possível salvar. Tente novamente.';ctx.toast(error.message)}finally{settingsBusy=false;if(alive){fields.disabled=false;button.disabled=false}}
 });
 host.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
  if(b.dataset.noticeFilter){filter=b.dataset.noticeFilter;draw();return}
  if(b.hasAttribute('data-retry-settings')){b.disabled=true;await loadSettings();return}
  if(b.hasAttribute('data-notice-refresh')){await load();return}
  if(b.dataset.noticeRead||b.hasAttribute('data-read-all')){b.disabled=true;await mark(b.dataset.noticeRead);await load();return}
  if(b.dataset.noticeOpen){const row=rows.find(r=>String(r.id)===b.dataset.noticeOpen),target=notificationDestination(row);if(!target)return;if(!row.read_at)await mark(row.id);ctx.refreshNotifications?.();ctx.navigate?.(target.page,{term:target.term})}
 }catch(error){if(b.isConnected)b.disabled=false;ctx.toast(error.message)}});
 const channel=db.channel('notices-page-'+ctx.user.id).on('postgres_changes',{event:'*',schema:'public',table:'lx_user_notifications',filter:'user_id=eq.'+ctx.user.id},()=>load().catch(()=>{})).subscribe();
 await Promise.all([load(),loadSettings()]);return{destroy(){alive=false;db.removeChannel(channel)}};
}
