import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dist=path.resolve(import.meta.dirname,'../dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const shell=html.match(/<script>\s*(\/\* LX SHELL v27[\s\S]*?)<\/script>/)?.[1];
const v27=fs.readFileSync(path.join(dist,'lxplus-v27.js'),'utf8');
assert.ok(shell,'inline splash script missing');
assert.ok(v27.includes('if(ident&&ident.textContent!==label)ident.textContent=label;'),'admin label must be idempotent');

function simulate(source){
  let observed=false,observerCallback=null,nextTimer=1,clock=0,writes=0;
  const mutations=[],timers=new Map(),elements=new Map();
  const makeElement=(id,hidden)=>{
    const classes=new Set(hidden?['hidden']:[]),handlers=new Map();
    return {id,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
      addEventListener:(event,fn)=>handlers.set(event,[...(handlers.get(event)||[]),fn]),click:()=>handlers.get('click')?.forEach(fn=>fn())};
  };
  for(const id of ['splash','auth','enterSplash','skipSplash','tabLogin','tabRegister','loginForm','registerForm'])
    elements.set(id,makeElement(id,id==='auth'||id==='registerForm'));
  let text='LX Plus';
  const identity={get textContent(){return text},set textContent(value){text=value;writes++;if(observed)mutations.push({addedNodes:[{nodeType:3}]})}};
  const document={readyState:'loading',documentElement:{},getElementById:id=>elements.get(id)||null,
    querySelector:selector=>selector==='.admin-identity small'?identity:null,querySelectorAll:()=>[],addEventListener:()=>{}};
  const window={addEventListener:()=>{}};
  const context={document,window,MutationObserver:class {constructor(callback){observerCallback=callback}observe(){observed=true}},
    setInterval:()=>0,setTimeout:(fn,ms=0)=>{const id=nextTimer++;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(shell,context,{filename:'lx-shell-inline.js'});
  vm.runInNewContext(source,context,{filename:'lxplus-v27.js'});
  assert.equal(typeof observerCallback,'function');
  const settle=()=>{
    let callbacks=0;
    while(mutations.length){
      assert.ok(++callbacks<=16,'MutationObserver rewrote its own childList indefinitely; intro timers cannot run');
      observerCallback([mutations.shift()]);
    }
    return callbacks;
  };
  const advance=until=>{
    settle();
    for(;;){
      const due=[...timers].filter(([,row])=>row.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!due)break;
      const [id,row]=due;timers.delete(id);clock=row.at;row.fn();settle();
    }
    clock=until;
  };
  return {identity,window,elements,writes,settle,advance,trigger:()=>observerCallback([{addedNodes:[{nodeType:3}]}]),get writeCount(){return writes}};
}

// Negative control: the previous unconditional assignment must demonstrably fail.
const old=v27.replace('if(ident&&ident.textContent!==label)ident.textContent=label;','if(ident)ident.textContent=label;');
assert.notEqual(old,v27);
const broken=simulate(old);broken.trigger();
assert.throws(()=>broken.settle(),/rewrote its own childList indefinitely/);

const fixed=simulate(v27);fixed.trigger();
assert.equal(fixed.settle(),1,'identity update should cause just one follow-up observer callback');
assert.equal(fixed.writeCount,1);
fixed.advance(2700);
assert.equal(fixed.elements.get('splash').classList.contains('hidden'),true,'splash still visible after timers');
assert.equal(fixed.elements.get('auth').classList.contains('hidden'),false,'login never appeared');
assert.equal(fixed.window.__LX_INTRO_DONE,true);
fixed.window.LX.state={user:{adminRole:'owner'}};fixed.trigger();
assert.equal(fixed.settle(),1,'changing the role must also settle');
assert.equal(fixed.identity.textContent,'Dono');
console.log('PASS — reproduz o loop da v27.1 e confirma que a v27.2 permite aos timers abrir o login.');
