// Browser equalization changes tonal balance, never the resolution of the source.
export const eqBands=[{frequency:80,label:'Graves'},{frequency:250,label:'Corpo'},{frequency:1000,label:'Médios'},{frequency:4000,label:'Voz'},{frequency:12000,label:'Brilho'}];
export const eqPresets={natural:{name:'Original',bands:[0,0,0,0,0]},bass:{name:'Mais graves',bands:[5,2,0,-1,1]},clear:{name:'Clareza',bands:[-2,-1,1,3,2]},vocal:{name:'Voz em destaque',bands:[-3,-1,3,2,-1]},warm:{name:'Aconchegante',bands:[3,2,0,-1,-2]}};
export function normalizeAudioEffects(value={}){
 value=value&&typeof value==='object'?value:{};
 const preset=Object.hasOwn(eqPresets,value.preset)?value.preset:value.preset==='custom'?'custom':'natural';
 const bands=(Array.isArray(value.bands)&&value.bands.length===5?value.bands:eqPresets[preset]?.bands||eqPresets.natural.bands).map(v=>Number.isFinite(Number(v))?Math.min(6,Math.max(-6,Number(v))):0);
 return {enabled:value.enabled===true,preset,bands};
}
export async function supportsAudioEffects(source,{origin=globalThis.location?.origin,signal,fetcher=globalThis.fetch}={}){
 if(source?.kind!=='audio')return false;
 let url;try{url=new URL(source.url)}catch{return false}
 if(url.origin===origin&&['https:','http:','blob:'].includes(url.protocol))return true;
 if(url.protocol!=='https:'||!fetcher)return false;
 try{const response=await fetcher(url.href,{method:'HEAD',mode:'cors',credentials:'omit',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(3500)]):AbortSignal.timeout(3500)});return response.ok&&response.type!=='opaque'}catch{return false}
}
export class AudioEffects {
 constructor(){this.context=null;this.source=null;this.nodes=[];this.settings=normalizeAudioEffects()}
 resume(){const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Ctor)return Promise.reject(Error('Este navegador não oferece equalizador.'));this.context||=new Ctor();return this.context.resume()}
 attach(media,settings,{analyze=false}={}){this.detach();const ctx=this.context;if(!ctx||ctx.state==='closed')throw Error('O equalizador não está disponível.');this.source=ctx.createMediaElementSource(media);this.preamp=ctx.createGain();this.filters=eqBands.map((band,i)=>{const node=ctx.createBiquadFilter();node.type=i===0?'lowshelf':i===4?'highshelf':'peaking';node.frequency.value=band.frequency;node.Q.value=.8;return node});this.analyser=analyze&&ctx.createAnalyser?ctx.createAnalyser():null;if(this.analyser){this.analyser.fftSize=256;this.samples=new Uint8Array(256)}this.nodes=[this.preamp,...this.filters,...(this.analyser?[this.analyser]:[])];this.update(settings)}
 update(settings){this.settings=normalizeAudioEffects(settings);if(!this.source)return;this.source.disconnect();this.nodes.forEach(node=>node.disconnect());const ctx=this.context;let output=this.source;if(this.settings.enabled){const peak=this.settings.bands.reduce((sum,n)=>sum+Math.max(0,n),0);this.preamp.gain.setTargetAtTime(10**(-peak/20),ctx.currentTime,.025);this.source.connect(this.preamp);output=this.preamp;this.filters.forEach((filter,i)=>{filter.gain.setTargetAtTime(this.settings.bands[i],ctx.currentTime,.025);output.connect(filter);output=filter})}output.connect(ctx.destination);if(this.analyser)output.connect(this.analyser)}
 level(){if(!this.analyser||!this.samples||this.context?.state!=='running')return null;this.analyser.getByteTimeDomainData(this.samples);let sum=0;for(const n of this.samples)sum+=((n-128)/128)**2;return Math.min(1,Math.sqrt(sum/this.samples.length)*4)}
 detach(){try{this.source?.disconnect()}catch{}for(const node of this.nodes)try{node.disconnect()}catch{}this.source=null;this.nodes=[];this.analyser=null;this.samples=null}
 destroy(){this.detach();const ctx=this.context;this.context=null;ctx?.close().catch(()=>{})}
}
