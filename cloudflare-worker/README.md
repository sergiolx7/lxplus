# LX Storage Drive Worker

Worker do LX Plus para entregar arquivos do Google Drive ao LX Player.

## Modo automático (sem credenciais)

1. No Google Drive, compartilhe o vídeo como **Qualquer pessoa com o link · Leitor**.
2. Use o botão **Gerar endpoint automaticamente** no ADM da LX Plus.
3. A Cloudflare cria o Worker `lx-storage-drive` e fornece uma URL `workers.dev`.
4. Cole essa URL no campo **Endpoint do LX Storage Worker** e salve.

## Modo privado (opcional)

Se quiser manter os arquivos privados, configure `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` como secrets no Worker e compartilhe a pasta com a Service Account.
