import {catalogPage} from '../services.js';
import {catalogPageTypes,normalizedCatalogMatch} from '../catalog-filters.js';
import {esc,empty,icon} from '../ui.js';
import {displaySizeControls} from '../display-preferences.js';
import {premiumCard} from '../premium-ui.js';
import {catalogSorts} from '../catalog-sort.js';

export async function mount(host,ctx){
 let alive=true,busy=false,generation=0,items=[],total=0,offset=0,error='',subtype='Todos',sort='recent',filtersOpen=false;
 const themes={Filmes:['film','CINEMA LX','Histórias para entrar de cabeça.'],Séries:['series','UM EPISÓDIO A MAIS','Encontre a série que combina com você.'],Doramas:['heart','CADA ENCONTRO, UMA HISTÓRIA','Descubra sua próxima paixão.'],Animes:['sparkles','EXPLORE OUTROS UNIVERSOS','Novos mundos começam aqui.'],Livros:['book','BIBLIOTECA LX','Uma boa história também se lê.'],'Ao vivo':['screen','ACONTECENDO AGORA','Escolha o que acompanhar.']};
 const filters={genre:'',country:'',year:''};
 const isSeries=ctx.page==='Séries';
 const canFilter=['Filmes','Séries','Doramas','Animes','Livros'].includes(ctx.page);
 function filterBar(){
  if(!canFilter)return '';
  const tabs=isSeries?'<div class="lx-catalog-subtypes" role="group" aria-label="Tipo de conteúdo">'+[['Todos','Tudo'],['Série','Séries'],['Dorama','Doramas'],['Anime','Animes']].map(([key,label])=>'<button type="button" data-catalog-subtype="'+key+'" aria-pressed="'+(subtype===key)+'">'+label+'</button>').join('')+'</div>':'';
  const active=Object.values(filters).filter(Boolean).length+(subtype!=='Todos'?1:0);
  return '<details class="lx5-catalog-refine" '+(filtersOpen?'open':'')+'><summary>'+icon('sliders')+'<span>Filtrar '+(ctx.page==='Livros'?'leituras':'histórias')+'</span>'+(active?'<span class="badge">'+active+' '+(active===1?'ativo':'ativos')+'</span>':'')+'<span aria-hidden="true">⌄</span></summary><div class="lx-catalog-filters">'+tabs+'<form id="lxCatalogFilters" aria-label="Filtrar catálogo">'+
   '<label>Gênero<input name="genre" type="search" maxlength="80" value="'+esc(filters.genre)+'" placeholder="Ex.: Drama" autocomplete="off"></label>'+
   '<label>País<input name="country" type="search" maxlength="80" value="'+esc(filters.country)+'" placeholder="País de origem" autocomplete="off"></label>'+
   '<label>Ano<input name="year" type="number" min="1900" max="2100" step="1" value="'+esc(filters.year)+'" placeholder="Ano"></label>'+
   '<button type="button" class="btn small" data-catalog-clear '+(!filters.genre&&!filters.country&&!filters.year&&subtype==='Todos'?'disabled':'')+'>Limpar filtros</button></form><small class="muted">Combine gênero, país e ano para encontrar sua próxima escolha.</small></div></details>';
 }
 function draw(){
  if(!alive)return;
  const previous=host.querySelector('.lx5-catalog-refine');if(previous)filtersOpen=previous.open;
  const [symbol,eyebrow,description]=themes[ctx.page]||['film','SEU UNIVERSO LX','Descubra sua próxima história.'];
  host.innerHTML='<header class="module-heading lx5-catalog-heading"><div><span class="premium-overline">'+esc(eyebrow)+'</span><h1>'+esc(ctx.term?'Resultados para “'+ctx.term+'”':ctx.page)+'</h1><p>'+esc(description)+'</p><span class="lx5-catalog-count" role="status">'+(busy?'Buscando no catálogo…':total.toLocaleString('pt-BR')+' '+(ctx.page==='Livros'?(total===1?'leitura':'leituras'):(total===1?'título':'títulos'))+' no catálogo')+'</span></div><span class="lx5-catalog-symbol" aria-hidden="true">'+icon(symbol)+'</span></header>'+
   filterBar()+(error?'<div class="panel" role="alert"><p>'+esc(error)+'</p><button class="btn" data-catalog-retry>Tentar novamente</button></div>':'')+
   '<div class="catalog-browse-bar">'+displaySizeControls()+'<label class="catalog-sort">Ordenar<select data-catalog-sort aria-label="Ordenar catálogo">'+Object.entries(catalogSorts).map(([key,value])=>'<option value="'+key+'" '+(sort===key?'selected':'')+'>'+value.label+'</option>').join('')+'</select></label></div>'+
   (items.length?'<div class="premium-grid">'+items.map(item=>premiumCard(item).replace('data-item=','data-catalog-item=')).join('')+'</div>':empty(busy?'Carregando histórias…':'Nenhum título encontrado',ctx.term||Object.values(filters).some(Boolean)||subtype!=='Todos'?'Altere os filtros ou tente outro título.':'Este catálogo está pronto para receber conteúdos revisados.'))+
   (offset<total?'<button class="btn load-more" data-catalog-more '+(busy?'disabled':'')+'>Carregar mais títulos</button>':'');
 }
 async function load(append=false){
  if(!alive||(append&&busy))return;
  const token=++generation;busy=true;error='';
  if(!append){items=[];total=0;offset=0;draw()}
  try{
   const result=await catalogPage({types:catalogPageTypes(ctx.page,subtype),term:ctx.term,offset:append?offset:0,match:normalizedCatalogMatch(filters),sort});
   if(!alive||token!==generation)return;
   items=append?[...items,...result.items]:result.items;total=result.total;offset=items.length;
  }catch(failure){if(alive&&token===generation)error='Não foi possível carregar o catálogo. Verifique sua conexão e tente novamente.'}
  finally{if(alive&&token===generation){busy=false;draw()}}
 }
 host.addEventListener('submit',event=>{if(event.target.id==='lxCatalogFilters')event.preventDefault()});
 host.addEventListener('change',event=>{
  if(event.target.matches('[data-catalog-sort]')){sort=Object.hasOwn(catalogSorts,event.target.value)?event.target.value:'recent';load();return}
  if(!event.target.closest('#lxCatalogFilters'))return;
  if(!['genre','country','year'].includes(event.target.name))return;
  filters[event.target.name]=event.target.value;
  load();
 });
 host.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.catalogItem){const item=items.find(x=>String(x.id)===b.dataset.catalogItem);if(item)ctx.openItem(item)}
  if(b.dataset.catalogSubtype&&isSeries){subtype=b.dataset.catalogSubtype;load()}
  if(b.hasAttribute('data-catalog-clear')){subtype='Todos';Object.keys(filters).forEach(key=>filters[key]='');load()}
  if(b.hasAttribute('data-catalog-more'))load(true);
  if(b.hasAttribute('data-catalog-retry'))load();
 });
 draw();await load();
 return{destroy(){alive=false;++generation}};
}
