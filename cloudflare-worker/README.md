# LX Storage Drive Worker

Worker do LX Plus para entregar arquivos do Google Drive ao LX Player.

## Modo automático (sem credenciais)

1. No Google Drive, compartilhe o vídeo como **Qualquer pessoa com o link · Leitor**.
2. Use o botão **Gerar endpoint automaticamente** no ADM da LX Plus.
3. A Cloudflare cria o Worker `lx-storage-drive` e fornece uma URL `workers.dev`.
4. Cole essa URL no campo **Endpoint do LX Storage Worker** e salve.

## Modo privado (opcional)

Se quiser manter os arquivos privados, configure `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` como secrets no Worker e compartilhe a pasta com a Service Account.


## R11 · correção de streaming público
- segue redirects manualmente preservando cookies do Google;
- resolve a página de confirmação de arquivos grandes;
- preserva `Range` para seek no LX Player;
- aceita `resourcekey` dos links novos do Drive;
- no modo público usa CORS aberto, porque o próprio arquivo já é público;
- endpoint de diagnóstico: `/probe/FILE_ID`.
