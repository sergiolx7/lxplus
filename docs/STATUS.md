# LX Plus v25 — Status

## Funcional quando o Supabase é configurado
- Auth por e-mail/senha, sessão persistente e recuperação de senha.
- Catálogo global + Realtime.
- Identidade visual global (splash, cor-base e destaques) em `lx_settings`.
- ADM protegido por papel no banco/RLS.
- Capas, banners, vídeo, áudio, livros, avatares e WebVTT em storage.
- Minha Lista, progresso no segundo exato, avaliações, preferências, bio, avatar, formato e aparência sincronizados.
- Pedidos centralizados, votos, aprovação/recusa e conversão em conteúdo.
- Notificações globais.
- Premium manual global pelo ADM e molduras Premium.
- Analytics global com plays, buscas e aberturas.
- Agendamento de lançamento, prioridade e prévia de rascunho.
- Player HLS.js, variantes manuais, WebVTT, mini player, PiP, tela cheia e autoplay.
- PWA / Modo App com Service Worker v25 que atualiza os arquivos de código pela rede antes de usar cache.

## Depende de integração externa
- **Transcodificação:** a v25 reproduz HLS real, mas gerar as rendições e o `master.m3u8` exige FFmpeg/worker ou provedor de vídeo.
- **Cobrança automática:** checkout + webhook do provedor de pagamento.
- **Pareamento LX TV:** QR/código com sessão compartilhada.

## Segurança
- No domínio público, produção exige Supabase configurado.
- O login ADM de demonstração é aceito somente em localhost/127.0.0.1 ou arquivo local para testes.
- Publishable/anon key pode ficar no browser porque RLS protege os dados.
- Service Role Key nunca deve ir para o frontend ou GitHub.
