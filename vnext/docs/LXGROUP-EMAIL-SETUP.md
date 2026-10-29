# LX Group — fundação de e-mails (versão de desenvolvimento)

**Estado:** modelos preparados no GitHub. Nenhum SMTP, DNS ou envio é ativado por este commit.

## Separação de canais
- **Transacional (Supabase Auth):** confirmação de cadastro e recuperação de senha, sem conteúdo promocional.
- **Comunicados:** anúncios da LX Plus apenas para usuários elegíveis que optaram por receber novidades, com descadastro funcional e supressão de endereços que recusaram.
- A função Supabase `lx-release-notify` existente utiliza **Web Push**, não SMTP; não a modificar para campanhas de e-mail.

## Arquivos
- `email/lxgroup/auth-confirmation.html`: Supabase Auth > Confirm sign up.
- `email/lxgroup/auth-recovery.html`: Supabase Auth > Reset password.
- `email/lxgroup/announcement.html`: rascunho para serviço de campanhas, **não usar como template de autenticação**; substituir `{{UNSUBSCRIBE_URL}}` por URL real antes de qualquer envio.

## Ativação pendente (não executar sem infraestrutura)
1. Definir um **domínio de envio sob controle da LX Group**, independente do domínio de hospedagem do site. O Gmail `lxgroup383@gmail.com` por si só não oferece DNS SPF/DKIM/DMARC configurável da marca.
2. Selecionar fornecedor SMTP de envio transacional (ex.: Resend, Postmark, Amazon SES, Brevo). Verificar domínio no fornecedor e publicar **os registros SPF, DKIM e DMARC exatos fornecidos por ele**; não inventar valores DNS. Considerar subdomínios separados para autenticação e divulgação.
3. Supabase > Authentication > SMTP Settings: ativar SMTP próprio; configurar host, porta, usuário, senha, remetente verificado e nome do remetente **LX Group**. Credenciais apenas no painel seguro, nunca neste repositório.
4. Authentication > Email Templates: aplicar os arquivos correspondentes. Assuntos recomendados: **"LX Plus | Confirme seu e-mail"** e **"LX Plus | Redefina sua senha"**. Conferir URL de site e allowlist de redirecionamentos.
5. Testar um cadastro e uma recuperação de senha em endereço autorizado, verificando links, logs, SPF/DKIM/DMARC, entrega e spam. Após isso avaliar limites e proteção antiabuso/CAPTCHA.
6. Configurar separadamente um serviço de campanhas com cadastro de consentimento, descadastro e monitoramento de rejeições. Não reenviar o anúncio aos que já receberam sem necessidade.

## Critérios de aceite
- O domínio de envio aparece como verificado no serviço.
- SPF, DKIM e DMARC aprovados para o remetente usado.
- Dois fluxos Auth testados sem falhas de link ou login.
- Modelo de campanha contém link de descadastro real.
- Nenhuma alteração em `main`, DNS, site publicado ou banco de dados por este pacote.

## Referências
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
