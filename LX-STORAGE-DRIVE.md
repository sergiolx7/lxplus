# LX Storage R12 — configuração e diagnóstico

O fluxo de vídeo é **Google Drive → API autenticada → Worker → Range bytes → LX Player**. Consulte [cloudflare-worker/README.md](cloudflare-worker/README.md) para a configuração única da conta de serviço.

No ADM, abra **Mídia & Upload → LX Storage**, salve a URL do Worker e clique em **Testar conexão**. “Google Drive conectado” aparece apenas quando a API aceita a autenticação. Cole o link de um vídeo em **Testar arquivo antes de publicar**: o resultado separa acesso, Range/206 e compatibilidade do contêiner/codec. O teste de publicação usa o mesmo diagnóstico antes de salvar links novos.

Para maior compatibilidade, use **MP4 com H.264 + AAC** e metadados no início do arquivo (faststart). A API não revela diretamente o codec: o diagnóstico examina trechos do arquivo e marca “desconhecido” quando não consegue determinar. Faça também um teste no navegador. Sem as duas credenciais no Worker, ele responde `DRIVE_AUTH_NOT_CONFIGURED`; cadastrar apenas a URL do endpoint não conecta o Google.

A interface não armazena a private key. A capacidade de 2 TB da conta pessoal não pode ser inferida dos dados da conta de serviço.
