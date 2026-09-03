# LX Plus v25 — Produção

A v25 usa GitHub Pages para o frontend e Supabase para os dados compartilhados. Não é necessário executar o backend Node antigo para as funções centrais desta versão.

## Arquitetura atual

`GitHub Pages → Supabase Auth/Postgres/Realtime/Storage`

- `lx-assets`: bucket público para capas, banners e avatares.
- `lx-media`: bucket privado para vídeo/áudio/livros; usuários autenticados recebem URL assinada temporária.
- RLS controla catálogo, perfis, estados, pedidos, notificações, Premium e analytics.
- Papel ADM fica em `lx_admins`.

## Para escalar depois

Quando o catálogo ficar grande, substitua o arquivo direto por pipeline de upload + transcodificação HLS + CDN. Para cobrança Premium automática, use checkout + webhook em um backend/Edge Function seguro.

Nunca coloque Secret Key/Service Role Key no frontend.
