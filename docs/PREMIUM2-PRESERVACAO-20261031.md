# LX Plus — matriz de preservação · 31/10/2026

> Registro histórico da versão candidata. O estado posterior de revisão, servidor e publicação está em [PUBLICACAO-PREMIUM2-20261031.md](PUBLICACAO-PREMIUM2-20261031.md).
Comparação entre `lxplus-v40-completa` (`e6109c6`) e a `main` (`9b92cf9`), seguida do candidato `rebuild/lxplus-premium2-20261031`. A versão de referência utiliza bundles e extensões globais; a atual utiliza módulos. A diferença compreende 537 arquivos, incluindo arquivos duplicados e saídas antigas. Copiar todos esses scripts para a nova interface não comprovaria recuperação funcional.

As cinco classes solicitadas são **preservada**, **parcial**, **regressão**, **reconstruir** e **nova**. O estado abaixo se refere ao código e à evidência indicada. A aprovação em QA local não certifica um recurso no serviço publicado. Os relatórios de 30/10 são evidência histórica e estão identificados dessa forma.

| Funcionalidade | Classe observada na main | Resultado do candidato | Evidência / pendência |
| --- | --- | --- | --- |
| Contas, perfis e credenciais existentes | Preservada | Nenhuma alteração de dados | 8 contas e 8 perfis; nenhuma operação de escrita de conta nesta rodada |
| Confirmação, login, recuperação e aprovação | Parcial | Fluxos existentes mantidos | Configuração HTTP confere confirmação obrigatória; e-mails e login real não repetidos nesta rodada |
| Sessão persistente e recuperação de inicialização | Preservada | Chaves e fluxo existentes mantidos | Testes de código; sessão real validada historicamente em 30/10 |
| Identidade LX e carinha 3D | Preservada | Marca mantida | Assets e telas atuais inspecionados |
| Capas, carrosséis e navegação inferior | Preservada | Compatíveis com controles novos | QA desktop e viewport 390 × 844 |
| Modo leve e preferências de capa | Preservada | Modo leve mantido | Teste visual/local e persistência no aparelho |
| Aparência sincronizada na conta | Regressão | Recuperação preparada | Escritas serializadas e separadas por usuário; dois aparelhos reais pendentes |
| Assistir e fontes diretas/embeds | Parcial | Resolução existente preservada | MP4 real local aprovado; catálogo autenticado e permissões externas pendentes |
| Retomada de vídeo | Parcial | Salva pausas e buscas para trás; confere episódio | Testes de posição e mídia local; sincronização entre aparelhos pendente |
| Avanço automático de episódio | Parcial | Contagem de 8 s, reproduzir agora e cancelar | Testes de temporizador e vídeo real local |
| Volume e velocidade salvos | Regressão | Recuperação preparada | Aplicação no vídeo/áudio e persistência pela conta; QA local aprovado |
| Legendas e sincronização | Parcial | Idioma, tamanho e deslocamento de VTT | Implementado; fonte real de legenda e iOS ainda precisam de teste |
| Qualidades HLS/DASH disponíveis | Preservada | Bibliotecas e seleção preservadas; encerramento melhorado | Testes reais de 30/10 são históricos; MP4 e cancelamento repetidos nesta rodada |
| Picture-in-Picture e transmissão para TV | Parcial | Botão PiP e detecção de recursos mantida/ampliada | Exige navegador/TV compatível e homologação física |
| LX Party / assistir junto | Reconstruir | Não implementado nesta rodada | Código legado localizado; sincronização autorizada e teste entre contas pendentes |
| MP3 e player persistente | Preservada | Continuidade mantida e recuperação manual da fonte | Áudio sintético real continuou ao trocar de página; 58 áudios de produção preservados |
| Fila, anterior, próximo e repetição | Preservada | Mantidos com limpeza de recursos | Testes de fila e comportamento de mídia |
| Playlists próprias e visibilidade | Parcial | Recursos existentes mantidos | CRUD no código; compartilhamento/edição completa e contas reais pendentes |
| Álbum completo por artista | Parcial | Agrupamento existente mantido | Atualmente considera a seleção carregada; álbum maior que a página exige recuperação adicional |
| Letras autorizadas | Parcial | Fluxo existente mantido | Depende de letra autorizada cadastrada |
| LX Mix e LX Flow | Nova | Seleções de faixas publicadas e continuidade por afinidade | Testes de seleção; Flow pode encerrar quando não há novas faixas elegíveis |
| Estatísticas e retrospectiva musical | Regressão | Interface mensal recuperada usando RPC existente | Minutos, faixas, artistas, dias e tops; frontend local aprovado; dado real por sessão pendente |
| Atividade musical Todos/Amigos/Ninguém | Preservada | Preferências existentes mantidas | RLS e fontes preservadas; visibilidade entre contas não repetida nesta rodada |
| Mensagens, anexos, respostas e reações | Parcial | Módulo existente mantido | Novo trabalho não removeu recursos; entrega/recebimento entre contas reais pendentes |
| Edição, exclusão e mensagens fixadas | Parcial | RPCs e interface existentes preservados | Verificação de autoria e moderação completa pendente |
| Amizades, perfis e presença | Preservada | Dados existentes mantidos | 5 relações de amizade preservadas; código de diretório respeita permissões |
| Grupos e publicações | Parcial | Código atual mantido | Homologação de criação, moderação e comunicação real pendente |
| Chamadas, tela e reconexão | Parcial | Código atual mantido | Sem TURN configurado/validado; não aprovado entre aparelhos/redes |
| Voz em grupo / LX Rooms | Reconstruir | Não implementado nesta rodada | Backend legado localizado; interface e chamadas em grupo pendentes |
| Biblioteca publicada de livros | Preservada | 220 registros publicados mantidos | Contagem no banco; fontes individuais não revalidadas em lote |
| Leitor interno PDF e EPUB | Parcial | Novo leitor real; substitui iframe PDF simples | PDF de duas páginas e EPUB real aprovados no navegador local |
| Marcadores, anotações e retomada de livro | Reconstruir | Implementados no candidato | Testes reais locais de leitura e notas; escrita na conta usa RPC existente; sincronização física pendente |
| Fonte, espaçamento e temas de leitura | Reconstruir | Claro, escuro, sépia e ajustes | EPUB e zoom PDF; não há promessa de reflow de PDF ou OCR |
| Busca dentro dos livros | Nova | Pesquisa textual em PDF/EPUB | PDF digitalizado sem texto exige OCR externo, não implementado |
| Metas e estantes personalizadas | Nova | Não implementado nesta rodada | Planejamento e modelo de interação pendentes |
| LX IA | Regressão | Interface e servidor candidatos recuperados com controle de acesso | Endpoint anterior ainda implantado; quota/consentimento e resposta online testados por mocks, não com provedor real |
| Busca global por metadados | Parcial | Título, artista, álbum, autor e gênero | Busca local no navegador e sanitização de filtro aprovadas |
| Busca de pessoas e comunidades | Parcial | Diretório autorizado e grupos do solicitante | Não expõe usuários/grupos fora dos retornos permitidos; teste entre contas pendente |
| Sugestões e histórico de busca | Nova | Histórico privado e sugestões aproximadas | Sugestões consideram amostra limitada de até 60 registros; não é índice fuzzy do catálogo completo |
| Ctrl+K e busca mobile | Preservada | Mantidos | Input acessível no mobile e atalho existente |
| Ranking e Hall | Parcial | Interface e dados existentes mantidos | Pontuação auditável, defesa completa contra fraude e gestão de prêmios pendentes |
| Múltiplos perfis por conta | Nova | Base existente mantida, fluxo não alterado | Não habilitado sem teste completo |
| Importação Drive, revisão e deduplicação | Parcial | Código e barreiras existentes mantidos | 10 verificações HTTP passaram; Drive/TMDB sem chaves e sem pasta autorizada |
| Importação de Drive privado por OAuth | Nova | Não implementado nesta rodada | Requer configuração e validação específica |
| Arquivamento e restauração | Preservada | Nenhum conteúdo restaurado nesta rodada | Arquivos, registros e histórico preservados |
| ADM Studio e permissões | Parcial | Correção crítica preparada para papéis | Administração não passou por E2E autenticado nesta rodada |
| Central de notificações | Preservada | Módulo existente mantido | Assinaturas reais, preferências de entrega e teste entre contas pendentes |
| Web Push e Service Worker | Regressão | Não recuperados nesta rodada | O shell atual remove workers antigos; nova estratégia de cache/consentimento necessária |
| Manifesto e ícones PWA | Preservada | Assets existentes mantidos | Instalação e push em Android/iOS reais ainda não homologados |
| Otimização, paginação e modo leve | Parcial | Mantidos; buscas e carregamentos novos limitados | Não houve benchmark de milhares de sessões ou teste de carga |

Os itens não implementados permanecem visíveis nesta matriz; não foram substituídos por botões de demonstração ou conteúdo fictício em produção. As fixtures de QA são excluídas do pacote público.
