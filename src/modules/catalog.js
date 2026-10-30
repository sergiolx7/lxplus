import {catalogPage} from '../services.js';
import {esc,empty} from '../ui.js';
import {premiumCard} from '../premium-ui.js';
export async function mount(host,ctx){
 let items=[],total=0,offset=0,alive=true,busy=false;
 const types={Filmes:['Filme'],Séries:['Série','Dorama','Anime'],Livros:['Livro'],'Ao vivo':['Ao Vivo']}[ctx.page]||[];
 async function load(append=false){if(busy)return;busy=true;try{const r=await catalogPage({types,term:ctx.term,offset:append?offset:0});if(!alive)return;items=append?[...items,...r.items]:r.items;total=r.total;offset=items.length;draw()}catch(error){if(alive)host.innerHTML=empty('Não foi possível carregar o catálogo',error.message,'<button class="btn" data-catalog-retry>Tentar novamente</button>')}finally{busy=false}}
 function draw(){host.innerHTML='<div class="module-heading"><span class="premium-overline">SEU UNIVERSO LX</span><h1>'+esc(ctx.term?'Resultados para “'+ctx.term+'”':ctx.page)+'</h1><p>'+total.toLocaleString('pt-BR')+' títulos · Descubra sua próxima história.</p></div>'+(items.length?'<div class="premium-grid">'+items.map(item=>premiumCard(item).replace('data-item=','data-catalog-item=')).join('')+'</div>':empty('Novas histórias a caminho',ctx.term?'Tente pesquisar outro título.':'Este catálogo está pronto para receber conteúdos revisados.'))+(offset<total?'<button class="btn load-more" data-catalog-more>Carregar mais títulos</button>':'')}
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.catalogItem){const item=items.find(x=>String(x.id)===b.dataset.catalogItem);if(item)ctx.openItem(item)}if(b.hasAttribute('data-catalog-more'))load(true);if(b.hasAttribute('data-catalog-retry'))load()});
 host.innerHTML=empty('Carregando catálogo…');await load();return {destroy(){alive=false}};
}
