// Connection health shown to the people in the call. Never records IPs,
// usernames, device details, full SDP, or private ICE candidate strings.
export function candidateKind(candidate){
 const type=String(candidate?.type||'').toLowerCase();
 if(['host','srflx','relay','prflx'].includes(type))return type;
 const found=String(candidate?.candidate||'').match(/\styp\s+(host|srflx|relay|prflx)(?:\s|$)/);
 return found?.[1]||'unknown';
}
export function callHealth({state='new',ice='new',signaling='stable',turnConfigured=false,types=[],remoteAnswered=false}={}){
 if(state==='connected'||ice==='connected'||ice==='completed')return {level:'good',text:'Mídia conectada.'};
 const kinds=new Set(types);
 if((ice==='failed'||state==='failed')&&!turnConfigured)return {level:'blocked',text:'Sem rota de mídia entre estas redes. O servidor TURN precisa ser ativado no ADM Studio → Visão geral.'};
 if((ice==='failed'||state==='failed')&&turnConfigured)return {level:'retry',text:'O relay está configurado, mas esta rede não concluiu a conexão. Tente Reconectar.'};
 if(!turnConfigured&&kinds.size&&!kinds.has('relay'))return {level:'warning',text:'Conexão direta em teste. Sem TURN, redes privadas e firewalls podem bloquear a transmissão.'};
 if(state==='disconnected')return {level:'retry',text:'Conexão interrompida. Tentando recuperar a rota de mídia…'};
 if(signaling==='have-local-offer')return {level:'pending',text:'Aguardando a resposta do outro participante…'};
 if(!remoteAnswered&&signaling==='stable')return {level:'pending',text:'Preparando a negociação de voz e tela…'};
 return {level:'pending',text:'Procurando uma rota segura para voz e tela…'};
}
export async function flushIceQueue(pc,candidates=[]){
 let added=0,ignored=0;
 for(const candidate of candidates){
  if(pc.signalingState==='closed')break;
  try{await pc.addIceCandidate(candidate);added++}
  catch{ignored++} // obsolete candidates belong to an old ICE generation
 }
 return {added,ignored};
}
