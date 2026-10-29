// LX Plus Premium: UI-only view helpers. No network calls or privileged credentials.
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mediaUrl=s=>{try{const u=new URL(String(s||''),location.origin);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const fmtKind=x=>String(x||'Conteúdo');
const safeTitle=x=>html(x?.title||'Sem título');
const setItem=x=>html(String(x?.id??''));
function poster(x,variant='poster'){
 const url=mediaUrl(variant==='landscape'?(x.banner||x.cover):(x.cover||x.banner));
 return '<div class="premium-cover '+(variant==='landscape'?'landscape':'portrait')+'">'+
 (url?'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+html(url)+'" alt="">':'<div class="premium-image-fallback">LX<span>PLUS</span></div>')+
 '<div class="premium-image-shade"></div><span class="premium-play">▶</span></div>';
}
export function premiumCard(x,variant='poster'){
 return '<button class="premium-card '+(variant==='landscape'?'wide':'')+'" type="button" data-item="'+setItem(x)+'" aria-label="Abrir '+safeTitle(x)+'">'+poster(x,variant)+
 '<div class="premium-card-copy"><strong>'+safeTitle(x)+'</strong><small>'+html([x.year,x.genre||x.type].filter(Boolean).join(' · '))+'</small></div></button>';
}
function row(title,subtitle,items,key,variant='poster'){
 const picks=(items||[]).filter(Boolean).slice(0,16);
 if(!picks.length)return '';
 return '<section class="premium-section" aria-label="'+html(title)+'"><div class="premium-row-title"><div><span class="premium-overline">'+html(subtitle)+'</span><h2>'+html(title)+'</h2></div><div class="rail-actions"><button data-scroll="'+html(key)+'" data-direction="-1" aria-label="Voltar '+html(title)+'">‹</button><button data-scroll="'+html(key)+'" data-direction="1" aria-label="Avançar '+html(title)+'">›</button></div></div>'+
 '<div class="premium-rail" data-rail="'+html(key)+'">'+picks.map(x=>premiumCard(x,variant)).join('')+'</div></section>';
}
function feature(item){
 if(!item)return '<div class="premium-welcome"><div class="premium-overline">LX PLUS · NOVA EXPERIÊNCIA</div><h1>Seu universo. Seu ritmo.</h1><p>Filmes, séries, música e comunidade, em um só lugar.</p></div>';
 const url=mediaUrl(item.banner||item.cover);
 return '<section class="premium-feature"><div class="premium-feature-image">'+(url?'<img src="'+html(url)+'" alt="" fetchpriority="high" referrerpolicy="no-referrer">':'')+'</div><div class="premium-feature-grad"></div>'+
 '<div class="premium-feature-text"><span class="premium-overline">✦ ESCOLHA LX PLUS</span><h1>'+safeTitle(item)+'</h1><p>'+html((item.description||item.desc||'Descubra uma nova história na LX Plus.').slice(0,230))+'</p><div class="premium-meta"><span>'+html(item.year||'Destaque')+'</span><span>'+html(fmtKind(item.type))+'</span><span>Na LX Plus</span></div>'+
 '<div class="premium-feature-actions"><button class="btn primary" data-item="'+setItem(item)+'">▶ Ver detalhes</button><button class="btn premium-secondary" data-page="Minha Lista">♡ Minha lista</button></div></div><span class="premium-feature-bottom">LX ORIGINAL EXPERIENCE</span></section>';
}
function categoryStats(items){
 const labels=[['Filmes','Filme','▣'],['Séries','Série','▤'],['Músicas','Música','♫'],['Livros','Livro','▥']];
 return '<section class="premium-quick">' + labels.map(([page,kind,icon])=>{
 const n=items.filter(x=>x.type===kind || (page==='Séries'&&['Dorama','Anime'].includes(x.type))).length;
 return '<button class="premium-quick-tile" data-page="'+page+'"><span class="quick-icon">'+icon+'</span><span><strong>'+page+'</strong><small>'+n.toLocaleString('pt-BR')+' no catálogo</small></span><i>↗</i></button>';
 }).join('')+'</section>';
}
function home({items,history,list}){
 const current=(items||[]),withArt=current.filter(x=>x.banner||x.cover);
 const fav=new Set((list||[]).map(String));
 const seen=Object.entries(history||{}).sort((a,b)=>String(b[1]?.updatedAt||'').localeCompare(String(a[1]?.updatedAt||'')))
 .map(([k])=>current.find(x=>String(x.id)===k)).filter(Boolean).slice(0,10);
 const featured=withArt.find(x=>x.featured&&x.banner)||withArt.find(x=>x.banner)||withArt[0]||current[0];
 const recent=[...current].sort((a,b)=>String(b.year||'').localeCompare(String(a.year||''))).filter(x=>x.cover||x.banner).slice(0,22);
 const movies=current.filter(x=>x.type==='Filme'), shows=current.filter(x=>['Série','Dorama','Anime'].includes(x.type));
 const audio=current.filter(x=>x.type==='Música'),books=current.filter(x=>x.type==='Livro');
 const favorites=current.filter(x=>fav.has(String(x.id)));
 return feature(featured)+categoryStats(current)+
 row('Continue assistindo','RETOME DE ONDE PAROU',seen,'continue','landscape')+
 row('Novidades do catálogo','SELEÇÃO DA LX PLUS',recent,'recent','landscape')+
 row('Sua lista','SALVOS PARA VOCÊ',favorites,'saved')+
 row('Filmes para explorar','CINEMA',movies,'movies')+
 row('Séries e doramas','TEMPORADAS E HISTÓRIAS',shows,'series')+
 row('LX Music','OUÇA NO SEU RITMO',audio,'music')+
 row('LX Books','HISTÓRIAS PARA LER',books,'books');
}
function listing({items,page,filter,term}){
 const options=['Todos','Filme','Série','Dorama','Anime','Música','Livro'];
 return '<div class="premium-listing-head"><span class="premium-overline">EXPLORE O UNIVERSO LX</span><h1>'+html(term?'Resultados para “'+term+'”':page)+'</h1><p>'+items.length+' resultados · Escolha o que combina com seu momento.</p></div>'+
 '<div class="filters premium-filters">'+options.map(x=>'<button type="button" class="chip '+(filter===x?'active':'')+'" data-filter="'+html(x)+'">'+html(x)+'</button>').join('')+'</div>'+
 (items.length?'<div class="premium-grid">'+items.slice(0,100).map(x=>premiumCard(x)).join('')+'</div>'+(items.length>100?'<p class="muted premium-result-note">Mostrando os primeiros 100 resultados. Refine sua busca para localizar outros títulos.</p>':''):'<div class="panel premium-empty"><h2>Nenhum resultado encontrado</h2><p>Tente outra palavra ou categoria.</p><button id="clear" class="btn">Limpar pesquisa</button></div>');
}
export function renderPremiumCatalog({items,page,filter='Todos',term='',history={},list=[],catalogStatus='ready'}={}){
 if(catalogStatus==='loading'&&!items?.length)return '<div class="premium-skeleton"><div class="premium-skeleton-feature"></div><div class="premium-skeleton-row"></div><div class="premium-skeleton-row"></div><p>Preparando sua biblioteca LX Plus…</p></div>';
 if(catalogStatus==='error'&&!items?.length)return '<div class="premium-listing-head"><h1>Catálogo indisponível</h1><p>Seu login continua conectado; os títulos não responderam.</p><button class="btn primary" id="retryCatalog">Tentar novamente</button></div>';
 if(page==='Início'&&!term)return home({items,history,list});
 return listing({items,page,filter,term});
}
