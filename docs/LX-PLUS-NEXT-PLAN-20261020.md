# LX PLUS — PLANO MESTRE DE RECONSTRUÇÃO E MANUTENÇÃO

**Projeto:** LX Plus
**Responsável:** Sérgio LX
**Data:** 20 de outubro de 2026
**Versão planejada:** LX Plus — Próxima Grande Atualização
**Tipo de trabalho:** Manutenção profunda, reconstrução visual, limpeza de dados de teste, automação e integração de pagamentos.

---

# 1. OBJETIVO PRINCIPAL

Realizar uma reconstrução profunda da LX Plus, transformando a plataforma em um serviço de entretenimento moderno, rápido, organizado, seguro e preparado para receber usuários reais.

O objetivo é construir uma identidade própria, combinando a facilidade de navegação de plataformas como Netflix e Spotify com uma experiência visual mais moderna, tecnológica e interativa.

A nova LX Plus deverá possuir:

- Interface premium com iluminação LED e efeitos modernos.
- Plataforma de filmes, séries, animes e doramas.
- Plataforma de músicas com experiência semelhante à de um aplicativo musical completo.
- Biblioteca de livros com leitor integrado.
- Comunidade com perfis, conversas e interações.
- Sistema inteligente de recomendações.
- Catálogo atualizado automaticamente.
- Painel administrativo completo.
- Sistema de pedidos de conteúdo.
- Área Premium com pagamentos.
- Integração com PunchPay.
- Integração com Cloudflare R2 e Supabase.
- Sistema de notificações.
- Aplicativo PWA.
- Monitoramento de erros e desempenho.
- Sistema de automações com histórico e controle.

**Diretriz principal:** reconstruir e modernizar a plataforma sem perder funcionalidades úteis que já foram desenvolvidas.

Não eliminar recursos apenas porque estão apresentando erros. Primeiro identificar o problema e avaliar se devem ser corrigidos, simplificados ou reconstruídos.

---

# 2. REGRAS OBRIGATÓRIAS ANTES DE COMEÇAR

## 2.1 Repositório e ambiente

Repositório GitHub:

`sergiolx7/lxplus`

Branch de referência:

`lxplus-v40-completa`

Backup de código já criado:

`backup/lxplus-before-maintenance-20261020-e6109c6`

Branch de testes já criada:

`staging/lxplus-maintenance-20261020-e6109c6`

Projeto Supabase:

`ubidogquzpdvrbzbhxda`

O trabalho deverá continuar na branch de testes.

Não substituir a versão publicada até que a nova versão seja completamente verificada.

## 2.2 Backup obrigatório

Antes de modificar dados ou executar qualquer limpeza:

- [ ] Verificar o backup do código.
- [ ] Exportar um backup integral do banco de dados.
- [ ] Exportar usuários e dados relacionados.
- [ ] Copiar os arquivos do Supabase Storage.
- [ ] Preservar capas, músicas e arquivos próprios ou licenciados.
- [ ] Preservar configurações administrativas.
- [ ] Preservar a estrutura das tabelas.
- [ ] Registrar as Edge Functions e suas configurações.
- [ ] Criar inventário dos serviços conectados.
- [ ] Verificar se o backup pode ser restaurado.
- [ ] Guardar uma cópia segura fora do Supabase.

Não considerar o backup concluído sem verificar sua integridade.

## 2.3 Regras de desenvolvimento

- Não modificar a produção diretamente.
- Não apagar arquivos indiscriminadamente.
- Não expor chaves secretas no navegador.
- Não introduzir cobranças sem autorização específica.
- Não quebrar funcionalidades existentes.
- Não publicar versões com erros críticos.
- Não utilizar integrações de reprodução que violem direitos autorais.
- Não declarar uma função como concluída sem realizar testes reais.
- Registrar todas as alterações realizadas.

---

# 3. LIMPEZA GERAL DA LX PLUS

**Autorização do proprietário:** os usuários atualmente existentes são considerados contas de teste, e a intenção é realizar um novo lançamento com cadastro do zero.

Entretanto, deve-se confirmar o inventário antes da exclusão definitiva, evitando remover contas ou informações reais por engano.

## 3.1 O que deverá ser removido

Após backup, conferência e teste da rotina de limpeza:

- [ ] Contas de usuários identificadas como contas de teste.
- [ ] Perfis vinculados a essas contas.
- [ ] Avatares de teste.
- [ ] Sessões de login.
- [ ] Favoritos de teste.
- [ ] Playlists de teste.
- [ ] Histórico de reprodução dos usuários removidos.
- [ ] Progresso de filmes e séries desses usuários.
- [ ] Progresso de leitura desses usuários.
- [ ] Mensagens de teste.
- [ ] Conversas e chamadas de teste.
- [ ] Notificações antigas de teste.
- [ ] Pedidos fictícios.
- [ ] Votos fictícios.
- [ ] Pontuações e rankings de teste.
- [ ] Aprovações antigas de contas removidas.
- [ ] Logs dispensáveis, conforme política de retenção.
- [ ] Arquivos temporários sem referência.
- [ ] Registros duplicados.
- [ ] Recursos abandonados e comprovadamente sem utilização.

A limpeza deve considerar relacionamentos entre tabelas e arquivos.

Não executar exclusões genéricas que atinjam o catálogo, configurações, permissões, conteúdo ou estrutura principal.

