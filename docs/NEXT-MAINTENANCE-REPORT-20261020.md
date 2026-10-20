# LX Plus Next — relatório de execução

**Data:** 20 de outubro de 2026
**Responsável pelo projeto:** Sérgio LX
**Build:** `R12.23-NEXT-STAGING-20261020`
**Branch:** `staging/lxplus-maintenance-20261020-e6109c6`
**Estado:** candidato de desenvolvimento; manutenção geral e lançamento ainda não concluídos.

## 1. Alterações realizadas

- Política de acesso separa e-mail não confirmado, aprovação pendente, aprovado, rejeitado, suspenso e banido. A confirmação de e-mail deixou de ser apresentada como alternativa à aprovação administrativa.
- Migration de staging exige e-mail confirmado para a aprovação e não altera `auth.users.email_confirmed_at`. Ela também bloqueia autoconcessão de aprovação/verificação por INSERT de perfil e verifica a existência da sessão nas autorizações de catálogo/administração.
- O modo de manutenção passa a ser considerado pelo helper de autorização no servidor candidato, preservando acesso administrativo. O projeto publicado não recebeu essa migration.
- Login e cadastro locais inseguros foram retirados dos adaptadores ativos e legados. Selecionar um plano não ativa Premium nem cria uma cobrança ou assinatura demonstrativa.
- Novas senhas exigem pelo menos 12 caracteres com letras e números. A configuração local registra confirmação de e-mail, troca segura de senha e TOTP. Os requisitos ainda precisam ser aplicados e testados no serviço de Auth isolado.
- A manutenção ganhou formulário de aviso de retorno com consentimento explícito. A RPC candidata valida e normaliza e-mails, impede leitura pública da lista e limita novos registros. Não foi enviada qualquer notificação de retorno.
- Novas páginas administrativas: Pagamentos/PunchPay, Segurança/MFA e Preparação do lançamento. Usam validação de proprietário e MFA no servidor para as configurações protegidas. As telas mostram indisponibilidade caso o ambiente não tenha a migration.
- Credenciais de pagamento são preparadas para armazenamento no Vault. O status e o histórico não retornam o segredo; teste e produção são separados. A integração permanece desativada e não contém endpoints externos inventados.
- A correção de capas preserva o avanço para imagens alternativas durante novas renderizações; capas já substituídas não voltam repetidamente à origem que falhou.
- O gerador de staging empacota apenas arquivos públicos, rejeita o banco de produção e chaves privilegiadas. Sem credenciais de staging, permanece desconectado do banco publicado.
- Manifest, shell, service worker e central de versões foram alinhados à build candidata. O CI verifica a branch de staging, sem executar publicação em produção.

## 2. Arquivos modificados/adicionados

- `.github/workflows/universal-catalog.yml`
- `.gitignore`
- `docs/LX-PLUS-NEXT-PLAN-20261020.md`
- `docs/NEXT-MAINTENANCE-REPORT-20261020.md`
- `docs/NEXT-STAGING-SETUP.md`
- `docs/verification/next-browser-results-20261020.json`
- `docs/verification/next-unit-results-20261020.json`
- `index.html`
- `js/account-policy.js`
- `js/app.js`
- `js/cloud.js`
- `js/services.js`
- `lxplus-artwork.js`
- `lxplus.bundle.js`
- `lxplus.js`
- `lxplus.next-console.js`
- `lxplus.next.css`
- `lxplus.release-v34.js`
- `manifest.webmanifest`
- `qa-loading-browser.cjs`
- `qa-native-playback-browser.cjs`
- `qa-next-browser.cjs`
- `qa-open-films-browser.cjs`
- `qa-session-album-plex-browser.cjs`
- `release-manifest.json`
- `service-worker.js`
- `supabase/config.toml`
- `supabase/migrations/20261020214237_lx_next_account_and_payment_controls.sql`
- `tests/artwork-fallback.mjs`
- `tests/next-security.mjs`
- `tests/staging-release.mjs`
- `tools/backup-manifest.mjs`
- `tools/build-staging.mjs`
- `tools/maintenance-inventory.sql`
- `tools/run-browser-qa.cjs`

