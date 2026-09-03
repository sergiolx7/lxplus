# LX Plus v25 — Pipeline de mídia

## O que a v25 já suporta
1. Capa/banner em `lx-assets`.
2. Vídeo/áudio/livro original em `lx-media`.
3. Player MP4/WebM com retomada no segundo exato.
4. Variantes de vídeo por URL (1080p/720p/480p/360p) com troca manual.
5. **HLS adaptativo real** via HLS.js quando o conteúdo possui `hlsUrl` apontando para um manifesto `master.m3u8`.
6. Legendas WebVTT por upload `.vtt` ou URL.
7. HLS e legendas por episódio para Série/Anime/Dorama.
8. Mini player, PiP, tela cheia, autoplay e pular abertura.

## O que “Auto” significa
Quando existe `hlsUrl`, o player entrega o manifesto ao HLS.js e deixa o algoritmo selecionar bitrate/resolução conforme banda, buffer e tamanho do player. Quando não existe HLS, a v25 não finge adaptação: mostra a fonte original e as variantes MP4 realmente cadastradas.

## Pipeline recomendado para escala
1. ADM envia o arquivo original.
2. Um worker/serviço de mídia recebe o job.
3. FFmpeg gera rendições 360p/480p/720p/1080p e o `master.m3u8`.
4. Segmentos HLS são publicados em storage/CDN com CORS para o domínio LX Plus.
5. O URL do `master.m3u8` é gravado em `hlsUrl` do filme ou episódio.
6. O catálogo só é publicado quando o job estiver pronto.

Para livros, mantenha PDF/EPUB privado. Para música, normalização de loudness e waveform continuam recomendadas para uma etapa futura.