Revogar sessões e tokens das contas removidas e verificar se não continuam autorizadas a acessar dados.

## 3.2 O que obrigatoriamente deve permanecer

- [ ] Código-fonte da plataforma.
- [ ] Identidade LX Plus.
- [ ] Logotipos oficiais.
- [ ] Estrutura do catálogo.
- [ ] Capas e banners válidos.
- [ ] Dados de filmes, séries, músicas e livros.
- [ ] Arquivos próprios e licenciados.
- [ ] Player de vídeo.
- [ ] Player de música.
- [ ] Leitor de livros.
- [ ] Área Premium.
- [ ] Painel administrativo.
- [ ] Sistema de automação.
- [ ] Ranking LX.
- [ ] Comunidade.
- [ ] Configurações e integrações existentes.
- [ ] Estrutura de notificações.
- [ ] Recursos de acessibilidade.
- [ ] Sistemas de upload e importação.
- [ ] Histórico de alterações administrativas necessário para auditoria.

O objetivo da limpeza é retirar dados temporários e preparar uma base organizada, preservando o trabalho já desenvolvido.

## 3.3 Conta administrativa principal

Após a limpeza:

1. Preparar um procedimento seguro de criação da conta proprietária.
2. Garantir que o proprietário não fique bloqueado fora do sistema.
3. Configurar autenticação forte e MFA.
4. Testar recuperação de acesso.
5. Recriar ou validar as permissões administrativas.
6. Só depois liberar novos cadastros.

Nunca manter uma senha administrativa padrão escrita no código.

---

# 4. MODO DE MANUTENÇÃO

Criar uma página moderna de manutenção para a LX Plus.

## 4.1 Identidade visual

A página deverá apresentar:

- Fundo escuro premium.
- Logotipo LX Plus iluminado.
- Efeitos LED suaves.
- Animações discretas.
- Elementos com aparência de vidro.
- Mensagem de atualização.
- Indicador de progresso quando houver dados reais disponíveis.
- Adaptação para computador e celular.

Mensagem sugerida:

**LX PLUS — UMA NOVA EXPERIÊNCIA ESTÁ CHEGANDO**

Estamos preparando uma nova fase da LX Plus, com mais conteúdo, uma experiência musical renovada, melhorias no player e novos recursos para você.

Em breve estaremos de volta.

## 4.2 Funcionalidades

- [ ] Ativar e desativar manutenção pelo ADM.
- [ ] Permitir acesso administrativo durante a manutenção.
- [ ] Exibir previsão de retorno somente quando confirmada.
- [ ] Botão “Avisar quando voltar”.
- [ ] Cadastro de interesse para receber notificação, com consentimento.
- [ ] Página responsiva.
- [ ] Resposta adequada para páginas temporariamente indisponíveis.
- [ ] Não apagar sessões ou dados apenas por ativar a manutenção.
- [ ] Impedir acesso indevido a funcionalidades em atualização.

Não utilizar contagens falsas de progresso.

---

# 5. NOVA IDENTIDADE VISUAL — LX PLUS NEXT

A interface deve ser completamente revisada.

A referência de experiência é uma combinação de plataformas modernas de streaming de filmes e música, mas mantendo uma identidade visual original da LX Plus.

Não copiar logotipos, artes, código proprietário ou elementos protegidos de outras plataformas.

## 5.1 Estilo visual

Implementar:

- Fundo preto ou grafite profundo.
- Superfícies com transparência controlada.
- Cartões com efeito de vidro.
- Iluminação LED nas bordas.
- Brilho suave em elementos destacados.
- Uma cor principal consistente em todo o sistema.
- Gradientes discretos.
- Sombras naturais.
- Cantos arredondados.
- Tipografia moderna.
- Ícones profissionais e consistentes.
- Transições suaves.
- Layout responsivo.

As animações não devem causar tremores, travamentos ou consumo excessivo de bateria.

## 5.2 Efeitos LED

Aplicar efeitos em:

- Botões principais.
- Cartões selecionados.
- Player.
- Mini-player.
- Menu lateral.
- Cartões Premium.
- Perfil do usuário.
- Painel ADM.
- Banners especiais.
- Elementos do ranking.

Os efeitos devem ser discretos e não prejudicar a leitura.

## 5.3 Acessibilidade

- [ ] Respeitar a preferência do sistema por movimento reduzido.
- [ ] Criar opção manual para reduzir animações.
- [ ] Permitir navegação por teclado.
- [ ] Corrigir contraste.
- [ ] Adicionar estados de foco visíveis.
- [ ] Adaptar fontes para telas menores.
- [ ] Evitar efeitos pesados em aparelhos fracos.

---

# 6. NOVA TELA INICIAL

Reconstruir a Home com aparência profissional.

## 6.1 Banner principal

Um grande banner deverá ocupar o destaque inicial, contendo:

- Capa ou imagem de fundo.
- Nome do filme ou série.
- Ano.
- Classificação indicativa, quando disponível.
- Gênero.
- Sinopse curta.
- Botão Assistir, quando houver mídia disponível.
- Botão Mais informações.
- Botão Minha lista.

Caso não exista vídeo disponível, apresentar a opção “Em breve” e o botão de solicitação.

## 6.2 Organização das seções

