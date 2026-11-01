# LX Plus Premium

Plataforma da LX Group com frontend modular estático e Supabase para autenticação, dados, arquivos, presença e comunicação. A atualização de 30/10/2026 substitui a interface anterior e preserva as contas existentes.

## Premium 2.0 · revisão e publicação de 31/10/2026

A revisão do PR 29 recupera controles de reprodução, preferências por conta, leitura PDF/EPUB, busca por metadados, Mix/Flow, retrospectiva e LX IA. A correção de papéis administrativos já foi aplicada; a quota e o handler seguro da LX IA também foram implantados. A revisão adicional corrige respostas musicais fora de ordem, estado de preferências e módulos que terminam após tempo limite.

Consulte [o registro de publicação](docs/PUBLICACAO-PREMIUM2-20261031.md) para validação, mudanças no servidor e limitações. O escopo completo ainda inclui pendências como LX Party, Rooms, TURN, push e homologação em aparelhos reais; a existência do PR não significava que esses itens estavam prontos.

## Reforma de interface · 01/11/2026

Player próprio com equalização para fontes compatíveis, cores por conta, Social renovado com presença, selos e avatares corrigidos, gestão de equipe e moderação vinculada a denúncias. Veja [a entrega e os limites de validação](docs/REFORMA-20261101.md).

## Executar e publicar

Requer Node.js 22 ou superior. Instale as dependências de teste fixadas no lockfile com `npm ci --ignore-scripts`. Elas não são incluídas no site.

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run dev -- --port 3000
```

O GitHub Actions executa os testes, prepara `dist/` e publica somente esse diretório no GitHub Pages. O domínio existente em `CNAME` foi preservado. Não publicar a raiz do repositório: ela contém documentação, scripts operacionais e testes que não pertencem ao site.

O build aplica a mesma versão de cache aos módulos locais e às rotas carregadas sob demanda. As bibliotecas Supabase, HLS e DASH estão fixadas em versões locais, com suas licenças em `assets/`. Nenhum segredo de servidor pertence ao frontend.

## Organização

- `src/app.js`: autenticação, navegação, sessão e reprodução persistente.
- `src/modules/`: catálogo, música, comunidade, perfil, notificações, listas, ranking e administração.
- `src/services.js`: paginação, arquivos, playlists, telemetria e operações de conteúdo.
- `src/universal-player.js`, `src/music-dock.js`, `src/calls.js`: reprodução e chamadas individuais.
- `supabase/functions/lx-drive-studio/`: importação de pastas compartilhadas, retomada e revisão.
- `supabase/migrations/`: incrementos aplicados nesta atualização; dependem do banco LX Plus já existente.
- `ops/`: referência de backup, arquivamento reversível e restauração do catálogo.
- `tests/`: testes comportamentais, verificações RLS com rollback e ambiente local com dados fictícios.

O caminho local `/qa/` usa exclusivamente dados fictícios e não se conecta ao Supabase. Os arquivos de QA não entram em `dist/` e esse caminho não existe na publicação.

## Dados e integrações

O projeto utiliza a chave pública publishable do Supabase. Permissões administrativas são verificadas no banco. As chaves do Google Drive e TMDB devem ser configuradas no ADM Studio; ficam no servidor. A importação real está pendente dessa configuração e de teste com uma pasta autorizada. Pastas privadas com OAuth ainda não estão implementadas.

Os 223 filmes e 1.788 registros musicais continuam arquivados. Os 58 arquivos musicais próprios, verificados e restaurados em 30/10, continuam publicados. Séries, livros, outros conteúdos, contas, senhas e dados pessoais foram preservados. O backup privado está separado do código e não deve ser enviado ao GitHub.

## Estado da entrega

Leia [o relatório de implementação](docs/RELEASE-20261030.md) e a [validação adicional](docs/VALIDATION-20261030.md), com 37 testes de código, 10 verificações HTTP e reprodução local com MP4/HLS/DASH reais. Há funcionalidades implementadas que ainda exigem homologação com contas e dispositivos reais. Chamadas em grupo, servidor TURN, integração OAuth do Drive, painel completo de prêmios, métricas de infraestrutura e testes em Android/iOS reais continuam pendentes. Esta entrega não declara a conclusão integral desses recursos.

Os modelos de e-mail anteriores continuam em `email/lxgroup/`. SMTP e entrega de e-mail dependem da configuração do provedor; nenhuma credencial foi alterada.
