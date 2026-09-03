# LX Plus v19 — Profile Identity & App Mode

A v19 evolui a base da v18 sem remover os formulários específicos por mídia, Premium, personalização ou a arquitetura de produção.

## Recursos herdados da v18
- **Para Você 2.0**: recomendações agora combinam histórico, avaliações, gêneros/tags e preferências escolhidas pelo usuário.
- **Perfil de gosto**: o usuário seleciona gêneros favoritos no Perfil LX.
- **Autoplay configurável**: opção para reproduzir automaticamente o próximo episódio.
- **LX Plus Premium**: nova área visual de assinatura com opções demonstrativas Mensal (R$ 9,90) e Anual (R$ 90).
- **Selo Premium** no perfil e na saudação da home.
- **ADM > Premium**: visão de assinaturas e ativação/desativação em modo local de demonstração.
- **Arquitetura de produção ampliada**: tabelas PostgreSQL para preferências e assinaturas, leitura de assinatura pela API e endpoints de preferências.
- Correção do scaffold do backend para leitura de cookie de sessão com `cookie-parser`.

## Recursos preservados
- Assistir / Ler / Ouvir.
- Filmes, Séries, Animes, Doramas, Livros e Música.
- Busca tolerante a erros por título, elenco, artista, autor, diretor, gênero e tags.
- Player LX, leitor LX e player de música.
- Minha Lista, progresso e avaliações 1–5.
- Ranking com privacidade.
- Pedidos e problemas com agrupamento por votos.
- Biblioteca ADM segmentada por mídia.
- Formulários específicos por tipo de conteúdo.
- Upload em lote de episódios e faixas.
- Controle de qualidade.
- Analytics local.
- PWA e Modo TV demonstrativo.

## Premium no modo local
O botão de plano ativa uma assinatura **somente nesta demonstração local**. Isso existe para testar UX, badges e regras de interface.

Em produção, o frontend **não deve liberar Premium por conta própria**. O fluxo correto é:

`Checkout → provedor de pagamento → webhook no backend → tabela subscriptions → sessão do usuário`

A v19 não inclui nem inventa credenciais de pagamento.

## Backend de produção
O diretório `backend/` contém scaffold Node/Express/PostgreSQL com:
- Argon2 no servidor;
- sessão segura via cookie;
- RBAC para ADM;
- catálogo e estruturas de mídia;
- preferências do usuário;
- assinaturas;
- pedidos e analytics;
- ponto de integração para storage/CDN e HLS.

## Modo local do ADM
- E-mail: `admin@lxplus.com.br`
- Senha: `Admin@1234`

Essas credenciais existem apenas com `production:false`.

## Executar o protótipo
Na pasta do projeto:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`.

## Próximo passo para publicação real
1. Criar o PostgreSQL e aplicar `backend/sql/schema.sql`.
2. Configurar `backend/.env`.
3. Instalar dependências do backend.
4. Conectar storage/CDN e pipeline HLS.
5. Integrar um provedor de pagamento no backend via checkout + webhook.
6. Definir `production:true` em `js/config.js` e apontar `apiBase` para a API.
7. Publicar apenas mídia para a qual a plataforma tenha direitos/licença de distribuição.


## Novidades da v19
- Galeria de logos/avatares no perfil (LX, Plus, Coroa, Play, Música, Livro, Neon e Mono).
- Upload de logo/foto personalizada no perfil em modo local.
- Avatar sincronizado na seleção de perfis, botão da conta e painel de perfil.
- Aparência redesenhada com Tema, Cor, Animações e três modos de interface: Cinema, App e Compacto.
- Modo App também no desktop, com navegação inferior e shell mais próximo de aplicativo.
- Fluxo PWA de instalação via `beforeinstallprompt`, quando suportado pelo navegador.
- Manifest atualizado para experiência standalone e ícone maskable.
- Atalhos no perfil para Premium, Modo App e Central LX.
- Atalhos no dashboard ADM para cadastrar Filme, Série, Anime, Dorama, Livro ou Música com um clique.

### Observação
No protótipo local, a logo/foto personalizada fica em `localStorage`. Em produção, imagens de perfil devem ser enviadas para storage/CDN e referenciadas pelo banco.
