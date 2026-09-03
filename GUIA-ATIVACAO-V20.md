# GUIA DE ATIVAÇÃO — LX Plus v20

Este guia foi escrito para fazer a configuração sem precisar entender programação.

## PARTE 1 — Criar a nuvem

1. Entre no Supabase e crie uma conta.
2. Crie um novo projeto.
3. Guarde a senha do banco em local seguro. Ela não vai para o GitHub.
4. Espere o projeto terminar de ser criado.

## PARTE 2 — Criar as tabelas e permissões

1. No projeto Supabase, abra o **SQL Editor**.
2. Abra neste pacote o arquivo `supabase/setup.sql`.
3. Copie todo o conteúdo.
4. Cole no SQL Editor.
5. Execute o SQL inteiro.
6. O script cria as tabelas, funções, RLS, os buckets `lx-assets`/`lx-media` e o Realtime necessário para a LX Plus.

## PARTE 3 — Copiar somente as duas informações públicas

No painel do Supabase, procure as configurações de API/API Keys.

Você precisa de somente duas informações:

- **Project URL** — algo como `https://xxxxxxxx.supabase.co`
- **Publishable Key** — normalmente começa com `sb_publishable_`

Projetos antigos podem mostrar uma chave `anon`. A v20 aceita os dois formatos.

Não copie Secret Key nem Service Role Key.

## PARTE 4 — Colocar no arquivo da LX Plus

Abra `js/config.js`.

Você encontrará:

```js
supabase:{
  url:'',
  publishableKey:'',
  anonKey:'',
  mediaBucket:'lx-media',
  assetBucket:'lx-assets'
}
```

Coloque a Project URL entre as aspas de `url` e a Publishable Key entre as aspas de `publishableKey`.

Exemplo apenas de formato:

```js
url:'https://SEU-PROJETO.supabase.co',
publishableKey:'sb_publishable_SUA_CHAVE_AQUI',
```

Salve o arquivo.

## PARTE 5 — Configurar os links de autenticação

No Supabase Auth, abra a configuração de URLs.

Use como **Site URL**:

`https://xn--rifamilionria-deb.api.br/`

Adicione como Redirect URL:

`https://xn--rifamilionria-deb.api.br/**`

Se for testar no seu PC, você também pode adicionar:

`http://localhost:8000/**`

Isso é necessário para confirmação de e-mail e recuperação de senha voltarem corretamente para a LX Plus.

## PARTE 6 — Criar sua conta de dono

1. Abra a LX Plus.
2. Clique em **Criar conta**.
3. Use um e-mail real ao qual você tenha acesso.
4. Crie uma senha forte.
5. Se a confirmação de e-mail estiver ativada no Supabase, abra o e-mail e confirme.
6. Entre normalmente na LX Plus.

Nesse momento a conta ainda é uma conta comum. Isso é proposital.

## PARTE 7 — Tornar sua conta ADM

1. Abra `supabase/ADMIN_SETUP.sql`.
2. Troque `SEU_EMAIL_AQUI` pelo e-mail que você acabou de cadastrar.
3. Copie o SQL.
4. Cole no SQL Editor do Supabase.
5. Execute.
6. Saia da LX Plus e entre novamente.

Agora o banco reconhecerá essa conta como Administrador.

## PARTE 8 — Migrar o que já estava na v19

Faça isso no mesmo navegador/computador onde você usava a v19, se tiver conteúdo local que deseja preservar.

1. Entre no ADM.
2. Abra **Produção & Nuvem**.
3. Confira se aparece Supabase configurado + ADM autorizado.
4. Clique em **Enviar catálogo atual para a nuvem**.
5. Espere terminar. Arquivos locais grandes podem demorar.

Quando concluir, o catálogo passa a ser visto pelos outros aparelhos através do banco e do storage.

## PARTE 9 — Publicar a v20 no GitHub

Substitua os arquivos antigos do repositório pelos arquivos desta v20, mantendo o `CNAME`.

Depois do commit na branch `main`, o GitHub Pages fará um novo deploy.

## TESTE FINAL

Faça estes testes:

1. Crie uma segunda conta em outro navegador/celular.
2. No ADM, adicione um conteúdo simples e publique.
3. Veja se o conteúdo aparece na segunda conta.
4. Na segunda conta, adicione à Minha Lista.
5. Saia e entre em outro aparelho com a mesma conta e confirme se a lista aparece.
6. No ADM, publique uma notificação e confirme se chega para o usuário.
7. Ative Premium manualmente para a segunda conta e confirme se o badge muda.
8. Teste recuperação de senha.

## IMPORTANTE

A v20 deixa as funções centrais multiusuário. Dois itens continuam sendo integrações separadas:

- cobrança automática de Premium: precisa de um provedor de pagamentos + webhook;
- streaming em grande escala: para catálogo pesado, o ideal é CDN/HLS em vez de depender somente de arquivo direto.