- `docs/verification/next-maintenance-390.png`
- `docs/verification/next-payments-1280.png`

Os dois arquivos JSON em `docs/verification/` registram resultados e limitações. As capturas da manutenção e do painel acompanham a revisão visual.

## 3. Banco de dados

**Nenhuma alteração foi executada no banco publicado.** A auditoria remota foi somente de leitura.

Migration candidata: `supabase/migrations/20261020214237_lx_next_account_and_payment_controls.sql`.

Ela altera os helpers de acesso e a RPC de aprovação, adiciona proteção no INSERT de perfis e cria o schema privado `lx_next_private` com configurações, auditoria e interessados no retorno. As funções expostas são wrappers `SECURITY INVOKER`; o trabalho privilegiado fica no schema privado, com validações explícitas e grants limitados. Não contém exclusão de contas, catálogo ou mídia.

A migration foi executada em PostgreSQL local por PGlite. O contrato do Vault é uma fixture: sua criptografia e configuração reais precisam ser verificadas no Supabase de staging.

## 4. Testes executados

| Verificação | Resultado |
| --- | --- |
| 22 scripts de contratos, banco local, catálogo, autenticação candidata e mídia | Passaram |
| 10 testes do Cloudflare Worker | Passaram |
| 10 suítes de navegador existentes/novas | Passaram com fixtures |
| Layout do novo painel em 320, 390, 820, 1280 e 1920 px | Sem transbordamento horizontal |
| Confirmação separada, autoconcessão de privilégios, conta bloqueada e sessão revogada | Bloqueios confirmados no banco local |
| MFA, credencial sem persistência no navegador e resposta atrasada após navegação | Passaram com fixtures |
| Backup de código e manifesto de integridade | Arquivo de código legível; detecção de adulteração passou |
| MP3 real de 12.271.315 bytes e livro real de 418.230 bytes | SHA-256 e tamanho conferidos; reprodução/leitura passaram por cópia local verificada |
| Requisição HTTP parcial ao MP3 hospedado | Resposta 206, `audio/mpeg` |
| Reprodução direta da mídia externa no navegador deste runtime | Timeout; permanece pendência de staging |
| E-mail real, Auth/MFA no serviço de staging, criptografia Vault e pagamentos | Não executados |
| Safari, iPhone, Android físico, chamadas reais, TV e Lighthouse | Não executados |

As fixtures não comprovam uma integração externa real. O workflow registra testes repetíveis; aprovação local não autoriza lançamento.

## 5. Problemas encontrados na auditoria

- A função publicada de aprovação confirmava e-mail em nome do usuário. A correção está preparada, ainda sem aplicação em produção.
- A proteção histórica de UPDATE de perfis não cobria INSERT com campos privilegiados. O candidato cobre esse caminho e testa a tentativa de escalada.
- Não existe branch de banco Supabase de desenvolvimento no projeto consultado.
- A rotina de transferência de músicas está em `ASSET_STORAGE_BUDGET`. O bucket `lx-assets` possui 775.693.304 bytes e o orçamento operacional existente é de 800.000.000 bytes; um novo arquivo pode exceder a margem. O limite foi preservado.
- Os avisos de segurança incluem funções `SECURITY DEFINER` acessíveis a autenticados que ainda exigem revisão individual. Não foram tratadas todas como vulneráveis nem foram removidas permissões indiscriminadamente. A proteção contra senhas vazadas estava desativada na consulta do advisor.
- A documentação oficial da gateway pretendida como PunchPay não foi identificada com confiança. A preparação não assume que produtos com nomes parecidos sejam equivalentes.

## 6. Pendências e alcance do plano

