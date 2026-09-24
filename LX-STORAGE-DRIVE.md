# LX Storage · Drive — R8 Automático

A R8 reduz a configuração do Worker para um fluxo de implantação automática pela Cloudflare.

## Como usar

1. Publique esta R8 no repositório `sergiolx7/lxplus`.
2. No ADM, abra **Mídia & Upload → LX Storage · Drive**.
3. Clique em **Gerar endpoint automaticamente**.
4. A Cloudflare abre o fluxo oficial **Deploy to Cloudflare** usando a pasta `cloudflare-worker` do próprio repositório.
5. Entre/autorize sua conta Cloudflare e conclua o Deploy.
6. Copie a URL gerada, por exemplo `https://lx-storage-drive.seunome.workers.dev`.
7. Cole no campo **Endpoint do LX Storage Worker**, clique **Salvar endpoint** e depois **Testar LX Storage**.
8. No Google Drive, compartilhe cada vídeo como **Qualquer pessoa com o link · Leitor**.
9. No cadastro do filme, escolha **LX Storage / Drive** e cole o link normal do arquivo.

## Sem conta de serviço

A R8 possui modo `public-drive`: não exige Service Account para começar. Arquivos compartilhados por link passam pelo Worker e chegam ao LX Player.

## Arquivos privados

Para arquivos privados, `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` continuam disponíveis como configuração opcional do Worker.

## Limites

Google Drive e Cloudflare continuam sujeitos às quotas próprias. Esta integração não transforma o Drive em CDN ilimitada.
