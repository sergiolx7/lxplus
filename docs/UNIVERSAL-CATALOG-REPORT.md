# LX Plus — entrega do LX Universal Catalog


Atualização posterior: [900 novos cadastros foram gravados no catálogo existente](CATALOG-POPULATION-20261006.md), com capas e status “Disponível em breve”. As contagens e a condição de leitura abaixo descrevem a auditoria anterior a esse preenchimento. A main e a implantação do catálogo universal continuam inalteradas.
Data: 06/10/2026. Branch: `lxplus-v40-completa`. Base preservada: UI36, `6a5b30b47861a39ad89b06ffcf1efbc878c96842`.

## Resultado e situação de implantação

A implementação acrescenta catálogo federado, importação sob demanda, tabelas separadas de fontes, resolver, filas, conector configurável de parceiro Plex e LX Content Hub. Reaproveita login, comunidade, retrospectiva, níveis reais e players atuais. A branch antiga recebeu um merge da UI36 antes da implementação, sem alterações na main.

O código, a migration e os testes estão preparados para staging. Nenhuma migration, Edge Function, cron, mudança de Storage ou publicação foi aplicada à produção. Não foi realizado um teste de login real nem de reprodução com novas credenciais de provedores; os limites de validação estão discriminados abaixo. A produção não está habilitada para essas novas funções apenas por este commit.

## Auditoria e preservação

Foram examinados o shell HTML/JS/CSS, módulos UI36, players, importadores, funções implantadas, schema, políticas, índices, Storage e nomes das integrações configuradas. O catálogo existente usa IDs bigint em `lx_catalog`; os novos registros usam UUID e um vínculo opcional `legacy_id`. Usuários, mensagens, histórico, músicas, filmes, livros e IDs antigos não foram convertidos ou substituídos.

Na leitura inicial do projeto Supabase: 88 registros de catálogo, 7 perfis, 7 estados de usuário, 49 mensagens e 51 registros de chamadas. A única integração configurada encontrada não fornece TMDB/Google Books/Plex. Valores de secrets não foram incluídos nesta entrega. Buckets existentes: `lx-assets` público e `lx-media` privado.

Foi criado o backup Git `lxplus-before-universal.bundle` antes do merge; ele acompanha o pacote. Contém referências anteriores da main/UI36 e da branch de trabalho. É backup de código, não de banco, Auth ou Storage. Nenhuma operação destrutiva no banco foi executada. Um backup completo e restauração verificada desses serviços continuam sendo requisitos da futura ativação em produção.

## Recursos implementados

| Área | Comportamento |
| --- | --- |
| Catálogo | Filme, série, anime, dorama, documentário, show, faixa, release/álbum, artista, playlist, livro, autor e tipo reservado para live. Temporadas e episódios têm tabelas e carregamento sob demanda. |
| Busca | Uma busca reúne catálogo local, TMDB, MusicBrainz, Google Books/Open Library, autores, playlists próprias e pessoas aprovadas com visibilidade social. Resultados locais aparecem imediatamente; respostas antigas são descartadas. Filtros, cache, paginação externa e janelas de sessenta cards evitam grids ilimitados. |
| Filme/TV | Metadados pt-BR, fallback inglês, imagens, logo, elenco, trailers, classificação, empresas, franquia, temporadas, episódios, similares e recomendações quando o provedor os fornecer. Filme e TV usam namespaces diferentes. |
| Anime/dorama | Mesma identidade TMDB do catálogo geral, classificação por gênero/país/idioma e tags K/J/C/T-Drama. País, título original, produção, elenco/personagens, status, próximo episódio e idiomas usam dados disponíveis; nenhuma informação ausente é inventada. |
| Música | Busca de faixas, artistas e releases, inclusive tipos single/EP quando informados; créditos, duração, ISRC, track number e campos opcionais. MusicBrainz fica separado da mídia. Playlists antigas permanecem disponíveis; músicas universais podem entrar em playlists privadas novas e ser encontradas pelo nome da playlist. |
| Livros/autores | Google Books configurável e Open Library equivalente sem chave; autores Open Library, ISBN, capa, páginas, editora e categorias quando fornecidos. Ficha sem arquivo autorizado mantém informações/link oficial. |
| Fontes | Cadastro administrativo de fontes múltiplas, autorização, DRM, região, prioridade, qualidade, codec, áudio, legendas, manifests, expiração e saúde. APIs e tabela oferecem os campos estruturados; o formulário básico permite URL ou upload privado e associação a episódio. |
| Resolver/player | Prioridade de fontes, validação de host/DNS, HEAD ou Range mínimo, expiração, URLs assinadas de Storage, exclusão de fonte com erro e fallback externo. Preserva players de vídeo, áudio e leitura. HLS/DASH também funcionam por tipo explícito quando a URL não tem extensão. Controles adaptativos de qualidade, áudio e legenda foram acrescentados. |
| Progresso | Novo progresso de vídeo/áudio por usuário, item e episódio, com restauração entre sessões/dispositivos. O progresso legado e os players antigos continuam no fluxo original. Próximo episódio utiliza a lista da reprodução; pular abertura aparece quando o episódio possui tempos de intro cadastrados. |
| Home | Mantém continue/recomendações/Top 10/recência/gêneros existentes. Acrescenta itens universais recentes, favoritos/progresso, recomendações e discovery TMDB de lançamentos, filme, TV, anime, dorama e gêneros. As listas são calculadas a partir do banco/APIs. |
| Importação | Prévia por URL/ID; TMDB, IMDb, livros/autores, música e Plex. CSV/JSON/listas/pastas de referências; filas até 2.000 entradas, lotes pequenos, retry, leases, retomada e rollback conservador. Arquivos de mídia podem ser enviados no gerenciamento de fontes. |
| Plex | Adaptador de feed autorizado com cursor, fila, vínculo Plex/TMDB, disponibilidade incremental e estatísticas. URLs públicas sem feed pedem correspondência explícita e geram botão oficial. O contrato real do parceiro ainda precisa ser fornecido e adaptado se diferir do contrato documentado. |
| Admin | Totais por tipo, episódios, reprodução/catálogo, capas/metadados ausentes, links offline e erros de importação; prévia, filas, Plex, saúde de fontes e publicação/rascunho em massa. |
| Manutenção | Cliente de cron para continuar filas, testar fontes, limpar cache e sincronizar feed configurado. Não depende de o Admin ficar aberto. Nenhum agendador externo foi instalado nesta sessão. |

