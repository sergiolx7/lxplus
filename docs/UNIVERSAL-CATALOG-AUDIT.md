# LX Plus — auditoria anterior ao LX Universal Catalog

Data: 05/10/2026. Repositório: sergiolx7/lxplus. Base atual: UI36, commit de produção `6a5b30b47861a39ad89b06ffcf1efbc878c96842`.

O trabalho ocorre somente na branch `lxplus-v40-completa`. Sua versão anterior era `d9cbd570ad6e231d215ac6b1b8d7551c771e9af8`; ela foi atualizada por merge com a UI36, mantendo o histórico da branch. Nos conflitos, foram preservados o agrupamento de álbuns e o service worker da UI36. A main não recebeu alterações. Foi criado um bundle Git com as duas referências antes do merge.

## Estrutura confirmada

Interface estática HTML/CSS/JS, com `index.html` e `lxplus.bundle.js` como shell principal, publicada pelo GitHub Pages. A configuração antiga de Sites permanece no checkout, mas não representa a implantação atual deste trabalho.

Supabase `ubidogquzpdvrbzbhxda`: Auth, PostgreSQL 17, catálogo, estados de usuário, comunidade, notificações, ranking e estatísticas. Buckets: `lx-assets` público e `lx-media` privado. Há um Worker de mídia Drive separado. O código atual possui módulos complementares de música, livros, player flutuante, retrospectiva, presença e recuperação.

Na leitura inicial: 88 itens de catálogo (58 músicas, 20 livros, 8 filmes, 1 série e 1 transmissão), 7 perfis, 7 estados de usuário, 49 mensagens e 51 registros de chamadas. Nenhum desses dados foi modificado por esta atualização.

O catálogo existente usa `lx_catalog(id bigint, payload jsonb, published, updated_at)`. Os IDs existentes são referências de históricos, listas e reprodução. Portanto, substituir essa tabela ou converter seus IDs destruiria compatibilidade.

## Recursos reaproveitados

Login/aprovação e cargos; players de vídeo/áudio/leitura; adaptação de streams; sincronização de estados; perfis, comunidade e retrospectiva UI36; upload ao Storage; fontes existentes de música e livros; Worker de mídia e funções anteriores. Foram examinadas as funções implantadas `lx-content-hub`, `lx-universal-importer`, `lx-books-library` e `lx-spotify-import`, além dos módulos locais.

## Problemas e decisões

1. Fontes estão misturadas aos payloads. Novas fontes passam a ter uma tabela protegida separada. As antigas permanecem no fluxo original, sem conversão destrutiva.
2. O importador TMDB antigo lia/escrevia uma chave em localStorage e consultava o TMDB no navegador. Foi removida a persistência local e a consulta passa pelo servidor. O formulário pode receber uma chave do administrador e enviá-la à RPC protegida existente; limpa o campo depois de salvar.
3. A busca antiga depende do modo e do catálogo local. A nova busca reúne local e provedores, com resultados imediatos, atraso curto para consulta externa, paginação e proteção contra respostas atrasadas.
4. Não há chave TMDB, Google Books, Spotify ou feed Plex cadastrado em `lx_integrations`. A única integração armazenada encontrada não fornece esses catálogos. Valores de secrets não foram recuperados nem incluídos no relatório.
5. Não foi encontrado contrato/feed de parceiro Plex no projeto. A página pública e a alegação de autorização não estabelecem os endpoints nem o escopo técnico. O conector requer URL, token, domínios e escopo do feed fornecido pelo parceiro; oferece links oficiais de catálogo enquanto isso.
6. O advisor existente aponta vários avisos sobre funções SECURITY DEFINER e tabelas fechadas sem policies. Esses avisos não demonstram por si só acesso indevido; a nova arquitetura não adiciona funções DEFINER e restringe todas as RPCs privilegiadas a service_role. A revisão das funções antigas não foi transformada em uma mudança de permissões sem avaliar seus consumidores.

## Alterações de banco e configuração previstas

Migration aditiva `20261005233838_lx_universal_catalog.sql`. Tabelas novas prefixadas `lx_media_*`, fila `lx_import_*`, limites e sincronização de parceiro. Não há backfill que sobrescreva conteúdos, usuários ou históricos. O vínculo `legacy_id` e os identificadores externos permitem reaproveitar os registros antigos. A importação concorrente usa IDs exclusivos e locks de transação.

Nova Edge Function `lx-universal-catalog`, com verificação de JWT, validação de usuário aprovado/cargo, cache, rate limit e autorização server-side. Variáveis e instruções completas estão em `UNIVERSAL-CATALOG-SETUP.md`.

Esta auditoria foi feita por leituras do código e dos metadados do projeto. Nenhuma migration, função nova, alteração de Storage ou publicação foi aplicada à produção nesta sessão.
