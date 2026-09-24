/* LX Plus NOVA — one controller per recovered feature. Catalog writes go through existing RPCs. */
(()=>{'use strict';
 const LX=window.LX,$=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cat=()=>LX.data.catalog(),cloud=()=>LX.cloud?.db?.(),notice=e=>LX.toast?.(String(e?.message||e||'Falha desconhecida.').slice(0,180));
 const deadline=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite excedido. Verifique a conexão e tente novamente.')),ms))]);
 const devices={desktop:'PC',tablet:'Tablet',mobile:'Celular',tv:'TV'};
 function renderMp3Import(m){
  const anchor=m.querySelector('.lx-admin-catalog-page');if(!anchor)return;
  const options=cat().filter(x=>x.type==='Música'&&(!x.tracks?.length||x.tracks.length===1)).map(x=>`<option value="${Number(x.id)}">${safe(x.title)} · ${safe(x.artist||'sem artista')}</option>`).join('');
  const section=document.createElement('section');section.className='admin-card lx-nova-mp3-import';
  section.innerHTML=`<div class="lx-nova-heading"><span>ARQUIVO ORIGINAL</span><h2>Adicionar MP3 ao catálogo</h2><p>Envie arquivos MP3 próprios ou cole links HTTPS diretos para arquivos MP3 autorizados. As tags ID3 preenchem título, artista, capa e duração. O site guarda a qualidade original, sem aumentar artificialmente o bitrate.</p></div><form class="lx-nova-mp3-form"><label>Arquivos MP3 (até 15 por vez)<input name="files" type="file" accept=".mp3,audio/mpeg" multiple></label><label>Links diretos para MP3 (um por linha)<textarea name="urls" rows="3" placeholder="https://seu-servidor.com/musica.mp3"></textarea></label><label>Gênero padrão<input name="genre" value="Gospel" maxlength="70"></label><label>Substituir fonte de uma música existente (somente 1 arquivo)<select name="replace"><option value="">Criar músicas novas</option>${options}</select></label><label class="lx-nova-check"><input name="publish" type="checkbox" checked> Publicar músicas novas automaticamente</label><button type="submit" class="primary-btn">Importar MP3</button><output role="status"></output></form>`;
  anchor.before(section);const form=section.querySelector('form'),output=section.querySelector('output');
  const validate=async(file)=>{if(file.size>150*1024*1024)throw new Error('Arquivo acima de 150 MB. Configure R2 para mídias maiores e envie por partes.');if(file.size<128)throw new Error('Arquivo MP3 vazio ou inválido.');const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());if(!(bytes[0]===73&&bytes[1]===68&&bytes[2]===51)&&!(bytes[0]===255&&(bytes[1]&224)===224))throw new Error('O arquivo não começa com cabeçalho MP3 válido.');};
  const direct=async(link)=>{const u=new URL(link);if(u.protocol!=='https:'||!/\.mp3$/i.test(u.pathname))throw new Error('Use um link HTTPS direto que termine em .mp3.');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{const response=await fetch(u.href,{signal:controller.signal,credentials:'omit',redirect:'follow'});if(!response.ok)throw new Error(`HTTP ${response.status} ao baixar ${u.hostname}`);const size=Number(response.headers.get('content-length')||0);if(size>150*1024*1024)throw new Error('O arquivo ultrapassa 150 MB.');const blob=await response.blob();if(blob.size>150*1024*1024)throw new Error('O arquivo ultrapassa 150 MB.');return new File([blob],decodeURIComponent(u.pathname.split('/').pop()||'faixa.mp3'),{type:'audio/mpeg'})}catch(err){if(err?.name==='TypeError')throw new Error('O servidor do MP3 bloqueou o download pelo navegador (CORS). Envie o arquivo diretamente pelo seletor.');throw err}finally{clearTimeout(timer)}};
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button[type=submit]'),urls=form.elements.urls.value.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean),files=[...form.elements.files.files];if(!files.length&&!urls.length){output.textContent='Escolha MP3 ou cole um link direto.';return}if(files.length+urls.length>15){output.textContent='Limite de 15 arquivos por operação.';return}const replaceId=Number(form.elements.replace.value)||0;if(replaceId&&files.length+urls.length!==1){output.textContent='Para substituir uma música existente, selecione somente 1 MP3.';return}
   button.disabled=true;let done=0;const errors=[];try{const audio=[...files];for(const url of urls){try{output.textContent=`Baixando arquivo próprio ${audio.length+1}/${files.length+urls.length}…`;audio.push(await direct(url))}catch(err){errors.push(`${url.slice(0,70)}: ${err.message||err}`)}}
    for(const file of audio){try{output.textContent=`Lendo tags e enviando ${done+1}/${audio.length}: ${file.name}`;await validate(file);const meta=await deadline(LX.musicMeta.readId3(file),8000),title=meta.title||file.name.replace(/\.mp3$/i,'').replace(/[._]/g,' '),artist=meta.artist||'Artista não informado',duration=Number(meta.duration)||0,genre=meta.genre||form.elements.genre.value.trim()||'Outros';let cover='';if(meta.cover?.startsWith('data:image/')){try{const artFile=await(await fetch(meta.cover)).blob();cover=await LX.store.putAsset(`mp3_cover_${Date.now()}_${file.name}.jpg`,artFile)}catch(err){console.warn('Capa ID3',err)}}
     const playable=file.type==='audio/mpeg'?file:new File([file],file.name,{type:'audio/mpeg'}),key=await LX.store.putMedia(`mp3_${Date.now()}_${file.name}`,playable);if(!String(key).startsWith('cloud:')&&!String(key).startsWith('r2:'))throw new Error('Arquivo não foi enviado à nuvem. Faça login novamente.');
     const bitrate=duration?Math.round(file.size*8/duration/1000):0,track={number:1,title,artist,duration,cover,genre,mediaKey:key,mimeType:'audio/mpeg',fileName:file.name,size:file.size,bitrateKbpsEstimate:bitrate,qualityMode:'original'};
     const previous=replaceId?cat().find(x=>Number(x.id)===replaceId):null;if(replaceId&&!previous)throw new Error('Música existente não encontrada.');
     const item=previous?{...previous,mediaKey:key,sourceMediaKey:'',externalMusicUrl:'',authorizedAudioUrl:'',authorizedStreamUrl:'',legacyMusicSourceUrl:previous.externalMusicUrl||previous.mediaKey||'',tracks:[{...(previous.tracks?.[0]||{}),...track,title:previous.tracks?.[0]?.title||previous.title,artist:previous.artist||artist,cover:cover||previous.cover||'',sourceMediaKey:''}],cover:previous.cover||cover,banner:previous.banner||cover}:{
      id:Date.now()*1000+Math.floor(Math.random()*999),type:'Música',title,artist,genre,genres:[genre],album:meta.album||'',year:Number(meta.year)||'',desc:`Faixa em MP3 enviada pelo ADM · qualidade original`,cover,banner:cover,duration,mediaKey:key,tracks:[track],published:form.elements.publish.checked,featured:false,priority:0,createdAt:new Date().toISOString()};
     await deadline(LX.data.saveCatalogItem(item),25000);LX.primeMusicMedia?.(key,file);done++
    }catch(err){errors.push(`${file.name}: ${err.message||err}`);console.warn('Importação MP3',err)}}
    const summary=`${done} MP3 ${done===1?'salvo':'salvos'} no catálogo.${errors.length?' Falhas: '+errors.join(' | '):''}`;output.textContent=summary;if(done){LX.toast?.(`${done} MP3 ${done===1?'adicionado':'adicionados'} ao catálogo.`);LX.admin?.render?.('music');const fresh=document.querySelector('.lx-nova-mp3-import output');if(fresh)fresh.textContent=summary}
   }finally{button.disabled=false}
  };
 }
 let carouselId=null,draft=null,previewUrls=[];
 const art=(x,d)=>x.heroArt?.[d]||x.heroArt?.desktop||x.carouselImage||x.banner||x.cover||'';
 const focus=(x,d)=>({...{zoom:1,x:50,y:35,dim:.45},...(x.heroFocus?.[d]||x.heroFocus?.desktop||{})});
 function renderCarousel(m){const items=cat().filter(x=>['Filme','Série','Anime','Dorama'].includes(x.type));if(!items.length){m.innerHTML='<h1>Carrossel</h1><p>Cadastre primeiro um filme ou série no catálogo.</p>';return}carouselId=items.some(x=>String(x.id)===String(carouselId))?carouselId:items[0].id;const selected=items.find(x=>String(x.id)===String(carouselId));draft={...selected,heroArt:{...(selected.heroArt||{})},heroFocus:Object.fromEntries(Object.keys(devices).map(d=>[d,focus(selected,d)]))};
 m.innerHTML=`<div class="lx-nova-heading"><span>ADMINISTRAÇÃO</span><h1>Carrossel</h1><p>Selecione um título já existente, ajuste as quatro telas e confira a prévia antes de salvar.</p>${selected.published===false?'<p>Este título está em rascunho; publique-o no catálogo para aparecer na Home.</p>':''}</div><form id="lxNovaCarousel" class="lx-nova-form"><div class="lx-nova-row"><label>Título do catálogo<select name="title">${items.map(x=>`<option value="${safe(x.id)}" ${String(x.id)===String(carouselId)?'selected':''}>${safe(x.title)} · ${safe(x.type)}</option>`).join('')}</select></label><label>Ordem (maior primeiro)<input name="priority" type="number" value="${Number(selected.priority)||0}"></label><label class="lx-nova-check"><input name="featured" type="checkbox" ${selected.featured?'checked':''}> Exibir no carrossel</label><label class="lx-nova-check"><input name="showTitle" type="checkbox" ${selected.showCarouselTitle===false?'':'checked'}> Mostrar título</label></div><div id="lxNovaDevices" class="lx-nova-devices"></div><div class="lx-nova-actions"><button type="submit" class="primary-btn">Salvar e atualizar Home</button><output id="lxNovaCarouselStatus" role="status"></output></div></form>`;
 const form=$('lxNovaCarousel');form.elements.title.onchange=e=>{carouselId=e.target.value;previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];renderCarousel(m)};
 function draw(){const host=$('lxNovaDevices');host.innerHTML=Object.entries(devices).map(([d,label])=>{const f=draft.heroFocus[d],src=draft.heroArt[d]||art(selected,d);return `<fieldset data-device="${d}"><legend>${label}</legend><div class="lx-nova-preview lx-nova-${d}" style="--pzoom:${Number(f.zoom)||1};--px:${Number(f.x??50)}%;--py:${Number(f.y??35)}%;--pdim:${Number(f.dim)||0}"><img alt="Prévia do banner para ${label}" src="${safe(src)}"><span ${form.elements.showTitle.checked?'':'hidden'}>${safe(selected.title)}</span></div><small>Clique na prévia para definir o ponto focal</small><label>Imagem própria<input data-image type="file" accept="image/*"></label><label>Zoom <input data-zoom type="range" min="1" max="2" step=".01" value="${Number(f.zoom)||1}"></label><label>Posição X <input data-x type="range" min="0" max="100" value="${Number(f.x??50)}"></label><label>Posição Y <input data-y type="range" min="0" max="100" value="${Number(f.y??35)}"></label><label>Escurecimento <input data-dim type="range" min="0" max=".85" step=".01" value="${Number(f.dim)||0}"></label></fieldset>`}).join('');for(const field of host.querySelectorAll('fieldset')){const d=field.dataset.device,show=()=>{const f=draft.heroFocus[d],p=field.querySelector('.lx-nova-preview');p.style.setProperty('--pzoom',f.zoom);p.style.setProperty('--px',`${f.x}%`);p.style.setProperty('--py',`${f.y}%`);p.style.setProperty('--pdim',f.dim)};for(const k of ['zoom','x','y','dim'])field.querySelector(`[data-${k}]`).oninput=e=>{draft.heroFocus[d][k]=Number(e.target.value);show()};field.querySelector('[data-image]').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const tmp=URL.createObjectURL(file);previewUrls.push(tmp);field.querySelector('img').src=tmp};field.querySelector('.lx-nova-preview').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();draft.heroFocus[d].x=Math.round((e.clientX-r.left)/r.width*100);draft.heroFocus[d].y=Math.round((e.clientY-r.top)/r.height*100);field.querySelector('[data-x]').value=draft.heroFocus[d].x;field.querySelector('[data-y]').value=draft.heroFocus[d].y;show()}}}
 draw();form.elements.showTitle.onchange=e=>m.querySelectorAll('.lx-nova-preview span').forEach(span=>span.hidden=!e.target.checked);form.onsubmit=async e=>{
  e.preventDefault();const b=form.querySelector('[type=submit]'),status=$('lxNovaCarouselStatus');
  b.disabled=true;status.textContent='Enviando banners e salvando…';
  try{
   for(const field of form.querySelectorAll('fieldset')){const file=field.querySelector('[data-image]').files?.[0];if(file)draft.heroArt[field.dataset.device]=await LX.store.putAsset(`carousel_${selected.id}_${field.dataset.device}_${Date.now()}_${file.name}`,file)}
   const y={...selected,heroArt:draft.heroArt,heroFocus:draft.heroFocus,featured:form.elements.featured.checked,showCarouselTitle:form.elements.showTitle.checked,priority:Number(form.elements.priority.value)||0};
   await deadline(LX.data.saveCatalogItem(y),16000);
   const db=cloud(),query=db?await deadline(db.from('lx_catalog').select('payload,published').eq('id',Number(y.id)).single(),8000):null;
   if(query?.error)throw new Error(`O carrossel foi enviado; a confirmação falhou: ${query.error.message}`);
   const saved=query?.data?{...query.data.payload,published:query.data.published}:cat().find(x=>String(x.id)===String(y.id));
   const sameArt=Object.keys(devices).every(device=>String(saved?.heroArt?.[device]||'')===String(y.heroArt?.[device]||''));
   if(!saved||saved.featured!==y.featured||saved.showCarouselTitle!==y.showCarouselTitle||Number(saved.priority||0)!==y.priority||!sameArt)throw new Error('O carrossel foi enviado, mas a leitura retornou dados diferentes. Recarregue o ADM antes de reenviar.');
   LX.ui?.renderApp?.();carouselId=y.id;renderCarousel(m);
   const message=y.published===false?'Salvo; publique o título para aparecer na Home.':'Salvo no catálogo e atualizado na Home.';
   $('lxNovaCarouselStatus').textContent=message;LX.toast?.(message);
  }catch(err){console.error('Carrossel',err);status.textContent=`Erro: ${err.message||err}`}finally{b.disabled=false}
 }}

 function spotifyTrackId(value){
  const raw=String(value||'').trim();
  if(/^spotify:track:[a-zA-Z0-9]{10,64}$/i.test(raw))return raw.split(':')[2];
  try{const url=new URL(raw);if(url.protocol!=='https:'||url.hostname!=='open.spotify.com')return '';
   const parts=url.pathname.split('/').filter(Boolean);if(/^intl-[a-z-]+$/i.test(parts[0]||''))parts.shift();
   return parts[0]==='track'&&/^[a-zA-Z0-9]{10,64}$/.test(parts[1]||'')?parts[1]:''}catch{return ''}
 }
 function renderSpotifyBulk(m){
  const anchor=m.querySelector('.youtube-bulk-card');if(!anchor)return;
  const section=document.createElement('section');section.className='admin-card lx-nova-spotify-bulk';
  section.innerHTML='<div class="lx-nova-heading"><span>SPOTIFY · IMPORTAÇÃO EM MASSA</span><h2>Adicionar faixas por links</h2><p>Um link de música por linha. O nome e a capa vêm da faixa exata no Spotify; confirme os dados antes de criar rascunhos. Artista e duração são completados quando a API oficial estiver configurada.</p></div><label>Links do Spotify<textarea id="lxSpotifyLinks" rows="5" placeholder="https://open.spotify.com/track/...&#10;https://open.spotify.com/track/..." aria-label="Links de músicas do Spotify"></textarea></label><label>Categoria<select id="lxSpotifyGenre"><option>Outra</option><option>Gospel</option></select></label><div class="lx-nova-actions"><button id="lxSpotifyAnalyze" type="button" class="primary-btn">Buscar títulos e capas</button><output id="lxSpotifyStatus" role="status"></output></div><div id="lxSpotifyPreview" class="lx-nova-spotify-preview"></div>';
  anchor.insertAdjacentElement('afterend',section);
  const status=section.querySelector('#lxSpotifyStatus'),preview=section.querySelector('#lxSpotifyPreview'),analyze=section.querySelector('#lxSpotifyAnalyze');
  let rows=[];
  function draw(){
   preview.innerHTML=rows.length?`<h3>Revise antes de salvar</h3><div class="lx-nova-spotify-list">${rows.map((row,i)=>`<article data-row="${i}"><img src="${safe(row.cover)}" alt="Capa da música"><div><strong>Spotify · faixa ${i+1}</strong><label>Título<input data-field="title" maxlength="180" required value="${safe(row.title)}"></label><label>Artista<input data-field="artist" maxlength="140" value="${safe(row.artist)}" placeholder="Preencha se não veio do Spotify"></label><label>Capa oficial<input data-field="cover" type="url" value="${safe(row.cover)}"></label><small>${safe(row.metadataMode)} · ${row.duration?LX.fmt(row.duration):'Duração indisponível · confira no Spotify'}</small></div><label><input data-field="include" type="checkbox" checked> Incluir</label></article>`).join('')}</div><button id="lxSpotifySave" type="button" class="primary-btn">Salvar selecionadas como rascunho</button>`:'';
   preview.querySelector('#lxSpotifySave')?.addEventListener('click',saveRows);
  }
  analyze.onclick=async()=>{
   const values=section.querySelector('#lxSpotifyLinks').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   if(!values.length){status.textContent='Cole links de músicas do Spotify.';return}
   if(values.length>200){status.textContent='Importe até 200 links por análise.';return}
   const ids=values.map(spotifyTrackId);if(ids.some(x=>!x)){status.textContent='Aceito somente links de faixas open.spotify.com/track/...';return}
   const unique=[...new Set(ids)],existing=new Set(cat().filter(x=>x.type==='Música').flatMap(x=>[x.mediaKey,x.sourceMediaKey,x.externalMusicUrl,...(x.tracks||[]).flatMap(t=>[t.mediaKey,t.sourceMediaKey])]).map(spotifyTrackId).filter(Boolean));
   const fresh=unique.filter(id=>!existing.has(id));rows=[];preview.replaceChildren();
   if(!fresh.length){status.textContent='Essas faixas já estão cadastradas. Nenhum rascunho novo foi criado.';return}
   analyze.disabled=true;
   try{
    const db=cloud();if(!db)throw new Error('Conecte-se ao Supabase para importar.');
    const session=await deadline(db.auth.getSession(),6000),jwt=session?.data?.session?.access_token;
    if(!jwt)throw new Error('Entre novamente na conta ADM.');
    const errors=[];
    for(let i=0;i<fresh.length;i+=20){
     status.textContent=`Consultando Spotify: ${Math.min(i+20,fresh.length)}/${fresh.length}…`;
     const links=fresh.slice(i,i+20).map(id=>`https://open.spotify.com/track/${id}`);
     const {data,error}=await deadline(db.functions.invoke('lx-spotify-import',{body:{links},headers:{Authorization:`Bearer ${jwt}`}}),35000);
     if(error){let detail=error.message;try{const body=await error.context?.clone?.().json?.();detail=body?.error||detail}catch{}throw new Error(detail||'Falha no Spotify')}
     if(data?.error)throw new Error(data.error);
     for(const item of data?.items||[]){if(item.error)errors.push(item.error);else if(item.title&&item.cover&&fresh.includes(item.id))rows.push(item)}
    }
    draw();status.textContent=`${rows.length} ${rows.length===1?'faixa pronta':'faixas prontas'} para revisar · ${unique.length-fresh.length} repetidas · ${errors.length} indisponíveis.${rows.some(x=>!x.artist)?' Revise os artistas que não vieram no oEmbed.':''}`;
   }catch(error){status.textContent=`Erro: ${error.message||error}`;console.error('Spotify em massa',error)}
   finally{analyze.disabled=false}
  };
  async function saveRows(){
   const chosen=[...preview.querySelectorAll('[data-row]')].filter(el=>el.querySelector('[data-field=include]').checked).map(el=>{
    const row=rows[Number(el.dataset.row)],get=name=>el.querySelector(`[data-field=${name}]`).value.trim();
    return {...row,title:get('title'),artist:get('artist'),cover:get('cover')}
   });
   if(!chosen.length){status.textContent='Selecione pelo menos uma faixa.';return}
   if(chosen.some(x=>!x.title||!/^https:\/\//i.test(x.cover))){status.textContent='Confira o título e a URL HTTPS da capa de cada faixa.';return}
   const button=preview.querySelector('#lxSpotifySave');button.disabled=true;status.textContent='Gravando rascunhos…';
   try{
    const genre=section.querySelector('#lxSpotifyGenre').value,now=Date.now();
    const items=chosen.map((row,i)=>{const mediaKey=`spotify:track:${row.id}`,id=now+i,year=new Date().getFullYear(),t={number:1,title:row.title,artist:row.artist,duration:Number(row.duration)||0,cover:row.cover,mediaKey,qualityMode:'external'};
     return{id,type:'Música',title:row.title,artist:row.artist,cover:row.cover,banner:row.cover,spotifyArtwork:row.cover,genre,genres:[genre],duration:t.duration,year,mediaKey,sourceMediaKey:mediaKey,tracks:[t],externalMusicUrl:row.sourceUrl,metadataUrl:row.sourceUrl,metadataProvider:row.metadataMode,published:false,featured:false,priority:0,createdAt:new Date().toISOString(),desc:row.artist?`${row.title} — ${row.artist}. Reprodução pelo Spotify oficial.`:`${row.title}. Reprodução pelo Spotify oficial.`};
    });
    const count=await deadline(LX.cloud.bulkUpsertCatalogItems(items),25000);
    if(count!==items.length)throw new Error(`A nuvem confirmou ${count} de ${items.length} rascunhos. Atualize a lista antes de reenviar.`);
    status.textContent=`${count} faixas importadas como rascunho. Revise e publique em ADM → Músicas.`;
    preview.replaceChildren();rows=[];
    LX.toast?.(status.textContent);
   }catch(error){status.textContent=`Erro ao salvar: ${error.message||error}`;console.error('Spotify em massa',error)}
   finally{button.disabled=false}
  }
 }
 let liveId=null;
 function liveItems(){return cat().filter(x=>x.type==='Ao Vivo')}
 function liveSource(value){
  const url=new URL(String(value||'').trim());
  if(url.protocol!=='https:')throw new Error('Use um link HTTPS da transmissão.');
  const host=url.hostname.toLowerCase();
  if(host==='youtu.be'||host==='youtube.com'||host.endsWith('.youtube.com')){
   const key=LX.mediaSources.normalize('youtube',url.toString());
   if(!key.startsWith('youtube:'))throw new Error('Use um link de vídeo ou live do YouTube, não de playlist.');
   return{provider:'youtube',mediaKey:key};
  }
  if(!/\.(?:mp4|m3u8|mpd|webm)(?:$|[?#])/i.test(url.pathname+url.search))
   throw new Error('Esse link parece uma página. Use uma live do YouTube ou uma URL direta MP4, HLS (.m3u8), DASH (.mpd) ou WebM autorizada.');
  return{provider:'direct',mediaKey:LX.mediaSources.normalize('direct',url.toString())};
 }
 function renderLiveAdmin(m){
  const rows=liveItems(),item=rows.find(x=>String(x.id)===String(liveId));
  m.innerHTML=`<div class="lx-nova-heading"><span>ADMINISTRAÇÃO</span><h1>Ao Vivo</h1><p>Adicione título, capa e link da transmissão. Links de vídeo do YouTube e arquivos MP4/HLS/DASH/WebM compatíveis abrem dentro da LX Plus.</p></div><label class="lx-nova-live-select">Editar transmissão<select id="lxLiveSelect"><option value="">Nova transmissão</option>${rows.map(x=>`<option value="${safe(x.id)}" ${String(item?.id)===String(x.id)?'selected':''}>${safe(x.title)}</option>`).join('')}</select></label><form id="lxNovaLive" class="lx-nova-form"><div class="lx-nova-row"><label>Título<input name="title" maxlength="180" required value="${safe(item?.title)}" placeholder="Título da transmissão"></label><label>Capa<input name="banner" type="url" value="${safe(item?.banner||item?.cover)}" placeholder="https://..."></label><label class="wide">Ou enviar capa<input name="bannerFile" type="file" accept="image/*"></label><label class="wide">Link de onde está passando<input name="source" type="url" required value="${safe(item?.sourceUrl||LX.mediaSources.toInput(item?.mediaKey)||'')}" placeholder="https://www.youtube.com/watch?v=... ou https://.../live.m3u8"></label></div><button class="primary-btn" type="submit">Salvar transmissão</button><output id="lxLiveStatus" role="status"></output></form><div class="lx-nova-live-list">${rows.map(x=>`<article><strong>${safe(x.title)}</strong><span>${safe(x.sourceProvider==='youtube'?'YouTube':'Vídeo direto')}</span><button type="button" data-edit="${safe(x.id)}">Editar</button></article>`).join('')||'<p>Nenhuma transmissão cadastrada.</p>'}</div>`;
  $('lxLiveSelect').onchange=e=>{liveId=e.target.value||null;renderLiveAdmin(m)};
  m.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{liveId=b.dataset.edit;renderLiveAdmin(m)});
  const form=$('lxNovaLive');
  form.onsubmit=async e=>{
   e.preventDefault();const button=form.querySelector('[type=submit]'),status=$('lxLiveStatus');button.disabled=true;status.textContent='Salvando transmissão…';
   try{
    const source=form.elements.source.value.trim(),{provider,mediaKey}=liveSource(source);
    let banner=form.elements.banner.value.trim();
    if(form.elements.bannerFile.files?.[0])banner=await LX.store.putAsset(`live_${Date.now()}_${form.elements.bannerFile.files[0].name}`,form.elements.bannerFile.files[0]);
    const y={...(item||{}),id:item?.id||Date.now(),type:'Ao Vivo',title:form.elements.title.value.trim(),cover:banner||item?.cover||'',banner:banner||item?.banner||'',sourceUrl:source,sourceProvider:provider,mediaKey,liveStatus:'Ao vivo',published:true,desc:item?.desc||'Transmissão na LX Plus'};
    await deadline(LX.data.saveCatalogItem(y),16000);
    const db=cloud(),query=db?await deadline(db.from('lx_catalog').select('payload').eq('id',Number(y.id)).single(),8000):null;
    if(query?.error)throw new Error(`Transmissão enviada; falha ao confirmar: ${query.error.message}`);
    const saved=query?.data?.payload||liveItems().find(x=>String(x.id)===String(y.id));
    if(saved?.title!==y.title||saved?.mediaKey!==y.mediaKey)throw new Error('Transmissão enviada, mas os dados lidos diferem do formulário. Recarregue o ADM.');
    liveId=y.id;LX.ui?.renderApp?.();renderLiveAdmin(m);$('lxLiveStatus').textContent='Transmissão salva e disponível na página Ao Vivo.';LX.toast?.('Transmissão salva.');
   }catch(error){console.error('Ao Vivo',error);status.textContent=`Erro: ${error.message||error}`}
   finally{button.disabled=false}
  };
 }
 function renderPublicLive(){
  const host=$('homeContent');if(!host)return;
  for(const id of ['hero','welcome']){const el=$(id);if(el){el.innerHTML='';el.classList.add('hidden')}}
  const events=liveItems().filter(x=>x.published!==false&&x.liveStatus!=='Encerrado');
  host.innerHTML=`<section class="lx-nova-live"><div class="lx-nova-heading"><span>TRANSMISSÕES</span><h1>Ao Vivo</h1></div>${events.length?`<div class="lx-nova-live-grid">${events.map(x=>`<article>${x.banner||x.cover?`<img src="${safe(x.banner||x.cover)}" alt="Capa de ${safe(x.title)}">`:''}<h2>${safe(x.title)}</h2>${x.mediaKey?`<button type="button" data-live-play="${safe(x.id)}">Assistir na LX Plus</button>`:''}</article>`).join('')}</div>`:'<p class="lx-nova-empty">Nenhuma transmissão disponível</p>'}</section>`;
  host.querySelectorAll('[data-live-play]').forEach(b=>b.onclick=()=>LX.play(Number(b.dataset.livePlay)));
 }
 const recentErrors=[];window.addEventListener('error',e=>{recentErrors.push(String(e.message||'Erro de script').slice(0,120));recentErrors.splice(0,Math.max(0,recentErrors.length-8))});window.addEventListener('unhandledrejection',e=>{recentErrors.push(String(e.reason?.message||e.reason||'Promise rejeitada').slice(0,120));recentErrors.splice(0,Math.max(0,recentErrors.length-8))});
 async function monitor(){
  const main=$('adminMain');if(!main||LX.ui?.state?.adminPage!=='dashboard')return;
  let box=$('lxNovaMonitor');if(!box){box=document.createElement('section');box.id='lxNovaMonitor';box.className='lx-nova-monitor';main.prepend(box)}
  box.textContent='Monitor do site: medindo…';const db=cloud(),start=performance.now();
  try{
   if(!db)throw new Error('Supabase indisponível');
   const {data,error}=await deadline(db.rpc('lx_admin_runtime_status'),8000);
   if(error)throw error;const p=data||{};if(p.error)throw new Error(p.error);
   const ms=Math.round(performance.now()-start),session=await deadline(db.auth.getSession(),6000),token=session?.data?.session?.access_token;
   const probe=async slug=>{
    if(!token)return 'Erro · sem JWT';
    try{const out=await deadline(db.functions.invoke(slug,{body:{},headers:{Authorization:`Bearer ${token}`}}),6000);
     const code=Number(out.error?.context?.status||0),reason=String(out.data?.error||'');
     return code===400&&(/Informe de 1 a 40 links/.test(reason)||reason==='INVALID_MEDIA_KEY')?'Estável · JWT validado':`Atenção · HTTP ${code||'desconhecido'}`;
    }catch(e){return `Erro · ${String(e?.message||e).slice(0,60)}`}
   };
   const [spotifyStatus,mediaStatus,supportCheck]=await Promise.all([probe('lx-spotify-import'),probe('lx-media-ticket'),deadline(db.from('lx_support_tickets').select('id',{count:'exact',head:true}),6000)]);
   const supportStatus=supportCheck.error?`Erro · ${supportCheck.error.message}`:'Estável · acesso validado';
   if(!box.isConnected||LX.ui?.state?.adminPage!=='dashboard')return;
   const errors=recentErrors.length,state=[spotifyStatus,mediaStatus,supportStatus].some(x=>x.startsWith('Erro'))?'Erro':'Atenção';
   box.innerHTML=`<h2>Monitor do site <small>${state}</small></h2><div><span>Usuários online agora <b>${safe(p.online_now??'Não disponível')}</b></span><span>Ativos nos últimos 10 minutos <b>${safe(p.active_10m??'Não disponível')}</b></span><span>Latência Supabase <b>${ms} ms</b></span><span>Edge Functions <b>Spotify: ${safe(spotifyStatus)} · mídia: ${safe(mediaStatus)}</b></span><span>Suporte <b>${safe(supportStatus)}</b></span><span>Estabilidade <b>${state} · reprodução no navegador não verificada</b></span><span>Erros recentes <b>${errors?recentErrors.map(safe).join(' · '):'Nenhum capturado nesta sessão'}</b></span></div>`;
  }catch(err){box.innerHTML=`<h2>Monitor do site <small>Erro</small></h2><p>Supabase / monitor: ${safe(err.message||err)} · Edge Functions: não testadas. Erros recentes: ${recentErrors.length?safe(recentErrors.join(' · ')):'nenhum capturado nesta sessão'}.</p>`}
 }

 LX.recovery={openAI:()=>LX.support?.open?.(),renderAIAdmin:m=>LX.support?.renderAdmin?.(m),renderCarousel,renderSpotifyBulk,renderMp3Import,renderLiveAdmin,renderPublicLive,monitor};LX.contentHub.renderLive=renderPublicLive;
 const top=$('lxAiTop335');if(top)top.onclick=()=>LX.support?.open?.();
})();
