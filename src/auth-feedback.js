// A provider outage must not be mistaken for an account or password problem.
export function authServiceState(error){
 const status=Number(error?.status);
 if(status===402||error?.code==='service_restricted'||/service for this project is restricted/i.test(String(error?.message||'')))return 'restricted';
 if(status>=500&&status<=599)return 'unavailable';
 return null;
}
export function authServiceMessage(state){
 return state==='restricted'
  ?'O acesso à LX Plus está temporariamente indisponível. A equipe precisa restabelecer o serviço. Não é necessário redefinir sua senha por causa desta falha.'
  :'O serviço de acesso está temporariamente indisponível. Aguarde e verifique a disponibilidade novamente.';
}
// Keep authentication failures useful without exposing account or request details.
export function authErrorMessage(error){
 const service=authServiceState(error);if(service)return authServiceMessage(service);
 const code=String(error?.code||'');
 const messages={invalid_credentials:'E-mail ou senha não conferem. Revise os dados e tente novamente.',email_not_confirmed:'Confirme seu e-mail antes de entrar. Você pode solicitar um novo envio da confirmação.',over_request_rate_limit:'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',over_email_send_rate_limit:'O limite de envio de e-mails foi atingido. Aguarde alguns minutos.',user_banned:'O acesso a esta conta está restrito. Entre em contato com a equipe LX Group.',signup_disabled:'Novos cadastros estão temporariamente desativados.',password_mismatch:'As senhas não coincidem. Confira os dois campos.'};
 if(messages[code])return messages[code];
 if(Number(error?.status)===429)return messages.over_request_rate_limit;
 const text=String(error?.message||'');
 if(/failed to fetch|network|load failed/i.test(text))return 'Não foi possível conectar ao serviço de acesso. Confira sua conexão e tente novamente.';
 if(/demorou para responder/i.test(text))return 'O serviço de acesso demorou para responder. Confira sua conexão e tente novamente.';
 return 'Não foi possível concluir o acesso. Tente novamente ou use a recuperação de senha.';
}

export function showAuthError(form,error){
 form.querySelector('[data-auth-error]')?.remove();
 const notice=document.createElement('p');notice.className='auth-error';notice.dataset.authError='';notice.setAttribute('role','alert');notice.tabIndex=-1;notice.textContent=authErrorMessage(error);form.prepend(notice);notice.focus({preventScroll:true});
}
