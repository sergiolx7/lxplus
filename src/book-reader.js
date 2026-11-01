import {esc,https,debounce} from './ui.js';
import {normalizeReader,safeBookPath} from './reader-state.js';

const MAX_BYTES=30*1024*1024;
async function fetchBook(url,signal){
 const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error('Não foi possível acessar o livro. Confira as permissões da fonte.');
 if(Number(response.headers.get('content-length'))>MAX_BYTES)throw Error('Este leitor aceita arquivos de até 30 MB. Abra este livro na origem.');
 const reader=response.body?.getReader();if(!reader){const data=await response.arrayBuffer();if(data.byteLength>MAX_BYTES)throw Error('Livro maior que 30 MB.');return data}
 let length=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Error('Livro maior que 30 MB. Abra a versão original.')}chunks.push(value)}const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}return bytes.buffer;
}
function xml(text){if(/<!DOCTYPE/i.test(text))throw Error('EPUB com definição XML não suportada.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('Estrutura do EPUB inválida.');return doc}
async function epubArchive(bytes){
 await import('../assets/jszip/jszip-3.10.1.js');
 const zip=await window.JSZip.loadAsync(bytes);const files=Object.values(zip.files);
 if(files.length>3000||files.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>100*1024*1024||files.some(f=>(f._data?.uncompressedSize||0)>10*1024*1024))throw Error('EPUB excede os limites deste leitor.');
 const read=async path=>{const f=zip.file(path);if(!f)throw Error('Uma seção do EPUB não foi encontrada.');const text=await f.async('string');if(text.length>5000000)throw Error('Seção do EPUB muito grande.');return text};
 const container=xml(await read('META-INF/container.xml')),root=container.getElementsByTagNameNS('*','rootfile')[0]?.getAttribute('full-path');
 const opf=safeBookPath('',root),doc=xml(await read(opf));
 const manifest=new Map(Array.from(doc.getElementsByTagNameNS('*','item')).map(x=>[x.getAttribute('id'),{path:safeBookPath(opf,x.getAttribute('href')),type:x.getAttribute('media-type')}]));
 const chapters=Array.from(doc.getElementsByTagNameNS('*','itemref')).map(x=>manifest.get(x.getAttribute('idref'))).filter(x=>x&&['application/xhtml+xml','text/html'].includes(x.type));
 if(!chapters.length||chapters.length>1000)throw Error('EPUB sem capítulos compatíveis.');
 return {zip,chapters,read};
}
async function chapterContent(archive,chapter,urls,signal){
 const doc=xml(await archive.read(chapter.path)),root=doc.getElementsByTagNameNS('*','body')[0]||doc.documentElement;
 const fragment=document.createDocumentFragment(),allowed=new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','em','strong','b','i','u','br','hr','div','span','pre','code','sup','sub','table','thead','tbody','tr','th','td']);
 const blocked=new Set(['script','style','iframe','object','embed','svg','math','form','link','meta','audio','video','source']);let visited=0;
 async function copy(node,parent){
  if(signal?.aborted)throw new DOMException('Leitura encerrada.','AbortError');
  if(++visited>30000)throw Error('Capítulo muito complexo para este leitor.');
  if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent));return}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const tag=node.localName.toLowerCase();if(blocked.has(tag))return;
  if(tag==='img'){
   try{const path=safeBookPath(chapter.path,node.getAttribute('src')),ext=path.split('.').pop().toLowerCase(),types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp'};if(!types[ext])return;const file=archive.zip.file(path);if(!file||(file._data?.uncompressedSize||0)>5*1024*1024)return;const blob=new Blob([await file.async('uint8array')],{type:types[ext]}),url=URL.createObjectURL(blob);urls.push(url);const img=document.createElement('img');img.src=url;img.alt=node.getAttribute('alt')||'';img.loading='lazy';parent.appendChild(img)}catch{}return;
  }
  const target=allowed.has(tag)?document.createElement(tag):parent;if(target!==parent)parent.appendChild(target);for(const child of node.childNodes)await copy(child,target);
 }
 for(const child of root.childNodes)await copy(child,fragment);return fragment;
}

