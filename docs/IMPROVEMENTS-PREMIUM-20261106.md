# LX Plus — perfis, continuidade e Premium ampliado

Entrega preparada em 6 de novembro de 2026, a partir da `main` moderna no commit `1414c3bae0fbf5f93389b6a0c69a858bb963cfbe`.

Backup anterior às alterações: `backup/improvements-20261106-1414c3b`. O código da publicação pode ser identificado por `source_commit` em `/build.json`; esta revisão usa `feature_revision: improvements-premium64-20261106`.

## Premium e biblioteca

- A biblioteca passou de 28 para **64 personalizações**. Os identificadores antigos foram preservados.
- Foram acrescentadas **18 coleções completas**, **16 paletas de LEDs** e **dois formatos de avatar**. As coleções combinam moldura, efeito, nome, tema de conversa, fundo e duas cores de perfil.
- A prévia e a aplicação agora incluem o `profile_style`: escolher uma paleta altera as cores reais das bordas, em vez de mudar somente a ilustração do item.
- Busca sem distinção de acentos, favoritos, filtro de novidades, ordenação por nome/categoria e estado vazio com limpeza dos filtros.
- Comparação entre o perfil atual e a combinação em prévia, além de amostra do tema de conversa.
- Prévia local dos três sons disponíveis, iniciada por clique e com resposta sobre a liberação do áudio pelo navegador.
- Até **oito combinações pessoais** guardadas na conta, com nome, experimentação e exclusão. A gravação é confirmada por leitura das preferências após o salvamento; guardar uma combinação não aplica a aparência ao perfil público.
- A aplicação continua usando `lx_set_premium_identity` e sua autorização existente no servidor. Uma prévia não concede Premium.
- Os novos itens usam somente os valores já aceitos pelo validador de identidade. Não foi necessária migração ou ampliação das permissões do banco.
- A página de planos apresenta os benefícios e mantém os valores de **R$ 9,90/mês** e **R$ 99,90/ano**.
- No celular, escolher um estilo leva à prévia; há ação para voltar à coleção.

## Interface e perfis

- Variação vetorial da marca em formato de play, com olhos em X e sorriso, aplicada ao cabeçalho e ao favicon.
- Busca com foco mais visível e ajuste do cabeçalho em larguras intermediárias.
- Cartão público de perfil ampliado para até 520 px, com ajustes de proporção e ações.
- Avatar circular no perfil Free; a forma escolhida no Premium continua sendo respeitada.
- Ao tocar na foto do perfil, um diálogo separado apresenta a imagem inteira com `object-fit: contain`, sem desmontar o cartão. O fechamento devolve o foco ao controle anterior.
- URLs de imagem com protocolos ativos, credenciais embutidas ou HTTP externo são recusadas.

## Chamadas e transmissão

O polling de chamadas podia avançar o cursor de sinais enquanto o peer ainda estava sendo preparado. A oferta era considerada lida sem ter sido aplicada. A leitura agora aguarda um peer disponível e só avança após processamento bem-sucedido.

Respostas atrasadas de heartbeat, consulta de sinais e busca de chamadas recebidas são verificadas contra a chamada/peer atual. Um resultado antigo não deve fechar ou renegociar uma chamada nova.

O seletor nativo pode retornar uma aba mesmo quando a interface inicialmente sugeriu uma janela. O áudio de uma aba com superfície identificada agora é preservado nessa situação. A captura de janela e de monitor mantém a exigência da opção correspondente; uma superfície desconhecida continua recusada. A faixa de microfone permanece separada.

**Limite observado:** duas sessões locais atenderam a chamada, completaram a negociação e encerraram remotamente com mídia sintética. O navegador de teste não produziu uma rota de mídia: WebRTC/ICE permaneceram em `new`, sem pacotes de áudio remoto. A recepção real de voz, vídeo e som da transmissão continua pendente de homologação entre aparelhos e redes diferentes. Esse resultado não identifica sozinho a causa do problema em produção.

## LX Music

- Remover uma faixa que está aguardando na fila preserva a faixa atual, o histórico e o controle de faixas já tocadas. A faixa atual não é removida por esse controle.
- Reordenar a fila durante a resolução de uma origem não troca a seleção por outra faixa: a identidade do conteúdo é conferida novamente.
- A resolução de uma origem musical tem limite de espera de 18 segundos e resposta recuperável. Uma origem que chega depois do limite é descartada e não reabre o player.
- Álbuns, artistas e playlists escolhidos explicitamente preservam sua sequência. A descoberta automática mantém a seleção por gênero/origem já existente.
- O acesso à fila permanece disponível no player oficial compacto em telas pequenas.

## Validação

- Baseline: 352 testes aprovados antes das alterações.
- A suíte ampliada cobre corridas de chamada, fila, origens atrasadas, combinações guardadas, filtros e compatibilidade dos 64 itens com a função de validação SQL existente em PostgreSQL/PGlite.
- A inspeção em navegador usa contas, dados e mídia fictícios na rota de desenvolvimento `/qa/`; os fixtures não são incluídos no build público.
- Foram observados em navegador: perfil ampliado, foto carregada sem recorte, retorno de foco, layout em 360/390 px, reprodução local, remoção de uma faixa sem parar a atual, aplicação de uma coleção, comparação com o perfil atual e uma combinação reaparecendo após recarregar.
- O fixture de QA passou a preservar as preferências fictícias por conta/caso de teste, permitindo verificar o recarregamento dos estilos guardados.

## Continuidade do plano de 100 melhorias

Esta entrega é um lote do plano; não representa conclusão integral dos 100 itens.

| Frente do plano | Resultado desta entrega |
| --- | --- |
| Marca, interface e perfis | Marca em play, cabeçalho, cartão maior e foto ampliável implementados; validação física de teclado e aparelhos permanece necessária. |
| Biblioteca e benefícios Premium | Ampliação para 64 itens, oito combinações guardadas, filtros, comparação e sons em prévia. |
| Voz e transmissão | Corridas de negociação e descarte indevido de áudio de aba corrigidos; mídia entre redes reais ainda não homologada. |
| Música | Remoção/reordenação segura da fila, limite de espera da origem e sequência explícita de álbuns/playlists. |
| Pagamentos e loja avulsa | Dependem da identificação e integração do gateway. O checkout permanece indisponível. |
| Chamadas em grupo e complemento desktop | Não implementados neste lote. |
| Robôs, ranking, LX IA e demais áreas do plano | Não receberam uma nova implementação nesta entrega; o estado existente deve ser revisto em etapas posteriores. |

## Pendências concretas

1. Confirmar o nome exato e a documentação do gateway para integrar e homologar cobrança, renovação e cancelamento.
2. Conferir a configuração do relay e testar voz, vídeo e transmissão com duas pessoas em aparelhos e redes distintos.
3. Concluir os demais itens do plano em lotes com evidências de funcionamento.

Contas e conteúdos existentes são preservados. Esta etapa não concede assinaturas nem cria cobranças, pedidos, cupons promocionais ou notificações a membros reais.
