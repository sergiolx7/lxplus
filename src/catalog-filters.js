// Exact metadata filters are applied server-side to the complete published catalogue.
const typesByPage={Filmes:['Filme'],Séries:['Série','Dorama','Anime'],Doramas:['Dorama'],Animes:['Anime'],Livros:['Livro'],'Ao vivo':['Ao Vivo']};
export function catalogPageTypes(page,subtype='Todos'){
 const types=typesByPage[page]||[];
 return page==='Séries'&&types.includes(subtype)?[subtype]:[...types];
}
export function normalizedCatalogMatch(value={}){
 const result={};
 for(const field of ['genre','country']){
  const text=String(value?.[field]||'').normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,80);
  if(text)result[field]=text;
 }
 const year=String(value?.year||'').trim();
 if(/^\d{4}$/.test(year)&&Number(year)>=1900&&Number(year)<=2100)result.year=year;
 return result;
}
