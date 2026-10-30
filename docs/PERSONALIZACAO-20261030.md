# LX Plus — Personalização e desempenho · 30/10/2026

## Entregue nesta rodada

- Marca aprovada por Sérgio: carinha 3D branca com olhos em X e boca com detalhe de play sobre preto, mantendo o texto `plus`. Ícones para navegador e aplicativo instalável incluídos.
- Saudação por horário local do visitante: madrugada (0–5h), manhã (6–11h), tarde (12–17h) e noite (18–23h).
- Modo leve opcional no cabeçalho e no perfil: desliga os LEDs, animações, transições, desfoques e movimentos de hover; usa fontes do sistema, reduz a seleção inicial e não carrega a arte grande do destaque.
- Preferências de tamanho pequeno, médio e grande, enquadramento das capas e LEDs salvas no aparelho; tolerância a armazenamento indisponível.
- Início limitado a filmes, séries, doramas e animes, incluindo novidades, recomendações, lista e histórico. Livros e músicas permanecem nas suas seções.
- Top 10 editorial com numeração e apenas títulos realmente disponíveis. Não simula audiência nem preenche lugares com conteúdo inexistente.
- Capas com dimensões reservadas, proporções 2:3 e 16:9 e fallback para arte ausente ou com falha. Arte vertical permanece inteira em cartões horizontais quando não há banner.
- Ranking com prêmio, prazo da temporada, pódio, posição pessoal, diferença para a próxima posição, classificação e histórico; perfis privados seguem protegidos.
- Notificações por categoria e período, marcação de leitura, atualização e atalhos para comunidade/suporte.
- ADM com filtros de categoria/publicação, prévia de links e três proporções de arte. Links HTTPS podem ser cadastrados; players reconhecidos abrem integrados, fontes sem extensão aceitam formato explícito, e outros serviços abrem na origem.
- Acessos no ADM: perfis cadastrados, contas ativas nos últimos 90 segundos e em 24h, páginas registradas e distribuição de rotas; atualização a cada 45 s. As métricas começam a ser coletadas por esta versão e não representam acessos anônimos ou uma contagem de dispositivos individuais.

## Validação

- 46 testes de código aprovados, incluindo isolamento do catálogo, persistência, horários, Top 10, links e privacidade do ranking.
- Build público concluído; fixtures, backups privados e SQL excluídos de `dist/`.
- Testes de interface com dados fictícios: marca, alteração de tamanho, persistência após recarregar, modo leve sem imagem do destaque/LEDs, ranking, leitura de avisos, rascunho com fonte HLS sem extensão, filtros e métricas.
- Layout de celular verificado em iframe de 390 × 844, sem rolagem horizontal do documento. Não substitui testes em hardware real.
- Teste transacional no banco real: heartbeat do próprio membro, bloqueio de leitura e escrita da sessão de outro membro, e acesso administrativo a métricas e contagem de perfis. Todas as escritas revertidas.
- Não foram alteradas credenciais, regras de acesso, estruturas do banco ou registros de catálogo.

## Músicas preservadas e limites

O catálogo contém 1.846 músicas arquivadas. Há 58 registros associados a arquivos no armazenamento privado; os 58 arquivos existem e nenhum tem tamanho zero. Isso verifica preservação de arquivos, mas não comprova reprodução ou integridade integral do áudio.

Nenhuma música foi republicada sem teste autenticado de reprodução. Os links externos e registros sem arquivo continuam arquivados. A seção musical pode receber novos cadastros pelo ADM.

O cadastro universal de links não garante incorporação de qualquer site: permissões, expiração, CORS, formatos, bloqueios do provedor e DRM continuam valendo. Serviços sem incorporação compatível usam a abertura na origem.

A validação completa de login em produção, chamadas entre aparelhos e integrações Drive/TMDB continua com as pendências registradas na validação anterior. Esta rodada não as apresenta como aprovadas.
