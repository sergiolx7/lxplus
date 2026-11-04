import {db} from './data.js';
export const premiumPlans=Object.freeze([
 Object.freeze({id:'monthly',name:'Mensal',amount_cents:990,period:'mês'}),
 Object.freeze({id:'annual',name:'Anual',amount_cents:9990,period:'ano'})
]);
export const brl=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents)||0)/100);
const errors={AUTH_REQUIRED:'Entre na sua conta para continuar.',APPROVAL_REQUIRED:'Seu acesso precisa estar aprovado.',ADMIN_REQUIRED:'Seu cargo não permite acessar os pagamentos.',OWNER_REQUIRED:'Somente o proprietário pode conceder ou revogar Premium.',COUPON_UNAVAILABLE:'Cupom inválido, expirado ou indisponível para este plano.',INVALID_COUPON:'Confira o código, o desconto e os limites do cupom.',INVALID_PLAN:'Escolha um dos planos disponíveis.',GATEWAY_NOT_CONFIGURED:'Os pagamentos ainda não foram liberados. Nenhuma cobrança foi criada.',QUOTE_RATE_LIMIT:'Aguarde um minuto antes de tentar novamente.'};
export async function billing(action,data={}){
 const query=db.rpc('lx_billing',{p_action:action,p_data:data});
 let timer;const result=await Promise.race([typeof query.abortSignal==='function'?query.abortSignal(AbortSignal.timeout(12000)):query,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('A área de assinaturas demorou para responder. Tente novamente.')),12000)})]).finally(()=>clearTimeout(timer));
 if(result.error)throw Error(errors[result.error.message]||'Não foi possível consultar as assinaturas. Tente novamente.');
 if(!result.data)throw Error('A área de assinaturas está temporariamente indisponível.');
 return result.data;
}
