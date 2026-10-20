/* One account policy shared by the cloud adapter and the authentication screen. */
(() => {
  'use strict';
  const LX = window.LX = window.LX || {};
  function access(authUser, profile = {}, admin = false) {
    const confirmed = !!authUser?.email_confirmed_at;
    const status = String(profile.approval_status || 'pending');
    if (['rejected', 'suspended', 'banned'].includes(status)) return status;
    if (!confirmed) return 'email_unconfirmed';
    return admin || profile.approved === true ? 'approved' : 'pending';
  }
  const messages = {
    email_unconfirmed: 'Confirme seu e-mail pelo link enviado. Depois, seu cadastro aguardará a aprovação do ADM.',
    pending: 'E-mail confirmado. Seu cadastro está aguardando a aprovação do ADM.',
    rejected: 'Seu cadastro não foi aprovado. Entre em contato com o suporte da LX Plus.',
    suspended: 'Seu acesso está suspenso. Entre em contato com o suporte da LX Plus.',
    banned: 'Esta conta não tem acesso à LX Plus. Entre em contato com o suporte.',
  };
  LX.accountPolicy = Object.freeze({
    access,
    message: status => messages[status] || messages.pending,
    passwordValid: value => typeof value === 'string' && value.length >= 12 && /\p{L}/u.test(value) && /\d/.test(value),
    canEnter: user => !!user && user.approved === true && !['email_unconfirmed', 'pending', 'rejected', 'suspended', 'banned'].includes(user.approvalStatus),
  });
})();
