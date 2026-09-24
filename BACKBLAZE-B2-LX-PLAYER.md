# LX Player + Backblaze B2

Build: **NOVA-20260924-R7-MP3AUTO**

Esta versão adiciona uma fonte **B2 / LX** no ADM. O vídeo continua sendo reproduzido pelo **LX Player**, sem interface do Backblaze.

## Como usar

1. Crie/abra um bucket no Backblaze B2 para os vídeos que você tem autorização para distribuir.
2. Envie um arquivo MP4 compatível com navegador **ou** uma pasta HLS com `master.m3u8` + segmentos.
3. Configure a entrega para que o navegador da LX Plus possa acessar os arquivos (bucket/CDN com HTTPS e CORS permitindo o domínio da LX Plus).
4. No ADM da LX Plus, abra **Novo conteúdo** → escolha **B2 / LX**.
5. Cole a URL HTTPS do MP4 ou do `master.m3u8` e use **Testar link**.
6. Publique. Ao abrir, a mídia toca no LX Player. Para HLS, o player ativa streaming adaptativo e mostra as qualidades disponíveis.

## Segurança

**Nunca** coloque `Application Key`, `Secret Key` ou credenciais do Backblaze no JavaScript/HTML do site. Esta build aceita somente a URL de entrega. Para bucket privado, use uma função de backend/Edge Function para gerar URLs autorizadas de curta duração.

## Formatos recomendados

- Simples: `filme.mp4` (H.264 + AAC)
- Melhor para streaming: `master.m3u8` com múltiplas qualidades
- Legendas: WebVTT (`.vtt`)

## Teste rápido

Use primeiro um vídeo pequeno de teste. Verifique: play/pause, avanço de 10 s, tela cheia, retomada, PiP e troca automática/manual de qualidade em HLS.
