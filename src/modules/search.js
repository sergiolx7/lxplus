import {matchingActions} from '../search-actions.js';
import {db} from '../data.js';
import {catalogPage,socialDirectory} from '../services.js';
import {searchTerm,matchesPerson,rememberSearch,fold,suggestQueries} from '../catalog-search.js';
import {esc,empty,avatar,checked} from '../ui.js';
import {premiumCard} from '../premium-ui.js';

const categories={Tudo:[],Cinema:['Filme','Série','Dorama','Anime'],Música:['Música'],Livros:['Livro'],Pessoas:null,Comunidades:null,Recursos:null};
export async function mount(host,ctx){
 let alive=true,filter='Tudo',items=[],total=0,people=[],groups=[],suggestions=[],error='',busy=false,request=0;
 const term=searchTerm(ctx.term);
 function draw(){
  if(!alive)return;
  const content=categories[filter]!==null;
  host.innerHTML='<div class="module-heading"><span class="premium-overline">SUA DESCOBERTA · LX PLUS</span><h1>'+esc(term?'Resultados para “'+term+'”':'O que combina com você?')+'</h1><p>Busque títulos, artistas, álbuns, autores e gêneros. Pessoas e comunidades seguem suas permissões de acesso.</p></div><div class="section-tabs">'+Object.keys(categories).map(k=>'<button data-search-category="'+k+'" class="'+(filter===k?'active':'')+'">'+k+'</button>').join('')+'</div>'+(['Tudo','Recursos'].includes(filter)&&matchingActions(term).length?'<section class="search-actions panel"><h2>Encontre na LX Plus</h2><div class="search-action-grid">'+matchingActions(term).map((a,i)=>'<button class="search-action" data-search-action="'+i+'"><strong>'+esc(a.title)+'</strong><small>'+esc(a.description)+'</small><span aria-hidden="true">↗</span></button>').join('')+'</div></section>':'')+(error?'<div class="panel" role="alert"><p>'+esc(error)+'</p><button class="btn" data-search-retry>Tentar novamente</button></div>':'')+(!term?'<section class="panel"><h2>Suas buscas recentes</h2><div class="actions">'+(ctx.state().searchHistory||[]).map(q=>'<button class="btn" data-search-term="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div><button class="link" data-clear-search>Limpar histórico de busca</button></section>':(content?(suggestions.length?'<div class="panel"><p>Talvez você procure</p><div class="actions">'+suggestions.map(q=>'<button class="btn" data-search-term="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div></div>':'')+'<section><h2>'+total+' conteúdos encontrados</h2>'+(items.length?'<div class="premium-grid">'+items.filter(x=>x.type!=='Música').map(x=>premiumCard(x).replace('data-item=','data-search-item=')).join('')+'</div>'+ (items.some(x=>x.type==='Música')?'<div class="music-result-heading"><h3>Músicas</h3><span>Faixas e artistas</span></div><div class="music-result-list">'+items.filter(x=>x.type==='Música').map(x=>premiumCard(x).replace('data-item=','data-search-item=')).join('')+'</div>':''):empty(busy?'Buscando…':'Nenhum conteúdo encontrado','Experimente o nome do artista, autor, álbum ou gênero.'))+(items.length<total?'<button class="btn load-more" data-search-more '+(busy?'disabled':'')+'>Carregar mais resultados</button>':'')+'</section>':'')+(['Tudo','Pessoas'].includes(filter)?'<section class="search-people"><h2>Pessoas</h2>'+(people.length?people.map(p=>'<article class="notice lx-search-person">'+avatar(p)+'<span class="lx-search-person-copy"><strong>'+esc(p.name||'Membro LX')+'</strong><small>'+esc(p.username?'@'+p.username:'Membro LX')+'</small></span><button type="button" class="btn small" data-search-person="'+esc(p.user_id)+'" aria-label="Ver perfil de '+esc(p.name||'membro')+'">Ver perfil</button></article>').join(''):'<p>Nenhum perfil visível encontrado.</p>')+'</section>':'')+(['Tudo','Comunidades'].includes(filter)?'<section class="panel"><h2>Suas comunidades</h2>'+(groups.length?groups.map(g=>'<p><strong>'+esc(g.name)+'</strong> · '+Number(g.member_count||g.members?.length||0)+' membros</p>').join('')+'<button class="btn" data-page="Comunidade">Abrir comunidade</button>':'<p>Nenhuma comunidade acessível encontrada.</p>')+'</section>':''));
 }
 async function load(append=false){
  const token=++request;busy=true;error='';draw();
  try{
   if(!term)return;
   const [catalog,directory,memberships]=await Promise.all([categories[filter]!==null?catalogPage({term,types:categories[filter],offset:append?items.length:0}):{items:[],total:0},['Tudo','Pessoas'].includes(filter)?socialDirectory():[],['Tudo','Comunidades'].includes(filter)?checked(db.rpc('lx_group_list')):[]]);
   if(!alive||token!==request)return;
   items=append?[...items,...catalog.items]:catalog.items;total=catalog.total;people=(directory||[]).filter(p=>matchesPerson(p,term));groups=(memberships||[]).filter(g=>fold(g.name).includes(fold(term)));
   suggestions=[];if(!total&&categories[filter]!==null){const samples=await Promise.all([['Filme','Série','Dorama','Anime'],['Música'],['Livro']].map(types=>catalogPage({types,limit:20})));if(!alive||token!==request)return;suggestions=suggestQueries(term,samples.flatMap(x=>x.items))}
   if(term.length>=2)ctx.savePreferences?.('searchHistory',rememberSearch(ctx.state().searchHistory,term));
  }catch(e){if(alive&&token===request)error='Não foi possível concluir a busca. Verifique sua conexão e tente novamente.'}
  finally{if(alive&&token===request){busy=false;draw()}}
 }
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.searchAction!==undefined){const action=matchingActions(term)[Number(b.dataset.searchAction)];if(action)ctx.navigate(action.page,{term:action.term||''});return}if(b.dataset.searchCategory){filter=b.dataset.searchCategory;items=[];load()}if(b.dataset.searchItem)ctx.openItem(items.find(x=>String(x.id)===b.dataset.searchItem));if(b.dataset.searchTerm)ctx.navigate('Buscar',{term:b.dataset.searchTerm});if(b.dataset.searchPerson&&people.some(p=>p.user_id===b.dataset.searchPerson))ctx.navigate('Comunidade',{term:'profile:'+b.dataset.searchPerson});if(b.hasAttribute('data-search-more')&&!busy)load(true);if(b.hasAttribute('data-search-retry'))load();if(b.hasAttribute('data-clear-search')){ctx.savePreferences?.('searchHistory',[]);draw()}});
 await load();return{destroy(){alive=false;++request}};
}
