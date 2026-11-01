const fields=['title','artist','album','author','genre'];
export function searchTerm(value){return String(value||'').normalize('NFKC').replace(/[^\p{L}\p{N}\s'_-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,90)}
export function catalogFilter(value){const term=searchTerm(value);return term?fields.map(field=>'payload->>'+field+'.ilike.%'+term+'%').join(','):''}
export function fold(value){return String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').trim()}
export function matchesPerson(person,term){const q=fold(searchTerm(term));return !!q&&fold([person.name,person.username].join(' ')).includes(q)}
export function rememberSearch(history,term){const q=searchTerm(term);return q?[q,...(Array.isArray(history)?history:[]).filter(x=>fold(x)!==fold(q))].slice(0,10):Array.isArray(history)?history:[]}
function distance(a,b){if(Math.abs(a.length-b.length)>2)return 3;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row}return prev[b.length]}
export function suggestQueries(term,items){
 const query=fold(searchTerm(term));if(query.length<3)return [];
 const candidates=[...new Set(items.filter(x=>x.published!==false).flatMap(x=>fields.flatMap(k=>typeof x[k]==='string'?[x[k]]:[])))].slice(0,300);
 return candidates.map(text=>({text,score:Math.min(...[fold(text),...fold(text).split(/\s+/)].map(word=>distance(query,word)))})).filter(x=>x.score>0&&x.score<=Math.min(2,Math.floor(query.length/4)+1)).sort((a,b)=>a.score-b.score||a.text.localeCompare(b.text)).slice(0,4).map(x=>x.text);
}
