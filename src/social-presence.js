import {esc} from './ui.js';
export function presenceSummary(entry,now=Date.now()){
 if(!entry)return {state:'private',label:'Presença não compartilhada',activity:''};
 const stamp=new Date(entry.updated_at).valueOf(),elapsed=now-stamp;
 if(!Number.isFinite(stamp)||elapsed< -60000)return {state:'offline',label:'Offline',activity:''};
 if(['online','away','busy'].includes(entry.status)&&elapsed<90000){const state=entry.status;return {state,label:{online:'Online agora',away:'Ausente',busy:'Ocupado'}[state],activity:entry.activity_title?String(entry.activity_title):''}}
 const minutes=Math.max(1,Math.floor(elapsed/60000));
 const label=elapsed<60000?'Visto agora há pouco':minutes<60?'Visto há '+minutes+' min':minutes<1440?'Visto há '+Math.floor(minutes/60)+' h':'Visto em '+new Date(stamp).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Fortaleza'});
 return {state:'offline',label,activity:''};
}
export function presenceMarkup(entry,now){const summary=presenceSummary(entry,now);return '<span class="presence-label state-'+summary.state+'"><i aria-hidden="true"></i>'+esc(summary.label)+'</span>'}