- Continuar assistindo.
- Em alta.
- Top 10 de hoje.
- Top 10 da semana.
- Filmes.
- Séries.
- Animes.
- Doramas.
- Lançamentos.
- Adicionados recentemente.
- Recomendados para você.
- Porque você assistiu determinado título.
- Minha lista.
- Em breve.
- Gêneros.
- Tendências da comunidade.

Evitar excesso de carrosséis e duplicações.

## 6.3 Navegação

- Menu lateral elegante no computador.
- Menu inferior simplificado no celular.
- Busca global acessível.
- Ícones consistentes.
- Mudança rápida entre Filmes, Música, Livros e Comunidade.
- Estados de carregamento.
- Sem animações ou componentes tremendo.

---

# 7. RECONSTRUÇÃO DA TELA DE ASSISTIR

Esta é uma das áreas prioritárias.

## 7.1 Página de detalhes

Mostrar:

- Banner do título.
- Pôster.
- Nome.
- Nota.
- Ano.
- Duração.
- Gênero.
- Classificação.
- Sinopse.
- Elenco.
- Diretor, quando disponível.
- Temporadas.
- Episódios.
- Trailer oficial, quando disponível.
- Botão Assistir.
- Botão Minha lista.
- Botão Pedir título.
- Títulos parecidos.

## 7.2 Temporadas e episódios

- [ ] Organizar episódios por temporada.
- [ ] Mostrar miniaturas.
- [ ] Identificar episódios assistidos.
- [ ] Salvar progresso.
- [ ] Exibir próximo episódio.
- [ ] Permitir continuar de onde parou.
- [ ] Suportar temporadas com muitos episódios.
- [ ] Evitar duplicação e mistura de episódios.

## 7.3 Player LX

Desenvolver uma experiência de reprodução própria para conteúdos que a plataforma esteja autorizada a distribuir.

Funções necessárias:

- Play e pausa.
- Avançar e voltar.
- Controle de volume.
- Mudo.
- Velocidade.
- Qualidade, conforme as versões de vídeo disponíveis.
- Legendas.
- Seleção de áudio, quando disponível.
- Tela cheia.
- Modo mini-player.
- Próximo episódio.
- Retomar reprodução.
- Indicador de carregamento.
- Tratamento de erro de mídia.
- Compatibilidade com celular, tablet e computador.
- Suporte a transmissão para TV quando tecnicamente disponível.

Não depender de links ilegais ou da reprodução não autorizada de terceiros.

---

# 8. LX MUSIC — EXPERIÊNCIA MUSICAL COMPLETA

A área de música deverá passar por uma modernização profunda.

A experiência deve lembrar a organização e facilidade de uso de um aplicativo musical moderno, com identidade própria da LX Plus.

## 8.1 Estrutura

Menu musical:

- Início.
- Buscar.
- Biblioteca.
- Playlists.
- Álbuns.
- Artistas.
- Curtidas.
- Recentes.
- Fila de reprodução.

## 8.2 Tela inicial

- Destaques musicais.
- Álbuns recomendados.
- Artistas.
- Músicas recentes.
- Músicas favoritas.
- Playlists criadas.
- Recomendações por preferência.
- Continuação da última reprodução.
- Descobertas musicais.

## 8.3 Player musical

- [ ] Play e pausa.
- [ ] Próxima música.
- [ ] Música anterior.
- [ ] Aleatório.
- [ ] Repetir faixa.
- [ ] Repetir fila.
- [ ] Barra de progresso.
- [ ] Controle de volume.
- [ ] Fila editável.
- [ ] Capa correta.
- [ ] Letras quando licenciadas ou autorizadas.
- [ ] Mini-player.
- [ ] Player expandido.
- [ ] Persistência ao navegar entre páginas.
- [ ] Reprodução em segundo plano quando suportada.
- [ ] Correção do botão Reproduzir álbum.
- [ ] Evitar interrupções desnecessárias.

## 8.4 Biblioteca pessoal

- Curtir músicas.
- Criar playlists.
- Renomear playlists.
- Adicionar e remover músicas.
- Ordenar faixas.
- Exibir artista e álbum.
- Salvar histórico.
- Sincronizar com a conta.

## 8.5 Integrações

Priorizar arquivos próprios ou licenciados armazenados na infraestrutura da LX Plus.

Integrações externas devem usar APIs, players oficiais e permissões adequadas.

Não extrair áudio protegido de serviços de terceiros sem autorização.

---

# 9. NOVO CATÁLOGO AUTOMÁTICO

Criar um sistema automático que encontre e organize metadados de filmes, séries, animes, doramas, músicas e livros.

O objetivo é acelerar a montagem do catálogo sem depender de cadastros manuais para cada título.

## 9.1 Fontes de metadados

Avaliar integrações oficiais com:

**Filmes e séries**
- TMDB.

**Músicas**
- MusicBrainz.
- Cover Art Archive.

**Livros**
- Open Library.
- Google Books, conforme os termos da API.

Respeitar limites, licenças, atribuições e condições de uso de cada fornecedor.

## 9.2 Automação diária

Criar tarefas agendadas para:

1. Consultar novidades nas fontes autorizadas.
2. Coletar os metadados.
3. Verificar duplicidades.
4. Validar títulos e identificadores.
5. Organizar gêneros e categorias.
6. Processar imagens autorizadas.
7. Atualizar registros existentes.
8. Criar novos registros.
9. Registrar erros.
10. Atualizar o painel administrativo.

## 9.3 Meta de processamento

