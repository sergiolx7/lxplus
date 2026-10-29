// ADM Studio: purely presentational review of existing catalog and importer results.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(String(s||''),location.origin);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
export function studioOverview({catalog=[],scan=null}={}){
 const total=(catalog||[]).length, rows=scan?.files||[],ready=rows.filter(x=>x.qualifies).length;
 const artwork=rows.filter(x=>x.match?.cover||x.match?.banner).slice(0,8);
 const recent=(catalog||[]).filter(x=>x.cover||x.banner).slice(0,8);
 const sources=artwork.length?artwork:recent.map(x=>({driveId:String(x.id),match:{title:x.title,cover:x.cover,banner:x.banner,year:x.year,desc:x.description}}));
 return '<section class="studio-overview"><div class="premium-studio-heading"><div><span class="premium-overline">LX GROUP · CENTRAL DE CONTEÚDO</span><h1>ADM Studio</h1><p class="muted">Organize, revise e apresente cada título com visual de cinema. As alterações só são publicadas quando autorizadas.</p></div><span class="badge">Área restrita</span></div>'+
 '<div class="premium-studio-stats"><div class="panel"><small>CATÁLOGO VISÍVEL</small><strong>'+total.toLocaleString('pt-BR')+'</strong></div><div class="panel"><small>ARQUIVOS ANALISADOS</small><strong>'+rows.length+'</strong></div><div class="panel"><small>PRONTOS PARA REVISÃO</small><strong>'+ready+'</strong></div></div>'+
 '<div class="panel" style="margin-bottom:22px"><div class="heading"><div><span class="premium-overline">CURADORIA VISUAL</span><h2>Estúdio de capas e banners</h2><p>Pré-visualize os materiais em layouts para desktop e celular antes de publicar. O sistema usa as imagens disponíveis, sem inventar qualidade ou arquivos novos.</p></div></div>'+
 (sources.length?'<div class="studio-preview-gallery">'+sources.map((x,i)=>{const m=x.match||{},url=safeUrl(m.banner||m.cover);
 return '<button class="studio-preview-card" type="button" data-studio-preview="'+i+'">'+(url?'<img loading="lazy" decoding="async" src="'+esc(url)+'" alt="">':'<div class="premium-image-fallback" style="height:150px">LX</div>')+'<strong>'+esc(m.title||'Sem título')+'</strong><small>Visualizar formatos e metadados ↗</small></button>';
 }).join('')+'</div>':'<p class="muted">Depois de analisar uma pasta, os filmes aparecerão aqui para pré-visualização.</p>')+
 '</div><div class="panel" style="margin-bottom:22px"><div class="heading"><div><span class="premium-overline">FLUXO DE PUBLICAÇÃO</span><h2>Importação assistida</h2></div></div><p>1. Envie o link da pasta do Drive. 2. Revise título, ano, capa e banner sugeridos. 3. Verifique duplicatas e direitos de distribuição. 4. Publique os títulos aprovados.</p><p class="muted">Imagens em alta resolução dependem da disponibilidade e dos direitos da fonte. A sincronização automática contínua ainda exige configuração no servidor.</p></div></section>';
}
export function studioSources({catalog=[],scan=null}={}){
 const a=(scan?.files||[]).filter(x=>x.match?.cover||x.match?.banner).slice(0,8);
 if(a.length)return a.map(x=>({title:x.match.title||x.parsed?.title||x.name,year:x.match.year,description:x.match.desc||'',cover:x.match.cover||'',banner:x.match.banner||''}));
 return (catalog||[]).filter(x=>x.cover||x.banner).slice(0,8).map(x=>({title:x.title,year:x.year,description:x.description||x.desc||'',cover:x.cover||'',banner:x.banner||''}));
}
export function studioPreview(item){
 if(!item)return '';
 const title=esc(item.title||'Título sem nome'),banner=safeUrl(item.banner||item.cover),poster=safeUrl(item.cover||item.banner);
 const fallback='<div class="premium-image-fallback">LX</div>';
 return '<div class="studio-art-preview"><p class="muted">Prévia responsiva. O recorte pode variar conforme a imagem original.</p>'+
 '<div class="studio-preview-columns"><div><span class="studio-frame-label">DESKTOP · 16:7</span><div class="studio-banner">'+(banner?'<img src="'+esc(banner)+'" alt="">':fallback)+'<h3>'+title+'</h3></div></div>'+
 '<div><span class="studio-frame-label">CELULAR · 9:16</span><div class="studio-mobile">'+(poster?'<img src="'+esc(poster)+'" alt="">':fallback)+'<h3>'+title+'</h3></div></div></div>'+
 '<div class="panel"><strong>'+title+'</strong><p>'+esc(item.year||'')+'</p><p>'+esc(item.description||'Descrição não disponível. Revise os metadados antes da publicação.')+'</p><small>Fonte da arte: '+esc(banner||poster?'URL existente':'não fornecida')+'</small></div></div>';
}
