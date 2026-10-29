# LX Plus — teste de aceitação para lançamento único

### Proteção de dados
- [ ] Exportar backup íntegro Auth, perfis, lista, histórico, mídia privada, assinaturas, conversas e preferências; comprovar restauração em ambiente isolado.
- [ ] Revisar RLS e autorização de todas as RPCs expostas; nenhuma service role no cliente.
- [ ] Comparar quantitativos e IDs antes e depois da migração; testar favoritos, assinaturas e direitos do usuário.

### Produto
- [ ] Login/sessão persistente/cadastro/validação/redefinição de senha/aprovação (Gmail e mobile).
- [ ] Catálogo, busca, imagens, detalhes, listas, progresso sem clobber de campos JSON.
- [ ] Vídeo com fontes autorizadas, HLS/MP4, legendas, temporadas/episódios e fallback quando indisponível.
- [ ] Música com MP3/HLS permitido, fila, playlists, segundo plano e troca de faixa estável.
- [ ] Livros com leitor, progresso, fontes licenciadas.
- [ ] Amigos, mensagens, chamadas, notificações, privacidade e ranking.
- [ ] Gestão ADM segura, edições em lote, revisão antes de excluir, rollback e logs.
- [ ] Testar 3 navegadores, Android/iOS e desktop, rede lenta, navegação por teclado e sem tela de carregamento infinito.
- [ ] Política de privacidade/termos e contato válidos.

### E-mails
- [ ] Domínio oficial LX Group verificado no provedor.
- [ ] SPF, DKIM, DMARC e SMTP; autenticação separada de campanhas.
- [ ] Testes de entrega, mensagem de confirmação, recuperação, opt-out e rejeições.

### Lançamento
- [ ] Homologação no endereço de teste, sem afetar o Pages atual.
- [ ] Benchmark de desempenho, rastreio de erros, revisão e aceite da release.
- [ ] Publicar somente a release maior consolidada; manter backup e retorno imediato à versão anterior.

**IMPORTANTE:** os checkboxes acima não estão marcados; o código ainda é um primeiro núcleo, não uma entrega pronta.
