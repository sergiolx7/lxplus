const key='lxplus-display-v1';
const defaults={performance:'normal',coverSize:'medium',posterFit:'cover',leds:true};
export function normalizeDisplay(value={}){
 return {performance:value.performance==='light'?'light':'normal',coverSize:['small','medium','large'].includes(value.coverSize)?value.coverSize:'medium',posterFit:value.posterFit==='contain'?'contain':'cover',leds:value.leds!==false};
}
let transient={...defaults};
export function readDisplay(storage){try{return normalizeDisplay(JSON.parse((storage??globalThis.localStorage).getItem(key)||'{}'))}catch{return {...transient}}}
export function writeDisplay(patch,storage){const value=normalizeDisplay({...readDisplay(storage),...patch});transient=value;try{(storage??globalThis.localStorage).setItem(key,JSON.stringify(value))}catch{}applyDisplay(value);return value}
export function applyDisplay(value=readDisplay()){
 if(!globalThis.document)return value;
 const root=document.documentElement;root.dataset.performance=value.performance;root.dataset.coverSize=value.coverSize;root.dataset.posterFit=value.posterFit;root.dataset.leds=value.leds?'on':'off';
 document.querySelectorAll('[data-display-size]').forEach(b=>{const selected=b.dataset.displaySize===value.coverSize;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
 document.querySelectorAll('[data-display-setting]').forEach(el=>{const field=el.dataset.displaySetting;if(el.type==='checkbox')el.checked=value[field];else el.value=value[field]});
 document.querySelectorAll('[data-performance-toggle]').forEach(b=>{const light=value.performance==='light';b.setAttribute('aria-pressed',String(light));b.innerHTML='<span aria-hidden="true">'+(light?'◒':'◑')+'</span><span>'+(light?'Modo leve ativo':'Modo leve')+'</span>';b.title=light?'Voltar ao modo normal':'Reduzir efeitos e animações neste aparelho'});
 return value;
}
export function greetingForHour(hour){const h=Number(hour);return h>=0&&h<6?'Boa madrugada':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}
export function displaySizeControls(){const current=readDisplay();return '<div class="display-size-control" role="group" aria-label="Tamanho das capas"><span>Capas</span>'+[['small','Pequenas'],['medium','Médias'],['large','Grandes']].map(([size,label])=>'<button type="button" data-display-size="'+size+'" aria-pressed="'+(current.coverSize===size)+'" class="'+(current.coverSize===size?'active':'')+'">'+label+'</button>').join('')+'</div>'}
export function displaySettings(){const p=readDisplay();return '<section class="panel display-settings"><span class="premium-overline">CONFORTO E DESEMPENHO</span><h2>A LX Plus no seu ritmo.</h2><p>Preferências salvas neste aparelho. O modo leve reduz efeitos, animações e imagens do início.</p><label class="field">Modo de exibição<select data-display-setting="performance"><option value="normal" '+(p.performance==='normal'?'selected':'')+'>Normal · experiência completa</option><option value="light" '+(p.performance==='light'?'selected':'')+'>Leve · menos efeitos</option></select></label>'+displaySizeControls()+'<label class="field">Enquadramento das capas<select data-display-setting="posterFit"><option value="cover" '+(p.posterFit==='cover'?'selected':'')+'>Preencher o quadro</option><option value="contain" '+(p.posterFit==='contain'?'selected':'')+'>Mostrar imagem inteira</option></select></label><label class="setting-toggle"><span>LEDs nas bordas <small>Desligados durante o modo leve.</small></span><input type="checkbox" data-display-setting="leds" '+(p.leds?'checked':'')+'></label></section>'}
export function bindDisplayControls(onChange=()=>{}){
 applyDisplay();
 const click=e=>{const button=e.target.closest('[data-display-size],[data-performance-toggle]');if(!button)return;const value=button.hasAttribute('data-performance-toggle')?writeDisplay({performance:readDisplay().performance==='light'?'normal':'light'}):writeDisplay({coverSize:button.dataset.displaySize});onChange(value)};
 const change=e=>{const field=e.target.dataset.displaySetting;if(!['performance','posterFit','leds'].includes(field))return;const value=writeDisplay({[field]:e.target.type==='checkbox'?e.target.checked:e.target.value});onChange(value)};
 const sync=e=>{if(e.key===key){applyDisplay();onChange(readDisplay())}};
 document.addEventListener('click',click);document.addEventListener('change',change);window.addEventListener('storage',sync);
 return()=>{document.removeEventListener('click',click);document.removeEventListener('change',change);window.removeEventListener('storage',sync)};
}