Os campos estruturados opcionais de fontes podem ser preenchidos pela API administrativa documentada. Romanização, estúdio exato, dublagem e tempos de abertura só devem ser adicionados quando houver dados confiáveis; não há um detector automático desses dados. O leitor PDF/ePub e as coleções legadas foram preservados, sem reimplementação.

## Arquivos e banco

Alterados: `index.html`, `lxplus.bundle.js`, `service-worker.js` e `tests/static-checks.mjs`. A folha de estilo antiga não recebeu uma reforma global; o CSS novo é escopado.

Novos arquivos principais:

- `lxplus.universal-catalog.js` e `lxplus.universal-catalog.css`.
- `supabase/functions/_shared/universal-core.mjs`, `universal-providers.mjs`, `universal-service.mjs`.
- `supabase/functions/lx-universal-catalog/index.ts`, `deno.json`, `.env.example` e `supabase/config.toml`.
- `supabase/migrations/20261005233838_lx_universal_catalog.sql`.
- `tests/universal-core.mjs`, `tests/universal-service.mjs`, `tests/universal-database.mjs`, `qa-universal-browser.cjs`.
- `tools/run-browser-qa.cjs`, `tools/run-catalog-maintenance.mjs`, dependências fixadas em `tools/catalog-qa` e workflow de verificação `universal-catalog.yml`.
- Auditoria, instruções de configuração e este relatório em `docs`.

A migration é aditiva, transacional e cria quinze tabelas:

`lx_media_items`, `lx_media_external_ids`, `lx_media_provider_links`, `lx_media_seasons`, `lx_media_episodes`, `lx_media_sources`, `lx_media_relations`, `lx_media_cache`, `lx_uc_limits`, `lx_import_jobs`, `lx_import_entries`, `lx_media_progress`, `lx_media_reactions`, `lx_media_playlists`, `lx_partner_sync`.

Inclui índices GIN/composite/FK, IDs externos únicos, locks de identidade, claims com `SKIP LOCKED`, RPCs INVOKER restritas a `service_role` e RLS em todas as novas tabelas. Não escreve em usuários, comunidade ou catálogo legado. Itens arquivados podem ser restaurados por um administrador a partir de uma prévia por URL. O rollback arquiva somente itens novos daquele lote ainda intactos e sem fontes, progresso, reação, relação ou uso em playlist; não apaga registros antigos.

## Segurança e correções

Chaves de provedores, token do parceiro e chave de serviço ficam no servidor. O cliente só recebe dados de catálogo, disponibilidade e a URL necessária a uma reprodução autorizada. A busca e a home respeitam rascunhos antigos vinculados. Manifests e campos privados dos jobs de parceiro não são enviados no painel de status. Jobs enviados pelo cliente não podem forjar um feed parceiro.

O TMDB antigo foi retirado do localStorage e movido para o proxy administrativo no servidor. Foram corrigidos o namespace compartilhado de IDs filme/TV, paginação de rascunhos, respostas de busca atrasadas, placeholders com URLs vazias, banner vazio na busca, rolagem herdada do modal, failover que poderia usar outra ficha aberta e persistência acidental de fontes temporárias no catálogo antigo. Upload recém-criado é removido se a associação à fonte falhar; arquivos anteriores não são removidos por essa limpeza.

