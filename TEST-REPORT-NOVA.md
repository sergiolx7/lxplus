# LX Plus NOVA — relatório de verificação

## Executado

- Arquivos JS passam em `node --check`; `manifest.webmanifest` é JSON válido.
- HTML não contém IDs estáticos duplicados. Rotas ADM, referências de scripts, temporizadores de áudio, componentes novos e chaves de versão passaram em validações estáticas. Os cinco recursos principais responderam HTTP 200 e MIME correto em servidor de desenvolvimento local dentro do mesmo processo.
- O identificador de build está alinhado entre HTML, CSS/JS, manifest e service worker.
- O projeto Supabase mantém 15 itens de catálogo (6 músicas), 4 usuários/perfis/estados de usuário e 15 objetos de mídia.
- Os MP3 `CUIDA DO PET`, `Para Ti Eu Vou - Ao Vivo` e `SEMI NUA 2` têm objetos existentes no Storage com MIME `audio/mpeg`. Este teste verifica presença e metadados do objeto, sem afirmar que o áudio tocou.
- A Edge Function `lx-ai` v4 foi implantada com `verify_jwt=true`. Não há chave OpenAI cadastrada atualmente.
- Site público original v34.0 foi aberto em navegador e mostrava falha fatal `syncMusicProviderBrand is not defined`; a referência foi corrigida na nova build.

## Pendente — critérios de aceitação não comprovados

O navegador remoto deste ambiente bloqueou o endereço do servidor local. A nova build não foi publicada no site público e não havia sessão autenticada ou credenciais fornecidas. Por isso **não foi possível ouvir uma MP3 da build NOVA no navegador** nem validar GET 200/206, Range, CORS ou `loadedmetadata` em uma URL assinada real. Também não houve teste autenticado do chat, resposta local de `lx-ai`, segunda pergunta, YouTube/Spotify, publicação/atualização da Home, criação de evento pelo ADM, perfil, busca ou layouts visuais desktop/tablet/celular nesta build. Nenhuma dessas etapas está marcada como aprovada.

Após disponibilizar a build em um endereço acessível e entrar com conta ADM, executar:

1. Música: CUIDA DO PET, Para Ti Eu Vou - Ao Vivo, SEMI NUA 2: Play → escuta audível → duração/progresso → pause/seek/próxima → navegação sem interrupção → capa. Network: checar resposta `200` ou `206`, `Content-Type: audio/mpeg`, `Accept-Ranges`, CORS e `loadedmetadata`. Repetir em desktop/tablet/celular.
2. YouTube e Spotify: iniciar players oficiais, verificar controles permitidos pelo provedor e estado ao navegar.
3. IA: abrir botão ✦ IA, enviar duas perguntas e conferir contexto; repetir ADM → LX IA. Verificar JWT e resposta local. Repetir modo online somente após chave OpenAI ser cadastrada.
4. Carrossel: editar uma obra existente, prévia das quatro telas, salvar e confirmar banner/foco/ordem na Home.
5. Ao Vivo: criar evento manual de teste no ADM, confirmar visualização pública e reprodução de fonte autorizada; deixar como rascunho ao concluir.
6. Perfil, busca e navegação: validar ações e layouts em desktop, tablet e celular; DevTools Console e Network sem falhas não tratadas.

A contagem e integridade do banco foram verificadas; nenhum dado foi removido para preparar os ZIPs.
