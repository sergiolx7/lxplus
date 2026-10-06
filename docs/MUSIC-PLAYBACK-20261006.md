# Catálogo ampliado e fontes de música — 6 de outubro de 2026

O banco de produção tem **2.134 conteúdos**, com **2.132 publicados**. Esta atualização adicionou **1.146 músicas** às 900 fichas importadas anteriormente. O catálogo contém 1.733 músicas, 96 filmes, 51 séries, 16 animes, 17 doramas, 220 livros e um item ao vivo. É o conjunto coletado e verificado neste trabalho, não um inventário de todas as músicas existentes ou de todo o Plex.

Foram vinculadas **18 referências oficiais do YouTube**, conferidas pelo oEmbed público, título e canal do artista: Envolver, Bang, Infiel (Ao Vivo), Blank Space, Shake It Off, Lover, Wildest Dreams, Look What You Made Me Do, Call Out My Name, Blinding Lights, Save Your Tears, I Feel It Coming, Shape of You, Perfect, Thinking Out Loud, Photograph, Yellow e Viva La Vida. Lover usa o lyric video oficial. Os arquivos de áudio não foram extraídos desses vídeos.

Entre as 2.046 fichas importadas, 18 têm a fonte oficial vinculada e 2.028 permanecem com **Disponível em breve**. As capas, artistas, álbuns e demais fatos de catálogo foram mantidos. As fichas sem fonte ficam prontas para o proprietário adicionar um arquivo ou link.

## Alterações efetivamente aplicadas no banco

- As 1.146 adições foram gravadas em 23 lotes com preservação do conjunto anterior, deduplicação e limite de 2.500 registros.
- Foram retirados campos repetidos de apresentação das 900 importações anteriores: capa duplicada, cópias da página de metadados, datas iguais e faixa única sem áudio. Dados de música repetidos em uma descrição gerada continuam nos campos de título, artista e álbum. Identificadores duplicados continuam na identidade externa e na URL oficial.
- Os 88 registros originais não foram alterados. Seu fingerprint continua `7d4ab52d911692acc86253a4471f5261`.
- A migration `20261006113522_lx_catalog_legacy_capacity.sql` configurou `pgrst.db_max_rows=2500` e recarregou a configuração. Isso dá capacidade à interface publicada, que faz uma única consulta. A interface v40 usa páginas de 500. Nenhuma política, grant, conta ou arquivo do Storage foi alterado.
- O snapshot completo dos 988 registros anteriores foi preservado antes das mudanças. Há guardas por fingerprint dos originais e por hash dos alvos para não substituir edições concorrentes.

## Player na branch v40

O código está na branch `lxplus-v40-completa`, com build `R12.6-V40-MUSIC-20261006`. A main e a publicação do frontend não foram modificadas nesta atualização.

Uma seleção comum agora atende ao catálogo, fila, player e marca: arquivos e URLs de áudio cadastrados têm prioridade; um player oficial é usado quando essa fonte não está disponível. A marca no dock segue a fonte que realmente iniciou, inclusive se um áudio falhar e houver fallback para YouTube. Links de loja e de metadados não são tratados como áudio.

Ao adicionar um MP3, a próxima seleção da mesma faixa recarrega a fonte e retira a indicação do YouTube do dock. O upload substitui overrides antigos de áudio. Faixas de um álbum conservam fontes próprias; o áudio de uma faixa não é aplicado a todas. Créditos, artista e informações de licença não são transformados em uma declaração de autoria do LX Plus.

O áudio nativo conserva o elemento de reprodução durante a navegação e usa Media Session para controles. O player oficial do YouTube permanece visível, com viewport de pelo menos 200 × 200; ocultar o player ou sair para segundo plano pausa a reprodução. O Spotify conserva seu embed e alterna entidades por `loadEntity`, com compatibilidade para `loadUri`; o container permanece estável mesmo quando o SDK substitui o elemento interno. Reprodução completa e continuidade de embeds dependem do provedor, sessão e navegador.

O cache usa o dado mais recente em memória quando o armazenamento local está cheio, evitando reintroduzir uma versão antiga. As fichas compactadas também foram testadas com o conjunto completo e espaço reservado para dados da conta.

## Plex

O adaptador do catálogo universal já está implementado e seu contrato foi validado em testes isolados. A ativação da transmissão interna ainda depende de feed, hosts e credenciais autorizados para catálogo/reprodução, além da publicação do backend universal. Os links públicos fornecidos identificam fichas e continuam disponíveis como **Assistir no Plex**.

Não foram implantadas as tabelas ou a Edge Function do catálogo universal, nem agendado o worker. A migration de capacidade acima é uma mudança separada na API existente. Fontes que exigem player do parceiro, DRM ou anúncios continuam no player oficial. O formato de feed e a configuração estão em `UNIVERSAL-CATALOG-SETUP.md`.

## Validação e limites

Passaram as verificações estáticas, SQL isolado com o snapshot real, proteção contra atualização concorrente, importação/deduplicação, capacidade limitada, paginação, cache cheio, seis tipos sem mídia, editor e filas. O conjunto de 2.134 fichas coube no cache do navegador junto a uma reserva de dados da conta.

O teste do player decodificou MP3 gerado para QA, verificou navegação, troca de YouTube para áudio nativo, recuperação de uma URL privada expirada, fonte efetiva e transporte de duas faixas Spotify com substituição do mount. A regressão UI36 e o navegador do catálogo universal passaram.

O estado hidden foi simulado no navegador desktop; não houve teste em aparelho físico com tela bloqueada. Os embeds de QA validam transporte e controles, não reproduzem conteúdo comercial real. A conferência dos 18 links confirma metadados oficiais, não garante reprodução em todos os países ou sessões. Nenhum MP3 comercial foi baixado ou convertido.

Documentação primária consultada: [YouTube: player visível e regras de reprodução](https://developers.google.com/youtube/terms/developer-policies), [tamanho e identificação do embed](https://developers.google.com/youtube/terms/required-minimum-functionality), [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api), [PostgREST: configuração](https://docs.postgrest.org/en/stable/references/configuration.html).
