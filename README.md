# LX Plus v25.7 — Retry Safe Auth

- Cadastro não fica mais bloqueado depois de e-mail/senha incorretos.
- Um único envio de cadastro pode ficar em andamento por vez, evitando disparos duplicados.
- Após cadastro pendente, há botão “Corrigir dados e tentar novamente”.
- Erro 429 não trava o formulário; a pessoa pode corrigir os campos.
- ADM ganhou “Excluir pendente” para remover contas com e-mail digitado errado.
- Contas aprovadas e ADM não podem ser excluídas por essa função.

# LX Plus v25.6 — Atomic Cloud Sync

- Catálogo agora usa operações atômicas por item no Supabase.
- Exclusão cria tombstone no banco: cache/navegador antigo não consegue ressuscitar conteúdo apagado.
- Realtime + atualização automática a cada 12 segundos + sincronização ao voltar para a aba.
- Formulário rápido: título, descrição e envio do arquivo; campos avançados ficam recolhidos.
- Capa/banner podem ser gerados automaticamente quando não enviados.
- Qualidade padrão do player fica em Automático; HLS adaptativo real permanece opcional em Mais opções.
- Conteúdo só aparece para usuários quando está publicado e a mídia mínima necessária existe.

# LX Plus v25.5 — Approval + Global Sync

Esta versão torna o Supabase a fonte de verdade do catálogo e adiciona aprovação de contas pelo ADM.

- Cadastro pode ser liberado por confirmação de e-mail ou aprovação manual do ADM.
- Mensagem de espera: até 24 horas.
- ADM pode Aprovar, Reaprovar ou Recusar em Comunidade & Aprovações.
- Aprovação manual confirma a conta no Auth sem expor chaves administrativas no frontend.
- Catálogo e mídia privada ficam disponíveis apenas para contas aprovadas.
- Adicionar, editar, publicar, priorizar e excluir conteúdo agora aguardam confirmação da nuvem antes de atualizar a interface.
- Realtime mantém outros navegadores/dispositivos sincronizados.
- Credencial ADM de demonstração removida da build de produção.

Versão limpa para operação oficial: sem catálogo de demonstração, sem usuários/notificações fictícias e sem posters de exemplo no splash. A estrutura, Supabase, ADM, conta verificada e recursos permanecem intactos. O ADM ganhou campos vazios para Sobre, Termos de Uso, Política de Privacidade e e-mail de suporte.

# LX Plus v25.3 — Auth Rate Limit Fix

- Exibe a versão na tela de autenticação para confirmar o deploy.
- Força HTTPS nos redirects de produção.
- Trata erro 429 do Supabase explicitamente.
- Cache-busting em CSS/JS e Service Worker v25.3.
- Não afirma que a conta foi criada quando o limite de e-mail bloqueia o signup.

# LX Plus v25.2 — Auth UX Fix

Melhora mensagens de cadastro/login, detecta conta não confirmada e rate limit, evita cliques repetidos e direciona o usuário para reenviar confirmação.

# LX Plus v25.1 — Auth Redirect Fix

Correção do fluxo de confirmação e recuperação do Supabase: redirects usam o domínio oficial configurado, link expirado é tratado dentro da interface e há botão para reenviar confirmação.

# LX Plus v25 — Launch Complete

A v25 fecha a lista de melhorias de lançamento: progresso no segundo exato, perfis editáveis, bio, formatos de avatar, molduras Premium, recomendações contextuais, mini player, WebVTT, HLS adaptativo real quando um manifesto é informado, dashboard avançado, agendamento, prioridade, prévia de rascunhos, pedidos convertidos em conteúdo e identidade visual global pelo ADM.

## O que é realmente adaptativo

O player usa **HLS.js**. Se o ADM informar um `master.m3u8`, a opção **Auto** deixa o HLS escolher a qualidade conforme rede/tela. Se houver apenas MP4s em resoluções diferentes, o player oferece troca manual entre as variantes cadastradas. A v25 não finge transcodificação: gerar o HLS continua sendo responsabilidade do pipeline/CDN de mídia.

# LX Plus v24 — Full Experience

Atualização ampla de experiência: painel do usuário modernizado, resumo de conta e sincronização, Home com faixa de experiência, player refinado com volume persistente e modo cinema, e painel ADM com Central de Lançamento e indicadores de prontidão.

# LX Plus v23 — Verified Dynamic

Atualização com selo verificado redesenhado em estilo inspirado nas plataformas sociais: mais visível, brilhando e acompanhando automaticamente a cor escolhida no tema.

# LX Plus v22 — DM Professional

