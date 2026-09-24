# LX Plus R12.1 — correção do diagnóstico e álbuns automáticos

Este pacote atualiza a R12 com as correções pedidas após as telas de “Diagnosticando arquivo no LX Storage…” e “Falha ao consultar o LX Storage”.

## Vídeo / LX Storage

- O endereço antigo `lxplus.sergio-sousa.workers.dev` foi retirado como padrão embutido. O ADM salva a URL real do Worker implantado para todos os dispositivos. URLs antigas já salvas continuam visíveis no ADM até serem corrigidas.
- Antes de abrir um filme do Drive, o player consulta `/health?check=1` e exige Worker R12 e Drive conectado. Para um Worker antigo, CORS/rede, timeout, credenciais ausentes e permissão de arquivo, mostra mensagens diferentes e instruções práticas. O diagnóstico tem timeout de 9 segundos.
- O ADM indica se o Worker é antigo ou se o Google está desconectado; o diagnóstico copiado inclui endpoint, horário e código de erro, sem credenciais.
- Cache da PWA atualizado para R12.1; na ativação remove caches LX antigos e recupera arquivos offline somente do cache atual.

**A conexão real ainda depende de implantação externa.** Este ZIP atualiza o site e inclui o código do Worker, mas publicar o site não instala nem configura o Worker na Cloudflare. Implante `cloudflare-worker/`, configure `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` como secrets, compartilhe a pasta dos vídeos com a conta de serviço e salve no ADM a URL devolvida pela Cloudflare. Confirme `/health?check=1` com `"version":"R12"` e `"googleConnected":true`; depois teste um MP4 real no ADM.

## Música

- Álbuns automáticos são derivados das capas reais iguais no catálogo: músicas com a mesma capa aparecem juntas na LX Music e abrem uma lista de faixas reproduzível. Capas genéricas SVG não geram álbuns falsos.
- O título vem do nome do álbum nas tags ID3/M4A ou nos metadados disponíveis; quando não existe, aparece “Álbum sem nome”, sem inventar um título. Faixas com capas diferentes não são agrupadas. O ADM exibe o nome do álbum detectado.
- O número da faixa do importador em lote é preservado e usado na ordenação do álbum; o player exibe o álbum detectado no estado da música. O enriquecimento Spotify aproveita o nome do álbum quando a integração retornar esse dado.

## Limites verificados

Os testes locais simulam Worker e arquivos de música; não houve acesso às credenciais da Cloudflare, à pasta de vídeos nem à sessão ADM de produção. Sem implantar/configurar o Worker, o player agora indica a falha, mas não pode criar um fluxo autenticado do Drive. Consulte `TEST-REPORT-R12-1.md`.
