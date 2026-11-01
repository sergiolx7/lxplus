// Supabase returns non-2xx bodies on FunctionsHttpError.context, not result.data.
// Show only known, actionable messages; never expose server or database details.
export async function profileMediaResult(result={}, {maxMB=5}={}) {
 const {data,error}=result;
 if(!error&&!data?.error&&data?.url)return data;
 let payload=data;
 const response=error?.context,status=Number(response?.status)||0;
 if(!payload?.error&&typeof response?.clone==='function') {
  try{payload=await response.clone().json()}catch{}
 }
 const code=String(payload?.error||payload?.code||'');
 const messages={
  AUTH_REQUIRED:'Sua sessão expirou. Entre novamente para enviar a imagem.',
  APPROVAL_REQUIRED:'Sua conta precisa estar aprovada para enviar imagens.',
  PREMIUM_BANNER_REQUIRED:'GIF e imagens animadas no avatar e na capa são exclusivos Premium.',
  PREMIUM_REQUIRED:'Sua conta precisa ter Premium ativo para usar este recurso.',
  PROFILE_IMAGE_SIZE:'Use uma imagem de até '+maxMB+' MB, com dimensões e animação menores.',
  PROFILE_IMAGE_FORMAT:'Use uma imagem JPG, PNG, WebP ou GIF compatível com sua conta.',
  PROFILE_IMAGE_INVALID:'Essa imagem está incompleta ou inválida. Escolha outro arquivo.',
  INVALID_REQUEST:'Escolha uma imagem válida e tente novamente.',
  PROFILE_UPDATE_FAILED:'Não foi possível salvar a imagem no perfil. Tente novamente.',
  PROFILE_UPLOAD_FAILED:'Não foi possível enviar a imagem agora. Tente novamente em instantes.'
 };
 let message=messages[code];
 if(!message&&status===401)message=messages.AUTH_REQUIRED;
 if(!message&&status===413)message=messages.PROFILE_IMAGE_SIZE;
 if(!message&&error?.name==='FunctionsFetchError')message='Não foi possível conectar ao envio de imagens. Confira sua conexão e tente novamente.';
 throw Error(message||'O envio de imagens está temporariamente indisponível. Tente novamente em instantes.');
}
