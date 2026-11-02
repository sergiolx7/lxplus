# LX Cinema Robot — protocolo operacional

A coleta de metadados usa o worker preexistente `lx-auto-catalog`, autenticado por token de cron guardado no Supabase Vault. O worker consulta Wikidata e permite artes verificadas do Wikimedia Commons. **Não coleta nem hospeda cópias de filmes protegidos**.

## Operação inicial
- Filmes: habilitado, `daily_limit=1000`. Depois de um timeout do provedor, o lote foi reduzido para 20 registros e nova tentativa programada com recuo de pelo menos 3 minutos.
- Séries e doramas: habilitado, `daily_limit=500`, `batch_size=80` durante a implementação.
- Configuração pelo proprietário/ADM via **Administração → Robô Cinema**, limites entre 1–10.000 títulos por tipo/dia, batch 1–100.
- As tarefas são cron reais, mas a execução depende do tempo disponível, limites do Wikidata, metadados e retrys. O limite máximo é somente teto, não produção garantida.
- Metadata descoberta entra como **rascunho** invisível ao público, inclusive títulos 18+. Antes de uma ficha aparecer no catálogo, o ADM deve conferir idade e direitos da capa; não selecionar 18+.
- Após aprovação, fichas entram no catálogo como **Em breve**, sem player ou link para arquivo.
- Posters do TMDB e estúdios comerciais exigem contrato/licença apropriada. Sem direitos confirmados, usa a capa LX.
- Duplicatas são identificadas por ID Wikidata, ID de catálogo, título+ano e lista de remoções existentes; nenhuma conta ou mídia anterior é apagada.

## Dependências não concluídas
1. Para incluir posters de filmes comerciais como Homem-Aranha, obter licença apropriada e configurar uma integração comercial legítima (TMDB ou distribuidor).
2. Para aumentar velocidade: monitorar `lx_auto_runs` e `lx_auto_jobs.last_error`; o provedor Wikidata pode limitar consultas e gerar `Signal timed out.`.
3. Validar manualmente diferentes contas, aprovação e permissões do ADM. O CI automatizado não substitui essa homologação.
4. Chamada de voz/vídeo e LX Party entre redes ainda dependem de TURN configurado e testes reais.
5. A Premium 4.0 original contém mais áreas que as implementadas nestas releases; não declarar conclusão integral.
