# LX Storage R7 — Google Drive + LX Player

Esta build usa o Google Drive como armazenamento dos vídeos, mas a reprodução principal não depende do preview do Drive.

## Arquitetura

Google Drive (arquivo original) → Google Drive API → Cloudflare Worker (LX Storage) → LX Player → LX Plus.

O Worker incluído em `cloudflare-worker/lx-drive-storage-worker.js` autentica no Google Drive com uma conta de serviço e repassa o arquivo bruto. O cabeçalho `Range` do navegador é encaminhado ao Drive para permitir busca/avanço no vídeo.

## Configuração rápida

1. No Google Drive, crie uma pasta chamada `LX Storage` e coloque nela um MP4 de teste.
2. No Google Cloud Console, crie um projeto, ative **Google Drive API** e crie uma **Service Account**.
3. Gere uma chave JSON para essa Service Account.
4. Compartilhe a pasta `LX Storage` do Drive com o e-mail `client_email` da Service Account como **Leitor**.
5. Na Cloudflare, crie um Worker gratuito e cole o conteúdo de `cloudflare-worker/lx-drive-storage-worker.js`.
6. Nos Secrets do Worker, crie:
   - `GOOGLE_CLIENT_EMAIL` = `client_email` do JSON.
   - `GOOGLE_PRIVATE_KEY` = `private_key` do JSON (incluindo BEGIN/END PRIVATE KEY).
7. Opcional: variável `ALLOWED_ORIGIN` com o domínio da LX Plus, por exemplo `https://seu-dominio.com`.
8. Publique o Worker e copie a URL `https://...workers.dev`.
9. Na LX Plus: **ADM → Mídia & Upload → LX Storage · Drive**. Cole a URL e clique **Testar LX Storage** e depois **Salvar endpoint**.
10. Ao adicionar um filme, mantenha a fonte **LX Storage / Drive** e cole o link normal do arquivo do Google Drive.

## Importante

- Nunca coloque a chave JSON/PRIVATE KEY no GitHub, no `index.html` ou no JavaScript público da LX Plus.
- A Service Account só precisa de leitura. Os filmes continuam sendo enviados pelo seu Google Drive normal.
- Se o Worker estiver indisponível, a build ainda tenta as rotas públicas antigas do Drive como fallback de compatibilidade.
- Esta solução aproveita o armazenamento do Drive, mas Google Drive e Cloudflare Workers continuam sujeitos às quotas dos respectivos serviços.
- Use somente conteúdo que você tenha autorização para distribuir.
