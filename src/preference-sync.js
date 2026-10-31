// Serialize account writes so a slower response cannot replace a newer choice.
// A new binding invalidates both queued writes and responses from the old account.
export function preferenceSync({save,onSaved=()=>{},onError=()=>{}}){
 let owner=null,epoch=0,pending=new Map(),running=null;
 async function drain(){
  while(pending.size){
   const [key,job]=pending.entries().next().value;pending.delete(key);
   try{const result=await save(job.owner,job.key,job.value);if(job.epoch===epoch&&!pending.has(job.key))onSaved(job.key,job.value,result)}
   catch(error){if(job.epoch===epoch)onError(error)}
  }
 }
 return {
  bind(id){owner=id||null;++epoch;pending.clear()},
  write(key,value){
   if(!owner)return Promise.resolve();
   pending.set(key,{owner,epoch,key,value:structuredClone(value)});
   if(!running)running=drain().finally(()=>{running=null});
   return running;
  },
  flush(){return running||Promise.resolve()}
 };
}
