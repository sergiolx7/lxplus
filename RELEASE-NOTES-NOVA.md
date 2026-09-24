# LX Plus NOVA — R7 LX Storage / Google Drive

## Principal
- Google Drive agora pode funcionar como o disco principal do **LX Storage**.
- O LX Player tenta primeiro o endpoint do **LX Storage Worker** para obter o arquivo bruto pela Google Drive API.
- O preview do Drive deixa de ser a rota principal; permanece apenas como fallback de compatibilidade.
- Novo painel ADM em **Mídia & Upload** para salvar/testar o endpoint do LX Storage.
- Endpoint pode ser sincronizado na configuração global (branding) e também tem override local.
- Fonte padrão de filmes/séries continua sendo Drive, agora exibida como **LX Storage / Drive**.
- Backblaze B2 foi mantido apenas como compatibilidade legada para itens antigos.

## Backend incluído
- `cloudflare-worker/lx-drive-storage-worker.js`: Worker sem dependências, pronto para Cloudflare Workers.
- Autenticação com Service Account do Google usando JWT RS256.
- Encaminhamento de `Range` para streaming/seek de MP4.
- CORS configurável com `ALLOWED_ORIGIN`.
- Endpoint `/health` para teste no painel ADM.

## Build
`NOVA-20260924-R7-LX-STORAGE-DRIVE`


## R6 · LX Player + Backblaze B2

- Adicionada fonte **B2 / LX** no editor de filmes, séries, animes e doramas.
- URLs B2/CDN em MP4 e HLS abrem diretamente no **LX Player**, sem iframe do provedor.
- HLS (`master.m3u8`) usa o módulo adaptativo existente e expõe qualidade automática/manual quando disponível.
- Badge do player identifica **B2** e resolução detectada.
- Nenhuma chave secreta do Backblaze é armazenada no frontend.
- Build/cache atualizado para `NOVA-20260924-R6-B2`.

# LX Plus NOVA R5 — correção crítica da Música

- Corrigido o erro `musicGenresOf is not defined` ao abrir uma música. A causa era o player (app.js) chamando helpers privados do módulo de interface (ui.js); agora os helpers de catálogo/gênero são exportados e existe uma ponte segura entre os módulos.
- Corrigida a criação/edição de playlists e álbuns pessoais, que sofria do mesmo problema de escopo ao chamar `musicCatalog()`.
- O botão de adicionar à playlist foi redesenhado com um ícone próprio de lista + adição, mais limpo no desktop e no celular.
- Build/cache atualizado para `NOVA-20260924-R6-B2` para evitar que navegador/PWA continue servindo o JavaScript antigo.

# LX Plus NOVA — 2026-09-24, R4

Esta versão recupera a R3B, substituída no `main` por um commit posterior que voltou a publicar arquivos da R1. O banco, usuários, catálogo, arquivos, histórico e favoritos existentes permanecem no Supabase. Nenhuma migração ou exclusão de dados foi executada.

## Música

- Capa e título das músicas acionam diretamente o mesmo player; um único controlador de clique atende aos cards da tela de Música. O dock aparece de imediato com capa, título e artista mesmo quando o registro não possui áudio; uma fonte ausente produz erro visível.
- A fila automática inclui as outras músicas publicadas do mesmo gênero. Próxima/anterior percorrem essa fila. O fluxo de MP3 da R3B, com `<audio>` nativo, URL assinada, alternativas de streaming/download, timeout e diagnóstico, foi recuperado; YouTube e Spotify continuam nos players oficiais.
- O ouvinte pode criar playlists e álbuns pessoais, dar nome, selecionar músicas do catálogo, adicionar pelo botão ＋ de um card ou do player, editar, remover, excluir e reproduzir a coleção em sequência. No celular, a aba Playlists abre essas coleções.
- As coleções são referências a músicas existentes, gravadas no campo `musicCollections` do JSONB de `lx_user_state` da conta atual. O resultado de sincronização é informado ao usuário; falha na nuvem não é apresentada como confirmação. Nenhum arquivo de áudio é duplicado.

## Distribuição

`index.html`, JavaScript, CSS, manifest e service worker usam a mesma build `NOVA-20260924-R6-B2`. A troca da versão invalida o cache antigo. Os arquivos de origem da aplicação e das Edge Functions seguem no pacote completo.

## Limite de verificação

A página pública e a integridade dos arquivos podem ser verificadas sem conta. Para validar som audível de MP3 privado, reprodução oficial do YouTube/Spotify e persistência das coleções na conta real, é necessária uma sessão LX Plus autenticada. Estes pontos não devem ser marcados como aprovados sem o teste correspondente.
