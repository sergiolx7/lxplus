export class MusicQueue {
 constructor(){this.items=[];this.index=-1;this.shuffle=false;this.repeat='off';this.previous=[];this.played=new Set()}
 set(items,current){this.items=[...new Map(items.filter(Boolean).map(x=>[String(x.id),x])).values()];this.index=this.items.findIndex(x=>String(x.id)===String(current.id));if(this.index<0){this.items.unshift(current);this.index=0}this.previous=[];this.played=new Set([this.index])}
 next({ended=false,random=Math.random}={}){
  if(!this.items.length)return null;if(ended&&this.repeat==='one')return this.items[this.index];let next;
  if(this.shuffle){let candidates=this.items.map((_,i)=>i).filter(i=>!this.played.has(i));if(!candidates.length){if(this.repeat==='off')return null;this.played.clear();candidates=this.items.map((_,i)=>i).filter(i=>i!==this.index)}if(!candidates.length)return this.repeat==='off'?null:this.items[this.index];next=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]}
  else{next=this.index+1;if(next>=this.items.length){if(this.repeat==='off')return null;next=0}}
  this.previous.push(this.index);this.index=next;this.played.add(next);return this.items[next];
 }
 back(){if(!this.items.length)return null;this.index=this.previous.length?this.previous.pop():Math.max(0,this.index-1);return this.items[this.index]}
 add(item){if(!this.items.some(x=>String(x.id)===String(item.id)))this.items.push(item)}
}
