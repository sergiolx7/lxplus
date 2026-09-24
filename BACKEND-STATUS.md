# Estado do backend LX Plus NOVA

- Projeto Supabase: `ubidogquzpdvrbzbhxda`. Em 24/09/2026: 40 itens de catálogo, 31 músicas, 4 usuários, 4 perfis, 4 estados de usuário e 34 objetos no bucket `lx-media`.
- Migração `20260924_lxplus_support.sql` aplicada: `lx_support_tickets` e `lx_support_messages` têm RLS para dono da conversa ou ADM, autenticação JWT, índices e Realtime. Um fluxo de inserção de ticket e mensagem foi simulado com perfis autenticados em transação desfeita; as tabelas permaneceram vazias.
- `lx-spotify-import` v1 implantada e ativa com verificação JWT e permissão ADM para importação de metadados exatos. Sem credenciais do Spotify Web API, o oEmbed fornece título/capa, mas artista/duração podem exigir revisão manual.
- `lx-media-ticket` v4, `lx-media-stream` v3 e as demais funções existentes não foram alteradas nesta continuação. A função `lx-ai` v4 permanece ativa para compatibilidade, sem uso no novo suporte.
- Nenhuma conta, faixa, arquivo, histórico ou favorito foi apagado. O frontend desta build ainda exige publicação e validação em navegador autenticado; o banco/Edge ativos não demonstram reprodução audível.
