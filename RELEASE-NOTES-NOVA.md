# LX Plus NOVA — recuperação

Build: `NOVA-20260923`. O HTML, CSS, JS, manifest e service worker compartilham este identificador. O service worker usa rede e remove caches antigos.

- O player MP3 usa um elemento `<audio>` persistente, URLs de Storage assinadas, fallback de mídia e limites de tempo. Preserva a capa e informa erro ao falhar. YouTube usa iframe oficial; Spotify usa SDK Embed com iframe oficial de fallback. Media Session está integrada ao player nativo.
- Removidos controladores concorrentes de áudio, IA, eventos esportivos automáticos e overlays da v34.
- Novo controlador `lxplus.recovery.js`: chat flutuante e ADM da IA, edição do Carrossel vinculada ao catálogo existente, eventos Ao Vivo manuais com banners/logos e monitor ADM.
- Layout Música redesenhado em grid com coluna lateral delimitada e espaço reservado para o player; ajustes próprios para tablet e celular.
- Busca com ícone SVG, navegação superior/lateral segundo Aparência e perfil com favoritos e histórico acionáveis.
- Importador do YouTube salva como rascunho para revisão dos dados do próprio vídeo; lote MP3 mantém extração de metadados ID3.

A build não deve ser declarada aprovada em produção antes dos testes autenticados e da escuta obrigatória descritos em TEST-REPORT-NOVA.md.
