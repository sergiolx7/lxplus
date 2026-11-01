# LX Plus Premium 2.0 — revisão e publicação · 31/10/2026

Estado confirmado: **PUBLICADO E CONFERIDO NO DOMÍNIO REAL**. O PR 29 foi integrado, o GitHub Pages concluiu o deploy e a entrada do aplicativo terminou de carregar com a versão nova.

O usuário autorizou a revisão e a publicação nesta continuação. O PR 29 é um conjunto de melhorias sobre o projeto existente. O escopo integral Premium 2.0 continua com pendências; as respostas anteriores que o descreviam como inteiramente concluído não refletem a matriz técnica.

## Correções da revisão final

- Uma fonte musical lenta não substitui a última faixa escolhida nem reabre o player depois de ele ser fechado. A fila só muda após a resolução bem-sucedida da fonte.
- Histórico musical, curtidas, privacidade e lista atualizam seus próprios campos, preservando preferências simultâneas. Respostas da conta anterior não alteram o perfil ativo.
- Abrir uma playlist e mudar de aba antes da resposta não restaura a seleção abandonada.
- O tempo limite de uma rota inclui o carregamento do módulo. Uma inicialização atrasada não reaparece sobre a tela de erro nem sobre a nova rota; seu controlador é descartado.
- Os nomes das migrations foram alinhados às versões realmente aplicadas no Supabase.

## Servidor confirmado

| Item | Estado |
| --- | --- |
| Correção de papéis | Aplicada anteriormente e conferida nesta rodada; `20261031214002_lx_premium2_admin_guard` |
| Proprietários | 2 preservados |
| Quota da IA | Aplicada; `20261101020959_lx_premium2_ai_budget` (versão em UTC) |
| Edge Function `lx-ai` | Versão 5, ativa, com verificação JWT mantida |
| Acesso ao catálogo da IA | JWT do solicitante, aprovação, RLS e `published=true` |
| IA online | Escolha explícita; 6 tentativas/minuto e 50/dia por usuário; sem envio de perfil ou conversas |
| Teste de quota no banco real | 6 permitidas, 7ª recusada; usuário comum sem acesso à função/tabela; gravações do teste revertidas |
| Chamadas pagas de IA nesta validação | 0 |

O advisor passou a apontar 12 tabelas com RLS sem política. A nova ocorrência é a tabela privada dos contadores da IA: usuários comuns não têm acesso e o servidor usa service_role. As 54 funções privilegiadas legadas e a proteção contra senhas vazadas desativada continuam registradas para revisão; não houve revogação em massa.

## Validação

| Verificação | Resultado |
| --- | --- |
| Testes de código/PostgreSQL descartável | 83 aprovados |
| Cenários de navegador Chromium | 5 aprovados |
| HTTP do serviço real | 14 aprovados |
| MP4, áudio contínuo, PDF/EPUB, notas, marcadores e busca | Aprovados no ambiente isolado |
| Cancelamento do próximo episódio | Aprovado com vídeo real local |
| Fluxos de fonte fora de ordem, fechamento e descarte de rota | 6 regressões adicionais aprovadas |
| Teste no banco de produção | Quota e permissões aprovadas com rollback das fixtures |
| Android/iPhone/tablet físicos e chamada entre redes | Ainda não homologados |
| Login real e entrega de e-mails nesta rodada | Não realizados; conferida a entrada pública e a configuração/isolamento HTTP |
| IA online com provedor real | Não invocada; estrutura e limites validados sem gasto |

As evidências estão em `tests/evidence/release-20261031.json` e `release-public-api-20261031.json`. As fixtures não entram no build público. Uma aprovação local ou no CI não certifica toda combinação de aparelho, rede e fonte externa.

## Dados e recuperação

No início desta continuação: 8 contas, 8 perfis, 51 mensagens, 5 amizades, 2.374 registros de catálogo, 280 publicados e 2 administradores/proprietários. Nenhum desses registros foi removido ou restaurado. As 58 músicas próprias publicadas e os demais conteúdos arquivados foram preservados.

O ponto de recuperação do frontend continua em `backup/pre-premium2-20261031`, na base `9b92cf9`. Reverter a interface não deve reinstalar a função administrativa vulnerável. A quota é aditiva; uma recuperação de interface não exige excluir seus contadores. A versão anterior do handler foi guardada antes do deploy para análise; sua filtragem vulnerável não deve ser restaurada sem correção.

## Escopo ainda pendente

LX Party, LX Rooms/chamadas de grupo na nova interface, TURN validado em redes distintas, push/Service Worker recuperado, metas/estantes de leitura, índice fuzzy completo, álbuns maiores que a seleção carregada, painel integral de prêmios, proteção completa contra pontos artificiais e parte da auditoria do ADM continuam pendentes. Drive/TMDB e OAuth privado exigem configuração e homologação próprias.

Os relatórios `PREMIUM2-*` anteriores foram mantidos como registros históricos da candidata. Esta publicação entrega as melhorias implementadas e revisadas, preservando as limitações acima. Nenhum anúncio coletivo de conclusão integral foi enviado.

## Evidência da publicação concluída

- PR integrado: https://github.com/sergiolx7/lxplus/pull/29
- Commit publicado: `b7f213d09aedcfd9ad2e939972fd620311e13a86`.
- Revisão final do código: `e08f4fb06811634681237d2fd0f71d2398bf8a7a`.
- Deploy Pages aprovado: https://github.com/sergiolx7/lxplus/actions/runs/41264768811
- Smoke da main aprovado: https://github.com/sergiolx7/lxplus/actions/runs/41264768922
- Domínio conferido: https://xn--rifamilionria-deb.api.br/
- Versão do frontend em `build.json`, HTML e CSS carregado no navegador: `174f102ab02b`.
- Nove verificações de publicação aprovadas: entrada, versão e módulos públicos acessíveis; fixtures, documentação interna e SQL não expostos pelo site.
- Navegador real após recarga: formulário de entrada renderizado e indicador de carregamento encerrado. Não foi usado login de usuário nesta rodada.

A integração auxiliar `Workers Builds: lxplus` apresentou falha, que também existe na versão anterior `6df38f8`. O Pages e os testes da main concluíram com sucesso. A configuração/logs internos desse serviço auxiliar da Cloudflare não foram alterados. Esse erro permanece como pendência separada da publicação confirmada acima.

Este registro posterior altera apenas documentação/evidências; o commit usa skip CI para manter a publicação do código já validado. A correção de permissões e a LX IA versão 5 permanecem implantadas no Supabase.
