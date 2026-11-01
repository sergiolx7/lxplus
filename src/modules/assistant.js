import {db,itemFrom} from '../data.js';
import {esc,empty,checked} from '../ui.js';
import {premiumCard} from '../premium-ui.js';
import {assistantHelp,assistantError,assistantHistory} from '../assistant-tools.js';
export async function mount(host,ctx){
 const history=assistantHistory(ctx.user.id),saved=history.read();
 let alive=true,busy=false,messages=saved.messages,remember=saved.consent,items=[],online=false,draft='',error='',controller=null,helpLink=null,generation=0;
 const prompts=['Quero músicas calmas para estudar','Me indique um filme de suspense','Quero descobrir um livro','Como personalizo os LEDs?'];
 function draw(){
  if(!alive)return;
  host.innerHTML='<div class="module-heading"><span class="premium-overline">LX IA · SEU UNIVERSO, MAIS PERTO</span><h1>O que combina com seu momento?</h1><p>Encontre uma nova história ou descubra como aproveitar melhor a sua LX Plus.</p></div><div class="ai-layout"><section class="panel ai-console"><div class="ai-messages" aria-live="polite" aria-busy="'+busy+'">'+(!messages.length?'<div class="ai-welcome"><span class="premium-overline">PODE PERGUNTAR</span><h2>Uma boa descoberta começa aqui.</h2><p>Conte o que gostaria de ouvir, assistir ou ler. Também posso ajudar com os controles e as preferências da plataforma.</p><div class="ai-prompts">'+prompts.map(q=>'<button type="button" data-ai-prompt="'+esc(q)+'">✦ '+esc(q)+'</button>').join('')+'</div></div>':messages.map(m=>'<article class="ai-message '+m.role+'"><strong>'+(m.role==='user'?'Você':'LX IA')+'</strong><p>'+esc(m.text)+'</p></article>').join(''))+(busy?'<p class="muted" role="status">Consultando seu pedido…</p>':'')+'</div>'+(helpLink?'<button type="button" class="btn" data-page="'+helpLink.page+'">'+helpLink.label+'</button>':'')+'<form id="aiForm" class="form"><label class="field">O que você procura?<textarea name="message" maxlength="5000" required placeholder="Uma música, uma história ou uma dúvida…">'+esc(draft)+'</textarea></label><button class="btn primary" '+(busy?'disabled':'')+'>'+(busy?'Consultando…':'Enviar pedido ✦')+'</button></form><p id="aiError" role="alert">'+esc(error)+'</p><label class="setting-toggle"><span>Usar IA online neste pedido<small>Envia sua pergunta e metadados do catálogo publicado à OpenAI. O modo padrão consulta o catálogo sem esse envio.</small></span><input id="aiOnline" type="checkbox" '+(online?'checked':'')+' '+(busy?'disabled':'')+'></label><label class="setting-toggle"><span>Guardar esta conversa neste aparelho<small>Opcional e separado por conta. O histórico não é enviado ao modo online.</small></span><input id="aiRemember" type="checkbox" '+(remember?'checked':'')+'></label><div class="actions"><button type="button" class="link" data-ai-clear '+(busy?'disabled':'')+'>Limpar conversa deste aparelho</button><button type="button" class="link" data-page="Suporte">Central de suporte</button></div></section><aside class="ai-privacy"><span class="premium-overline">VOCÊ NO CONTROLE</span><h3>Descobertas reais.</h3><p>As recomendações consultam até 80 conteúdos publicados recentemente, conforme suas permissões. Os cartões são conferidos novamente antes de aparecer.</p><p>Pedidos sobre aparência, privacidade e controles podem receber ajuda local, sem envio à IA online.</p><p>A LX IA orienta você. Alterações na conta e ações administrativas continuam nos controles autorizados da plataforma.</p></aside></div>'+(items.length?'<section class="ai-recommendations"><div class="music-result-heading"><h3>Encontrei na LX Plus</h3></div><div class="premium-grid">'+items.filter(x=>x.type!=='Música').map(card).join('')+'</div><div class="music-result-list">'+items.filter(x=>x.type==='Música').map(card).join('')+'</div></section>':'');
 }
 function card(item){return premiumCard(item).replace('data-item=','data-ai-item=')}
 function persist(){history.save(remember,messages)}
 host.addEventListener('input',e=>{if(e.target.name==='message')draft=e.target.value});
 host.addEventListener('change',e=>{if(e.target.id==='aiOnline')online=e.target.checked;if(e.target.id==='aiRemember'){remember=e.target.checked;persist()}});
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-ai-clear')&&!busy){messages=[];items=[];helpLink=null;error='';history.clear();persist();draw()}if(b.dataset.aiItem)ctx.openItem(items.find(x=>String(x.id)===b.dataset.aiItem));if(b.dataset.aiPrompt&&!busy){draft=b.dataset.aiPrompt;draw();host.querySelector('#aiForm textarea')?.focus()}});
 host.addEventListener('submit',async e=>{
  if(e.target.id!=='aiForm')return;e.preventDefault();if(busy)return;
  const message=String(new FormData(e.target).get('message')||'').trim();if(!message)return;
  const token=++generation,useOnline=online;busy=true;error='';items=[];helpLink=null;
  if(messages.at(-1)?.role!=='user'||messages.at(-1).text!==message)messages.push({role:'user',text:message});messages=messages.slice(-12);persist();draw();
  controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),24000);
  try{
   const local=assistantHelp(message);
   if(local){helpLink=local;messages.push({role:'assistant',text:local.text})}
   else {
    const response=await db.functions.invoke('lx-ai',{body:{message,useOnline},signal:controller.signal});
    if(response.error||response.data?.error){let code=response.data?.error;try{code||=(await response.error?.context?.json())?.error}catch{}throw Error(assistantError(code))}
    if(response.data?.protocol!==2)throw Error('A atualização da LX IA ainda precisa ser liberada no servidor.');
    const ids=[...new Set((response.data.recommendations||[]).map(x=>String(x.id)).filter(x=>/^\d+$/.test(x)))].slice(0,5);
    const rows=ids.length?await checked(db.from('lx_catalog').select('id,payload,published').in('id',ids).eq('published',true)):[];
    if(!alive||token!==generation)return;
    items=rows.map(itemFrom).sort((a,b)=>ids.indexOf(String(a.id))-ids.indexOf(String(b.id)));
    messages.push({role:'assistant',text:String(response.data.answer||'Não encontrei conteúdo compatível na seleção consultada.')});
   }
   if(!alive||token!==generation)return;
   if(draft.trim()===message)draft='';persist();
  }catch(failure){if(alive&&token===generation)error=controller.signal.aborted?'A consulta demorou para responder. Seu texto foi mantido para tentar novamente.':failure.message||assistantError()}
  finally{clearTimeout(timer);if(alive&&token===generation){controller=null;busy=false;draw();host.querySelector('#aiForm textarea')?.focus()}}
 });
 draw();return{destroy(){alive=false;++generation;controller?.abort()}};
}
