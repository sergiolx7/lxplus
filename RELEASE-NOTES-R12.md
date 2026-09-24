# LX Plus R12 — NEXUS · núcleo de reprodução

Esta atualização consolida a prioridade **LX Storage / LX Player → falhas funcionais → ADM** sobre o pacote R11. O ZIP contém os arquivos do site e do Worker prontos para substituir os arquivos correspondentes no repositório. A migração não altera dados do Supabase.

## Correções e melhorias incluídas

- Worker do Drive refeito com conta de serviço e Google Drive API. Segredos permanecem no Worker. O vídeo passa pelo endpoint LX Storage, com Range, 206, HEAD, OPTIONS, CORS restrito ao domínio e repasse de cabeçalhos de mídia disponíveis.
- Páginas HTML e JSON do Google deixam de ser servidas como vídeo. Erros informam código e status sem devolver conteúdo HTML ao player.
- Teste de arquivo no ADM: valida acesso, Range e formato; inspeciona trechos MP4 para identificar H.264/AAC ou HEVC quando possível. Codec não identificável fica marcado como desconhecido.
- Publicação de links novos do Drive é verificada antes de salvar. Episódios e opções de qualidade são testados em grupos de quatro.
- Rota pública direta removida do caminho normal do player. Fallback público no Worker exige configuração explícita e resposta de bytes válida; não tenta ler páginas de confirmação.
- Player continua com controles próprios, agora com episódio anterior e opção de recomeçar. O erro de vídeo do Drive consulta o diagnóstico do arquivo. O preview visual do Drive não abre em filmes LX Storage.
- Metadados musicais não dependem da busca remota: corrigida a falha quando o catálogo devolve null. MP3 ID3, número da faixa, tags comuns de M4A, nome do arquivo e duração têm fallback local. O importador em lote mantém os dados locais se a busca remota falhar.
- Estante de livros: cards de proporção fixa, texto contido e rolagem horizontal com snap no celular.
- PWA: shell com cache por versão, rede primeiro e aviso “Nova versão disponível → Atualizar agora”; não apaga todos os caches a cada visita.

## Configuração externa obrigatória

1. Habilitar a Google Drive API, criar uma conta de serviço e compartilhar com ela a pasta dos vídeos.
2. Implantar o Worker R12 e salvar GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY como secrets da Cloudflare. O ZIP não contém essas credenciais.
3. No ADM, salvar/testar o endpoint HTTPS do Worker, testar um arquivo real e publicar a versão do site no GitHub.

Veja **LX-STORAGE-DRIVE.md** e **cloudflare-worker/README.md**. Apenas trocar o ZIP do GitHub sem atualizar/configurar o Worker não conecta o Drive.

## Pendências para a atualização integral

- Escolha de arquivo pela interface do Drive; uso/disponibilidade reais dos 2 TB do Drive pessoal; metadados de filmes obtidos automaticamente de uma fonte autorizada.
- Autorização de mídia com URL assinada para catálogo privado; revisão de políticas de RLS e operações do Supabase em ambiente real.
- Reformulação ampla de notificações, comunidade, chamadas, perfil, busca global, dashboard e visual da plataforma.
- Teste integrado do site publicado com usuário ADM e usuário comum, arquivos reais grandes, seek no início/meio/fim, Chrome/Edge/Safari e diferentes aparelhos.

Este é um pacote de código testado localmente, **não uma confirmação de funcionamento em produção**. Leia TEST-REPORT-R12.md para os testes realizados e os que dependem de credenciais/implantação.