Preparar a arquitetura para uma meta de até **2.000 registros de filmes por dia**, além de séries, músicas e livros.

A quantidade efetiva dependerá dos limites das APIs e da capacidade do sistema.

Essa meta se refere à importação de metadados, não à disponibilização automática de milhares de vídeos para reprodução.

## 9.4 Status do conteúdo

Cada título deverá possuir um status claro:

- Em breve.
- Em análise.
- Disponível.
- Indisponível.
- Removido por solicitação de direitos.
- Erro de mídia.

Um título pode aparecer no catálogo sem ter vídeo ou áudio disponível.

Nesse caso, apresentar informações, capa e botão de pedido, mas nunca um botão de reprodução que não funciona.

## 9.5 Capas e imagens

- [ ] Validar direitos e condições de uso da imagem.
- [ ] Criar versões reduzidas.
- [ ] Usar WebP ou formatos compatíveis.
- [ ] Evitar duplicação.
- [ ] Armazenar localmente quando a licença permitir.
- [ ] Utilizar carregamento sob demanda.
- [ ] Configurar imagens substitutas quando necessário.

---

# 10. CENTRO DE AUTOMAÇÃO — ADM

Criar uma área exclusiva denominada:

**LX Automation Center**

Ela deverá centralizar o funcionamento das automações do catálogo.

## 10.1 Visão geral

Mostrar:

- Automações ativas.
- Automações pausadas.
- Última execução.
- Próxima execução.
- Registros processados hoje.
- Registros publicados.
- Registros rejeitados.
- Registros duplicados.
- Erros encontrados.
- Consumo de armazenamento.
- Duração das execuções.
- Histórico de atividades.

## 10.2 Controles

- Iniciar.
- Pausar.
- Retomar.
- Reprocessar erros.
- Configurar horários.
- Ajustar limites.
- Selecionar categorias.
- Ativar aprovação manual.
- Visualizar fila.
- Cancelar uma execução.
- Exportar relatórios.

## 10.3 Regras

- Nunca gerar milhares de processos simultâneos sem limite.
- Controlar consumo de APIs.
- Respeitar a capacidade do Supabase.
- Implementar tentativas automáticas com intervalos.
- Evitar registros duplicados.
- Validar respostas externas.
- Não publicar mídias sem autorização.
- Manter logs de auditoria.

A automação deve funcionar por tarefas programadas na infraestrutura. Não depender de uma conversa aberta com o ChatGPT.

---

# 11. SISTEMA DE PEDIDOS

Criar um sistema de pedidos em toda a plataforma.

## 11.1 Para usuários

Cada título indisponível deverá oferecer:

**Pedir este título**

O usuário poderá:

- Solicitar um filme.
- Solicitar uma série.
- Solicitar um dorama.
- Solicitar uma música.
- Solicitar um livro.
- Acompanhar o pedido.
- Votar em pedidos existentes.

## 11.2 Regras

- Impedir pedidos duplicados do mesmo usuário.
- Unificar pedidos equivalentes.
- Limitar tentativas.
- Bloquear spam.
- Registrar data.
- Exibir quantidade de votos.
- Informar status atualizado.

## 11.3 Administração

Status:

- Recebido.
- Em análise.
- Aprovado.
- Adicionado.
- Indisponível.
- Rejeitado.

Notificar o usuário quando seu pedido for atendido.

---

# 12. NOVO CADASTRO DE USUÁRIOS

Após a limpeza autorizada e a preparação da nova versão, todos os novos usuários deverão fazer cadastro.

## 12.1 Processo de cadastro

O fluxo obrigatório será:

1. Usuário acessa a LX Plus.
2. Seleciona Criar conta.
3. Informa e-mail e senha.
4. Recebe mensagem de confirmação.
5. Confirma o e-mail por meio do link.
6. O sistema valida a confirmação.
7. O cadastro fica aguardando aprovação administrativa.
8. O ADM analisa o pedido.
9. O ADM aprova ou rejeita.
10. A conta aprovada passa a ter acesso.

**A confirmação de e-mail não deve substituir a aprovação do ADM.**

## 12.2 Estados da conta

- E-mail não confirmado.
- Aguardando aprovação.
- Aprovado.
- Rejeitado.
- Suspenso.
- Banido.

## 12.3 Mensagens automáticas

Enviar mensagens apropriadas para:

- Confirmação de cadastro.
- E-mail confirmado.
- Cadastro aguardando aprovação.
- Conta aprovada.
- Conta rejeitada.
- Recuperação de senha.
- Alteração de senha.
- Alerta de segurança.

## 12.4 Segurança

- Exigir senhas fortes.
- Limitar tentativas de login.
- Aplicar proteção contra abuso.
- Habilitar MFA para administradores.
- Proteger rotas administrativas.
- Revisar RLS.
- Impedir usuários comuns de se promoverem a ADM.
- Manter chaves privilegiadas somente no servidor.

---

# 13. PAINEL ADMINISTRATIVO

Reorganizar completamente o painel ADM.

## 13.1 Menu proposto

1. Visão Geral
2. Usuários e Aprovações
3. Catálogo
4. Importação em Massa
5. Automação
6. Mídia e Uploads
7. Armazenamento
8. Pedidos e Problemas
9. Comunidade
10. Denúncias
11. Premium
12. Pagamentos
13. Notificações
14. Analytics
15. Identidade Visual
16. Equipe ADM
17. Segurança
18. Configurações
19. Logs
20. Manutenção

