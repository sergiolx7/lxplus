# LX Plus — revisão completa de bugs — 2026-09-27

Branch revisada: `lxplus-v40-completa`

## Correções aplicadas

1. **Player flutuante não arrastava corretamente no desktop**
   - O JavaScript gravava `left/top`, mas o CSS v40 mantinha `right/top/left` com `!important`.
   - O hotfix agora usa posição inline prioritária durante o arraste, salva a posição e recalcula os limites da viewport em resize/orientation change.
   - No mobile, as posições desktop são removidas para a regra responsiva continuar controlando o dock.

2. **Player de vídeo podia lançar `ReferenceError: S is not defined`**
   - A telemetria `lx_client_errors` registrou a exceção na build `V40-COMPLETE-20260925`.
   - O módulo v27 usava `S.read/S.write` no player aprimorado sem declarar `S` naquele escopo.
   - O hotfix expõe de forma lazy o store oficial `LX.store` para esse código legado.

3. **Leituras protegidas antes do login / após logout**
   - Logs do Postgres registraram `permission denied for table lx_catalog` e `permission denied for table lx_notifications`.
   - As duas tabelas possuem leitura RLS apenas para usuários autenticados/aprovados, mas o bootstrap legado tentava consultá-las antes de existir sessão.
   - O hotfix bloqueia apenas essas consultas enquanto `LX.cloud.user()` estiver vazio; depois do `hydrateUser`, o cliente Supabase original volta a ser usado sem alteração.

4. **Foreign keys sem índice**
   - Criados:
     - `lx_push_subscriptions_user_id_idx`
     - `lx_support_messages_author_id_idx`
   - Migration aplicada no Supabase e registrada em `supabase/migrations/20260927_lxplus_bugfix_fk_indexes.sql`.

5. **QA estava validando build antiga**
   - `tests/static-checks.mjs` ainda apontava para `dist`/v28.3.
   - Agora valida a raiz de produção v40, os JS/CSS ativos, referências locais, Service Worker, credenciais públicas e os contratos do hotfix.
   - `qa-v40.cjs` também passou a exigir os marcadores e guards desta revisão.

6. **Cache da revisão**
   - Service Worker atualizado para `V40-BUGFIX-20260927` para separar o shell corrigido do cache anterior.
   - A estratégia continua network-first e o registro existente chama `reg.update()` com `updateViaCache: 'none'`.

## Itens auditados sem alteração destrutiva

- RPCs administrativas de aprovação, cargo ADM, catálogo e ranking: as rotinas revisadas validam owner/capability/admin antes das operações sensíveis.
- Função pública `lx-media-stream`: `verify_jwt=false` é intencional; a função exige ticket HMAC assinado e expirável antes de acessar mídia privada.
- O único erro recente de Edge Function encontrado foi um `TUS_START_413: Maximum size exceeded` na rotina auxiliar `lx-github-media-broker`, usada em um hotfix específico de áudio. Não é o caminho normal do player/streaming.
- Advisors do Supabase ainda apontam otimizações de RLS (`auth_rls_initplan`) e funções `SECURITY DEFINER`. Elas não foram alteradas automaticamente porque são políticas/RPCs existentes com checagens de autorização e uma alteração em massa poderia mudar permissões.

## Garantias desta revisão

- Nenhum conteúdo do catálogo foi apagado.
- Nenhum usuário, mensagem, playlist, histórico, filme, série, música, livro ou configuração foi removido.
- Nenhuma tabela foi truncada ou recriada.
- `main` não foi alterada nesta revisão.
