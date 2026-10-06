# LX Universal Catalog — configuração e ativação em staging

Esta atualização deve ser instalada sobre a UI36 na branch `lxplus-v40-completa`. Não recria usuários, catálogo, comunidade ou históricos. Não foi implantada na produção durante sua preparação.

## Ordem de ativação

1. Criar um ambiente Supabase de staging a partir de um backup verificado. Fazer também um backup separado do banco, Auth e objetos do Storage antes de qualquer futura mudança em produção. O bundle Git incluído na entrega é backup do código; não contém banco nem arquivos de usuários.
2. Conferir que existem `lx_catalog`, `lx_profiles`, `lx_admins`, `lx_integrations`, `lx_is_approved()` e `lx_admin_can(text)`. A auditoria confirmou esses objetos no projeto existente. Um banco vazio precisa receber a estrutura existente primeiro.
3. Aplicar somente `supabase/migrations/20261005233838_lx_universal_catalog.sql` no staging, dentro da transação do arquivo. Não executar indiscriminadamente todas as migrations históricas com `db push`: o repositório inclui SQL antigo cuja aplicação depende do histórico do ambiente.
4. Configurar os secrets da nova função e implantá-la apenas no projeto de staging. `supabase/config.toml` mantém `verify_jwt = true`; o handler também valida a sessão com `auth.getUser()` e o cargo no banco. Supabase fornece suas próprias variáveis de serviço automaticamente.
5. Servir esta branch em uma prévia isolada, apontando a configuração pública existente do LX para o Supabase de staging. Executar a validação ao vivo descrita ao final. Não mudar o GitHub Pages para esta branch antes de concluir essa etapa.

Com a CLI instalada, o comando de implantação da função em staging é:

```bash
supabase functions deploy lx-universal-catalog --project-ref "$LX_STAGING_PROJECT_REF"
```

Defina `LX_STAGING_PROJECT_REF` explicitamente com o ambiente de teste. Este comando não foi executado nesta sessão. Na preparação desse módulo, o projeto de produção auditado foi utilizado somente para leitura. Posteriormente, foram adicionadas 900 fichas à tabela de catálogo já existente, conforme [o relatório de preenchimento](CATALOG-POPULATION-20261006.md); a migration e as funções deste módulo continuam sem implantação.

## Variáveis no servidor

| Variável | Uso |
| --- | --- |
| `TMDB_READ_ACCESS_TOKEN` ou `TMDB_API_KEY` | Metadados de filmes e TV. A chave antiga `tmdb_v3` em `lx_integrations` também é aceita. |
| `GOOGLE_BOOKS_API_KEY` | Opcional para Google Books. Sem ela, a pesquisa de livros usa Open Library. Uma URL de volume Google exige sua chave para importar aquele volume específico. |
| `LX_CATALOG_USER_AGENT` | Identificação e contato do aplicativo para MusicBrainz. Há identificação padrão pelo repositório; configure o contato oficial da operação. |
| `LX_MEDIA_ALLOWED_HOSTS` | Domínios exatos, separados por vírgula, dos servidores/CDNs autorizados. Sem curingas. O próprio host Supabase é incluído automaticamente. |
| `PLEX_PARTNER_FEED_URL` | Endpoint JSON oficialmente fornecido pelo parceiro. Não usar uma página de player como feed. |
| `PLEX_PARTNER_ALLOWED_HOSTS` | Hosts exatos permitidos para o endpoint do parceiro. |
| `PLEX_PARTNER_API_TOKEN` | Credencial de acesso ao feed, exclusivamente no servidor. |
| `PLEX_PARTNER_SCOPE` | `catalog` por padrão; `playback` somente quando o contrato autorizar a reprodução no LX. |
| `LX_PLEX_SYNC_INTERVAL_MS` | Intervalo da sincronização automática; padrão de uma hora, mínimo de dois minutos. Páginas ainda pendentes são buscadas em intervalos de dois minutos. |
| `LX_CATALOG_JOB_SECRET` | Segredo aleatório forte, compartilhado somente com o agendador de manutenção. |

O arquivo `.env.example` dentro da nova função contém nomes e valores vazios. Não colocar secrets em HTML, JavaScript público, localStorage, commits ou ZIPs. O formulário antigo de chave TMDB envia a chave à RPC administrativa protegida e limpa o campo, sem guardar uma cópia no navegador.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo runtime Supabase. A chave pública existente do cliente não substitui as credenciais dos provedores. Nunca copiar a chave de serviço para a configuração do site.

## Manutenção periódica

`tools/run-catalog-maintenance.mjs` é um cliente para um agendador confiável. Seu ambiente recebe `SUPABASE_URL`, `LX_CATALOG_GATEWAY_JWT` e `LX_CATALOG_JOB_SECRET`. O JWT deve ser aceito pelo gateway Supabase; a antiga chave pública JWT é suficiente para esse gateway quando disponível. Uma chave pública opaca não é um JWT. O segredo adicional concede somente o caminho de manutenção, validado no servidor.

Executar a cada dois minutos, por exemplo em cron de um servidor com Node 22 ou superior:

```cron
*/2 * * * * /usr/bin/node --env-file=/etc/lxplus/catalog-scheduler.env /srv/lxplus/tools/run-catalog-maintenance.mjs
```

Proteger o arquivo de ambiente e os logs no servidor. O worker processa duas entradas de um job e três fontes por chamada; o Admin processa quatro entradas por lote e pode verificar doze fontes. Há trava compartilhada de manutenção, leases de cinco minutos, retry e limites globais. Jobs interrompidos podem ser retomados; leases esgotadas tornam-se erro recuperável. A manutenção revalida o cargo do criador antes de processar sua fila.