Atualização DM com splash mais profissional, movimento visual refinado, menos exposição de nomes nas artes de fundo, identidade de perfil modernizada e ajustes de apresentação para lançamento.

# LX Plus v21 — Launch Update

Atualização com melhorias de lançamento: acesso ADM exclusivo no topo, retorno do painel ADM para a plataforma, galeria interna de fotos/avatares para perfil, ajustes visuais no logo LX Plus para evitar corte do X e refinamentos de interface.

# LX Plus v20 — Cloud Sync

A v20 transforma a LX Plus em uma base online multiusuário. O GitHub Pages continua servindo a interface, enquanto o Supabase passa a centralizar autenticação, catálogo, progresso, pedidos, assinaturas administrativas, notificações, analytics e storage.

## O que passa a funcionar entre todos os dispositivos

- Cadastro e login reais por e-mail/senha com Supabase Auth.
- Sessão persistente e recuperação de senha.
- Perfis e privacidade do Ranking LX.
- Minha Lista, histórico, avaliações, preferências, aparência, Modo App e avatar sincronizados.
- Catálogo único para todos os usuários.
- Conteúdo criado/editado/excluído no ADM refletido globalmente.
- Capas/banners/avatares em `lx-assets` e mídia privada em `lx-media` com URL assinada temporária.
- Upload em lote de episódios e faixas.
- Pedidos/problemas com votos centralizados.
- Notificações publicadas pelo ADM.
- Premium manual pelo ADM sincronizado em todos os dispositivos.
- Analytics centralizado para o administrador.
- RLS: permissões de ADM ficam no banco, não no JavaScript público.
- Realtime para catálogo, notificações, assinatura e estado do usuário.

## Migração automática da v19

A v20 mantém o prefixo de armazenamento local da v19 e o IndexedDB legado `LXPlus16Media`.

Na primeira entrada de uma conta cloud sem estado remoto, a v20 tenta importar automaticamente:

- histórico;
- Minha Lista;
- avaliações;
- preferências;
- tema/cor/Modo App;
- avatar/logo do perfil.

No ADM > Produção & Nuvem, o botão **Enviar catálogo atual para a nuvem** também tenta migrar capas em data URI e arquivos locais de filmes/episódios/faixas para o Supabase Storage antes de publicar o catálogo.

## O que você precisa configurar uma única vez

Abra `GUIA-ATIVACAO-V20.md` e siga o passo a passo. Resumo:

1. Criar um projeto Supabase.
2. Executar `supabase/setup.sql` no SQL Editor.
3. Copiar a Project URL e a **Publishable Key** para `js/config.js`.
4. Configurar a URL oficial da LX Plus no Supabase Auth.
5. Criar sua conta normalmente pelo site.
6. Tornar essa conta administradora executando `supabase/ADMIN_SETUP.sql` com seu e-mail.
7. Entrar de novo e usar ADM > Produção & Nuvem > Enviar catálogo atual para a nuvem.
8. Subir os arquivos da v20 no repositório GitHub Pages.

## Domínio já preparado

O arquivo `CNAME` está configurado para:

`xn--rifamilionria-deb.api.br`

que corresponde ao domínio internacionalizado da LX Plus configurado no GitHub Pages.

## Chaves do Supabase

No navegador use somente:

- Project URL;
- Publishable Key (`sb_publishable_...`), ou a `anon` key legada quando necessário.

**Nunca coloque Secret Key / Service Role Key no GitHub, HTML ou JavaScript.**

## ADM da v20

A senha fixa `admin@lxplus.com.br / Admin@1234` não é usada no modo cloud de produção. Isso foi removido para evitar que qualquer pessoa que veja o JavaScript consiga entrar no ADM.

Na v20, você cria uma conta normal e autoriza essa conta como ADM no banco usando o SQL de configuração.

## Premium

O ADM pode ativar/desativar Premium manualmente e isso já fica global no banco. Isso serve para cortesia, teste ou administração.

Cobrança automática ainda exige um provedor de pagamento com checkout + webhook seguro. A v20 não finge que uma cobrança aconteceu apenas pelo JavaScript do navegador.

## Mídia e escala

Vídeo/áudio direto pelo bucket privado `lx-media` funciona para a base do produto e testes dentro dos limites do plano usado. O player recebe URLs assinadas temporárias. Para catálogo grande e streaming em escala, a arquitetura recomendada continua sendo object storage/CDN + transcodificação HLS.

Publique apenas conteúdo que você tenha direito/licença para distribuir.

## Teste local

Na pasta do projeto:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`.

Para testar confirmação/recuperação de senha localmente, adicione também a URL local permitida no Supabase Auth.
