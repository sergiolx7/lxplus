# LX Plus Premium 2.0 — revisão de segurança · 31/10/2026

> Registro histórico da versão candidata. O estado posterior de revisão, servidor e publicação está em [PUBLICACAO-PREMIUM2-20261031.md](PUBLICACAO-PREMIUM2-20261031.md).
**As correções deste documento estão em código de desenvolvimento. O banco e as Edge Functions de produção permanecem sem essas alterações.**

## Falhas confirmadas e correções preparadas

### Crítica: alteração de papéis administrativos

A função implantada `lx_admin_set_admin_role` compara o papel retornado com `owner` de forma que NULL não resulta em recusa. A revisão do código confirmou que um membro sem papel pode alcançar a validação do destinatário. A reprodução no servidor utilizou um UUID inexistente e foi encerrada antes de qualquer escrita, dentro de transação revertida. Não foi concedido, removido nem alterado um papel real.

A migration `20261031210235_lx_premium2_admin_guard.sql` recusa identidade ausente e papel diferente de owner com `IS DISTINCT FROM`, fixa search_path vazio, serializa alterações e impede a remoção ou o rebaixamento do último proprietário. Mantém assinatura, papéis válidos e dados existentes. Os testes executam a SQL real em um PostgreSQL descartável via PGlite, incluindo NULL, anonymous, administrator, editor, moderator, concessão/revogação válida e último proprietário. Não foi feito teste concorrente entre duas conexões reais do Supabase.

**Prioridade de publicação: aplicar esta correção isoladamente após autorização.** Não depende do novo frontend. Reverter o visual não deve reinstalar a função vulnerável.

### Alta: contexto do catálogo na LX IA

O código implantado de `lx-ai` lê com service_role e testa a publicação dentro do payload, em vez do campo publicado da linha. Também não verifica aprovação da conta antes dessa consulta. Isso pode incluir metadados arquivados no contexto de resposta. Esta constatação é de revisão do código implantado; uma exploração com sessão de usuário não foi executada.

O candidato em `supabase/functions/lx-ai/` valida usuário e aprovação e consulta o catálogo com o JWT do solicitante, RLS e `published=true`. Não envia perfil, biografia, conversas, credenciais ou histórico privado ao provedor. O modo de catálogo usa regras locais e dados reais. O modo online depende de escolha explícita na interface, configuração existente no servidor e uma reserva atômica de orçamento: 6 tentativas/minuto e 50/dia por usuário, saída limitada. Só IDs da seleção autorizada podem gerar cartões; o cliente confere publicação novamente. Erros do provedor não são exibidos.

A migration `20261031211552_lx_premium2_ai_budget.sql` cria somente contadores em schema privado; a função de reserva é invoker e executável exclusivamente pelo service_role. Não guarda perguntas. A quota e o handler foram testados em ambiente descartável/mocks. Não houve chamada paga à OpenAI nem deploy da função. Os limites são técnicos por usuário, não constituem orçamento monetário global. Configuração global de gastos continua a cargo do proprietário/provedor.

## Advisors observados no projeto real

| Aviso | Quantidade | Tratamento nesta entrega |
| --- | ---: | --- |
| SECURITY DEFINER executável por authenticated | 54 | Inventário abaixo; nenhuma revogação indiscriminada |
| Auth RLS InitPlan | 23 | Otimização individual pendente; regras preservadas |
| RLS habilitado sem política | 11 | Negação padrão preservada; várias tabelas de serviço |
| Proteção contra senhas vazadas desativada | 1 | Configuração de Auth não alterada |
| Foreign keys sem índice de cobertura | 2 | Necessário avaliar consultas e custo antes de criar |
| Políticas permissivas sobrepostas | 1 | Revisão adicional pendente |
| Tabelas sem chave primária | 90 | Avisos do snapshot privado; não removidos |
| Índices sem uso observado | 43 | Não removidos com base apenas neste contador |

