# LX Plus R12.2 — conexão Drive e diagnóstico claro

- O endereço inicial do LX Storage agora é o Worker `https://lxplus.sergio-sousa.workers.dev` identificado no painel Cloudflare. Uma URL que o ADM tenha salvado continua com prioridade.
- O teste `/health?check=1` distingue respostas 403 de API do Drive desativada, limite da API, política de domínio e recusa ainda não classificada. O Worker não publica a mensagem original do Google nem credenciais.
- O player e o ADM explicam esses erros separadamente; o aviso genérico anterior não afirma mais que um arquivo específico falhou quando a consulta de saúde da API foi recusada.
- A versão do site, do manifesto e do cache da PWA foi atualizada para R12.2, para receber a correção sem manter scripts da versão anterior.
- O agrupamento automático de músicas pela mesma capa e a leitura do nome do álbum da R12.1 continuam incluídos.

## Para concluir a reprodução real

A Google Drive API precisa estar ativa no projeto da conta de serviço. A pasta com os vídeos deve ser compartilhada com o e-mail dessa conta como leitor. Depois de implantar o código novo do site e do Worker, abra `/health?check=1`; apenas `"googleConnected":true` confirma a conexão. Em seguida, teste um link de vídeo no ADM → Mídia & Upload → LX Storage. A ativação da API foi informada pelo usuário, mas a resposta nova do Worker e o acesso a um vídeo ainda não foram verificados em produção.
