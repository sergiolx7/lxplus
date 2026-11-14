import {esc} from './ui.js';

export function storageSummary(snapshot){
 const raw=snapshot?.asset_bytes,bytes=raw===null||raw===undefined?null:Number(raw);
 const job=(snapshot?.jobs||[]).find(row=>row.kind==='music');
 const budget=Number(job?.asset_budget_bytes);
 return {bytes:Number.isFinite(bytes)&&bytes>=0?bytes:null,budget:Number.isFinite(budget)&&budget>0?budget:null};
}
const size=bytes=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(bytes/1000000)+' MB';
export function renderStorageStatus(snapshot){
 const {bytes,budget}=storageSummary(snapshot),over=bytes!==null&&budget!==null&&bytes>=budget;
 return '<section class="panel studio-storage '+(over?'storage-warning':'')+'" aria-label="Armazenamento do projeto"><div class="heading"><div><span class="premium-overline">SAÚDE DO SERVIÇO</span><h3>Espaço para o próximo play</h3></div><button type="button" class="btn small" data-refresh-monitor>Atualizar</button></div>'+
  (bytes===null?'<p>Não foi possível medir o armazenamento. Atualize os dados antes de importar arquivos.</p>':'<div class="studio-storage-total"><strong>'+esc(size(bytes))+'</strong><span>em todos os espaços de arquivos do projeto</span></div>'+
   (budget===null?'':'<div class="studio-storage-meter" role="meter" aria-label="Uso do limite preventivo do robô" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.min(100,Math.round(bytes/budget*100))+'" aria-valuetext="'+esc(size(bytes)+' de '+size(budget))+'"><i style="width:'+Math.min(100,bytes/budget*100)+'%"></i></div><p>Limite preventivo do robô: <strong>'+esc(size(budget))+'</strong>. '+(over?'Novos downloads automáticos ficam bloqueados até liberar espaço ou revisar o limite.':'O limite reserva espaço para perfis, anexos e outros arquivos.')+'</p>')+
   '<p class="muted">Arquivar um título no catálogo mantém seus arquivos e continua ocupando espaço. Esta medição inclui mídia privada, arquivos públicos, perfis e anexos. O limite do plano deve ser consultado no provedor.</p>')+'</section>';
}
