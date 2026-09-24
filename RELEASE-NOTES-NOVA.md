# LX Plus NOVA — 2026-09-24, R3B

Base: versão R2-AUDIO já mesclada ao GitHub. Catálogo, contas, mídia, histórico e tabelas do Supabase foram preservados; esta atualização altera frontend e documentação, sem migrações nem exclusões de dados.

## Ajustes

- Música: áudio MP3 nativo prioriza a URL assinada do Storage; o proxy de streaming com Range (tentado diretamente se a URL assinada falhar) e o download autorizado do arquivo continuam como alternativas. O cache da URL privada expira antes da assinatura. Pré-carregamento limitado a oito faixas da tela atual ajuda a manter a ativação de áudio no primeiro toque. Reprodução começa logo após definir a fonte, sem esperar a metadata para chamar `play()`. O player apresenta erro ou tentativa manual quando a fonte/bloqueio do navegador impede o áudio. Capa e título permanecem. Capa e título do destaque, além do título do álbum, podem iniciar a música.
- Filmes: o comando Assistir chama `play()` assim que a fonte está definida no player nativo. Quando o navegador bloqueia a reprodução automática, a tela informa que é necessário tocar em ▶. Fontes externas seguem as restrições de seus players oficiais.
- Notificações: uma única abertura da central para topbar e perfil, abas com contagem, estado lido/não lido, acesso aos avisos da comunidade e painel responsivo. ADM tem prévia ao escrever. Erro de publicação na nuvem passa a aparecer, sem mensagem enganosa de sucesso.
- ADM: menu dividido por tipo de trabalho; identificação usa o avatar da conta; atalhos reais e lista de rascunhos/fontes a conferir na Visão geral.
- Cache: HTML, JavaScript, CSS, Service Worker e manifest apontam para a build `NOVA-20260924-R3B`.

## Limites de confirmação

A audição de uma faixa privada, o teste de conta ADM e a reprodução de filmes autenticados requerem uma sessão LX Plus. O navegador de verificação estava na tela de login, portanto esses passos não devem ser apresentados como aprovados até serem realizados na conta do usuário.
