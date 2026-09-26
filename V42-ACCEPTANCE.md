# LX Plus V42 — reconstrução limpa e gate de aprovação

## Regra principal
A V42 não pode carregar nem sobrepor a interface V40/V41. Não usar:
- lxplus.bundle.css
- lxplus.rebuild.css
- lxplus.reference.css
- lxplus.v41.css
- lxplus.reference.js
- lxplus.v41.js

Os motores/dados podem ser reaproveitados apenas por adaptadores isolados, sem injetar DOM ou CSS visual antigo.

## Referências visuais canônicas
As quatro imagens aprovadas pelo proprietário são a especificação visual:
1. Home LX Plus — 1672×941
2. LX Music — 1672×941
3. LX Community — 1672×941
4. LX Admin — 1672×941

## Home — critérios obrigatórios
- Topbar fina: LX Plus, Início, Filmes, Séries, Animes, Dramas, Música + NOVO, Minha Lista.
- Pesquisa no topo à direita, notificação e avatar.
- Rail lateral estreita: Início, Explorar, Em alta, Lançamentos, LX Music, Comunidade.
- Hero 100% na proporção da referência, com título à esquerda e arte à direita.
- Greeting card no canto superior direito do hero.
- Top 10 com números gigantes em outline e posters sobrepostos.
- Continuar assistindo em cards horizontais com progresso.
- Em alta com cards compactos.
- Navegação Filmes/Séries/Animes/Dramas/Música deve sempre funcionar e possuir ação de voltar.

## LX Music — critérios obrigatórios
- Shell próprio; não reaproveitar visual da Home.
- Sidebar: Início, Buscar, Sua Biblioteca, Playlists, Álbuns, Artistas, Curtidas e Recentes.
- Saudação e hero de álbum.
- Player flutuante no canto superior direito.
- Ouvidos recentemente, Feito para você, Descobertas, Álbuns e Mais tocadas.
- Botão voltar sempre funcional.
- Player persistente, segundo plano e mobile preservados.

## LX Community — critérios obrigatórios
- Drawer à direita sobre Home escurecida/desfocada.
- Cabeçalho LX Community + conceito vNext + fechar.
- Busca.
- Tabs Conversas / Pessoas / Grupos / Pedidos.
- Ferramentas: Pesquisar / Salvas / Mídia / Enquete.
- Lista de conversas com avatar, presença, horário e não lidas.
- Dock inferior com conversar / voz / vídeo / mais.
- Chat, reações, pins, enquetes, salvas, mídia, chamadas e grupos continuam conectados ao banco.

## LX Admin — critérios obrigatórios
- Sidebar LX Admin separada.
- Dashboard no mesmo grid da referência.
- 6 KPIs: Usuários, Filmes, Músicas, Lives, Erros, Importações.
- LX Smart Import.
- Ranking da Comunidade + temporada + R$100 + pódio.
- Atividades Recentes.
- Moderação e Auditoria.
- Ações Rápidas.
- Menus: conteúdo, comunidade, ferramentas e gestão.
- Sem banners/paineis V31/V40/V41 aparecendo por cima.

## Entrada / Login
- Refeito no mesmo design system preto + roxo.
- Login, criar conta, recuperar senha e confirmação de e-mail.
- Aprovação de conta continua respeitada.
- ADM só aparece para admin real.
- Nenhuma tela pode sobrepor outra.

## 126 requisitos
A matriz V40-IMPLEMENTATION-MATRIX.md permanece como checklist funcional obrigatória. A V42 muda a interface e integra os recursos existentes sem apagar dados.

## Gate de entrega
1. Produção fica em manutenção.
2. V42 é desenvolvida em branch isolada.
3. Screenshots obrigatórios em Chromium de Home, Music, Community e Admin em 1672×941.
4. Screenshots também em tablet e mobile para regressão.
5. Dono aprova visual.
6. Só depois ocorre merge/deploy.
7. Se a aprovação visual não acontecer, produção continua em manutenção.
