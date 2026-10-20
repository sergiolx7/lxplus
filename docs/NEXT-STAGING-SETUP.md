# LX Plus Next — ambiente isolado

Este candidato continua na branch `staging/lxplus-maintenance-20261020-e6109c6`. Não aplicar migrations no projeto publicado para testar a interface.

## Preparar a interface

```bash
npm ci --prefix tools/catalog-qa
node tools/build-staging.mjs
```

O diretório gerado é `build/staging`. Sem configuração, a interface permanece em manutenção e não usa o banco de produção. A build inclui somente arquivos públicos necessários ao aplicativo. Backend, migrations, testes, backups e arquivos de ambiente são excluídos.

Para conectar um projeto Supabase de testes, fornecer pelo ambiente:

```text
LX_STAGING_SUPABASE_URL
LX_STAGING_PUBLISHABLE_KEY
LX_STAGING_SITE_URL
```

O gerador rejeita o projeto `ubidogquzpdvrbzbhxda`, URLs de banco sem HTTPS e chaves privilegiadas. Nunca usar `service_role` ou `sb_secret` na build pública. As referências de mídia pública já autorizada podem permanecer no catálogo; os dados e a autenticação de staging devem usar o projeto isolado.

## Banco e autenticação

1. Validar os backups completos antes de qualquer mudança em produção.
2. Provisionar staging sem iniciar serviços pagos sem autorização específica.
3. Restaurar um backup em ambiente isolado e verificar schema, dados, funções, RLS, usuários e arquivos.
4. Conferir quais migrations históricas já foram aplicadas. O repositório contém arquivos antigos de configuração que não substituem o inventário do banco atual.
5. Aplicar a migration `20261020214237_lx_next_account_and_payment_controls.sql` apenas no ambiente de testes preparado.
6. Habilitar confirmação de e-mail, MFA TOTP, SMTP e URLs de redirecionamento apropriadas ao ambiente. O `config.toml` registra os requisitos locais; não altera as configurações do projeto publicado.
7. Validar o acesso da conta proprietária, configurar o autenticador e confirmar o código na página Segurança.
8. Testar cadastro, e-mail, aprovação, recuperação de acesso, sessões revogadas e acesso de membro comum.

As RPCs de pagamento e preparação do lançamento exigem proprietário e `aal2`. O Vault precisa estar disponível. A migration não disponibiliza um checkout: o gateway permanece desativado enquanto sua documentação e seus testes não forem validados.

## PunchPay

O nome fornecido no plano ainda precisa ser associado à documentação oficial da gateway pretendida. Não foi assumido que serviços com nomes parecidos sejam equivalentes.

A área **Pagamentos → PunchPay** permite preparar ambiente, referência da documentação e credencial. O segredo é enviado uma vez ao servidor, salvo no Vault, removido do formulário e nunca retornado pelo status ou pelo histórico. O audit log não armazena valores de credenciais. As credenciais de teste e produção são separadas.

Ainda são necessários o contrato oficial da API, ambiente de testes, método de verificação de webhooks, recursos de assinatura e procedimentos de cancelamento/estorno. Nenhum endpoint externo ou evento de pagamento foi inventado. Não existem cobranças reais habilitadas neste candidato.

## Backup e limpeza

`tools/maintenance-inventory.sql` faz somente consultas. Todas as contas começam com `confirmed_test_account=false`: nenhuma é automaticamente classificada como descartável.

O backup completo precisa conter banco, Auth, arquivos de Storage, funções e configurações recuperáveis. Uma cópia do catálogo ou uma branch Git não substitui esse backup. Manter dados pessoais, tokens, senhas e cópias do banco fora do repositório público.

Para conferir a integridade de uma pasta privada de backup:

```bash
node tools/backup-manifest.mjs create PASTA_PRIVADA
node tools/backup-manifest.mjs verify PASTA_PRIVADA
```

Isso verifica os hashes e o conjunto de arquivos. `restore_verified` e `cleanup_allowed` permanecem falsos: a capacidade de restauração e a lista de contas precisam ser verificadas separadamente. Este candidato não oferece um comando de exclusão.

Referências técnicas: [backup e restauração](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Vault](https://supabase.com/docs/guides/database/vault), [MFA TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp).

## Validação

O workflow de verificação passa a incluir a branch de staging e o destino da revisão `lxplus-v40-completa`. Ele testa as alterações sem publicar a versão em produção.

```bash
node tests/next-security.mjs
node tests/staging-release.mjs
node tests/artwork-fallback.mjs
node tools/run-browser-qa.cjs qa-next-browser.cjs
```

Os testes PostgreSQL locais usam PGlite e fixtures para o contrato do Vault; a criptografia do Vault deve ser verificada no Supabase de staging. Os testes de MFA do navegador usam respostas de teste; não comprovam entrega de e-mail ou configuração real do autenticador.

`qa-native-playback-browser.cjs` permite `LX_QA_REAL_NATIVE=1` para os arquivos autorizados reais. Se a rede do ambiente exigir uma cópia local, `LX_QA_NATIVE_CACHE` usa arquivos previamente baixados e conferidos com os hashes do catálogo. O relatório distingue esse teste da reprodução direta pela rede.
