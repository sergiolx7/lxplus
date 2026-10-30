import {db,notices} from '../data.js';
import {personalNotices} from '../services.js';
import {esc,dateTime,empty,checked,icon} from '../ui.js';
const socialKinds=new Set(['message','friend','friend_request','friend_accepted','call','mention','comment','like']);
const destination=kind=>socialKinds.has(kind)?'Comunidade':kind==='support'?'Suporte':null;
export async function mount(host,ctx){
 let alive=true,rows=[],global=[],filter='Todas',busy=false;
 function draw(){
  if(!alive)return;
  const unread=rows.filter(r=>!r.read_at).length,visible=rows.filter(r=>filter==='Não lidas'?!r.read_at:filter==='Comunidade'?socialKinds.has(r.kind):filter==='Sistema'?!socialKinds.has(r.kind):true);
  let lastGroup='';const cards=visible.map(n=>{
   const day=new Date(n.created_at),today=new Date();today.setHours(0,0,0,0);const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);const group=day>=today?'Hoje':day>=yesterday?'Ontem':'Anteriores';
   const heading=group!==lastGroup?'<h2 class="notification-date-label">'+group+'</h2>':'';lastGroup=group;
   const target=destination(n.kind);
   return heading+'<article class="notification-card '+(!n.read_at?'unread':'')+'"><span class="notification-symbol">'+icon(n.kind==='message'?'chat':socialKinds.has(n.kind)?'social':'bell')+'</span><div><small class="notice-kind">'+(socialKinds.has(n.kind)?'Comunidade':'LX Plus')+'</small><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><small>'+dateTime(n.created_at)+'</small><div class="notification-actions">'+(target?'<button class="link" data-notice-open="'+n.id+'">Abrir '+(target==='Comunidade'?'comunidade':'suporte')+' ↗</button>':'')+'</div></div>'+(!n.read_at?'<button class="btn small" data-notice-read="'+n.id+'">Marcar como lida</button>':'')+'</article>';
  }).join('');
  host.innerHTML='<div class="module-heading"><span class="premium-overline">SUAS CONEXÕES, EM DIA</span><h1>Central de notificações.</h1><p>'+unread+' não lidas entre as últimas '+rows.length+' notificações.</p></div><div class="module-toolbar"><div class="section-tabs">'+['Todas','Não lidas','Comunidade','Sistema'].map(t=>'<button data-notice-filter="'+t+'" class="'+(filter===t?'active':'')+'">'+t+'</button>').join('')+'</div><div class="actions"><button class="btn small" data-notice-refresh>Atualizar</button><button class="btn small" data-read-all '+(!unread?'disabled':'')+'>Marcar todas como lidas</button></div></div><div class="notifications-list">'+(cards||empty('Tudo em dia.','As novas notificações desta categoria aparecerão aqui.'))+'</div><section class="panel"><span class="premium-overline">DIRETO DA EQUIPE</span><h2>Comunicados da LX Group</h2>'+(global.length?global.map(n=>'<div class="notice"><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><small>'+dateTime(n.created_at)+'</small></div>').join(''):'<p>Sem novos comunicados.</p>')+'</section>';
 }
 async function load(){if(busy)return;busy=true;try{[rows,global]=await Promise.all([personalNotices(),notices()]);draw();ctx.refreshNotifications?.()}finally{busy=false}}
 async function mark(id){let q=db.from('lx_user_notifications').update({read_at:new Date().toISOString()}).eq('user_id',ctx.user.id).is('read_at',null);if(id)q=q.eq('id',Number(id));await checked(q)}
 host.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
  if(b.dataset.noticeFilter){filter=b.dataset.noticeFilter;draw();return}
  if(b.hasAttribute('data-notice-refresh')){await load();return}
  if(b.dataset.noticeRead||b.hasAttribute('data-read-all')){b.disabled=true;await mark(b.dataset.noticeRead);await load();return}
  if(b.dataset.noticeOpen){const row=rows.find(r=>String(r.id)===b.dataset.noticeOpen),target=destination(row?.kind);if(!target)return;if(!row.read_at)await mark(row.id);ctx.refreshNotifications?.();ctx.navigate?.(target)}
 }catch(error){if(b.isConnected)b.disabled=false;ctx.toast(error.message)}});
 const channel=db.channel('notices-page-'+ctx.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_user_notifications',filter:'user_id=eq.'+ctx.user.id},()=>load().catch(()=>{})).subscribe();await load();return{destroy(){alive=false;db.removeChannel(channel)}};
}
