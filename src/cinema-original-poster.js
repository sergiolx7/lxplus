// LX-original cover for titles without licensed poster artwork. No copyrighted image is copied.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cinemaOriginalPoster(item={},compact=false){
 const raw=String(item.title||'Novo título').trim().slice(0,90),kind=['Filme','Série','Dorama','Anime'].includes(item.type)?item.type:'LX Cinema';
 const seed=String(item.id||raw),hue=[...seed].reduce((v,c)=>(v*33+c.charCodeAt(0))%360,17);
 const year=/^\d{4}$/.test(String(item.year||''))?String(item.year):'';
 return '<div class="premium-image-fallback lx-original-cover '+(compact?'lx-original-cover-compact':'')+'" style="--lx-poster-hue:'+hue+'" aria-label="Capa original LX para '+esc(raw)+'">'+
 '<span class="lx-original-brand">LX <b>PLUS</b></span><span class="lx-original-rings" aria-hidden="true"></span>'+
 '<span class="lx-original-subtitle">'+esc(kind)+' · ORIGINAL LX</span><strong class="lx-original-title">'+esc(raw)+'</strong>'+
 '<small class="lx-original-year">'+esc(year||'DESCUBRA NA LX PLUS')+'</small></div>';
}
