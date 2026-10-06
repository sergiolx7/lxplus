# LX Plus v40 — loading e fontes musicais

Build: `R12.9-V40-LOADING-MUSIC-20261006`. Publicação exclusiva na branch `lxplus-v40-completa`.

O SDK oficial Supabase 2.117.2 é servido pelo próprio site, com versão fixa e cache offline. As requisições de catálogo compartilham a carga em andamento, têm prazo total de 20 segundos e cancelam o pedido quando necessário. Respostas atrasadas não substituem cargas mais recentes. Falhas preservam o catálogo salvo e permitem tentar novamente; uma falha ao iniciar o SDK também encerra o loading. O catálogo e as notificações deixaram de bloquear a sessão já validada. O polling foi reduzido de 12 para 60 segundos e fica suspenso com a aba oculta; as atualizações em tempo real continuam ativas.

O player de vídeo encerra esperas sem resposta e oferece tentativa novamente. O controller do Spotify tem prazo limite e usa o embed oficial como alternativa quando não responde. A primeira faixa recebe a mesma inicialização das seguintes, e eventos oficiais de término avançam a fila do álbum. Eventos da faixa anterior não alteram a atual. Álbuns/coleções do próprio Spotify continuam sob controle do player do fornecedor.

As fontes adicionadas são links individuais do Spotify, conferidos por título, todos os artistas creditados e duração (diferença máxima de três segundos). Foram consultadas páginas públicas de álbuns, artistas e embeds oficiais. Não foram baixados previews ou MP3 comerciais. Cada atualização exige que o registro ainda esteja sem fonte e que a versão do banco coincida com o backup; não altera a publicação do item. O relatório entregue no pacote informa os IDs, as URLs, a evidência e a contagem final. MP3 próprios continuam com preferência automática e usam a identidade LX Music.

O endereço público `https://watch.plex.tv/pt-BR/movie/leprechaun` permanece uma ficha de catálogo. Não foi recebido endpoint de playback, servidor Plex do usuário ou acesso à integração de parceiro. Essa ficha não foi convertida em arquivo de vídeo, nem foi anunciada uma parceria concluída. O player LX aceita fontes remotas reais MP4/HLS/DASH sem copiar o filme para o armazenamento da LX; a reprodução comercial do Plex depende da integração de reprodução fornecida pelo serviço. Capas e a aba Plex permanecem no site.

Validação: verificações estáticas; regressões do navegador para sessão lenta/persistente, restauração sem catálogo, carga interrompida/duplicada, resposta atrasada, retry, SDK local sem CDN, fallback Spotify, ordem/término/anterior/próxima do álbum e timeout/retry de vídeo; regressões existentes de catálogo, fonte MP3, navegação, álbum e interface universal. Os testes de transporte de fornecedores usam fixtures e não comprovam uma assinatura ou reprodução integral de música no Spotify.

Não foram modificadas as políticas RLS, as permissões do banco ou as configurações de autenticação. A branch main e os conteúdos originais devem permanecer idênticos. Backups anteriores estão no pacote de entrega.
