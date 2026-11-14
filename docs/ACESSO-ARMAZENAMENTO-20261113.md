# LX Plus 5.1 — acesso, armazenamento e interface

Revisão de 13 de novembro de 2026, horário de Fortaleza. Base: `main`, commit `f07480f127cfaa847424ddddd816989f1f1bb57d`. A árvore moderna, as fontes de reprodução e os dados existentes foram preservados.

## Causa do bloqueio de acesso

O gateway do Supabase respondeu **HTTP 402** ao health check autenticado com a chave pública, às configurações de autenticação e à API de dados. A resposta identifica `exceed_storage_size_quota`. Os logs também mostram recusas de login, renovação de sessão e reenvio de confirmação. É uma restrição do projeto, anterior à validação individual das credenciais.

A conta associada ao Diego tem perfil `@xaruto`, aprovação administrativa e e-mail confirmado; não estava banida nem excluída. Nenhuma senha, confirmação ou permissão de conta foi modificada.

| Armazenamento medido | Objetos | Bytes |
| --- | ---: | ---: |
| `lx-media`, privado | 72 | 992.222.441 |
| `lx-assets`, público | 383 | 793.375.247 |
| `lx-social`, privado | 1 | 1.248 |
| **Total** | **456** | **1.785.598.936** |

A organização está no plano Free. Corrigir a interface ou a aprovação de um usuário não remove a restrição do provedor. Restaurar o acesso depende de regularizar o armazenamento/plano e confirmar que o gateway voltou a responder normalmente.

## Correções entregues

- O aplicativo consulta a saúde do serviço antes de construir o cliente de autenticação e aguardar a sessão. Restrições 402 e indisponibilidade 503 mostram uma tela própria, com nova tentativa, sem sugerir senha incorreta. O probe tem limite de tempo e não exclui sessões salvas.
- Em uma restrição detectada, a renovação automática é interrompida; a nova tentativa restabelece o ciclo quando a saúde do serviço permite. Um gateway sem endpoint de saúde continua usando a autenticação normal.
- Login, confirmação e recuperação usam mensagens sanitizadas. O reenvio evita cliques duplicados. A validação de senhas diferentes agora explica o problema concreto.
- A função `public.lx_auto_asset_usage()` antes retornava apenas os **793.375.247 bytes de `lx-assets`**. Passou a contar todos os buckets: **1.785.598.936 bytes**. O orçamento preventivo existente do robô musical agora inclui uploads privados, perfis e anexos. A alteração não faz downloads nem remove arquivos.
- ADM → Visão geral/Monitoramento mostra o total e o limite preventivo configurado do robô, distingue dados indisponíveis de uso zero e explica que arquivar títulos não libera armazenamento.
- A Home tem um destaque de largura total, seis portais para os universos e os painéis de atividade abaixo. Catálogos recebem cabeçalhos próprios e filtros recolhíveis que mantêm seu estado ao atualizar resultados.
- Os fundamentos visuais usam cantos mais retos e textos principais maiores nas páginas existentes. Os controles do carrossel e os portais usam SVG; o estado inicial de pausa respeita movimento reduzido.

Migração aplicada: `20261113235842_lx_storage_budget_all_buckets`. A função permanece `SECURITY INVOKER`, com `EXECUTE` negado a `anon` e `authenticated` e mantido para `service_role`. O painel administrativo continua usando a função intermediária existente, protegida por autorização administrativa. Não foram criadas novas permissões públicas.

## Opções para recuperar espaço — nenhuma exclusão executada

Estas categorias não aparecem nas referências dos **títulos atualmente publicados**. Isso não prova que podem ser descartadas: títulos arquivados, versões históricas ou links antigos ainda podem depender delas.

| Candidatas à cópia externa e revisão | Objetos | Bytes |
| --- | ---: | ---: |
| `lx-assets/automated/` | 178 | 568.655.827 |
| Objetos de `lx-assets/licensed/` sem referência em título publicado | 24 | 136.563.959 |
| Objetos de `lx-media/media/` sem referência em título publicado | 13 | 131.988.601 |
| **Total para revisão** | **215** | **837.208.387** |

Se todos esses candidatos forem efetivamente liberados após cópia verificada e revisão das demais referências, o total cairia para **948.390.549 bytes**. Essa é uma projeção de espaço, não uma confirmação de que a quota será imediatamente recalculada pelo provedor. Ainda excederia o limite preventivo atual de 800 MB do robô.

Separadamente, há 91 cópias candidatas a duplicação por tamanho e ETag, equivalentes a 107.090.964 bytes. Não devem ser somadas automaticamente à tabela acima: pode haver sobreposição. ETag não substitui comparação criptográfica dos arquivos e revisão das referências.

Qualquer remoção deve ser precedida de cópia íntegra e mapa de restauração, e feita pela **Storage API**, nunca com `DELETE` nas tabelas de metadados. A alternativa que mantém todos os arquivos no mesmo lugar é regularizar um plano com quota suficiente; nenhuma contratação ou cobrança foi feita nesta revisão.

## Verificação e limites

- `npm test`: **409 testes aprovados, nenhuma falha**, incluindo probe, erros de autenticação, orçamento com vários buckets e estado do painel.
- Build estático e `git diff --check` aprovados.
- Chrome local com dados sintéticos isolados: **20 páginas × 3 tamanhos** (1440×1000, 390×844, 340×800), **60 verificações**, sem erro de rota ou transbordamento horizontal identificado.
- Consulta após a migração confirmou total igual à soma real de objetos e preservação dos privilégios. Os avisos de segurança anteriores permanecem; esta alteração não introduziu função privilegiada nova.
- O login real continua bloqueado pelo HTTP 402. Não foram usadas senhas de terceiros, criadas contas reais ou feitas falsas declarações de autenticação bem-sucedida.
- TURN para chamadas em redes restritas e homologação do gateway de pagamento continuam pendentes de configuração. Esta revisão não declara concluído todo o histórico de solicitações da plataforma.

A publicação usa o pipeline de `main`, com testes e build antes do GitHub Pages. O `build.json` identifica a revisão `lxplus-5.1-access-storage-20261113`. A branch histórica `lxplus-v40-completa` não é usada como fonte de arquivos antigos nesta correção.
