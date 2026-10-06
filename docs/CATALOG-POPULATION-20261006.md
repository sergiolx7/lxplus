# Catálogo preenchido — 6 de outubro de 2026

Foram cadastrados **900 novos itens no banco do site**, com capas, identificação da fonte e status **Disponível em breve**. Os 88 registros anteriores foram preservados. O catálogo passou a ter 988 registros, dos quais 986 estão publicados.

| Tipo | Novos cadastros |
| --- | ---: |
| Filmes | 88 |
| Séries | 50 |
| Animes | 16 |
| Doramas | 17 |
| Músicas | 529 |
| Livros | 200 |
| **Total** | **900** |

O Duende / Leprechaun está cadastrado com capa e link oficial do Plex. A coleta inclui os títulos identificados na página pública brasileira do Plex, respeitando registros já existentes, além de animes, doramas, músicas e livros. Capas e fatos de catálogo vêm de páginas públicas do Plex, da API de catálogo do iTunes e da Open Library. Não foram copiados arquivos de vídeo, músicas, PDFs, previews de áudio ou URLs protegidas de players.

Todos os novos itens estão publicados como fichas de catálogo, com mídia interna vazia. As descrições começam com “Disponível em breve no LX Plus” para que o estado também fique claro na interface anterior. Livros não receberam links de leitura sem arquivo; links de loja de música ficam separados das fontes de reprodução.

## Interface na branch de trabalho

As alterações de interface estão na branch `lxplus-v40-completa`. A main e a publicação do frontend em produção não foram alteradas. A gravação dos 900 cadastros no banco já foi executada; publicar a interface nova é uma etapa separada.

Na interface nova, conteúdos sem mídia exibem o aviso nas capas e na ficha, sem abrir vídeo, leitor ou áudio vazio. O proprietário encontra o botão **Adicionar arquivo ou link**, que abre o editor do item. A ficha continua publicada ao editar seus metadados sem arquivo. Ao cadastrar uma fonte, o estado de disponibilidade é atualizado. Filmes antigos sem fonte também mostram “Disponível em breve”, sem alterar seus dados no banco.

O carregamento passou a paginar o catálogo em blocos de 500, com ordenação por atualização e ID. Uma página com erro preserva o último catálogo completo em cache. A importação inicial foi limitada a 900 novos registros para manter os itens antigos visíveis também na interface anterior, cujo carregamento usa uma página de até 1.000 registros. Não se trata de um inventário completo mundial ou de todo o acervo do Plex. Outras 1.146 fichas coletadas ficaram no arquivo de coleta, sem publicação automática neste lote.

Fichas de música têm links oficiais e o selo oficial do iTunes junto às capas. Músicas sem arquivo ficam fora das filas de reprodução de músicas existentes. O convite para assistir com amigos exige uma fonte de vídeo cadastrada.

## Conferências realizadas

- 900 novos registros com URL de capa HTTPS, status “Disponível em breve” e fonte de reprodução interna vazia.
- Os 88 registros originais conservaram o fingerprint `7d4ab52d911692acc86253a4471f5261` antes e depois da gravação.
- Importação aditiva em 36 lotes, com trava de preservação dos originais, deduplicação por ID, identidade externa, identidade normalizada e página de metadados. Não houve substituição de registros existentes.
- Teste em PostgreSQL isolado com o snapshot real: 900 adições, repetição sem duplicar, proteção do limite e interrupção diante de edição concorrente de um original.
- Navegador: paginação de 1.205 registros; falha de página sem perda do cache; seis tipos sem mídia; editor e atualização do estado ao adicionar fonte; filas preservadas; larguras de 320, 390, 820, 1.280 e 1.920 pixels.
- Busca universal, ficha, Admin e controles adaptativos mantiveram os testes de navegador aprovados. A regressão da UI36 validou Meu Play, ranking, perfil, movimento do player e áudio PCM real, incluindo play/pause, seek e limpeza.
- Uma capa de cada um dos seis tipos respondeu HTTP 200 com tipo de imagem. Foi uma amostragem, não uma verificação HTTP de todas as capas.

Não foram alterados usuários, histórico, comunidade, Storage, políticas de acesso, migrations, Edge Functions ou cron. As integrações do catálogo universal descritas no relatório anterior continuam preparadas para staging; este preenchimento utiliza a tabela de catálogo existente.

O snapshot anterior do catálogo foi preservado fora do repositório público. O pacote de entrega contém o snapshot, o lote publicado, a coleta adicional, os resultados de verificação e o código da branch. Dois endereços adicionais tentados para Solo Leveling e Hidden Love não tiveram metadados confirmados; não receberam fichas inventadas.
