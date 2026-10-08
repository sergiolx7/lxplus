# Manutenção e automação LX Plus

Versão R12.19-V40-AUTO-20261008. Atualização na branch `lxplus-v40-completa`.

## Acesso e organização

A manutenção fica ativada para visitantes e membros. Uma conta autenticada com permissão administrativa pode entrar no site. Em **ADM → Configurações**, o botão **Reabrir o site** encerra a manutenção. A tela usa iluminação azul e lilás, sem alterar as permissões de acesso do servidor.

Só a entrada de Assistir mantém o carrossel principal. Livros, música e demais categorias usam grades. As músicas marcadas como destaque aparecem em uma grade na entrada de Música, mantendo o botão de reprodução nativa. O catálogo público de reprodução mostra apenas itens com fonte nativa utilizável ou texto disponível. 1.858 registros indisponíveis foram retirados da publicação: 1.675 músicas, 100 filmes, 50 séries, 17 doramas e 16 animes. Seus registros originais estão preservados no ADM e em `lx_maintenance_archive`; nenhum arquivo do proprietário foi apagado.

O **Acervo mundial** mostra fichas de descoberta separadas do catálogo de reprodução, com pesquisa e paginação de 36 itens. Uma ficha não oferece um botão de reprodução sem arquivo autorizado. Imagens livres do Wikimedia Commons incluem crédito e licença. Quando não existe imagem verificável, a capa apresenta o título e a identificação **Arte LX**. O ADM pode editar a capa por URL HTTPS; essa edição fica protegida contra substituição automática.

## Dois processos permanentes

Os processos usam Supabase Cron e a função `lx-auto-catalog`. Continuam executando com o site em manutenção e com o navegador fechado. Em Configurações, o ADM pode consultar os resultados e solicitar uma execução elegível.

| Processo | Frequência | Limite diário | Comportamento |
| --- | --- | --- | --- |
| Filmes | A cada 15 minutos | Até 2.000 fichas examinadas | Lote inicial com prioridade aos lançamentos mais recentes do ano, seguido de descoberta incremental no Wikidata, capas livres e revisão de capas faltantes; filmes do acervo Prelinger com licença verificável e MP4 acessível são publicados no player LX. |
| Músicas | Minutos 7, 22, 37 e 52 | Até 50 faixas examinadas e 150 MB | Consulta o catálogo autorizado de Kevin MacLeod, baixa MP3 completos de até 25 MB, confere estrutura, duração e SHA-256, hospeda na LX, reconfere a cópia e publica com créditos CC BY 4.0. |

O orçamento operacional do bucket `lx-assets` é 800 MB, incluindo arquivos anteriores. O processo pausa quando precisa de espaço ou quando atinge o limite; não aumenta plano nem compra armazenamento. Ao atingir a reserva diária de áudio, o processo aguarda a próxima meia-noite no fuso de Fortaleza, mantendo o próximo arquivo na fila. A falta de espaço total tem uma indicação diferente no ADM e uma nova conferência a cada hora. Arquivos acima do limite, inválidos ou removidos na origem são pulados; falhas temporárias e limites de requisição geram nova tentativa com espera. Duplicatas não são publicadas novamente. Remoções e capas definidas pelo ADM são respeitadas.

As 2.000 fichas são uma capacidade de descoberta, não uma promessa de 2.000 filmes disponíveis para assistir. As fontes podem impor limites ou mudar. O processo não baixa obras comerciais sem autorização, não usa YouTube nem Spotify para reprodução e não contorna proteção de acesso. Filmes autorizados podem usar o arquivo MP4 da origem dentro dos controles LX; os MP3 novos são hospedados no próprio site. O catálogo nativo aceita até 5.000 registros; as fichas mundiais têm consulta paginada separada.

As credenciais ficam no servidor e no Vault. O endpoint rejeita chamadas sem a autenticação própria do agendador. As tabelas de operação e os backups não ficam acessíveis a membros comuns. Duas tarefas diárias de acompanhamento verificam a saúde dos processos; a retrospectiva tem também uma verificação anual no Natal.

## Ranking, mês e Natal

O ranking é da comunidade LX, usa os dados reais do sistema e atualiza a cada 45 segundos enquanto está aberto. O painel mensal mostra tempo ouvido, artista e faixas mais ouvidas, dias de atividade e participação como primeiro ouvinte. Não apresenta uma retrospectiva em formato de histórias.

O tempo ouvido conta reprodução efetiva; pausar ou apenas abrir uma faixa não gera horas. O primeiro ouvinte exige pelo menos 30 segundos registrados. Essa medição começou em 8 de outubro de 2026, sem inventar resultados anteriores. As estatísticas de reprodução já eram medidas desde 2 de outubro de 2026.

A retrospectiva anual só fica disponível a partir de **25 de dezembro, no fuso America/Fortaleza**. A regra vale no servidor e na interface. A virada corresponde a 03:00 UTC; a opção fica bloqueada até lá. A liberação por data não encerra a manutenção do site.

## Backup e recuperação

O pacote desta atualização inclui os arquivos do site, histórico Git e orientações de manutenção. O catálogo antes da manutenção está preservado no backup anterior e na tabela de arquivo do servidor. Os 2.231 registros anteriores foram preservados. Para restaurar uma publicação, o ADM deve primeiro conferir a fonte de reprodução e a licença. Um administrador de banco também pode recuperar `payload`, `published` e `previous_updated_at` da tabela `lx_maintenance_archive`, após salvar o estado atual e verificar se não houve edição posterior. Não restaure registros em massa sem essa comparação.

As migrações estão em `supabase/migrations/20261008114122_lx_automation_maintenance.sql`, `20261008115023_lx_automation_schedule.sql` e `20261008121548_lx_christmas_recap_gate.sql`. O código do processo e seus testes estão no repositório. Não execute migrações já aplicadas novamente.

## Fontes

- Metadados CC0: https://www.wikidata.org/wiki/Wikidata:Data_access
- Imagens e licenças individuais: https://commons.wikimedia.org/
- Filmes históricos e evidência individual de licença: https://archive.org/details/prelinger
- Catálogo e autorização de Kevin MacLeod: https://incompetech.com/agent-section/
- Agendamento do servidor: https://supabase.com/docs/guides/functions/schedule-functions
