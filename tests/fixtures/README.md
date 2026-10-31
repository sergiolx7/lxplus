# Fixtures isoladas

Estes arquivos são usados apenas em desenvolvimento e testes. Não entram no build público nem no catálogo.

- `reader-test.pdf` e `reader-test.epub`: documentos sintéticos produzidos para verificar navegação, retomada, marcadores, notas e sanitização de EPUB.
- `flower.mp4`: vídeo de teste obtido da pasta `cc0-videos` dos exemplos interativos da MDN: https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4 . Não representa um título publicado na LX Plus.
- `tone.wav`: áudio sintético gerado pelo servidor de desenvolvimento, sem música comercial.
- `mock-data.js`: contas, conteúdo e notificações fictícios para QA, sem conexão com Supabase.
- `premium2.html`: executa os módulos reais de leitor/player com os arquivos acima e mostra as evidências locais.

Os testes PostgreSQL usam apenas identificadores sintéticos em bancos descartáveis.
