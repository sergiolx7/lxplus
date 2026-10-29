# LX Plus Premium — atualização visual em revisão

**Estado:** primeira entrega na branch de desenvolvimento, sem publicação em `main`. O login do site atual permanece intacto.

## Implementado nesta entrega
- Início cinematográfico com imagem de destaque, botão de detalhes, atalhos de categorias e seções horizontais.
- Fileiras para novidades, continuar assistindo, Minha Lista, filmes, séries/doramas, LX Music e LX Books — todas usam o catálogo existente; imagens carregam sob demanda.
- Listagens em grade e filtros compatíveis com telas pequenas, além de indicação clara de carregamento e falha.
- Menu **Mais seções** em celular e tablet para alcançar Livros, Comunidade, Ranking, Avisos e Administração. Antes algumas dessas páginas não tinham acesso pelo rodapé móvel.
- ADM Studio com estatísticas de catálogo, prévia de posters (9:16) e banners (16:7), incluindo a visualização da pasta simulada do Drive.
- LX Social: busca **apenas nos perfis públicos previamente disponíveis**, visual de comunidade, botão para copiar o @ quando existente. Sem simular mensagens/chamadas como operacionais.
- Cor de identidade, cartões, contraste, estados de foco, acessibilidade e CSS responsivo; sem introduzir bibliotecas de front-end pesadas.
- Testes estáticos e unitários para HTML escapado, visualização responsiva, estados do catálogo e preservação da autenticação.

## Pendências para próximas entregas (não declarar como prontas)
- Feed e posts reais, mensagens, amizade, identificador universal pesquisável e chamadas com consentimento.
- Monitoramento de erros e usuários ativos com permissões adequadas e painel de métricas de produção.
- Gerenciamento integral de capas/banners com salvamento e histórico de versões no Supabase.
- Sincronização recorrente do Google Drive, confirmação do vínculo TMDB e respeito aos direitos de distribuição.
- Testes manuais em navegadores e dispositivos reais, vídeo/áudio e permissão do ADM.
- Revisão do fluxo de perfil antes de permitir alterações de outros usuários.

## Critérios antes da publicação
1. CI verde no GitHub.
2. Login de conta existente funcionando no ambiente de teste.
3. Telas de catálogo e ADM revisadas em 360px, 768px e desktop.
4. Dados, perfil e listas preservados; sem alteração destrutiva no banco.
5. Validação do proprietário para atualizar a página principal e plano de reversão imediato.

Não há promessa de zero bugs. A publicação permanece isolada até estes critérios.