[Funções privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [RLS InitPlan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan) · [Proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Foram identificadas 54 funções privilegiadas com execução para authenticated e nenhuma delas com execução para anon. Um aviso de SECURITY DEFINER não comprova, por si só, falha. A tabela registra triagem e finalidade, sem certificar todos os fluxos. Funções internas adicionais, sem execução por authenticated, não integram este contador.

| Função | Execução anon | Estado da revisão | Observação |
| --- | --- | --- | --- |
| `lx_admin_approve_user(uuid)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_can(text)` | Não | Helper inspecionado | Consulta identidade/papel do banco; manter compatibilidade de RLS e consumidores. |
| `lx_admin_delete_pending_user(uuid)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_reject_user(uuid)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_role()` | Não | Helper inspecionado | Consulta identidade/papel do banco; manter compatibilidade de RLS e consumidores. |
| `lx_admin_runtime_status()` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_set_admin_role(uuid,boolean,text)` | Não | Falha confirmada; correção candidata testada | Bloqueio para papel NULL e proteção do último owner; 11 cenários PostgreSQL isolados. |
| `lx_admin_set_integration_secret(text,text)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_set_verified(uuid,boolean)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_user_directory()` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_admin_user_directory_v27()` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_am_i_admin()` | Não | Helper inspecionado | Consulta identidade/papel do banco; manter compatibilidade de RLS e consumidores. |
| `lx_call_heartbeat(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_catalog_bulk_upsert(jsonb)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_catalog_delete_item(bigint)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_catalog_delete_item_checked(bigint)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_catalog_upsert_item(bigint,jsonb,boolean)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_claim_push_subscription(text,text,text,text)` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_delete_message_for_all(text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_edit_message(text,text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_end_call(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_friend_remove(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_friend_request(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_friend_respond(uuid,boolean)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_get_conversation_streak(uuid)` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_group_call_heartbeat(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_group_create(text,uuid[])` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_group_join_call(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_group_leave_call(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_group_list()` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_group_start_call(uuid,text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_hide_message_for_me(text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_integration_status()` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_is_admin()` | Não | Helper inspecionado | Consulta identidade/papel do banco; manter compatibilidade de RLS e consumidores. |
| `lx_is_approved()` | Não | Helper inspecionado | Consulta identidade/papel do banco; manter compatibilidade de RLS e consumidores. |
| `lx_is_group_member(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_mark_messages_delivered(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_mark_messages_read(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_message_history(uuid)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_presence_for_viewer()` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_rank_close_current(boolean)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_rank_confirm_season(text)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_rank_get(text)` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_rank_record_event(text,text,jsonb)` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_rank_rollover_if_needed()` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_rank_set_payment(text,text)` | Não | Triagem estática; teste por conta pendente | Contém verificação administrativa ou delega a outra função; não houve revogação em massa. |
| `lx_react_message(text,text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_request_or_vote(text,text,text,text)` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_respond_call(uuid,boolean)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_send_message(uuid,text,text,text,text,text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_social_directory()` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_start_call(uuid,text)` | Não | Triagem estática; teste por conta pendente | Fluxo social usa identidade/participação; homologação entre contas e redes permanece necessária. |
| `lx_track_event(text,jsonb)` | Não | Triagem estática; teste por conta pendente | Função legada privilegiada; preservar até validar autorização e consumidores. |
| `lx_v40_is_admin()` | Não | Helper inspecionado | Consulta identidade/papel do banco; manter compatibilidade de RLS e consumidores. |

## Limites e pendências

A proteção de ranking contra pontuação artificial, papéis do ADM, URLs assinadas, buckets e demais Edge Functions ainda exigem homologação funcional completa. A lista de funções implantadas foi inventariada, mas não foi feita auditoria integral do código de todas as 19 Edge Functions. Endpoints com verify_jwt desativado podem ter autenticação própria; não foram tratados automaticamente como vulneráveis. O importador manteve seus testes de autorização HTTP aprovados.

Nenhuma senha, hash de senha, token, conteúdo de mensagem, chave privada ou URL assinada está nos artefatos. As chaves públicas do cliente são preservadas. Não houve reset, exclusão de conta, restauração de catálogo ou alteração de configurações de Auth em produção. A criação de arquivo pelo CLI gerou uma tentativa de telemetria a PostHog bloqueada pela revisão automática; o comando não foi repetido e o arquivo vazio já criado foi preenchido localmente.

