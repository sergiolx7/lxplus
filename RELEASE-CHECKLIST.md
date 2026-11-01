# LX Plus — acompanhamento da validação

Estado da atualização de 30/10/2026. Veja também a [validação adicional](docs/VALIDATION-20261030.md). O [relatório completo](docs/RELEASE-20261030.md) distingue implementação, evidências e limitações.

- [x] Snapshot privado conferido por contagens, checksums e cópias temporárias.
- [x] Arquivamento reversível de filmes e músicas; contas, senhas, perfis e conversas preservados.
- [x] Testes de sintaxe e 37 testes comportamentais.
- [x] Testes RLS/CRUD com rollback no banco existente.
- [x] Navegação local em desktop e layout móvel de 390 × 844.
- [x] Criação de playlist, áudio contínuo ao navegar, DM e rascunho no QA isolado.
- [x] Testes e build aprovados no GitHub; frontend publicado pelo Pages.
- [x] Tela de entrada e versão do frontend conferidas no domínio real.
- [x] Backups, SQL e fixture ausentes do site publicado.
- [x] Branch anterior e procedimento de reversão preservados.
- [ ] Restauração integral em projeto Supabase separado, incluindo bytes de Storage.
- [ ] Homologação de login, confirmação/recuperação por e-mail e sessão entre aparelhos.
- [ ] Drive/TMDB configurados e importação real autorizada.
- [ ] OAuth para pastas privadas.
- [ ] Chamadas individuais em redes distintas com TURN; chamadas em grupo na nova UI.
- [ ] Upload/voz, grupos, Realtime e notificações entre contas reais.
- [x] Fontes de teste MP4/HLS/DASH reais no ambiente local, busca, velocidade e qualidade quando disponível.
- [x] Dez verificações HTTP anônimas e barreiras de publicação de importações com rollback.
- [ ] Fontes do catálogo autenticado, legendas e transmissão para TV.
- [ ] Android, iOS/Safari e tablet físicos.
- [ ] Prêmios/Hall de campeões, papéis ADM e auditoria completos.
- [ ] Métricas de infraestrutura, alertas externos e benchmark de carga.

Esta checklist registra uma atualização publicada com pendências identificadas; não declara homologação integral.

## Candidato de 31/10/2026

- [x] Branch de recuperação criada antes das edições.
- [x] 77 testes de código/PostgreSQL e 5 cenários de navegador local aprovados.
- [x] 10 verificações HTTP do serviço real aprovadas; contas e contagens preservadas.
- [x] Matriz de preservação, auditoria e procedimento de recuperação documentados.
- [ ] Autorizar e aplicar correção crítica de papéis administrativos.
- [ ] Autorizar quota e deploy da LX IA; homologar modo online e sessão real.
- [ ] E2E entre aparelhos, TURN, e-mail, Drive/TMDB e fontes do catálogo.
- [ ] Concluir funcionalidades pendentes da matriz Premium 2.0.
- [ ] Autorizar integração/publicação do frontend.