Fontes sem autorização, com DRM ou requisitos de anúncios/player de parceiro não entram no resolver direto. Hosts são exatos e há bloqueio de IPs/endereços privados e redirecionamentos de mídia não revisados. A saúde da fonte nunca remove o título. Os avisos antigos do Supabase sobre funções DEFINER não foram tratados como autorização para alterar permissões antigas sem revisar seus consumidores.

## Validação realizada

| Verificação | Evidência e limite |
| --- | --- |
| Sintaxe/arquivos | Nove verificações estáticas: scripts ativos/inline, IDs HTML, CSS, assets, manifest/service worker, migration e credenciais públicas. |
| Núcleo e provedores | Contratos, taxonomy, parsers CSV/JSON/URL, IDs, metadados separados da mídia, cache, fallback pt-BR, rate limit compartilhado, falhas de API e erros sanitizados. Rede externa simulada. |
| Serviço/resolver | Fonte offline seguida de fonte permitida, rejeição de DRM/sem autorização, host privado, redirecionamento, Range mínimo e lote parceiro forjado. Fixtures de HTTP e SDK. |
| PostgreSQL/RLS | Migration executada em PostgreSQL isolado via PGlite 0.5.8; IDs estáveis, deduplicação, namespaces, limites, leases, rollback, drafts, playlists privadas, ownership, RPCs/fontes negadas e fingerprint dos payloads antigos preservada. PGlite serializa conexões: não foi um teste de carga concorrente de múltiplas sessões reais. |
| Edge Function | Type check Deno 2.9.6 com tipos oficiais instalados do SDK Supabase 2.117.2. Foi utilizado import map local porque a resolução npm pelo Deno estava bloqueada neste ambiente. Nenhuma função foi implantada para esse teste. |
| Interface universal | Chromium em 320, 390, 820, 1280 e 1920 px: login preservado no bootstrap, busca, filtros, resposta atrasada, metadados sem fonte, link Plex, lista, prévia Admin, limites de viewport e escape de HTML. Sessão/API simuladas. |
| Player | Regressão UI36 com mídia PCM real de teste, seek/pausa, áudio, player flutuante e toque/arraste. Novos controles adaptativos e troca de fonte exercitados por adapter simulado; não houve reprodução de um stream autorizado real de parceiro. |
| Regressões existentes | `qa-insights-v36`, `qa-audio-resolver-v36`, `qa-music-r4`, `qa-metadata-r12`, `qa-drive-albums-r12-1` e dez testes do Worker de mídia passaram. |

As capturas de interface foram inspecionadas; duas falhas visuais detectadas foram corrigidas. O tamanho 1920 px representa navegador em tela grande, não uma certificação de Tizen/webOS ou de codecs de todas as TVs. Não foi executado teste de carga com milhares de usuários, nem autenticação real no ambiente de produção.

## Dependências para ativar

Faltam chave/token TMDB, configuração opcional Google Books, identificação de contato MusicBrainz, hosts de mídia autorizados e credenciais/contrato/endpoint do parceiro Plex. Os exemplos vazios e o procedimento estão em `UNIVERSAL-CATALOG-SETUP.md`.

Plex em reprodução interna só pode ser ativado com escopo contratual, fontes explicitamente autorizadas e compatibilidade com requisitos do parceiro. Caso contrário, o fluxo é de catálogo/link oficial. Música e livros não são baixados de serviços protegidos. CORS, codecs, URLs assinadas e arquivos próprios precisam ser confirmados com as mídias reais do staging.

Antes de publicar: aplicar a única migration nova no staging com backup, configurar/implantar a função, executar login/RLS/provedores/player em dados reais e dois dispositivos, validar cron e restauração, conferir licenças/atribuições e somente então preparar a release. A validação local concluída não autoriza automaticamente deploy de produção.

## Reprodução dos testes

Node 22+:

```bash
npm ci --prefix tools/catalog-qa
export LX_QA_NODE_MODULES="$PWD/tools/catalog-qa/node_modules"
node tests/static-checks.mjs
node tests/universal-core.mjs
node tests/universal-service.mjs
node tests/universal-database.mjs
tools/catalog-qa/node_modules/.bin/deno check --config supabase/functions/lx-universal-catalog/deno.json supabase/functions/lx-universal-catalog/index.ts
tools/catalog-qa/node_modules/.bin/playwright install chromium
node tools/run-browser-qa.cjs qa-universal-browser.cjs
```

`LX_QA_CHROMIUM` permite usar um executável Chromium já instalado; `LX_QA_OUTPUT` define a pasta das capturas. O runner serve somente a prévia local necessária ao teste. O workflow novo executa verificação, não publicação.

Documentação de APIs utilizada: [TMDB](https://developer.themoviedb.org/docs/authentication-application), [Google Books](https://developers.google.com/books/docs/v1/using), [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API), [Open Library autores](https://openlibrary.org/dev/docs/api/authors) e [Shaka Player](https://shaka-project.github.io/shaka-player/docs/api/shaka.Player.html).
