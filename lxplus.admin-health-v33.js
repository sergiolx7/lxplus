/* LX Plus UI33 — read-only catalogue review for the existing ADM dashboard. */
((root)=>{'use strict';
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=value=>String(value??'').trim();
  const has=value=>!!text(value);
  const episodic=new Set(['Série','Anime','Dorama']);
  const mediaFor=item=>{
    if(item.type==='Filme')return has(item.mediaKey||item.demoMedia);
    if(episodic.has(item.type))return (item.episodes||[]).some(ep=>has(ep.mediaKey||ep.url));
    if(item.type==='Livro')return has(item.mediaKey||item.externalReadUrl)||(item.chapters||[]).length>0;
    if(item.type==='Música')return [item.mediaKey,item.authorizedAudioUrl,item.authorizedStreamUrl,...(item.tracks||[]).flatMap(t=>[t.mediaKey,t.authorizedAudioUrl,t.authorizedStreamUrl,t.url])].some(has);
    return true;
  };
  const duplicateKey=item=>[norm(item.type),norm(item.title),item.type==='Música'?norm(item.artist):norm(item.year)].join('|');

  function analyzeCatalog(items=[]){
    const rows=Array.isArray(items)?items:[],groups=new Map(),findings=[];
    for(const item of rows){
      if(!item||typeof item!=='object')continue;
      const key=duplicateKey(item);
      if(norm(item.title))groups.set(key,[...(groups.get(key)||[]),item]);
    }
    const add=(item,category,severity,message)=>findings.push({id:item.id,title:text(item.title)||'Sem título',type:text(item.type)||'Conteúdo',published:item.published!==false,category,severity,message});
    for(const item of rows){
      if(!item||typeof item!=='object')continue;
      const live=item.published!==false,level=live?'critical':'warning';
      if(!has(item.title))add(item,'content',level,'Falta o título.');
      if(!has(item.desc)&&!has(item.description))add(item,'content',live?'warning':'draft','Falta a descrição.');
      if(!has(item.genre))add(item,'content',live?'warning':'draft','Falta o gênero ou categoria.');
      if(!has(item.cover)&&!has(item.banner))add(item,'artwork',live?'warning':'draft','Falta a capa.');
      if(!mediaFor(item))add(item,'media',level,'Falta uma fonte de mídia ou arquivo.');
      if(episodic.has(item.type))for(const ep of item.episodes||[]){if(!has(ep.mediaKey||ep.url))add(item,'media',level,`Episódio S${Number(ep.season)||1} E${Number(ep.number)||'?'} sem vídeo.`)}
      if(item.type==='Música'&&mediaFor(item)){
        const refs=[item.mediaKey,item.authorizedAudioUrl,...(item.tracks||[]).flatMap(t=>[t.mediaKey,t.authorizedAudioUrl,t.url])].filter(has);
        if(refs.length&&refs.every(ref=>/^(?:spotify:|youtube:|https?:\/\/(?:open\.spotify\.com|(?:www\.)?(?:youtube\.com|youtu\.be)))/i.test(ref)))add(item,'external','warning','Somente player externo; confira a reprodução no app e em segundo plano.');
      }
      if(!live)add(item,'draft','draft','Rascunho: revisão e publicação pendentes.');
      if((groups.get(duplicateKey(item))||[]).length>1)add(item,'duplicate','warning','Possível duplicado com mesmo tipo, título e artista ou ano.');
    }
    return {total:rows.length,published:rows.filter(x=>x?.published!==false).length,drafts:rows.filter(x=>x?.published===false).length,critical:findings.filter(x=>x.severity==='critical').length,warnings:findings.filter(x=>x.severity==='warning').length,findings};
  }

  const csvCell=value=>{
    let s=String(value??'');
    if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  };
  function toCsv(report){return '\uFEFF'+[['ID','Tipo','Título','Publicado','Categoria','Prioridade','Pendência'],...(report.findings||[]).map(f=>[f.id,f.type,f.title,f.published?'Sim':'Não',f.category,f.severity,f.message])].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n'}

  const api={analyzeCatalog,toCsv};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(!root?.document)return;
  let current=null,filter='all',query='',busy=false;
  const $=id=>root.document.getElementById(id);
  const lx=()=>root.LX||{};
  const canEdit=()=>{const tab=root.document.querySelector('#adminNav [data-admin="movies"]');return !!tab&&!tab.disabled&&!tab.classList.contains('lx-role-hidden')};
  const visible=()=>!$('admin')?.classList.contains('hidden')&&lx().ui?.state?.adminPage==='dashboard'&&!!lx().ui?.state?.user?.admin;

  function draw(){
    const list=$('lxHealth33List'),count=$('lxHealth33Count');if(!list||!current)return;
    const rows=current.findings.filter(row=>(filter==='all'||(filter==='draft'?row.category==='draft':filter==='critical'?row.severity==='critical':row.category===filter))&&(!query||norm([row.title,row.type,row.message].join(' ')).includes(norm(query))));
    if(count)count.textContent=`${rows.length} pendência${rows.length===1?'':'s'}`;
    list.innerHTML=rows.slice(0,100).map(row=>`<article class="lx-health33-row"><span class="lx-health33-kind ${esc(row.severity)}">${row.severity==='critical'?'Corrigir':row.severity==='draft'?'Rascunho':'Revisar'}</span><div><strong>${esc(row.title)}</strong><small>${esc(row.type)} · ${esc(row.message)}</small></div>${canEdit()&&Number.isSafeInteger(Number(row.id))?`<button type="button" data-health-edit="${Number(row.id)}" aria-label="Editar ${esc(row.title)}">Editar ›</button>`:''}</article>`).join('')||'<p class="lx-health33-empty">Nenhuma pendência neste filtro.</p>';
    if(rows.length>100)list.insertAdjacentHTML('beforeend',`<p class="lx-health33-empty">Mostrando 100 de ${rows.length}. Exporte o relatório para ver todas.</p>`);
  }
  function refresh(){const items=lx().data?.catalog?.()||[];current=analyzeCatalog(items);const values={total:current.total,published:current.published,drafts:current.drafts,critical:current.critical,warnings:current.warnings};for(const [key,value] of Object.entries(values)){const el=$('lxHealth33_'+key);if(el)el.textContent=String(value)}draw();const cloud=lx().cloud?.status?.();const label=$('lxHealth33Cloud');if(label)label.textContent=cloud?.connected?'Catálogo sincronizado com a conta':'Mostrando dados disponíveis neste aparelho';return current}
  function exportReport(){if(!current)return;const blob=new Blob([toCsv(current)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=root.document.createElement('a');link.href=url;link.download='LX-Plus-diagnostico-catalogo.csv';root.document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function sync(){if(busy)return;busy=true;const button=$('lxHealth33Sync');if(button){button.disabled=true;button.textContent='Conferindo…'}try{if(lx().cloud?.retryCatalog)await lx().cloud.retryCatalog();refresh()}catch(error){console.warn('LX catalogue review',error);lx().toast?.('Não foi possível atualizar o catálogo agora.')}finally{busy=false;if(button){button.disabled=false;button.textContent='Atualizar diagnóstico'}}}
  function mount(){
    if(!visible())return;const main=$('adminMain');if(!main||$('lxAdminHealth33'))return;
    const section=root.document.createElement('section');section.id='lxAdminHealth33';section.className='lx-health33 admin-card';
    section.innerHTML=`<div class="lx-health33-head"><div><span class="eyebrow">CENTRAL ADM · UI34</span><h2>Diagnóstico do catálogo</h2><p>Veja o que falta antes de publicar e encontre títulos que precisam de revisão.</p><small id="lxHealth33Cloud"></small></div><div class="lx-health33-actions"><button id="lxHealth33Sync" type="button">Atualizar diagnóstico</button><button id="lxHealth33Export" type="button">Exportar CSV</button></div></div><div class="lx-health33-stats"><span><b id="lxHealth33_total">0</b> títulos</span><span><b id="lxHealth33_published">0</b> publicados</span><span><b id="lxHealth33_drafts">0</b> rascunhos</span><span class="attention"><b id="lxHealth33_critical">0</b> para corrigir</span><span><b id="lxHealth33_warnings">0</b> para revisar</span></div><div class="lx-health33-tools"><div class="lx-health33-filters" role="group" aria-label="Filtrar pendências">${[['all','Todas'],['critical','Críticas'],['media','Mídia'],['duplicate','Duplicados'],['draft','Rascunhos']].map(([key,label])=>`<button type="button" data-health-filter="${key}" aria-pressed="${key==='all'}">${label}</button>`).join('')}</div><input id="lxHealth33Search" type="search" placeholder="Buscar título ou problema" aria-label="Buscar no diagnóstico"><small id="lxHealth33Count" aria-live="polite"></small></div><div id="lxHealth33List" class="lx-health33-list"></div><div class="lx-health33-foot"><span>Revise os itens antes de publicar; o diagnóstico não altera dados.</span><div><button type="button" data-health-page="importer">Importar conteúdo</button><button type="button" data-health-page="uploads">Enviar arquivos</button></div></div>`;
    const quick=main.querySelector('.admin-quick-add');if(quick)quick.after(section);else main.prepend(section);section.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;if(target.dataset.healthFilter){filter=target.dataset.healthFilter;section.querySelectorAll('[data-health-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));draw()}else if(target.dataset.healthEdit&&canEdit())lx().admin?.edit?.(Number(target.dataset.healthEdit));else if(target.dataset.healthPage){const tab=root.document.querySelector(`#adminNav [data-admin="${target.dataset.healthPage}"]`);if(tab&&!tab.disabled&&!tab.classList.contains('lx-role-hidden'))lx().admin?.render?.(target.dataset.healthPage)}else if(target.id==='lxHealth33Sync')sync();else if(target.id==='lxHealth33Export')exportReport()});
    $('lxHealth33Search').addEventListener('input',event=>{query=event.target.value;draw()});refresh();
  }
  function boot(){const main=$('adminMain');if(!main)return;new MutationObserver(()=>queueMicrotask(mount)).observe(main,{childList:true});mount()}
  Object.assign(api,{mount,refresh});root.LXAdminHealth33=api;
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
