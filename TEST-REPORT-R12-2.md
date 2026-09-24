# Testes — LX Plus R12.2

- `node --test cloudflare-worker/worker.test.mjs`: 10 testes, inclusive resposta 403 com motivo de API desativada, cota e erro não identificado; nenhum detalhe do Google aparece na resposta pública.
- `node qa-drive-albums-r12-1.cjs`: endereço inicial, mensagem do diagnóstico, acesso ao Worker e agrupamento das músicas.
- `node qa-metadata-r12.cjs` e `node qa-music-r4.cjs`: fluxos locais existentes de música e metadados.
- Sintaxe do JavaScript e do HTML verificada localmente.

O teste local simula respostas do Google; não confirma o estado da conta, o compartilhamento da pasta, a publicação automática do Worker nem a reprodução de arquivo real.
