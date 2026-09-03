# Pipeline de Mídia

1. ADM solicita upload.
2. API gera URL assinada para object storage.
3. Navegador envia o arquivo direto ao storage.
4. Evento/fila dispara worker de transcodificação.
5. Worker usa FFmpeg para gerar HLS adaptativo, áudio, thumbnails e metadados.
6. API marca o asset como `ready`.
7. Controle de qualidade valida capa, banner, mídia, áudio, legenda e estrutura.
8. Somente então o conteúdo pode ir para `published`.

Para livros: PDF/EPUB no storage e, se desejado, extração de capítulos em pipeline separado. Para música: normalização de loudness e geração de waveform podem entrar no mesmo worker.
