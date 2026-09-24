# Testes da R12

## Executados localmente

- Worker: 9 testes automatizados para autenticação simulada, Range/206, cabeçalhos, resourcekey, HEAD, OPTIONS, detecção H.264/AAC e HEVC, bloqueio de HTML, bloqueio de Range ignorado, CORS e fallback público explícito.
- Música: teste de fallback por nome, tags ID3 de MP3, tags M4A e número da faixa; teste anterior das interações do player de áudio, fila, coleção e sincronização de estado.
- Sintaxe: bundle JavaScript, scripts inline do HTML, service worker e Worker verificados pelo Node.
- Busca estática: removidas as rotas públicas diretas do player; dados do Supabase mantidos no bundle sem alteração de esquema.

Comandos:

    node --test cloudflare-worker/worker.test.mjs
    node qa-metadata-r12.cjs
    node qa-music-r4.cjs
    node --check lxplus.bundle.js
    node --check service-worker.js

## Não executados nesta sessão

- Reprodução de um arquivo real do Drive, Range de arquivo grande, seek no começo/meio/fim e configuração real da conta de serviço: não há credenciais nem acesso ao Worker publicado nesta cópia.
- Fluxos autenticados de ADM, usuário comum, Supabase, chamadas e comunidade: faltam sessão e ambiente de teste integrado.
- QA visual em celular/tablet/desktop e Edge/Safari: o navegador de teste bloqueou o endereço local. As regras CSS foram revisadas, mas não há captura visual validada.
- Teste de instalação/atualização real da PWA em dispositivos físicos.

## Critério antes de produção

Após implantar o Worker com secrets, confira /health?check=1, teste no ADM um MP4 H.264 + AAC com Range/206 e abra o filme num usuário comum. Navegue até o meio e o fim, confirme áudio, depois valide a experiência em celular e tablet. Reveja as permissões dos arquivos: CORS sozinho não protege URLs de mídia.
