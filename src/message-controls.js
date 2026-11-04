export const messageKey=message=>String(message.client_id||message.id);
export const editableMessage=(message,userId)=>Boolean(message&&message.sender_id===userId&&message.kind==='text'&&!message.deleted_at);
export const forwardableMessage=message=>Boolean(message&&message.kind==='text'&&!message.deleted_at&&!message.media_key&&!message.media_path&&String(message.body||'').trim());
export function socialActionError(error){
 const code=String(error?.message||'');
 if(/MESSAGE_UNAVAILABLE/.test(code))return 'Esta mensagem não está mais disponível.';
 if(/FORWARD_TEXT_ONLY/.test(code))return 'O encaminhamento está disponível para mensagens de texto.';
 if(/THREAD_UNAVAILABLE|friendship required/.test(code))return 'Esta conversa não está disponível. Atualize sua lista de amigos e grupos.';
 if(/INVALID_MESSAGE_BODY/.test(code))return 'Escreva uma mensagem de até 4.000 caracteres.';
 if(/FORWARD_REQUEST_CONFLICT/.test(code))return 'O envio anterior foi identificado. Feche a janela e confira a conversa antes de tentar novamente.';
 return code||'Não foi possível concluir esta ação.';
}
