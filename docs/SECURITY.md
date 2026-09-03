# Segurança da LX Plus

- Senha: Argon2id no servidor; nunca guardar senha ou hash no frontend em produção.
- Sessões: cookie `HttpOnly`, `Secure` e `SameSite=Lax` ou mais restritivo conforme o fluxo.
- Admin: RBAC no servidor, MFA recomendado, rate limit mais agressivo e log de todas as ações.
- Upload: validar MIME, tamanho e extensão; usar URL assinada e varredura antes de publicar.
- Mídia: URLs temporárias/assinadas; não expor bucket público.
- API: validação de payload, CORS restrito, Helmet/CSP, limites de corpo e rate limiting.
- Banco: usuário com mínimo privilégio, TLS, backups e rotação de credenciais.
- Privacidade: ranking opt-in/opt-out e controles de histórico.
- Segredos: `.env` fora do Git e secret manager em produção.


## Premium e cobrança
Em produção, o frontend nunca é autoridade para ativar Premium. O estado de assinatura deve ser confirmado no backend a partir do provedor de pagamento/webhooks, com auditoria administrativa.
