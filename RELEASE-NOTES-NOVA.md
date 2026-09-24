# LX Plus NOVA — build NOVA-20260924-R2-AUDIO

## Correção emergencial do player de música

- Player MP3 agora prioriza o `lx-media-stream` seguro, com CORS e suporte a byte-range.
- URL assinada direta do Supabase Storage permanece como fallback automático.
- `<audio>` passa a usar `crossorigin="anonymous"`, necessário para a cadeia Web Audio dos ajustes premium.
- Removido o pré-carregamento agressivo de URLs assinadas ao abrir/rolar a página de música. A fonte é resolvida no clique.
- Tempo de carregamento tolerado foi ampliado para MP3 maiores.
- Cache bust atualizado para `NOVA-20260924-R2-AUDIO`.

O catálogo e os arquivos existentes no Supabase foram preservados.
