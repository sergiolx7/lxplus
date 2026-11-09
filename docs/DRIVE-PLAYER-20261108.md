# Player LX: áudio compatível e qualidade real do Google Drive

Os vídeos do Drive agora priorizam as versões MP4 progressivas que incluem vídeo H.264 e áudio AAC. O original MKV/AC3 não é mais escolhido quando essas versões estão disponíveis. Links `file/d`, `open?id`, `uc?id` e chaves `gdrive:` continuam funcionando no catálogo existente, sem nova importação.

## Qualidade e controles

O seletor recebe somente resoluções devolvidas pelo Drive que contenham vídeo e áudio juntos. Formatos adaptativos apenas de vídeo são excluídos. Não são inventadas opções 1080p/4K. A qualidade automática considera economia de dados e a largura de banda informada pelo navegador. A troca manual mantém posição, velocidade, volume, estado de silêncio e pausa, inclusive quando o usuário muda rapidamente de opção. A primeira troca não apaga o progresso salvo.

Para o arquivo relatado, foram verificadas as opções HD (1280 × 538) e Economia (640 × 270), ambas com AAC. O botão “Som ligado”/“Ativar som” reflete o silêncio e o volume reais do elemento de vídeo. Tela cheia, controles nativos, avanço/retrocesso e progresso continuam disponíveis.

## Acesso e transporte

O POST de `lx-drive-player` valida a sessão com Auth e lê o catálogo usando o token do próprio membro e suas políticas RLS. Só arquivos de títulos publicados e autorizados recebem tickets. Cada ticket HMAC tem escopo de arquivo e qualidade, expiração de seis horas e não contém a chave de serviço.

O servidor consulta a configuração pública atual do visualizador do Drive e seus metadados de reprodução. Apenas URLs HTTPS de reprodução do Google vinculadas ao mesmo arquivo são aceitas. As URLs do provedor permanecem no servidor, onde têm cache curto e são renovadas uma vez se expirarem. O GET verifica o ticket e mantém `206 Partial Content`, MIME, CORS e os cabeçalhos de busca. Cada pedido é limitado a 8 MiB.

O original continua como alternativa para formatos compatíveis sem variantes disponíveis. Um MKV sem versão compatível gera um aviso explícito de processamento, em vez de iniciar silenciosamente um fluxo que pode ficar sem áudio. Arquivos privados sem compartilhamento acessível, limitações do Drive e a disponibilidade das transcodificações continuam condicionados ao provedor.

## Publicação

Enviar `supabase/functions/lx-drive-player/index.ts`, `handler.mjs`, `playback.mjs` e `src/drive-source.js`, preservando os caminhos relativos. A função usa `verify_jwt=false` porque autentica o POST internamente e valida tickets assinados nos pedidos de mídia. Variáveis necessárias: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Não há migração de banco nem mudança de permissão do catálogo.

## Verificação

- Suíte automatizada: testes de autorização, assinatura, limites de Range, AAC obrigatório, resoluções reais, seleção automática, preservação de posição/volume/pausa e cancelamento ao fechar.
- O Drive real forneceu duas versões MP4 contendo H.264 e AAC.
- Uma amostra AAC real foi decodificada a partir de 120 segundos: 444.480 amostras, volume médio −34,6 dB e pico −19,6 dB. O início do filme contém silêncio; o teste não se limitou ao primeiro quadro.
- A tentativa de navegador local não ficou disponível neste ambiente. O teste de áudio usa decodificação real do arquivo e não confirma a saída dos alto-falantes do dispositivo do usuário.