export async function openReader(host,{url,format='pdf',state={},onSave=()=>{},signal}){
 const abort=new AbortController(),ownSignal=abort.signal;let closed=false,doc=null,archive=null,renderTask=null,pageGeneration=0,searchGeneration=0,urls=[],timer=null;
 let saved=normalizeReader(state,format),current=saved.position,fetchTimer=null;
 const assertOpen=()=>{if(closed||ownSignal.aborted)throw new DOMException('Leitura encerrada.','AbortError')};
 const persist=()=>{if(!closed)onSave({...saved,position:current,updatedAt:new Date().toISOString()})};
 const destroy=()=>{if(closed)return;persist();closed=true;abort.abort();clearTimeout(timer);clearTimeout(fetchTimer);noteChange.cancel();++pageGeneration;++searchGeneration;renderTask?.cancel();doc?.destroy();urls.forEach(URL.revokeObjectURL)};
 const noteChange=debounce(()=>{saved.notes=host.querySelector('#readerNotes')?.value||'';persist()},500);
 signal?.addEventListener('abort',destroy,{once:true});if(signal?.aborted){destroy();throw new DOMException('Leitura encerrada.','AbortError')}
 host.innerHTML='<div class="reader-toolbar"><button class="btn small" data-reader-prev>Anterior</button><label>Página / capítulo <input id="readerPosition" type="number" min="1" value="'+current+'"></label><span id="readerTotal"></span><button class="btn small" data-reader-next>Próximo</button><label>Tema <select id="readerTheme">'+[['dark','Escuro'],['light','Claro'],['sepia','Sépia']].map(([v,t])=>'<option value="'+v+'" '+(saved.theme===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>Texto / zoom <input id="readerFont" type="range" min="14" max="30" value="'+saved.fontSize+'"></label><label>Espaçamento <select id="readerSpacing">'+[1.4,1.7,2,2.3].map(n=>'<option value="'+n+'" '+(saved.spacing===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><button class="btn small" data-reader-bookmark>Marcar página</button></div><div id="readerStatus" role="status">Carregando seu livro…</div><div class="reader-layout"><div id="readerViewport" class="reader-viewport" tabindex="0" aria-label="Conteúdo do livro"></div><aside class="reader-sidebar"><details><summary>Marcadores</summary><div id="readerBookmarks"></div></details><details><summary>Suas anotações privadas</summary><label class="field">Anotações<textarea id="readerNotes" maxlength="10000">'+esc(saved.notes)+'</textarea></label></details><details><summary>Buscar no livro</summary><form id="readerSearchForm"><label class="field">Texto<input id="readerSearch" minlength="2" maxlength="80" required></label><button class="btn small">Buscar</button></form><div id="readerResults" role="status"></div></details></aside></div>';
 const viewport=host.querySelector('#readerViewport'),status=host.querySelector('#readerStatus');
 function theme(){viewport.dataset.theme=saved.theme;viewport.style.fontSize=saved.fontSize+'px';viewport.style.lineHeight=String(saved.spacing)}theme();
 function bookmarks(){host.querySelector('#readerBookmarks').innerHTML=saved.bookmarks.map((b,i)=>'<p><button class="link" data-reader-marker="'+b.position+'">'+esc(b.label)+'</button> <button class="link" data-reader-remove-marker="'+i+'" aria-label="Remover marcador">×</button></p>').join('')||'<p>Marque uma página para voltar a ela.</p>'}bookmarks();
 async function show(position,restore=false){
  assertOpen();const token=++pageGeneration,pageUrls=[];renderTask?.cancel();current=Math.min(saved.total,Math.max(1,Number(position)||1));host.querySelector('#readerPosition').value=String(current);status.textContent='Preparando leitura…';urls.forEach(URL.revokeObjectURL);urls=[];
  try{
   if(format==='pdf'){
    const page=await doc.getPage(current);assertOpen();if(token!==pageGeneration)return;
    const base=page.getViewport({scale:1}),scale=Math.min(2.5,Math.max(.4,(viewport.clientWidth-32)/base.width*(saved.fontSize/18))),view=page.getViewport({scale}),ratio=Math.min(2,window.devicePixelRatio||1),canvas=document.createElement('canvas');
    canvas.width=Math.floor(view.width*ratio);canvas.height=Math.floor(view.height*ratio);canvas.style.width=view.width+'px';canvas.style.maxWidth='none';canvas.setAttribute('aria-label','Página '+current+' do livro');viewport.replaceChildren(canvas);
    renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await renderTask.promise;
   }else{const content=await chapterContent(archive,archive.chapters[current-1],pageUrls,ownSignal);assertOpen();if(token!==pageGeneration){pageUrls.forEach(URL.revokeObjectURL);return}urls=pageUrls;viewport.replaceChildren(content)}
   if(token!==pageGeneration)return;viewport.scrollTop=restore?saved.scroll*Math.max(0,viewport.scrollHeight-viewport.clientHeight):0;saved.position=current;status.textContent=(format==='pdf'?'Página ':'Capítulo ')+current+' de '+saved.total+' · '+Math.round(current/saved.total*100)+'%';persist();
  }catch(e){pageUrls.forEach(URL.revokeObjectURL);if(e.name!=='RenderingCancelledException'&&e.name!=='AbortError'&&!closed)status.textContent=e.message||'Não foi possível abrir esta seção.'}
 }
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-reader-prev'))show(current-1);if(b.hasAttribute('data-reader-next'))show(current+1);if(b.dataset.readerMarker)show(Number(b.dataset.readerMarker));if(b.hasAttribute('data-reader-bookmark')){if(!saved.bookmarks.some(x=>x.position===current)&&saved.bookmarks.length<100)saved.bookmarks.push({position:current,label:(format==='pdf'?'Página ':'Capítulo ')+current});bookmarks();persist()}if(b.dataset.readerRemoveMarker!==undefined){saved.bookmarks.splice(Number(b.dataset.readerRemoveMarker),1);bookmarks();persist()}},{signal:ownSignal});
 host.addEventListener('change',e=>{const id=e.target.id;if(id==='readerPosition')show(e.target.value);if(id==='readerTheme'){saved.theme=e.target.value;theme();persist()}if(id==='readerFont'){saved.fontSize=Number(e.target.value);theme();format==='pdf'?show(current):persist()}if(id==='readerSpacing'){saved.spacing=Number(e.target.value);theme();persist()}},{signal:ownSignal});
 host.querySelector('#readerNotes').addEventListener('input',e=>{saved.notes=e.target.value;noteChange()},{signal:ownSignal});
 viewport.addEventListener('scroll',()=>{saved.scroll=viewport.scrollTop/Math.max(1,viewport.scrollHeight-viewport.clientHeight);clearTimeout(timer);timer=setTimeout(persist,800)},{signal:ownSignal});
 host.querySelector('#readerSearchForm').addEventListener('submit',async e=>{
  e.preventDefault();const term=host.querySelector('#readerSearch').value.trim().toLocaleLowerCase('pt-BR'),results=host.querySelector('#readerResults'),token=++searchGeneration;results.textContent='Pesquisando…';const matches=[];
  try{for(let i=1;i<=saved.total;i++){assertOpen();if(token!==searchGeneration)return;let text;if(format==='pdf'){const page=await doc.getPage(i);text=(await page.getTextContent()).items.map(t=>t.str).join(' ')}else{text=xml(await archive.read(archive.chapters[i-1].path)).documentElement.textContent}const at=text.toLocaleLowerCase('pt-BR').indexOf(term);if(at>=0)matches.push({position:i,excerpt:text.slice(Math.max(0,at-35),at+term.length+65)});if(matches.length>=30)break}if(token===searchGeneration&&!closed)results.innerHTML=matches.length?matches.map(m=>'<p><button class="link" data-reader-marker="'+m.position+'">'+m.position+' · '+esc(m.excerpt)+'</button></p>').join(''):'Nenhum resultado. PDFs digitalizados podem não conter texto pesquisável.'}catch(e){if(!closed)results.textContent='Não foi possível concluir a busca.'}
 },{signal:ownSignal});
 try{
  const target=new URL(url);if(target.protocol!=='https:'&&!(target.protocol==='blob:'&&target.origin===location.origin))throw Error('Fonte de leitura inválida.');
  fetchTimer=setTimeout(()=>abort.abort(),25000);const bytes=await fetchBook(url,ownSignal);clearTimeout(fetchTimer);assertOpen();
  if(format==='pdf'){
   const pdf=await import('../assets/pdfjs/pdf-6.4.299.mjs');assertOpen();pdf.GlobalWorkerOptions.workerSrc=new URL('../assets/pdfjs/pdf.worker-6.4.299.mjs',import.meta.url).href;
   const base=new URL('../assets/pdfjs/',import.meta.url).href;
   const task=pdf.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,maxImageSize:16000000,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/'});
   ownSignal.addEventListener('abort',()=>task.destroy(),{once:true});doc=await task.promise;saved.total=doc.numPages;
  }else{archive=await epubArchive(bytes);saved.total=archive.chapters.length}
  assertOpen();host.querySelector('#readerTotal').textContent='de '+saved.total;host.querySelector('#readerPosition').max=String(saved.total);await show(current,true);
 }catch(e){clearTimeout(fetchTimer);if(!closed)status.textContent=e.name==='AbortError'?'O livro demorou para responder. Tente novamente ou abra a versão original.':'Não foi possível abrir o livro neste leitor. A fonte pode exigir permissão, bloquear CORS ou usar um formato protegido. Abra a versão original.'}
 return destroy;
}
