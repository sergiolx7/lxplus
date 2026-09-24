# LX Plus NOVA — verificação da build NOVA-20260924-R1

## Verificado

- `node --check` passou para `lxplus.bundle.js`, `lxplus.recovery.js`, `lxplus.support.js` e `lxplus.audiofx.js`; manifest JSON válido; IDs estáticos do HTML únicos e arquivos referenciados incluídos no pacote.
- Teste comportamental isolado da fila: iniciando uma faixa Gospel em um catálogo com outra Gospel e uma de outro gênero, Próxima e Anterior circularam apenas nas faixas Gospel.
- Migração de suporte aplicada no projeto real. Ambas as tabelas estão com RLS ativo; inserção de ticket e mensagem como usuário autenticado e leitura ADM foram simuladas em transação desfeita. Outro usuário viu 0 tickets alheios. Contagem final: 0 tickets, 0 mensagens de teste.
- Supabase lido sem alterar o catálogo: 40 itens, 31 músicas, 4 usuários, 4 perfis, 4 estados de usuário e 34 objetos em `lx-media`. `lx-spotify-import` v1 consta ativa e exige JWT.
- O site público foi aberto no navegador e ainda servia a build `NOVA-20260923`; esta nova build não foi publicada no domínio público. O console público mostrou uma mensagem da extensão do navegador, sem evidência de erro do aplicativo nessa tela de acesso.

## Não comprovado nesta build

O navegador de testes bloqueou o servidor local com `net::ERR_BLOCKED_BY_CLIENT`; não havia conta autenticada disponível. Portanto não foi possível ouvir uma MP3 desta build, testar controles de áudio/Spotify/YouTube, concluir chat com ADM no navegador, salvar Carrossel e conferir Home, publicar evento Ao Vivo, testar Cast/AirPlay em TV, nem inspecionar visualmente desktop/tablet/celular desta build. Network 200/206, Range, CORS e `loadedmetadata` de uma faixa real também não foram comprovados nesta continuação. Esses itens não estão aprovados.

Após publicar os arquivos juntos em um endereço HTTPS e entrar com conta ADM, verificar:

1. Ouvir `CUIDA DO PET`, `Para Ti Eu Vou`, `Semi Nua 2`: Play, duração, progresso, pause, seek, Próxima do mesmo gênero, navegação sem interrupção e capa. DevTools: MIME, URL assinada, Range, HTTP 200/206 e erros 4xx/5xx.
2. Abrir os players oficiais YouTube/Spotify e conferir os controles e o tamanho móvel. Num MP3, ativar presets, amplificação e graves e ouvir a diferença, inclusive após trocar de página.
3. Abrir Ajuda, escolher assunto, iniciar conversa, enviar duas mensagens, responder em ADM → Suporte e verificar histórico e isolamento entre usuários.
4. Importar uma faixa MP3 autorizada, conferir ID3/capa, publicação e aba MP3; substituir a fonte de uma música da aba Links. Colar links Spotify reais em lote e revisar a prévia antes de salvar.
5. Salvar uma alteração do Carrossel e conferir Home; criar evento manual Ao Vivo com fonte compatível, verificar página pública e remover o evento de teste com cuidado.
6. Conferir a tela de assistir e filtro de qualidade em celular/tablet/desktop, testar TV compatível na mesma rede, perfil, busca, Comunidade e DevTools Console/Network.

O backend está preservado; o teste audível e os fluxos autenticados ainda dependem de publicação e sessão real.