## 13.2 Visão geral

Exibir:

- Total de usuários.
- Cadastros pendentes.
- Usuários ativos.
- Títulos cadastrados.
- Títulos disponíveis.
- Títulos em breve.
- Pedidos pendentes.
- Vendas.
- Receita recebida.
- Assinaturas ativas.
- Erros recentes.
- Status das automações.
- Consumo de armazenamento.

Nunca utilizar números fictícios nos indicadores reais.

## 13.3 Equipe

Permissões:

- Proprietário.
- Administrador.
- Editor de catálogo.
- Moderador.
- Suporte.

Cada função deverá acessar somente o que for necessário.

A autorização deve ser validada no servidor, e não apenas escondendo botões.

---

# 14. PREMIUM — PLANOS OFICIAIS

Implementar uma área Premium organizada e transparente.

## 14.1 Planos

### LX Plus Mensal

**R$ 9,90 por mês**

### LX Plus Anual

**R$ 90,00 por ano**

Economia em comparação com 12 pagamentos mensais de R$ 9,90:

**R$ 28,80 por ano.**

## 14.2 Página Premium

Criar:

- Comparação de planos.
- Identidade visual premium.
- Cartões iluminados.
- Benefícios reais e claramente informados.
- Botão Assinar.
- Informações sobre renovação.
- Informações sobre cancelamento.
- Histórico de pagamentos.
- Estado da assinatura.
- Próxima cobrança, quando aplicável.

Os benefícios dos planos deverão corresponder a funcionalidades efetivamente disponíveis.

## 14.3 Regras

- Não liberar Premium apenas porque o usuário clicou em Pagar.
- Não confiar em valores enviados pelo navegador.
- Confirmar o pagamento no servidor.
- Impedir cobrança duplicada.
- Registrar transações.
- Permitir cancelamento conforme as regras aplicáveis.
- Tratar pagamentos pendentes, recusados e estornados.
- Exibir comprovantes ou registros de transação.

---

# 15. INTEGRAÇÃO COM PUNCHPAY

**Gateway de pagamento escolhido pelo proprietário: PunchPay.**

Esta integração deverá substituir soluções improvisadas de pagamento.

## 15.1 Validação inicial obrigatória

Antes de programar a integração:

- [ ] Confirmar o site e a documentação oficial da PunchPay.
- [ ] Confirmar disponibilidade de API.
- [ ] Confirmar tipos de credenciais.
- [ ] Confirmar pagamentos por Pix.
- [ ] Confirmar pagamentos por cartão.
- [ ] Confirmar suporte a assinaturas recorrentes.
- [ ] Confirmar funcionamento de webhooks.
- [ ] Confirmar ambiente de testes.
- [ ] Confirmar taxas e condições comerciais.
- [ ] Confirmar política de estorno e cancelamento.

**Não inventar endpoints, nomes de eventos, cabeçalhos ou parâmetros.**

Se a PunchPay não oferecer recorrência automática, implementar o fluxo de renovação suportado oficialmente e informar essa limitação.

## 15.2 Área de configuração da PunchPay

Criar no painel:

**ADM → Pagamentos → PunchPay**

Campos necessários, conforme a documentação oficial:

- Ativar ou desativar integração.
- Ambiente de testes ou produção.
- Credencial de API.
- Chave pública, caso exista.
- Chave secreta, caso exista.
- Segredo de verificação de webhook, caso exista.
- Identificadores dos produtos ou planos, caso exigidos.
- Endereço do webhook.
- Status da conexão.
- Data do último teste.
- Histórico de erros.

Nunca exibir novamente uma chave secreta completa após salvá-la.

Nunca armazenar credenciais secretas no HTML, JavaScript público ou repositório GitHub.

## 15.3 Processo de pagamento

Fluxo esperado:

1. Usuário seleciona o plano.
2. LX Plus cria o pedido no servidor.
3. Servidor comunica-se com a API oficial da PunchPay.
4. Usuário realiza o pagamento.
5. Gateway informa ou disponibiliza o resultado.
6. Servidor verifica autenticidade e estado da cobrança.
7. LX Plus atualiza a assinatura.
8. Usuário recebe confirmação.
9. Premium é liberado somente após pagamento confirmado.

## 15.4 Webhooks

Implementar, conforme a API oficial:

- Endpoint protegido.
- Validação de assinatura ou autenticação da notificação.
- Conferência do identificador da transação.
- Conferência de valor e moeda.
- Conferência do usuário e plano.
- Processamento idempotente.
- Tratamento de eventos repetidos.
- Registro de tentativas.
- Retentativas controladas.
- Reconciliação com a API oficial.
- Prevenção contra notificações falsas.

## 15.5 Estados financeiros

Tratar, quando suportados:

- Aguardando pagamento.
- Pago.
- Recusado.
- Expirado.
- Cancelado.
- Estornado.
- Em disputa.
- Assinatura ativa.
- Assinatura vencida.

Não ativar Premium por uma resposta recebida somente no navegador.

## 15.6 Testes obrigatórios

- Pagamento aprovado.
- Pagamento recusado.
- Pix não pago.
- Notificação atrasada.
- Notificação duplicada.
- Valor incorreto.
- Cancelamento.
- Estorno.
- Renovação.
- Falha de comunicação.
- Retorno após queda do servidor.

