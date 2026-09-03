# LX Plus v19 — Status

## Funcional no protótipo
- UI Assistir / Ler / Ouvir
- Perfis principal e Kids
- Home, progresso, Minha Lista, ranking e avaliações
- Para Você com histórico + avaliações + preferências de gênero
- Preferências de autoplay
- Área Premium demonstrativa
- Gerenciamento Premium demonstrativo no ADM
- Biblioteca ADM segmentada
- Formulários por mídia
- Upload local via IndexedDB
- Player, leitor e música
- Pedidos, notificações e analytics locais
- PWA com fluxo de instalação e Modo App
- Logos/avatares de perfil e upload local de imagem
- Modos de interface Cinema, App e Compacto
- Atalhos rápidos de cadastro no dashboard ADM

## Preparado para produção, mas exige infraestrutura externa
- PostgreSQL
- autenticação compartilhada entre dispositivos
- storage/CDN
- transcodificação HLS
- URLs assinadas
- checkout de assinatura
- webhooks do provedor de pagamento
- notificações push
- pareamento real de TV

O frontend não deve ser considerado autoridade para autenticação, permissões Premium ou pagamento em produção.
