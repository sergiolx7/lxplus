# Ativação da LX Plus v25

1. Teste localmente com `python -m http.server 8000` e abra `http://localhost:8000`. No localhost, a conta ADM de demonstração continua disponível para teste.
2. Antes de publicar, execute **novamente** `supabase/setup.sql` no SQL Editor. A v25 adiciona a tabela `lx_settings`, usada pela Identidade visual global.
3. Confira `js/config.js` e preencha `supabase.url` e `supabase.publishableKey` (ou `anonKey`). Nunca use a Service Role Key no frontend.
4. Crie sua conta real no site e promova somente sua conta para ADM usando o comando descrito no fim de `supabase/setup.sql`.
5. No ADM > Produção, envie o catálogo atual para a nuvem.
6. No ADM > Identidade visual, salve o Splash, a cor global e os destaques principais.
7. Para vídeo adaptativo real, informe o URL de um manifesto HLS (`master.m3u8`) no cadastro do filme ou por episódio. O servidor do HLS precisa permitir CORS para o seu domínio.
8. Para legendas, use arquivos `.vtt` ou URLs WebVTT.
9. Faça upload dos arquivos da v25 para o repositório GitHub Pages e aguarde o deploy.
10. Teste em outro navegador/celular: conta, progresso, catálogo, pedidos, identidade global e ADM.

## Segurança

No domínio público, se o Supabase não estiver configurado, o fallback ADM local fica bloqueado. Ele só é permitido em localhost/127.0.0.1 ou ao abrir o arquivo localmente para facilitar testes.