Somente ativar pagamentos reais depois de concluir esses testes.

---

# 16. ARMAZENAMENTO — R2, SUPABASE E DRIVE

## 16.1 Cloudflare R2

Usar inicialmente a franquia gratuita do Cloudflare R2 Standard.

Objetivo:

- Armazenar arquivos grandes autorizados.
- Gerar URLs temporárias de reprodução.
- Permitir uploads administrativos.
- Controlar acesso.
- Exibir consumo.
- Evitar despesas inesperadas.

Configurar um limite preventivo próximo de 9 GB, considerando a franquia gratuita inicial de 10 GB-mês.

Esse limite deverá ser implementado na aplicação; não presumir que a Cloudflare bloqueará automaticamente o uso excedente.

## 16.2 Supabase

Manter para:

- Autenticação.
- Perfis.
- Aprovações.
- Catálogo.
- Favoritos.
- Playlists.
- Pedidos.
- Histórico.
- Progresso.
- Comunidade.
- Dados Premium.
- Referências de pagamento.
- Configurações.
- Logs.

## 16.3 Google Drive

Utilizar a capacidade de 2 TB já disponível para:

- Backups.
- Arquivos próprios.
- Cópias de segurança.
- Materiais administrativos.

Não utilizar o Drive como servidor de streaming em massa sem infraestrutura e permissões adequadas.

## 16.4 Centro de armazenamento

Adicionar ao ADM:

- Espaço ocupado.
- Espaço disponível.
- Uso por categoria.
- Quantidade de arquivos.
- Arquivos sem referência.
- Falhas.
- Status do backup.
- Última sincronização.

---

# 17. LX BOOKS

Reconstruir e estabilizar a área de livros.

## Funcionalidades

- Biblioteca.
- Busca.
- Página de detalhes.
- Capas.
- Autor.
- Gênero.
- Descrição.
- Favoritos.
- Continuar lendo.
- Progresso salvo.
- Modo noturno.
- Ajuste de fonte.
- Navegação por capítulos.
- Marcadores.
- Histórico.
- Livros recomendados.

Corrigir travamentos ao abrir ou navegar pelos livros.

---

# 18. COMUNIDADE LX

Modernizar a comunidade.

## 18.1 Perfis

- Avatar.
- Nome.
- Nome de usuário único.
- Bio.
- Conquistas.
- Listas públicas.
- Preferências de privacidade.
- Atividade recente, conforme consentimento.

## 18.2 Interações

- Amigos.
- Mensagens.
- Grupos.
- Comentários.
- Avaliações.
- Curtidas.
- Compartilhamento de listas.
- Indicações de títulos.

## 18.3 Chamadas

Corrigir:

- Indicadores de presença.
- Contador de participantes.
- Entrada e saída.
- Reconexão.
- Microfone.
- Compartilhamento de tela quando suportado.
- Encerramento de chamadas.
- Erros de permissão.

## 18.4 Moderação

- Denunciar.
- Bloquear.
- Silenciar.
- Remover conteúdo.
- Suspender conta.
- Banir.
- Analisar denúncia.
- Registrar decisão administrativa.

## 18.5 Ranking LX

Preservar e modernizar:

- Top 3.
- Ranking mensal.
- Conquistas.
- Histórico.
- Hall dos Campeões.
- Opção de não participar.
- Regras transparentes.
- Proteção contra manipulação de pontos.

Qualquer premiação deverá possuir regras e condições explícitas.

---

# 19. BUSCA UNIVERSAL

Criar uma busca única.

O usuário poderá encontrar:

- Filmes.
- Séries.
- Animes.
- Doramas.
- Músicas.
- Álbuns.
- Artistas.
- Livros.

Requisitos:

- Busca rápida.
- Sugestões.
- Correção aproximada de escrita.
- Filtros.
- Ordenação.
- Resultados sem duplicação.
- Boa experiência no celular.

---

# 20. APLICATIVO PWA

Transformar a LX Plus em um aplicativo web instalável.

## Funcionalidades

- Botão Instalar aplicativo funcionando.
- Ícones apropriados.
- Tela de abertura.
- Nome correto.
- Navegação adaptada ao celular.
- Cache de recursos estáticos.
- Atualizações controladas.
- Notificações quando autorizadas.

## Downloads

Criar:

- Meus downloads.
- Espaço utilizado.
- Gerenciar arquivos.
- Remover download.
- Disponível offline.

O download offline de mídia deverá existir somente quando tecnicamente permitido e autorizado pela licença do conteúdo.

---

# 21. PÁGINAS LEGAIS E SUPORTE

Criar e revisar:

- Termos de Uso.
- Política de Privacidade.
- Política de Cookies, quando necessária.
- Política de Direitos Autorais.
- Página de Denúncias de Conteúdo.
- Página de Suporte.
- Política de Assinaturas.
- Informações sobre cancelamento e reembolso.

## Direitos autorais

Criar um canal de denúncias contendo:

- Identificação do conteúdo.
- Link do conteúdo.
- Dados de contato do reclamante.
- Descrição da alegação.
- Documentação complementar.
- Protocolo.
- Prazo de análise definido conforme requisitos aplicáveis.
- Resultado da solicitação.

O responsável deverá fornecer o contato oficial da plataforma antes da publicação.

## Privacidade

Documentar:

