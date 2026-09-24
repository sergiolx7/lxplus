# Verificação da LX Plus NOVA R3

## Executado

- Arquivos da R2-AUDIO comparados com a versão `main` publicada antes das alterações da R3.
- Conferência estática do fluxo de música: fonte assinada, proxy alternativo, timeout, metadata e `play()` nativo. Conferência do início do vídeo nativo e dos estados de erro.
- `node --check` nos arquivos JavaScript da distribuição.
- Inspeção do site público no navegador e validação do marcador de build após publicação: resultado anotado quando realizado.
- Supabase: objetos MP3 do catálogo confirmados anteriormente no bucket `lx-media` com MIME `audio/mpeg`; logs do Storage apresentaram requisições 200 e 206. Essa evidência não comprova que houve áudio audível no navegador.

## Pendente de sessão autenticada e ouvido humano

- Ouvir CUIDA DO PET, Para Ti Eu Vou e Semi Nua 2 no navegador; validar duração, avanço, pausa, seek, próxima, troca de página e capa.
- Validar filmes e séries reais após clicar Assistir, filtros de qualidade e retorno de provedores externos.
- Abrir central de avisos, publicar no ADM, testar suporte, carrossel, ao vivo e responsividade nas contas apropriadas.

Não marcar testes pendentes como aprovados. Nenhum item do Supabase foi alterado durante a preparação desta build.
