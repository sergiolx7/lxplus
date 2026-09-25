# LX Plus V40 Rebuild — status

Build alvo: `V40-REBUILD-20260925`

## Estratégia
- Base funcional restaurada: R12.4.
- Dados e Supabase preservados.
- Runtime funcional v40 reaproveitado sem o stylesheet v40 anterior.
- Novo layout em `lxplus.rebuild.css`.
- Guardas estruturais em `lxplus.rebuild.js`.
- Produção permanece em manutenção até revisão final.

## Módulos integrados
- Home cinematográfica, hero, carrosséis e Top 10.
- Filmes, séries, player e Google Drive preservados da base.
- LX Music, Floating Player, álbuns, playlists e Presence.
- LX Books.
- LX Live e resolver de streams.
- LX Community 2.0 como overlay fixo.
- LX Ranking mensal e histórico.
- LX Admin, Smart Import, Link Health, erros e feature flags.
- Mobile/tablet/desktop responsivos.

## Critérios para sair da manutenção
- CI verde.
- Sem overflow horizontal estrutural.
- Comunidade sempre em overlay.
- Top 10 e carrosséis sem cortes.
- JS principal e v40 com sintaxe válida.
- PWA/cache apontando para a rebuild.
- Supabase sem migration destrutiva.
