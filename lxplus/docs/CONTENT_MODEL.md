# Modelo de conteúdo — LX Plus v25

## Campos editoriais comuns
Título, tipo, ano, classificação, gênero, descrição, status, prioridade, destaque, Em alta e `scheduledAt` opcional. Um conteúdo publicado com `scheduledAt` futuro só aparece aos usuários quando o horário chega.

## Filme
Obrigatórios editoriais: título, ano, classificação, gênero, descrição, capa, banner, diretor e duração.
Mídia: pelo menos um entre arquivo original (`mediaKey`), `hlsUrl` ou `qualitySources`.
Opcionais: trailer, elenco, idiomas, WebVTT e variantes 1080p/720p/480p/360p.

## Série / Anime / Dorama
Obrigatórios: metadados da obra, capa, banner, criador/estúdio e episódios numerados. Para publicação com controle de qualidade, cada episódio deve ter arquivo (`mediaKey`), `hlsUrl` ou variante de qualidade.
Cada episódio pode possuir `subtitleTracks` e `hlsUrl` próprios.

## Livro
Sem banner obrigatório. Exige capa, autor e PDF/EPUB ou capítulos cadastrados.

## Música
Sem banner obrigatório. Exige capa, artista e arquivo/faixas. Descrição ou letra satisfaz o texto editorial.

## Campos de experiência
- `priority`: ordem editorial.
- `scheduledAt`: lançamento agendado.
- `publishedAt`: primeira publicação.
- `featured`: destaque editorial.
- `trending`: Em alta.
- `hlsUrl`: manifesto adaptativo.
- `qualitySources`: URLs por resolução.
- `subtitleTracks`: `{label, lang, url}`.
