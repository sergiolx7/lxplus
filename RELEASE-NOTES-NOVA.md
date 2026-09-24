# LX Plus NOVA — 2026-09-24, R4

Esta versão recupera a R3B, substituída no `main` por um commit posterior que voltou a publicar arquivos da R1. O banco, usuários, catálogo, arquivos, histórico e favoritos existentes permanecem no Supabase. Nenhuma migração ou exclusão de dados foi executada.

## Música

- Capa e título das músicas acionam diretamente o mesmo player; um único controlador de clique atende aos cards da tela de Música. O dock aparece de imediato com capa, título e artista mesmo quando o registro não possui áudio; uma fonte ausente produz erro visível.
- A fila automática inclui as outras músicas publicadas do mesmo gênero. Próxima/anterior percorrem essa fila. O fluxo de MP3 da R3B, com `<audio>` nativo, URL assinada, alternativas de streaming/download, timeout e diagnóstico, foi recuperado; YouTube e Spotify continuam nos players oficiais.
- O ouvinte pode criar playlists e álbuns pessoais, dar nome, selecionar músicas do catálogo, adicionar pelo botão ＋ de um card ou do player, editar, remover, excluir e reproduzir a coleção em sequência. No celular, a aba Playlists abre essas coleções.
- As coleções são referências a músicas existentes, gravadas no campo `musicCollections` do JSONB de `lx_user_state` da conta atual. O resultado de sincronização é informado ao usuário; falha na nuvem não é apresentada como confirmação. Nenhum arquivo de áudio é duplicado.

## Distribuição

`index.html`, JavaScript, CSS, manifest e service worker usam a mesma build `NOVA-20260924-R4`. A troca da versão invalida o cache antigo. Os arquivos de origem da aplicação e das Edge Functions seguem no pacote completo.

## Limite de verificação

A página pública e a integridade dos arquivos podem ser verificadas sem conta. Para validar som audível de MP3 privado, reprodução oficial do YouTube/Spotify e persistência das coleções na conta real, é necessária uma sessão LX Plus autenticada. Estes pontos não devem ser marcados como aprovados sem o teste correspondente.
