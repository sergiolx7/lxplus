# Modelo de conteúdo — LX Plus v18

Cada tipo de mídia possui requisitos diferentes no ADM. O controle de qualidade não exige campos sem sentido para aquela mídia.

## Filme
Obrigatórios: título, ano, classificação, gênero, descrição, capa vertical, banner 16:9, diretor, duração e arquivo do filme.
Opcionais: elenco, idiomas, legendas e trailer.

## Série
Obrigatórios: título, ano, classificação, gênero, descrição, capa, banner, criador/produção e ao menos um episódio numerado dentro de uma temporada.
Opcionais: país/origem e trailer.

## Anime
Mesma estrutura de série, mas o campo principal é **Estúdio**. Episódios e temporadas são enviados no módulo Mídia & Upload.

## Dorama
Mesma estrutura de série, com **Criador/produção**, país/origem opcional e episódios separados por temporada.

## Livro
**Não exige banner.** Obrigatórios: título, ano, classificação, gênero, descrição, capa, autor e PDF/EPUB ou capítulos cadastrados.
Opcionais: editora e ISBN.

## Música
**Não exige banner.** Obrigatórios: título, ano, classificação, gênero, capa, artista e arquivo de áudio/faixas. Para texto editorial, basta uma descrição ou letra.
Opcionais: álbum, compositor, número da faixa e letra. Para álbuns/EPs, as faixas podem ser enviadas em lote.

## Upload em lote
A tela Mídia & Upload possui dois modos independentes:
- **Episódios**: Série, Anime e Dorama; seleciona obra + temporada e detecta E01/EP02.
- **Faixas de música**: seleciona a obra musical e envia vários arquivos de áudio em ordem.
