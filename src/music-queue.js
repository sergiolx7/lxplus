export class MusicQueue {
 constructor(){this.items=[];this.index=-1;this.shuffle=false;this.repeat='off';this.previous=[];this.played=new Set()}
 set(items,current){this.items=[...new Map(items.filter(Boolean).map(x=>[String(x.id),x])).values()];this.index=this.items.findIndex(x=>String(x.id)===String(current.id));if(this.index<0){this.items.unshift(current);this.index=0}this.previous=[];this.played=new Set([this.index])}
 next({ended=false,random=Math.random,match=()=>true}={}){
  if(!this.items.length)return null;
  if(ended&&this.repeat==='one')return this.items[this.index];
  const accepts=i=>i!==this.index&&match(this.items[i],this.items[this.index]);
  let next=-1;
  if(this.shuffle){
   let candidates=this.items.map((_,i)=>i).filter(i=>accepts(i)&&!this.played.has(i));
   if(!candidates.length&&this.repeat!=='off'){
    this.played.clear();
    candidates=this.items.map((_,i)=>i).filter(accepts);
   }
   if(!candidates.length)return null;
   next=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
  }else{
   for(let i=this.index+1;i<this.items.length;i++)if(accepts(i)){next=i;break}
   if(next<0&&this.repeat!=='off')
    for(let i=0;i<this.index;i++)if(accepts(i)){next=i;break}
   if(next<0&&this.repeat!=='off'&&this.items.length===1)
    next=this.index;
  }
  if(next<0)return null;
  this.previous.push(this.index);
  this.index=next;
  this.played.add(next);
  return this.items[next];
 }

 back(){if(!this.items.length)return null;this.index=this.previous.length?this.previous.pop():Math.max(0,this.index-1);return this.items[this.index]}
 // Keep the playing track, shuffle coverage and previous-history stable when ordering changes.
 move(from,to){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=this.items.length||to>=this.items.length)return false;
  if(from===to)return true;
  const current=this.items[this.index],history=this.previous.map(i=>this.items[i]).filter(Boolean),played=this.items.filter((_,i)=>this.played.has(i));
  const [moving]=this.items.splice(from,1);this.items.splice(to,0,moving);
  this.index=this.items.indexOf(current);
  this.previous=history.map(track=>this.items.indexOf(track)).filter(i=>i>=0);
  this.played=new Set(played.map(track=>this.items.indexOf(track)).filter(i=>i>=0));
  return true;
 }
 remove(index){
  if(!Number.isInteger(index)||index<0||index>=this.items.length||index===this.index)return false;
  const current=this.items[this.index],history=this.previous.map(i=>this.items[i]),played=[...this.played].map(i=>this.items[i]);
  this.items.splice(index,1);this.index=this.items.indexOf(current);
  this.previous=history.map(item=>this.items.indexOf(item)).filter(i=>i>=0);
  this.played=new Set(played.map(item=>this.items.indexOf(item)).filter(i=>i>=0));
  return true;
 }
 add(item){if(!this.items.some(x=>String(x.id)===String(item.id)))this.items.push(item)}
}
