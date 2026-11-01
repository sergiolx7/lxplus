export function socialDrafts(userId,{storage=globalThis.sessionStorage,now=()=>Date.now()}={}){
 const key='lx-social-drafts-v1:'+userId;let entries={};
 try{const saved=JSON.parse(storage?.getItem(key)||'{}');if(saved.updated>now()-86400000&&saved.entries&&typeof saved.entries==='object')entries=saved.entries}catch{}
 function persist(){try{storage?.setItem(key,JSON.stringify({updated:now(),entries}))}catch{}}
 return {get(id){const value=entries[id];return value&&typeof value==='object'?{text:String(value.text||'').slice(0,4000),visibility:['public','friends','private'].includes(value.visibility)?value.visibility:'public'}:{text:'',visibility:'public'}},set(id,value){entries[id]={text:String(value.text||'').slice(0,4000),visibility:['public','friends','private'].includes(value.visibility)?value.visibility:'public'};if(Object.keys(entries).length>100)delete entries[Object.keys(entries)[0]];persist()},clear(id){delete entries[id];persist()}};
}
// Reuse the same client ID after an uncertain response, and reject concurrent sends.
export function messageOutbox(createId){
 const jobs=new Map();
 return {begin(thread,body,media=''){const previous=jobs.get(thread);if(previous?.sending)throw Error('Uma mensagem ainda está sendo enviada nesta conversa.');const signature=JSON.stringify([body,media]),id=previous?.signature===signature?previous.id:createId();jobs.set(thread,{id,signature,sending:true});return id},finish(thread,id,success){const job=jobs.get(thread);if(job?.id!==id)return;if(success)jobs.delete(thread);else job.sending=false}};
}
