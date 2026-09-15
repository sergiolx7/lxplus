import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dist=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const shell=html.match(/<script>\s*(\/\* LX SHELL v27[\s\S]*?)<\/script>/)?.[1];
assert.ok(shell,'inline splash fallback not found');

function simulate(){
  const elements=new Map(),timers=new Map();let tick=0,next=1;
  const element=id=>{
    if(!elements.has(id)){
      const classes=new Set(id==='splash'||id==='loginForm'||id==='tabLogin'?[]:['hidden']);
      const handlers={};
      elements.set(id,{id,handlers,onclick:null,classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle:(name,force)=>{if(force)classes.add(name);else classes.delete(name)}},addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)}});
    }
    return elements.get(id);
  };
  const window={};
  const context={window,document:{readyState:'loading',getElementById:element,addEventListener(){}},setTimeout:(fn,delay=0)=>{const id=next++;timers.set(id,{fn,at:tick+delay});return id},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(shell,context,{filename:'lx-shell-inline.js'});
  const advance=until=>{while(true){const nextTimer=[...timers].filter(([,row])=>row.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!nextTimer)break;const [id,row]=nextTimer;timers.delete(id);tick=row.at;row.fn()}tick=until};
  return {element,window,advance,click:id=>{const el=element(id);for(const fn of el.handlers.click||[])fn();el.onclick?.()},timers};
}

const automatic=simulate();
assert.equal(automatic.element('auth').classList.contains('hidden'),true);
automatic.advance(2700);
assert.equal(automatic.element('splash').classList.contains('hidden'),true,'splash remained visible without DOMContentLoaded');
assert.equal(automatic.element('auth').classList.contains('hidden'),false,'login never opened automatically');
assert.equal(automatic.window.__LX_INTRO_DONE,true);

const manual=simulate();
manual.click('skipSplash');
manual.advance(0);
assert.equal(manual.element('auth').classList.contains('hidden'),false,'Pular depends on core initialization');
assert.equal(manual.element('splash').classList.contains('hidden'),true);
assert.equal(manual.timers.size,0,'auto timer kept running after Pular');

assert.match(fs.readFileSync(path.join(dist,'lxplus.js'),'utf8'),/U\.show\(window\.__LX_INTRO_DONE\?'auth':'splash'\)/,'late core cannot reopen intro');
console.log('PASS — login automático e Pular abrem sem DOMContentLoaded nem núcleo; inicialização tardia não reabre a entrada.');
