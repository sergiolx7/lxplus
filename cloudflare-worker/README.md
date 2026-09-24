# LX Storage R12 — Drive API

O Worker consulta o Google Drive pela API autenticada e transmite bytes ao player. Credenciais não pertencem ao frontend, ao ZIP ou ao repositório.

## Configuração única

1. No Google Cloud, habilite a Google Drive API e crie uma **conta de serviço** com chave JSON. Guarde a chave fora do repositório.
2. Compartilhe com o e-mail da conta de serviço a pasta do Drive que contém os vídeos. É suficiente dar acesso de leitura. A conta de serviço precisa ter acesso aos arquivos reais, não apenas ao link.
3. Implante esta pasta na Cloudflare Workers. Em **Settings → Variables and Secrets**, adicione `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` como **secrets**; copie o e-mail e a chave privada do JSON. Nunca use variáveis públicas ou campos do frontend para a chave privada.
4. Defina `ALLOWED_ORIGIN` com o endereço exato da LX Plus (já exemplificado em `wrangler.toml`). Implemente o Worker após configurar os secrets.
5. No ADM → **Mídia & Upload → LX Storage**, salve o endpoint HTTPS e teste um arquivo. Compartilhar arquivos com a conta de serviço é suficiente para os próximos cadastros; cole o link normal do Drive.

O site R12.2 usa como endereço inicial o Worker **lxplus** mostrado no painel Cloudflare: `https://lxplus.sergio-sousa.workers.dev`. Uma URL salva no ADM tem prioridade. O `wrangler.toml` desta pasta configura outro nome, **lx-storage-drive**: se você implantar por ele, salve no ADM a nova URL recebida. Confira `GET /health?check=1`: a resposta deve incluir `"version":"R12"` e `"googleConnected":true` antes de testar o vídeo.

## Endpoints

- `GET /health?check=1`: consulta de autenticação real; `googleConnected` só vale `true` após resposta da API. Se a API devolver 403, o Worker informa um código seguro para distinguir API desativada, limite, política do domínio ou recusa genérica. A resposta nunca inclui a mensagem completa do Google nem credenciais.
- `GET /probe/FILE_ID?resourcekey=...`: metadados, acesso, Range/206 e identificação parcial de codecs. `codec=unknown` significa que o teste não encontrou a informação nos trechos analisados.
- `GET /v/FILE_ID?resourcekey=...`: vídeo, com encaminhamento de `Range` e 206.
- `HEAD /v/FILE_ID` e `OPTIONS`: cabeçalhos e preflight CORS.

O Worker não devolve HTML do Google ao player. Ele informa erros curtos ao cliente e registra no log da Cloudflare o status HTTP do upstream. O `ETag` é repassado quando o Google o enviar; o Worker não inventa um. O espaço da conta de serviço não representa necessariamente os 2 TB do Drive pessoal.

Para arquivos já públicos, `ALLOW_PUBLIC_FALLBACK=true` habilita uma rota secundária. Ela só é tentada quando falta a conta de serviço ou quando a API devolve 403/404. Ainda exige bytes e Range/206 e pode falhar por limites ou páginas de confirmação do Google; deixe desativada se não precisar dela.

**Segurança:** CORS restringe navegadores, mas não autentica solicitações diretas ao Worker. Quem conhece um ID de arquivo servido por este Worker pode requisitar os bytes. Antes de oferecer catálogo privado por assinaturas, implemente autorização e URLs assinadas no backend.

**Verificação local:** na pasta `cloudflare-worker`, rode `node --test worker.test.mjs`. Para verificar o acesso real é necessário implantar o Worker com credenciais válidas e testar um MP4 H.264 + AAC no ADM.
