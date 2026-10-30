# LX Plus Premium

Plataforma da LX Group com frontend modular estático e Supabase para autenticação, dados, arquivos, presença e comunicação. A atualização de 30/10/2026 substitui a interface anterior e preserva as contas existentes.

## Executar e publicar

Requer Node.js 22 ou superior. Não há instalação de dependências de desenvolvimento.

```sh
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

Os 223 filmes e 1.846 registros musicais anteriores foram arquivados e retirados do catálogo público de forma reversível. Séries, livros, outros conteúdos, contas, senhas e dados pessoais foram preservados. O backup privado está separado do código e não deve ser enviado ao GitHub.

## Estado da entrega

Leia [o relatório de implementação e validação](docs/RELEASE-20261030.md). Há funcionalidades implementadas que ainda exigem homologação com contas e dispositivos reais. Chamadas em grupo, servidor TURN, integração OAuth do Drive, painel completo de prêmios, métricas de infraestrutura e testes em Android/iOS reais continuam pendentes. Esta entrega não declara a conclusão integral desses recursos.

Os modelos de e-mail anteriores continuam em `email/lxgroup/`. SMTP e entrega de e-mail dependem da configuração do provedor; nenhuma credencial foi alterada.
