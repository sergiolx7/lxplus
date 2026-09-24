# Verificação da R12.4

- `node --check lxplus.bundle.js`: aprovado.
- `node --check service-worker.js`: aprovado.
- Leitura de `manifest.webmanifest` como JSON: aprovada.
- `node --test cloudflare-worker/worker.test.mjs`: 10 testes aprovados.
- `node qa-drive-albums-r12-1.cjs`: aprovado.
- `node qa-metadata-r12.cjs`: aprovado.
- `node qa-music-r4.cjs`: aprovado.

O teste de áudio do filme específico requer abrir a mídia com acesso à conta no navegador. Se o áudio não tocar no LX Player e o Drive solicitar login ou também falhar, forneça pelo ADM uma segunda cópia com áudio AAC.