Quando feed, token e hosts Plex estiverem configurados, a manutenção também sincroniza o feed no intervalo indicado, utilizando um proprietário cadastrado. Sem essas configurações, esse caminho não é executado. Nenhum cron foi instalado nesta sessão.

## Contrato do adaptador de parceiro Plex

Como nenhum endpoint oficial de parceiro foi encontrado no projeto, o conector utiliza um contrato explícito para adaptar o feed autorizado que o parceiro vier a fornecer. Ele envia `Authorization: Bearer ...`, `cursor` e `limit=100`. Resposta esperada:

```json
{
  "items": [
    {
      "tmdbId": 11,
      "tmdbType": "movie",
      "plexUrl": "https://watch.plex.tv/pt-BR/movie/example-title",
      "available": true,
      "sources": []
    }
  ],
  "nextCursor": "checkpoint-for-next-sync",
  "hasMore": false
}
```

O checkpoint deve representar a próxima página ou o ponto incremental, inclusive no fim da sincronização. `available:false` desativa a disponibilidade do parceiro sem apagar o título. São aceitos no máximo cem itens por página; sem TMDB ID/type, a entrada é ignorada e contabilizada. A associação Plex/TMDB usa IDs externos únicos, além do link oficial. O cursor só avança após a página entrar na fila durável.

Em escopo `playback`, cada fonte usa o mesmo formato do endpoint `attach`, com `authorized:true`, `drm:"none"`, `source_type`, URL HTTPS, autorização, região, qualidade e expiração. Domínios da mídia também precisam estar em `LX_MEDIA_ALLOWED_HOSTS`. Fontes que exigem player do parceiro, DRM ou anúncios não são reproduzidas diretamente: permanecem no player oficial pelo link Plex. Não há extração de manifests, cópia de tokens ou supressão de anúncios.

Para episódios, `episode_id` é o UUID do episódio LX já importado. Se o feed real fornecer somente números de temporada/episódio ou outro protocolo, adaptar seu contrato após receber a documentação oficial. URLs que exigem headers privados de autenticação não são entregues como arquivos diretos ao navegador; usar o player oficial ou uma integração autorizada específica.

Sem feed, uma URL Plex gera candidatos TMDB. O Admin confirma a correspondência antes de importar. O botão **Assistir no Plex** abre a página oficial. Essa confirmação evita associar títulos diferentes por coincidência de nome.

## API, cache e importação

Todas as ações usam POST para `lx-universal-catalog` com a sessão Supabase. Usuários aprovados podem buscar, abrir, consultar temporadas, resolver fontes e abrir suas playlists. Somente owner/administrator/editor podem importar lotes, cadastrar fontes, editar catálogo, verificar links ou sincronizar Plex.

Exemplos de body:

```json
{"action":"search","q":"Nome do título","filter":"all","page":0}
{"action":"open","reference":{"provider":"tmdb","namespace":"movie","id":"11"}}
{"action":"resolve","media_id":"UUID-LX","exclude":[]}
{"action":"enqueue","references":["tmdb:movie:11","https://openlibrary.org/works/OL1W"],"published":false}
{"action":"process","job_id":"UUID-JOB"}
{"action":"job","job_id":"UUID-JOB","offset":50}
```

Referências: TMDB, IMDb, Google Books, Open Library (obras/autores), MusicBrainz (recording/release/artist), Plex e catálogo legado. CSV aceita coluna `url`, `reference`, `referencia` ou `id`; JSON aceita array ou `{ "items": [...] }`. Pastas importam arquivos de referências `.csv/.json/.txt`; o envio de mídia e a associação a uma ficha ocorrem no gerenciamento de fontes. Cada fila tem até 2.000 entradas e tamanho de requisição de 2 MB. Entradas inválidas viram erros rastreáveis. Arquivos de mídia e players já existentes continuam no fluxo original.

Pesquisas/discovery têm cache de seis horas; detalhes, quatorze dias; episódios, sete dias. A abertura de uma ficha já importada usa o banco. MusicBrainz possui limite global de uma chamada por 1,1 segundo; consultas gerais incluem faixas, artistas e releases. O site limita cada janela a sessenta cards e oferece paginação, lazy loading e `content-visibility`.

Fontes novas usam tabela privada separada; somente o resolver entrega uma URL autorizada de reprodução. Storage recebe URLs assinadas curtas. Um usuário comum não tem grants para inserir/consultar URLs nessa tabela. Links de provedor podem existir sem uma fonte interna. Sem fonte válida, a ficha mostra **Disponível em breve**; livros exibem **Ler agora** somente quando há fonte de leitura no resolver ou arquivo já existente.

## Validação obrigatória antes de produção

Validar em staging com contas de usuário pendente, aprovado, editor, moderador e proprietário. Confirmar login real, importações com chaves reais, RLS, cache, fontes próprias/autorizadas, MP4/WebM/HLS/DASH, PDF/ePub, áudio/legendas, expiração de URLs, fonte offline e failover, temporadas/episódios, dois dispositivos e cron. Confirmar também os avisos/licenças/atribuições exigidos pelos provedores e o contrato Plex recebido.

Comparar contagens, IDs e amostras do banco/Storage com o backup antes e depois. Testar restauração do backup. Os testes locais e fixtures não substituem essa etapa. Em uma eventual publicação validada, atualizar os marcadores de release do shell de forma coordenada; foram mantidos os marcadores UI36 para não anunciar uma release não implantada.
