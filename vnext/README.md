# LX Plus Next — reconstrução do zero

## Situação
Este é um **novo aplicativo web em uma árvore isolada**, com módulos próprios, sem importar os bundles de produção. Este código **ainda não foi publicado** e **não é uma versão pronta para lançamento**.

## Recursos implementados na primeira base
- Layout responsivo com identidade LX Plus / LX Group, categorias, capas e busca.
- Supabase Auth: entrar, criar conta, confirmar e-mail, solicitar recuperação de senha e manter sessão usando a chave de armazenamento de sessão padrão do projeto original.
- Aprovação de contas e verificação de administrador pelo Supabase.
- Catálogo publicado paginado, descoberta por pesquisa limitada, categorias filmes/séries/músicas/livros, ficha do conteúdo e indicação de indisponibilidade sem inventar reprodução.
- Minha Lista sincronizada com `lx_user_state`, sem apagar as outras propriedades JSON; progresso básico de reprodução.
- Perfil, avisos e visibilidade básica de membros da comunidade.
- Botões administrativos de exclusão **deliberadamente ausentes** até revisão de segurança.

## Integração de dados
Projeto Supabase: `ubidogquzpdvrbzbhxda`. O frontend contém apenas a Publishable Key pública; não possui senha, token secreto ou credenciais administrativas. O banco de produção NÃO foi modificado durante esta criação.

Inventário de preservação encontrado em 29/10/2026: 7 usuários, 7 perfis, 7 estados pessoais, 2.374 itens do catálogo (nem todos publicados), 68.144 registros de descoberta automática, mensagens, amizades, assinaturas, rankings e informações de escuta.

Não excluir `auth.users`, `lx_profiles`, `lx_user_state`, `lx_subscriptions`, `lx_messages`, `lx_friendships`, `lx_rank_*`, conteúdo de Storage e backups anteriores. A reconstrução pode reaproveitar a autenticação e os dados sem conservar o código legado. Excluir esse conteúdo seria perda de contas e informações pessoais.

## Arquitetura
`index.html` → `assets/styles.css` + `src/app.js` → `src/data.js` → Supabase Auth/PostgREST/Storage.
Sem Service Worker antigo ou múltiplos CSS/JS com overrides. Sem build step ou Node obrigatório para visualização.

## Limitações ainda não aceitas para lançamento
A comunidade completa, sistema de mensagens e chamadas, painel ADM completo, player HLS/DASH/Drive e controle de séries, playlists e letras de músicas não foram reimplementados ou homologados. Testes de login, permissões, persistência entre dispositivos, qualidade de streaming e performance ainda precisam ocorrer. O SMTP autenticado da LX Group ainda depende do domínio e provedor. **Não publicar como substituição do site em produção antes da lista de aceite.**

## Publicação e rollback
A versão `main` e as branches de backup antigas são preservadas. Realizar homologação em URL isolada; depois do aceite, gerar snapshot com restauração comprovada e trocar a versão publicada uma única vez. Reverter ao commit/branch anterior em caso de incidente. O CNAME abaixo foi mantido apenas por compatibilidade; domínio final da LX Plus deve ser confirmado antes do corte.

## E-mails
Os modelos do trabalho anterior são incorporados na pasta `email/lxgroup/`. Os e-mails de autenticação exigem SMTP confiável, e os comunicados exigem controle de consentimento e descadastro.