- Dados coletados.
- Finalidade de utilização.
- Base legal.
- Compartilhamento com prestadores.
- Prazos de retenção.
- Segurança.
- Direitos dos usuários.
- Canal de contato.
- Procedimento de exclusão de conta.

Submeter os textos jurídicos à revisão adequada antes do lançamento.

---

# 22. SEGURANÇA GERAL

Executar uma auditoria completa.

## Supabase

- [ ] Revisar RLS em todas as tabelas expostas.
- [ ] Testar acesso de usuário comum.
- [ ] Testar acesso de ADM.
- [ ] Verificar privilégios de editores.
- [ ] Revisar funções SECURITY DEFINER.
- [ ] Bloquear alterações indevidas do catálogo.
- [ ] Verificar permissões dos buckets.
- [ ] Impedir consultas indevidas a informações privadas.

## Autenticação

- [ ] MFA administrativo.
- [ ] Senhas fortes.
- [ ] Confirmação de e-mail.
- [ ] Limitação de tentativas.
- [ ] Recuperação de conta.
- [ ] Revogação de sessões.
- [ ] Aprovação obrigatória.
- [ ] Mensagens de erro seguras.

## Credenciais

- [ ] Remover senhas demonstrativas.
- [ ] Revisar chaves públicas e secretas.
- [ ] Proteger tokens administrativos.
- [ ] Rotacionar credenciais comprovadamente comprometidas.
- [ ] Não enviar credenciais para logs.
- [ ] Manter HTTPS.
- [ ] Verificar permissões de integrações.

---

# 23. VELOCIDADE E ESTABILIDADE

A nova LX Plus deverá funcionar bem em computadores e celulares intermediários.

## Otimizações

- Compactar CSS e JavaScript.
- Remover código duplicado ou abandonado.
- Reduzir carregamentos desnecessários.
- Dividir módulos muito grandes quando viável.
- Carregar imagens sob demanda.
- Utilizar cache adequado.
- Evitar consultas repetidas.
- Otimizar banco e índices.
- Implementar telas skeleton.
- Corrigir travamentos.
- Revisar consumo de memória.
- Verificar reprodução em segundo plano.

## Testes

- Android.
- iPhone.
- Tablet.
- Computador.
- Chrome.
- Safari.
- Navegadores compatíveis adicionais.

Executar Lighthouse e testes reais, registrando os resultados antes e depois da manutenção.

---

# 24. SISTEMA DE NOTIFICAÇÕES

Implementar notificações para:

- Conta aprovada.
- Conta rejeitada.
- Novo título.
- Pedido atendido.
- Nova mensagem.
- Novidade Premium.
- Aviso de manutenção.
- Retorno da plataforma.

O usuário deverá controlar quais notificações deseja receber, respeitando permissões e preferências de privacidade.

---

# 25. MONITORAMENTO E RELATÓRIOS

Criar um centro de monitoramento.

Indicadores:

- Site disponível.
- Erros recentes.
- Falhas de login.
- Problemas no player.
- Falhas de pagamento.
- Falhas de integração.
- Automações interrompidas.
- Uso de armazenamento.
- Tempo de resposta.
- Desempenho das páginas.

Criar histórico de incidentes e identificação dos módulos afetados.

---

# 26. ORDEM DE EXECUÇÃO

O Work deverá executar o projeto em etapas.

## Etapa 1 — Preparação

- [ ] Auditar versão atual.
- [ ] Verificar backup.
- [ ] Concluir backup do banco.
- [ ] Concluir backup do Storage.
- [ ] Preparar staging isolado.
- [ ] Registrar riscos.

## Etapa 2 — Segurança

- [ ] Revisar RLS.
- [ ] Corrigir permissões.
- [ ] Revisar login.
- [ ] Preparar MFA.
- [ ] Proteger credenciais.
- [ ] Preparar reset seguro das contas de teste.

## Etapa 3 — Estrutura visual

- [ ] Reorganizar componentes.
- [ ] Aplicar identidade LX Plus Next.
- [ ] Corrigir responsividade.
- [ ] Modernizar menus.
- [ ] Implementar efeitos LED.
- [ ] Criar controles de acessibilidade.

## Etapa 4 — Conteúdo e players

- [ ] Reconstruir Home.
- [ ] Reconstruir detalhes.
- [ ] Corrigir player de vídeo.
- [ ] Reconstruir LX Music.
- [ ] Corrigir LX Books.
- [ ] Implementar busca universal.

## Etapa 5 — Automação

- [ ] Integrar APIs autorizadas.
- [ ] Criar importação.
- [ ] Criar fila.
- [ ] Criar painel.
- [ ] Implementar tarefas agendadas.
- [ ] Testar limites e erros.

## Etapa 6 — Comunidade

- [ ] Corrigir perfis.
- [ ] Corrigir mensagens.
- [ ] Corrigir presença.
- [ ] Corrigir chamadas.
- [ ] Atualizar ranking.
- [ ] Implementar moderação.

## Etapa 7 — Premium

- [ ] Criar página de planos.
- [ ] Verificar documentação PunchPay.
- [ ] Desenvolver integração oficial.
- [ ] Configurar chaves com segurança.
- [ ] Implementar webhooks.
- [ ] Testar pagamentos.
- [ ] Testar cancelamentos.

## Etapa 8 — Armazenamento e PWA

