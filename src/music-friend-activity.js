import {esc,https} from './ui.js';
import {presenceSummary} from './social-presence.js';
// Entries must come from lx_presence_for_viewer(), which applies server-side
// audience authorization (Todos / Amigos / Ninguém). Never query lx_presence
// directly from the frontend or trust a caller-provided viewer flag.
export function listeningSummary(entry,now=Date.now()){
 const p=presenceSummary(entry,now);
 if(!['online','away','busy'].includes(p.state)||entry?.activity_type!=='music'||!String(entry.activity_title||'').trim())return null;
 return {title:String(entry.activity_title).trim(),artist:String(entry.activity_subtitle||'').trim(),cover:https(entry.activity_cover)?entry.activity_cover:'',state:p.state};
}
export function listeningMarkup(entry,now=Date.now()){
 const playing=listeningSummary(entry,now);
 if(!playing)return '';
 return '<div class="lx-listening-now" aria-label="Ouvindo agora na LX Music">'+
   '<span class="lx-listening-art">'+(playing.cover?'<img loading="lazy" alt="" src="'+esc(playing.cover)+'">':'♫')+'</span>'+
   '<span class="lx-listening-copy"><small><span class="lx-listening-eq" aria-hidden="true"><i></i><i></i><i></i></span> OUVINDO AGORA</small>'+
   '<strong>'+esc(playing.title)+'</strong>'+
   (playing.artist?'<span>'+esc(playing.artist)+'</span>':'')+'</span></div>';
}
