export function normalizeReader(value={},format='pdf'){
 value=value&&typeof value==='object'?value:{};
 const number=(v,f,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
 return {format,position:Math.floor(number(value.format===format?value.position:1,1,1,10000)),scroll:number(value.scroll,0,0,1),total:Math.floor(number(value.total,1,1,10000)),theme:['light','dark','sepia'].includes(value.theme)?value.theme:'dark',fontSize:number(value.fontSize,18,14,30),spacing:number(value.spacing,1.7,1.2,2.4),notes:String(value.notes||'').slice(0,10000),bookmarks:(Array.isArray(value.bookmarks)?value.bookmarks:[]).filter(b=>b&&Number.isInteger(b.position)&&b.position>=1&&b.position<=10000).slice(0,100).map(b=>({position:b.position,label:String(b.label||'Marcador').slice(0,100)}))};
}
export function safeBookPath(base,relative){
 if(typeof relative!=='string'||!relative||/^[a-z][a-z0-9+.-]*:|^\/\/|[\x00-\x1f\\]|%2[ef]|%5c/i.test(relative))throw Error('Referência inválida no EPUB.');
 const url=new URL(relative,'https://book.invalid/'+String(base).replace(/^\//,''));
 if(url.origin!=='https://book.invalid')throw Error('Referência externa não permitida.');
 const path=decodeURIComponent(url.pathname.slice(1));if(path.split('/').includes('..')||path.includes('\\'))throw Error('Caminho inválido no EPUB.');return path;
}
