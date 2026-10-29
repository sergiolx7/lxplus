// Admin diagnostics: on-demand, read-only queries; all rows remain under Supabase RLS.
// This module never tries to infer true live user counts from analytics events.
export async function loadDashboardMetrics(db){
 const since=new Date(Date.now()-7*86400000).toISOString();
 const start24h=new Date(Date.now()-86400000).toISOString();
 const [errors,events,jobs,tickets]=await Promise.allSettled([
  db.from('lx_client_errors').select('id,created_at,error_type,page,message').gte('created_at',since).order('created_at',{ascending:false}).limit(250),
  db.from('lx_analytics').select('id,user_id,event,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(500),
  db.from('lx_auto_jobs').select('kind,enabled,status,last_run_at,last_error').limit(20),
  db.from('lx_support_tickets').select('id,status,updated_at').order('updated_at',{ascending:false}).limit(50)
 ]);
 function usable(x){return x.status==='fulfilled'&&!x.value.error?x.value.data||[]:null}
 const er=usable(errors),ev=usable(events),job=usable(jobs),ticket=usable(tickets);
 const trend=new Map();
 for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);trend.set(d,{day:d,errors:0,events:0})}
 for(const e of er||[]){const day=String(e.created_at||'').slice(0,10);if(trend.has(day))trend.get(day).errors++}
 for(const e of ev||[]){const day=String(e.created_at||'').slice(0,10);if(trend.has(day))trend.get(day).events++}
 const unique24=ev===null?null:new Set(ev.filter(e=>e.created_at>=start24h&&e.user_id).map(e=>e.user_id)).size;
 return {
  periodDays:7,
  errorsCount:er?.length??null,eventsCount:ev?.length??null,
  uniqueActiveLast24h:unique24, // observed users in a capped event sample, NOT realtime presence.
  jobs:job||[], tickets:ticket||[], trend:[...trend.values()],
  errors:(er||[]).slice(0,25),
  failures:{errors:er===null,events:ev===null,jobs:job===null,tickets:ticket===null},
  truncated:{errors:(er?.length||0)>=250,events:(ev?.length||0)>=500}
 };
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n===null?'Indisponível':Number(n).toLocaleString('pt-BR');
function barChart(data){
 const max=Math.max(1,...data.map(x=>x.errors||0));
 return '<div class="health-bars" role="img" aria-label="Erros observados nos últimos sete dias">'+data.map(x=>
  '<div class="health-bar-col"><div class="health-bar-track"><div class="health-bar-fill" style="height:'+Math.round(100*x.errors/max)+'%"></div></div><strong>'+x.errors+'</strong><small>'+esc(x.day.slice(5))+'</small></div>'
 ).join('')+'</div>';
}
export function renderDashboardMetrics(m){
 if(!m)return '<div class="panel"><p>Abra o painel de diagnóstico para consultar o estado atual do site.</p><button class="btn primary" id="monitorRefresh">Carregar diagnóstico</button></div>';
 const open=m.tickets.filter(x=>!['closed','resolved'].includes(String(x.status||'').toLowerCase())).length;
 const failed=m.jobs.filter(x=>x.last_error||['error','failed'].includes(String(x.status||'').toLowerCase())).length;
 const stat=(heading,value,description)=>'<div class="panel health-stat"><small>'+esc(heading)+'</small><strong>'+esc(value)+'</strong><p>'+esc(description)+'</p></div>';
 return '<section class="health-dashboard"><div class="heading"><div><span class="premium-overline">SUPERVISÃO · LX PLUS</span><h2>Saúde da plataforma</h2><p>Dados de eventos e erros registrados; não equivale a uma medição contínua de disponibilidade.</p></div><button class="btn" type="button" id="monitorRefresh">Atualizar</button></div>'+
 '<div class="health-stats">'+stat('ERROS · 7 DIAS',fmt(m.errorsCount),m.truncated.errors?'Máximo de 250 eventos na amostra':'Eventos registrados')+
 stat('ATIVIDADE · 7 DIAS',fmt(m.eventsCount),m.truncated.events?'Máximo de 500 eventos na amostra':'Eventos registrados')+
 stat('USUÁRIOS COM EVENTO · 24H',fmt(m.uniqueActiveLast24h),'Contas distintas na amostra; não são usuários online')+
 stat('CHAMADOS PENDENTES',m.failures.tickets?'Indisponível':fmt(open),'Entre os 50 chamados mais recentes')+'</div>'+
 '<div class="health-layout"><div class="panel"><h3>Erros por dia</h3>'+barChart(m.trend)+
 '<p class="muted">Se não houver registros, o gráfico pode ficar zerado mesmo com falhas ainda não instrumentadas.</p></div>'+
 '<div class="panel"><h3>Automações</h3><p>'+m.jobs.length+' tarefas visíveis · '+failed+' sinalizadas com erro</p>'+
 (m.failures.jobs?'<p class="muted">Não foi possível ler as automações.</p>':m.jobs.map(j=>'<div class="health-job"><strong>'+esc(j.kind||'Tarefa')+'</strong><small>'+esc(j.status||'desconhecido')+' · '+(j.enabled?'Ativa':'Desativada')+'</small></div>').join(''))+'</div></div>'+
 '<div class="panel"><h3>Erros recentes</h3>'+
 (m.failures.errors?'<p>Os dados de erros não estão disponíveis para esta conta.</p>':m.errors.length?m.errors.slice(0,12).map(e=>'<div class="health-error"><strong>'+esc(e.error_type||'Falha')+'</strong><p>'+esc(String(e.message||'Sem detalhes').slice(0,160))+'</p><small>'+esc(e.page||'Página não informada')+' · '+esc(String(e.created_at||'').replace('T',' ').slice(0,16))+'</small></div>').join(''):'<p class="muted">Nenhuma falha registrada no período.</p>')+'</div>'+
 '<p class="muted">A visualização é protegida pelas regras administrativas do Supabase. A amostragem é limitada para evitar sobrecarga.</p></section>';
}
