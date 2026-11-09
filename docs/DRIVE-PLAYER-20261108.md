# Player LX para arquivos do Google Drive

Links `file/d`, `open?id`, `uc?id` e chaves `gdrive:` passam pelo player HTML5 da LX Plus. O catálogo existente é preservado; não é preciso importar os títulos novamente. A interface inclui reprodução/pausa, voltar/avançar 10 segundos, controles nativos, velocidade, tela cheia e os recursos de progresso/episódios existentes. Outros provedores continuam com suas integrações.

## Acesso e transporte

`sourceFor` solicita um endereço ao endpoint `lx-drive-player`. O servidor valida a sessão com Auth e consulta o catálogo usando o token do próprio membro e suas políticas RLS. Só um arquivo já presente em um título publicado e autorizado pode receber um ticket. A autorização de distribuição é a registrada pelo administrador no catálogo.

O ticket HMAC tem escopo de arquivo e expiração de seis horas. O navegador nunca recebe a chave de serviço. O endpoint GET verifica a assinatura antes de contatar o Google e mantém respostas `206 Partial Content`, `Content-Range`, `Content-Length`, `Accept-Ranges` e CORS. Cada pedido é limitado a 8 MiB, sem baixar o arquivo inteiro em memória. Respostas HTML do Drive, restrições de download, limites de acesso e fontes que ignoram Range retornam erros explícitos.

O arquivo deve permitir download pelo compartilhamento público do Drive. Não há integração OAuth para arquivos privados nem conversão de codecs. O acesso continua sujeito aos limites e disponibilidade do Drive e do serviço de retransmissão.

Para publicar o backend, enviar `index.ts`, `handler.mjs` e `src/drive-source.js`, mantendo os caminhos relativos. Usar `verify_jwt=false`: a função faz sua própria autenticação no POST e verifica tickets assinados no GET/HEAD. A configuração padrão da plataforma que exige bearer no GET impediria a reprodução pela tag de vídeo. Variáveis padrão necessárias: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Nenhuma chave adicional do Google é exigida para arquivos públicos.

## Formatos

MP4 com H.264 e AAC oferece compatibilidade ampla. O player não substitui transcodificação: MKV, AC3 e outros codecs podem não produzir imagem ou áudio em alguns navegadores. O arquivo relatado pelo usuário respondeu a um pedido de bytes do original, mas a inspeção de 32 KiB identificou contêiner Matroska, vídeo H.264 e áudio AC3. Seu conteúdo completo não foi baixado nem convertido. É necessário substituir por uma versão MP4/H.264/AAC para assegurar compatibilidade de áudio.

## Verificação

- 386 testes automatizados passaram; build estático concluído.
- Testes específicos verificam autenticação, RLS, catálogo autorizado, fontes de episódios, tickets alterados/expirados, limites de Range, CORS, MIME e rejeição de HTML/quota.
- O Drive real respondeu `206` ao pedido dos primeiros bytes do arquivo relatado.
- A validação visual local ficou indisponível: o Chromium local foi impedido de abrir seu socket e o navegador remoto não alcançou a porta local. Não foi confirmada uma sessão autenticada de reprodução completa no navegador do usuário.

Não há alteração de banco de dados ou migração de catálogo nesta atualização.