- [ ] Preparar Cloudflare R2.
- [ ] Aplicar limite preventivo.
- [ ] Testar uploads.
- [ ] Testar reprodução autorizada.
- [ ] Revisar backups.
- [ ] Finalizar aplicativo PWA.

## Etapa 9 — Testes finais

- [ ] Testar autenticação.
- [ ] Testar aprovação.
- [ ] Testar acesso Premium.
- [ ] Testar recuperação de senha.
- [ ] Testar usuários comuns.
- [ ] Testar ADM.
- [ ] Testar players.
- [ ] Testar pedidos.
- [ ] Testar notificações.
- [ ] Testar automação.
- [ ] Testar pagamentos.
- [ ] Testar segurança.
- [ ] Testar celulares e computadores.
- [ ] Validar a restauração do backup.

## Etapa 10 — Limpeza e lançamento

Após todos os testes e conferências:

- [ ] Executar simulação da exclusão das contas de teste.
- [ ] Conferir a lista exata de contas e registros afetados.
- [ ] Executar a limpeza aprovada.
- [ ] Preservar catálogo, arquivos e funcionalidades definidos.
- [ ] Garantir a criação segura da conta proprietária.
- [ ] Ativar confirmação obrigatória de e-mail.
- [ ] Ativar aprovação administrativa.
- [ ] Publicar a nova versão.
- [ ] Testar o site publicado.
- [ ] Desativar manutenção.
- [ ] Notificar usuários inscritos que a LX Plus voltou.
- [ ] Monitorar erros durante 48 horas.
- [ ] Manter plano de retorno à versão anterior.

---

# 27. CRITÉRIOS PARA CONSIDERAR A MANUTENÇÃO CONCLUÍDA

O projeto somente será considerado concluído quando:

1. A interface funcionar corretamente em celular e computador.
2. Não existirem erros críticos conhecidos.
3. O login funcionar.
4. A confirmação de e-mail funcionar.
5. A aprovação administrativa funcionar.
6. O proprietário conseguir entrar no ADM.
7. O player de vídeo reproduzir mídias autorizadas corretamente.
8. O player musical funcionar sem falhas críticas.
9. Os livros abrirem normalmente.
10. O catálogo automático funcionar dentro dos limites permitidos.
11. O sistema de pedidos funcionar.
12. A comunidade funcionar.
13. O painel ADM apresentar dados reais.
14. A integração PunchPay passar pelos testes oficiais.
15. O Premium ser liberado somente após confirmação do pagamento.
16. O sistema R2 funcionar, caso a conta esteja configurada.
17. O site estar protegido contra acessos indevidos.
18. O sistema possuir backup verificável.
19. O ambiente de staging passar nos testes.
20. A produção ser monitorada após o lançamento.

---

# 28. ENTREGA OBRIGATÓRIA DO WORK

Ao finalizar cada etapa, entregar um relatório com:

**1. Alterações realizadas**

Descrever o que foi implementado de verdade.

**2. Arquivos modificados**

Informar os caminhos dos arquivos.

**3. Banco de dados**

Informar migrations, tabelas e políticas alteradas.

**4. Testes executados**

Apresentar resultados verificáveis.

**5. Problemas encontrados**

Listar bugs e limitações.

**6. Pendências**

Indicar o que ainda depende de credenciais, aprovação ou infraestrutura.

**7. Publicação**

Informar se as alterações estão somente no staging ou se chegaram à produção.

**8. Segurança**

Registrar os controles verificados.

**9. Backups**

Informar localização, data e resultado da verificação de integridade.

**10. Próxima etapa**

Explicar o que será feito em seguida.

**Não considerar uma funcionalidade implementada apenas porque seu código foi escrito. Ela precisa ser testada e funcionar.**

---

# 29. REGRAS FINAIS E AUTORIZAÇÃO DO PROPRIETÁRIO

Eu, Sérgio LX, autorizo a modernização completa da LX Plus conforme este documento, inclusive a reorganização do código e a remoção de dados confirmados como dados de teste, respeitando as etapas de backup, validação e segurança.

Minha prioridade é transformar a LX Plus em uma plataforma moderna, bonita, estável e funcional.

Quero manter o trabalho que já foi criado e melhorá-lo profundamente.

Autorizo:

- Modernização visual.
- Reorganização de menus.
- Correção de bugs.
- Refatoração de código.
- Reconstrução de módulos.
- Implantação de automações.
- Preparação da integração PunchPay.
- Preparação da integração Cloudflare R2.
- Melhorias de segurança.
- Modernização do sistema Premium.
- Limpeza controlada das contas de teste.
- Preparação do novo sistema de cadastro.
- Atualização da comunidade.
- Modernização dos players.
- Atualização da biblioteca musical.
- Otimizações de desempenho.

Não autorizo assumir que credenciais inexistentes estão disponíveis, criar despesas não aprovadas ou publicar funções sem testes.

A limpeza definitiva dos dados deverá ocorrer apenas após a criação e verificação dos backups e a validação dos registros afetados.

**OBJETIVO FINAL:**

Entregar uma LX Plus renovada, com identidade própria, recursos modernos, catálogo organizado, música estável, comunidade funcional, painel administrativo completo, automações confiáveis, pagamentos seguros e uma experiência de alta qualidade para todos os usuários.

**LX PLUS — SEU PRÓXIMO PLAY, AINDA MELHOR.**
