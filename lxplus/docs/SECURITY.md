# Segurança da LX Plus v25

- Autenticação: Supabase Auth; senha não é armazenada pelo JavaScript da LX Plus.
- Admin: autorização via tabela `lx_admins` e funções/RLS no banco.
- Chave do navegador: somente Publishable Key (ou `anon` legada).
- Nunca expor Secret Key/Service Role Key no GitHub.
- Catálogo: leitura pública somente de itens publicados; rascunhos ficam visíveis apenas ao ADM autenticado.
- Estado do usuário: Minha Lista, histórico, avaliações e preferências só podem ser lidos pelo próprio usuário/ADM conforme RLS.
- Métricas: atualizadas por RPC `lx_track_event`; usuário não pode editar os números de ranking diretamente.
- Assets: `lx-assets` é público para imagens que precisam carregar na interface. Usuários só podem enviar para a própria pasta de avatar; ADM pode gerir os demais assets.
- Mídia: `lx-media` é privado. Usuários autenticados recebem URL assinada temporária para reprodução/leitura.
- Premium: o ADM pode atribuir status manualmente. Cobrança automática só deve mudar assinatura após confirmação de webhook do provedor.
- Upload: para uso público, imponha limites de tamanho/tipo e publique apenas mídia autorizada.
