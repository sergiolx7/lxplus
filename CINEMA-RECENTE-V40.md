# LX Plus · cinema e catálogo · 7 de outubro de 2026

A seleção reúne 12 longas completos em português nos canais oficiais Filmelier TV BR, Adrenalina Pura TV BR e O2 Play. As versões incorporadas duram entre 75 e 145 minutos. O ano corresponde ao lançamento usado no catálogo brasileiro; Love Kills chegou aos cinemas brasileiros em maio de 2026, após exibição em festival em 2025.

O início de Assistir agora apresenta filmes recentes, doramas, séries e animes em seções verticais separadas. As capas têm proporção de cartaz e duração visível. Em Filmes, curtas e acervo histórico têm suas próprias coleções. Os títulos de descoberta continuam identificados como Em breve quando não possuem mídia.

Filmes com fonte YouTube utilizam a incorporação oficial, com os controles, créditos, anúncios e restrições do provedor. A LX Plus oferece retomada pelo histórico, avanço e recuo de dez segundos, tela cheia, fechamento por Escape e próximo episódio. Os controles do site ficam fora do quadro do provedor.

O arquivo `catalog/recent-films.json` registra duração, canal, oEmbed e disponibilidade declarada para o Brasil. A confirmação do oEmbed permite criar a incorporação; a disponibilidade continua dependente do canal e da região. Os arquivos de vídeo não são copiados ou redistribuídos.

A importação é somente de novos registros. O total e a impressão digital de todo o catálogo são comparados dentro de uma transação. Uma mudança concorrente ou uma fonte duplicada impede a gravação. A importação não altera os conteúdos já existentes, suas publicações ou datas.

## Verificação

- Contratos estáticos e integração de mídia: passaram.
- Teste Postgres de preservação, repetição, colisão, concorrência e limite: passou.
- Catálogos e player em 390, 820 e 1280 pixels: passaram.
- Regressões de sessão, música, álbuns, Plex e filmes do acervo: passaram.
- Eventos de transporte e erros do YouTube: verificados com fixture de teste.
- API oficial do YouTube: carregou e inicializou dentro do player. A validação não consiste em assistir a cada filme inteiro; os demais canais têm restrições regionais.

O código está na branch `lxplus-v40-completa`. A branch principal e as contas dos usuários ficam preservadas.
