# LX Plus R11 · Drive Fix

- Corrigido o LX Storage quando o arquivo já está em **Qualquer pessoa com o link · Leitor**, mas o Google devolve página de confirmação/redirect em vez dos bytes.
- Worker R11 agora acompanha redirects, cookies de confirmação e formulários do Drive.
- Suporte a `resourcekey` preservado do link compartilhado.
- `Range` continua sendo repassado para avançar/voltar no vídeo.
- Player tenta automaticamente: Worker → `drive.usercontent.google.com` → `drive.google.com/uc`, sem cair imediatamente no erro de compartilhamento.
- Mensagem de erro não acusa mais compartilhamento como única causa; também informa incompatibilidade de codec/contêiner.
- Mantidas as correções R10 do áudio automático.

**Importante:** como o Worker mudou, publique esta versão no mesmo repositório conectado à Cloudflare para o build automático atualizar `lxplus.sergio-sousa.workers.dev`.
