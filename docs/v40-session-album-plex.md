# LX Plus v40 — sessão, álbuns e filmes do Plex

Build: `R12.7-V40-SESSION-ALBUM-PLEX-20261006`.

A restauração da sessão não é mais abandonada depois de 4,5 segundos. Uma conexão lenta pode terminar de validar a conta e abrir o site sem outro login. O SDK continua renovando e persistindo os tokens; a senha não é salva. Se o catálogo ocupar o espaço necessário para um token, somente sua cópia recuperável no armazenamento local é removida. O catálogo continua em memória e pode ser recarregado da nuvem. Histórico e coleções são preservados. Sair da conta ou entrar em outra invalida uma restauração anterior ainda em andamento.

Reproduzir álbum procura a primeira faixa com uma fonte válida. A fila segue a ordem das faixas do álbum e ignora as que ainda não têm áudio. Próxima, anterior e término da faixa usam a mesma fila. A correção também vale para álbuns pessoais e playlists. Um álbum inteiro sem fonte avisa que o áudio ainda não está disponível.

Em **Assistir → Filmes**, a aba **Parceria com Plex** mostra somente filmes associados ao Plex no catálogo. O botão externo “Assistir no Plex” foi retirado. Os títulos sem vídeo mantêm suas capas e o aviso **Disponível em breve**; o proprietário pode usar **Adicionar arquivo ou link** na ficha para cadastrar uma fonte que tenha autorização para transmitir.

O player LX aceita arquivos próprios e URLs nativas autorizadas, incluindo as fontes `mediaKey`, `authorizedStreamUrl` e `authorizedVideoUrl`. Páginas `watch.plex.tv` são fichas de catálogo e não são tratadas como arquivos de vídeo. Fontes que exigem DRM, player do parceiro ou publicidade do parceiro não são convertidas para esse fluxo.

**A transmissão dos filmes comerciais do Plex ainda não está ativada.** O endereço público de catálogo recebido não fornece um feed de reprodução autorizado. Para ativá-la, falta o acesso de reprodução fornecido pelo Plex. As configurações do feed, token e hosts permitidos pertencem ao servidor; nunca devem ser colocadas no JavaScript público. Esta atualização não altera políticas de autenticação, aprovação de contas, RLS, catálogo publicado ou a branch `main`.

Verificação: testes de navegador com sessão lenta, fechamento/reabertura, armazenamento cheio, logout durante restauração, troca de conta, áudio real de teste, fila do álbum e filme MP4 próprio de teste. Os testes não usam contas reais nem extraem conteúdo dos provedores.