| Área do plano | Situação real |
| --- | --- |
| Repositório e backup de código | Branches verificadas; arquivo do código lido e conferido |
| Backup integral e restauração | Dependem de exportação segura do banco/Auth/Storage e teste em ambiente isolado |
| Limpeza das contas | Não executada; todas precisam de conferência explícita no inventário privado |
| Cadastro e segurança candidata | Desenvolvidos e testados localmente; validação no serviço real pendente |
| Manutenção e novas telas ADM | Desenvolvidas e testadas; dependem da migration no staging |
| Home, detalhes, música, livros e busca | Funcionalidades existentes preservadas e verificadas pelos testes; correção específica de capas implementada. Reconstrução visual completa do plano não foi declarada concluída |
| Catálogo e automação | Já existem no servidor; auditoria e regressões executadas. Fontes adicionais e expansão não foram ativadas |
| Comunidade, moderação e chamadas | Preservadas; a nova manutenção não comprova funcionamento real de todas as interações |
| PunchPay | Configuração protegida preparada; API oficial, webhooks, cobranças e testes financeiros pendentes |
| R2 e Drive | Inventário de integração, credenciais, orçamento de uploads e reprodução reais ainda precisam de validação. Não foi contratado armazenamento |
| PWA | Shell e cache verificados; instalação física, push e downloads licenciados ainda precisam de testes |
| Textos legais e suporte | Contato oficial, políticas e revisão de publicação pendentes |
| Notificações de retorno | Interesse com consentimento preparado; envio depende do lançamento validado e do canal configurado |
| Publicação e observação por 48 horas | Não iniciadas |

A lista completa de requisitos fornecidos pelo proprietário está preservada em `docs/LX-PLUS-NEXT-PLAN-20261020.md`. Este relatório não substitui os critérios de conclusão desse plano.

## 7. Publicação

As alterações pertencem à branch de testes. Não houve merge na versão publicada, aplicação de migration remota, exclusão de contas, compra de serviços ou ativação de cobrança. A configuração remota de manutenção encontrada estava desativada e foi preservada. Nenhum aviso de atualização concluída foi enviado.

## 8. Segurança e inventário observado

O projeto `ubidogquzpdvrbzbhxda` estava ativo. A consulta observou 7 usuários Auth, 7 perfis, 2 administradores, 2.374 registros do catálogo e 435 objetos de Storage:

| Bucket | Objetos | Bytes registrados |
| --- | ---: | ---: |
| lx-assets | 365 | 775.693.304 |
| lx-media | 70 | 981.224.032 |

Os dados privados de usuários e os valores de credenciais não foram copiados para este relatório ou para o repositório.

Na leitura das rotinas de 20 de outubro, filmes tinham processado 2.000 fichas; séries, 500; metadados musicais, 1.000. Esses números representam processamento de catálogo e não milhares de vídeos liberados para reprodução. O processo de arquivos musicais estava aguardando armazenamento.

## 9. Backups

- Backup Git confirmado: `backup/lxplus-before-maintenance-20261020-e6109c6`, commit `e6109c6ea1d225a0fa60d3f5c06cc6f9b725f7b3`.
- Exportação local desse código: 43.827.200 bytes, 616 entradas. Leitura de `index.html`, bundle e service worker conferida.
- SHA-256: `f1c7475f0c962ff83da0ea9bead147421cf718f36b1803293894c147c3bffd3f`.
- Banco/Auth/arquivos: backup integral e restauração não comprovados. A cópia de código não os substitui.
- `tools/backup-manifest.mjs` valida integridade, mantendo `restore_verified=false` e `cleanup_allowed=false`.

## 10. Próxima etapa

Disponibilizar um Supabase de staging isolado e os meios seguros de backup/restauração, aplicar a migration candidata nesse ambiente e validar o fluxo real de cadastro/MFA. Confirmar o endereço oficial e a documentação da PunchPay, configurar R2/limites e executar os cenários financeiros e de mídia antes de considerar a limpeza e o lançamento. Não enviar credenciais secretas em mensagens ou arquivos públicos.
