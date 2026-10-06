/* LX Plus — central de ajuda e atendimento humano. Um controlador para usuários e ADM. */
(()=>{'use strict';
 const LX=window.LX,topics={
  'Música':'Confira a conexão e abra novamente a faixa. Para MP3 do catálogo, use Tentar novamente no player. Se o erro continuar, envie o nome da música ao ADM.',
  'Vídeos e TV':'Para assistir na TV, use Transmitir no player em um dispositivo compatível, na mesma rede. Em outras TVs, use o navegador da TV para abrir a LX Plus.',
  'Conta e perfil':'Abra Meu perfil para atualizar seus dados. Se não conseguir entrar, use Esqueci a senha na tela de acesso.',
  'Comunidade':'Confira sua conexão. A conversa fica disponível ao reabrir a Comunidade; se estiver saindo sozinha, informe o aparelho e o navegador.',
  'Outro assunto':'Descreva o que aconteceu e um ADM poderá continuar esta conversa.'
 };
 const state={owner:'',tickets:[],messages:[],active:null,topic:'',busy:false,error:'',loading:false,channel:null,timer:null,names:{}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const uid=()=>String(LX.cloud?.user?.()?.id||LX.ui?.state?.user?.id||'');
 const client=()=>LX.cloud?.db?.();
 const wait=(promise,ms=9000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo esgotado. Confira a conexão.')),ms))]);
 function resetOwner(){
  const user=uid();if(state.owner===user)return;
  if(state.channel)client()?.removeChannel(state.channel).catch(()=>{});
  state.owner=user;state.tickets=[];state.messages=[];state.active=null;state.topic='';state.error='';state.names={};state.channel=null;
 }
 function error(err){state.error=String(err?.message||err||'Atendimento indisponível.').slice(0,240);console.warn('LX suporte',err);draw()}
 function ticket(){return state.tickets.find(x=>String(x.id)===String(state.active))}
 function status(text=''){for(const e of document.querySelectorAll('[data-support-status]'))e.textContent=state.error||text||''}
 function panelHTML(){return '<header><div><small>LX PLUS</small><h2>Central de ajuda</h2></div><button type="button" data-help="close" aria-label="Fechar">×</button></header><div class="lx-support-content"><div data-help-topics></div><div data-help-tickets></div><div class="lx-nova-ai-log" data-help-log role="log" aria-live="polite"></div><form data-help-form><textarea maxlength="4000" rows="2" placeholder="Descreva o que precisa…" aria-label="Mensagem para o ADM" required></textarea><button type="submit">Enviar</button></form><output data-support-status role="status"></output></div>'}
 function draw(){
  const t=ticket();for(const root of document.querySelectorAll('[data-help-root]')){
   const admin=root.dataset.helpRoot==='admin',topicsNode=root.querySelector('[data-help-topics]'),ticketsNode=root.querySelector('[data-help-tickets]'),log=root.querySelector('[data-help-log]'),form=root.querySelector('[data-help-form]');
   if(!admin&&topicsNode)topicsNode.innerHTML='<h3>Em que podemos ajudar?</h3><div class="lx-support-topics">'+Object.keys(topics).map(x=>`<button type="button" data-help="topic" data-topic="${esc(x)}" class="${state.topic===x?'active':''}">${esc(x)}</button>`).join('')+'</div>'+(state.topic?`<p class="lx-support-answer">${esc(topics[state.topic])}</p><button class="primary-btn" type="button" data-help="start">Conversar com o ADM sobre ${esc(state.topic)}</button>`:'<p>Escolha um assunto para ver uma resposta imediata ou conversar com o ADM.</p>');
   if(ticketsNode){const rows=admin?state.tickets:state.tickets.filter(x=>String(x.user_id)===uid());ticketsNode.innerHTML='<h3>'+(admin?'Conversas com usuários':'Minhas conversas')+'</h3>'+(rows.length?'<div class="lx-support-tickets">'+rows.map(x=>`<button type="button" data-help="ticket" data-id="${x.id}" class="${String(state.active)===String(x.id)?'active':''}"><b>${esc(x.topic)}</b><small>${admin?esc(state.names[x.user_id]||String(x.user_id).slice(0,8))+' · ':''}${x.status==='open'?'Aguardando atendimento':'Encerrado'}</small></button>`).join('')+'</div>':`<p>${state.loading?'Carregando…':admin?'Nenhum chamado ainda.':'Nenhuma conversa iniciada.'}</p>`)+(admin&&t?`<button type="button" data-help="status">${t.status==='open'?'Encerrar':'Reabrir'} chamado</button>`:'')}
   if(log){log.replaceChildren();if(t){const title=document.createElement('p');title.className='lx-support-conversation-title';title.textContent=`${t.topic} · ${t.status==='open'?'Conversa aberta':'Encerrada'}`;log.append(title);for(const msg of state.messages){const node=document.createElement('div');node.className=`lx-nova-ai-message ${msg.author_id===uid()?'me':''}`;node.textContent=msg.body;log.append(node)}}else{const placeholder=document.createElement('p');placeholder.textContent=admin?'Selecione um chamado para responder.':'Escolha um assunto ou reabra uma conversa acima.';log.append(placeholder)}log.scrollTop=log.scrollHeight}
   if(form){form.hidden=admin?!t||t.status!=='open':!!t&&t.status!=='open';form.querySelector('button').disabled=state.busy;form.querySelector('button').textContent=state.busy?'Enviando…':'Enviar';form.querySelector('textarea').placeholder=t?'Digite sua mensagem…':'Descreva o problema para iniciar a conversa…'}
  }
  status()
 }
 async function loadTickets({quiet=false}={}){
  resetOwner();if(!uid())throw new Error('Entre na sua conta para conversar com o suporte.');
  const db=client();if(!db)throw new Error('A nuvem está indisponível.');if(!quiet){state.loading=true;draw()}
  try{const {data,error:dbError}=await wait(db.from('lx_support_tickets').select('id,user_id,topic,status,created_at,updated_at').order('updated_at',{ascending:false}).limit(100));if(dbError)throw dbError;
   if(!uid()||state.owner!==uid())return;state.tickets=data||[];
   if(state.active&&!state.tickets.some(x=>String(x.id)===String(state.active))){state.active=null;state.messages=[]}
   const ids=[...new Set(state.tickets.map(x=>x.user_id))];if(LX.ui?.state?.user?.admin&&ids.length){try{const profiles=await wait(db.from('lx_profiles').select('user_id,name').in('user_id',ids),6000);if(!profiles.error)state.names=Object.fromEntries((profiles.data||[]).map(x=>[x.user_id,x.name]))}catch{}}
   if(state.active)await loadMessages(state.active,true);state.error='';draw()
  }finally{state.loading=false;draw()}
 }
 async function loadMessages(id,quiet=false){
  const db=client();if(!db)throw new Error('Nuvem indisponível.');state.active=Number(id);if(!quiet){state.loading=true;draw()}
  try{const {data,error:dbError}=await wait(db.from('lx_support_messages').select('id,ticket_id,author_id,body,created_at').eq('ticket_id',state.active).order('created_at',{ascending:true}).limit(200));if(dbError)throw dbError;
   if(String(id)===String(state.active)){state.messages=data||[];state.error='';draw()}
  }finally{state.loading=false;draw()}
 }
 async function start(){
  if(state.busy)return;resetOwner();if(!state.topic)return error(new Error('Escolha um assunto primeiro.'));
  const db=client();if(!db)return error(new Error('Nuvem indisponível. Tente novamente mais tarde.'));
  state.busy=true;state.error='';draw();status('Abrindo conversa com o ADM…');
  try{const {data, error:dbError}=await wait(db.from('lx_support_tickets').insert({user_id:uid(),topic:state.topic}).select('id,user_id,topic,status,created_at,updated_at').single());if(dbError)throw dbError;
   state.tickets.unshift(data);state.active=data.id;state.messages=[];state.topic='';draw();document.querySelector('#lxNovaAIPanel [data-help-form] textarea')?.focus()
  }catch(err){error(err)}finally{state.busy=false;draw()}
 }
 async function send(value){
  if(state.busy)return;const body=String(value||'').trim();if(!body)return;resetOwner();const db=client();if(!db)return error(new Error('Nuvem indisponível. Mensagem não enviada.'));
  try{if(!ticket()){if(!state.topic)throw new Error('Escolha um assunto antes de enviar.');await start();if(!ticket())throw new Error(state.error||'Não foi possível abrir o chamado.')}
   state.busy=true;state.error='';draw();status('Enviando mensagem…');
   const {error:dbError}=await wait(db.from('lx_support_messages').insert({ticket_id:state.active,author_id:uid(),body}));if(dbError)throw dbError;
   const {error:updateError}=await wait(db.from('lx_support_tickets').select('id').eq('id',state.active).single(),6000);if(updateError)throw updateError;
   await loadMessages(state.active,true);status('Mensagem enviada ao suporte.')
  }catch(err){error(err);throw err}finally{state.busy=false;draw()}
 }
 async function toggleStatus(){const t=ticket();if(!t||!LX.ui?.state?.user?.admin)return;try{const next=t.status==='open'?'closed':'open',db=client(),{error:dbError}=await wait(db.from('lx_support_tickets').update({status:next,updated_at:new Date().toISOString()}).eq('id',t.id));if(dbError)throw dbError;t.status=next;draw()}catch(err){error(err)}}
 function bind(root){
  root.onclick=e=>{const node=e.target.closest('[data-help]');if(!node||!root.contains(node))return;const action=node.dataset.help;if(action==='close')root.remove();else if(action==='topic'){state.topic=node.dataset.topic;draw()}else if(action==='start')start();else if(action==='ticket')loadMessages(node.dataset.id).catch(error);else if(action==='status')toggleStatus()};
  root.querySelector('[data-help-form]').onsubmit=async e=>{e.preventDefault();const input=e.currentTarget.querySelector('textarea'),body=input.value;try{await send(body);input.value=''}catch{}};
  root.querySelector('[data-help-form] textarea').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form.requestSubmit()}};
  draw();loadTickets().catch(error);ensureUpdates()
 }
 function ensureUpdates(){
  if(state.timer)return;state.timer=setInterval(()=>{if(!document.querySelector('[data-help-root]'))return;loadTickets({quiet:true}).catch(error)},7000);
  const db=client();if(!db||!uid()||state.channel)return;
  state.channel=db.channel('lx-support-'+uid()).on('postgres_changes',{event:'*',schema:'public',table:'lx_support_tickets'},()=>loadTickets({quiet:true}).catch(error)).on('postgres_changes',{event:'INSERT',schema:'public',table:'lx_support_messages'},e=>{if(String(e.new?.ticket_id)===String(state.active))loadMessages(state.active,true).catch(error);else loadTickets({quiet:true}).catch(error)}).subscribe()
 }
 function open(){
  resetOwner();let panel=document.getElementById('lxNovaAIPanel');if(panel){panel.remove();return}
  panel=document.createElement('aside');panel.id='lxNovaAIPanel';panel.className='lx-nova-ai-panel lx-support-panel';panel.dataset.helpRoot='user';panel.setAttribute('aria-label','Central de ajuda LX Plus');panel.innerHTML=panelHTML();document.body.append(panel);bind(panel)
 }
 function renderAdmin(root){
  resetOwner();root.innerHTML='<div class="lx-nova-heading"><span>ATENDIMENTO</span><h1>Suporte LX Plus</h1><p>Respostas rápidas para usuários e conversa humana quando solicitada.</p></div><section class="lx-nova-ai-page lx-support-admin" data-help-root="admin"><div data-help-topics hidden></div><div data-help-tickets></div><div class="lx-nova-ai-log" data-help-log role="log" aria-live="polite"></div><form data-help-form><textarea rows="2" maxlength="4000" placeholder="Responder ao usuário…" required></textarea><button type="submit">Enviar resposta</button></form><output data-support-status role="status"></output></section>';
  bind(root.querySelector('[data-help-root]'))
 }
 LX.support={open,renderAdmin,refresh:()=>loadTickets().catch(error)};
})();
