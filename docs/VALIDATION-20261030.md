# LX Plus — validação adicional de 30/10/2026

**Resultado: validação ampliada, ainda não integral.** A entrada do site foi conferida em produção. Não houve confirmação de sessão autenticada após a tentativa pelo formulário seguro; portanto, ADM, comunicação e biblioteca pessoal no site publicado continuam dependentes de um login válido. Nenhuma senha foi lida, alterada ou incluída no código.

## Resultados desta etapa

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Testes de código | 37 aprovados | Inclui tratamento de credenciais inválidas, confirmação, limite de tentativas, rede e proteção de detalhes do provedor |
| HTTP público/anônimo | 10 aprovados | Configuração pública de Auth, isolamento de mensagens/perfis/revisões, bloqueio administrativo e proteção/métodos/CORS do importador |
| Publicação de importações no banco | Aprovada, com rollback | Direitos obrigatórios, confiança mínima, publicação revisada, deduplicação de fonte ativa, bloqueio para membro e privacidade da revisão |
| MP4 real | Aprovado no teste local | Vídeo de teste MDN, duração 5,055 s, busca e reprodução em 1,5×; `readyState=4` |
| HLS nativo real | Aprovado no teste local | Fluxo de teste Mux, duração 634,634 s; reprodução, busca e velocidade em 1,5× |
| HLS via hls.js/MSE | Aprovado no teste local | Fallback forçado somente no elemento do teste; cinco qualidades, seleção de 1080p, largura 1920 e 424 quadros decodificados, busca e 1,5× |
| DASH real | Aprovado no teste local | Fluxo de teste DASH-IF/Akamai, duração 634,566 s; dez opções de qualidade até 2160p, seleção manual, busca e 1,5× |
| WebRTC local | Não aprovado/inconclusivo para chamada | Oferta e resposta estáveis, mas zero candidatos ICE dos dois peers; não houve conexão de dados. Repetição com os STUNs do produto apresentou o mesmo resultado |
| Aviso persistente de erro | Aprovado visualmente no componente local | Mensagem em português com alerta e foco; permaneceu visível além do tempo do toast antigo |
| Preservação após testes | Aprovada | 7 contas; zero contas removidas, hashes de senha e perfis alterados; zero filmes/músicas antigos publicados; nenhum fixture de importação ficou no banco |

Os testes de mídia usaram o mesmo `attachPlayer` do produto, em uma página local de QA. Não houve inclusão desses vídeos no catálogo nem utilização de uma sessão real da LX Plus. A reprodução no catálogo autenticado, formatos protegidos por DRM, permissões de cada provedor, transmissão para TV e aparelhos físicos ainda não foram homologados. No Chrome disponível, HLS nativo não expôs seleção manual; o fallback por MSE expôs cinco opções.

O teste WebRTC usa o método real `Calls.receive` entre dois peers locais, sem câmera/microfone e sem publicar sinais no banco. O estado SDP estável confirma a troca de oferta/resposta desse teste, mas a coleta sem candidatos impediu uma conexão. Isso não comprova o funcionamento de chamadas de voz/vídeo entre aparelhos. TURN segue sem configuração.

## Correção incluída

O formulário de acesso antes informava erros somente por um aviso que desaparecia em 5,5 segundos. A falha agora permanece dentro do formulário, com `role=alert`, foco acessível, texto em português e retorno do botão após erro/tempo limite. O formulário indica que está aguardando o serviço e impede o envio duplicado enquanto processa. Detalhes desconhecidos do servidor, URLs, e-mails e credenciais não são copiados para a mensagem. A autenticação, as credenciais e as regras de aprovação permanecem com o Supabase existente.

A amostra MP4 antiga da fixture local retornou 404 e foi substituída por um vídeo de teste CC0 da MDN. Essa mudança não altera nenhum título real.

## Drive, cron e e-mail

O banco confirmou ausência das chaves `google_drive_api_key` e `tmdb_v3`, zero pastas cadastradas e zero jobs de importação. Por isso não há como afirmar que uma importação real foi validada. Não foram criadas chaves, feitas compras nem alterados arquivos do Drive. A revisão manual e a publicação foram testadas com registros fictícios dentro de transação revertida, sem chamar os provedores.

Os agendamentos de revisão do Drive e de publicação estavam ativos e tinham execução de cron marcada como concluída. Isso confirma a execução do agendamento, não a leitura real de uma pasta nem uma publicação real. O relatório diário está agendado, sem execução anterior observada nesta verificação. As automações antigas de filmes e músicas continuam pausadas.

O endpoint público de configuração confirmou login por e-mail habilitado e confirmação de e-mail obrigatória. Entrega de confirmação, recuperação de senha e validade dos redirecionamentos por e-mail ainda não foram testadas de ponta a ponta. Não foram enviados e-mails de recuperação ou alteradas credenciais.

## Revisão do servidor

Foram consultados os logs e os advisors de segurança/desempenho antes da correção. Também foram comparadas 30 chamadas literais de RPC no frontend com 26 funções existentes no banco; não houve divergência entre os nomes de parâmetros verificados. Essa conferência não substitui uma chamada autenticada para todos os métodos ou a validação de todos os formatos de retorno.

Os advisors retornaram avisos que permanecem para revisão:

- 54 funções legadas `SECURITY DEFINER` executáveis por usuários autenticados. Os bloqueios administrativos cobertos nesta etapa passaram; não houve auditoria individual completa das 54 funções nem mudança em massa das permissões. [Orientação do Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Proteção contra senhas vazadas desativada no provedor. Não foi alterada a configuração de Auth. [Orientação do Supabase](https://supabase.com/docs/guides/auth/password-security).
- 11 tabelas de serviço com RLS sem políticas, mantendo negação padrão para usuários; duas FKs sem índice de cobertura, 23 políticas com avaliação de Auth por linha e uma ocorrência de políticas permissivas sobrepostas. [Orientação de desempenho](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).
- Os 90 avisos de tabela sem chave primária vieram do schema privado do snapshot de backup, sem acesso por usuários comuns. Os 46 índices sem uso não foram removidos durante esta validação.

Não se declara ausência de vulnerabilidades com base somente nesses testes ou no advisor. As migrações e dados existentes não foram alterados nesta etapa; todas as novas gravações de fixture foram revertidas.

## Reproduzir os testes

```sh
npm test
npm run build
python3 tests/public-api-check.py
```

Com o servidor de desenvolvimento, abrir `/tests/fixtures/media-validation.html` e `/tests/fixtures/auth-feedback.html`. Essas páginas, scripts de teste, resultados e SQL não entram em `dist/`. Os registros observados estão em `tests/evidence/`. O teste SQL `tests/import-publication-rollback.sql` exige um operador do banco e mantém todas as fixtures dentro de uma transação com rollback; não executá-lo como uma migração.

## Para concluir

1. Estabelecer uma sessão real pelo formulário seguro ou controle manual do navegador, para testar as áreas autenticadas no domínio publicado.
2. Configurar Drive/TMDB no ADM e fornecer uma pasta autorizada para testar leitura, retomada, revisão e publicação reais. OAuth privado continua pendente.
3. Configurar TURN e testar voz/vídeo/tela entre dois aparelhos/redes, além de Android/iOS, e-mails e fontes reais do catálogo.

As pendências funcionais do relatório original — chamadas em grupo, prêmios/Hall completo, papéis/auditoria completos e métricas adicionais — continuam identificadas. Esta etapa não transforma esses itens em recursos concluídos.
