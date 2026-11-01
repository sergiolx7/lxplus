# LX Premium Studio e chamada com tela em destaque

A personalização anterior tinha uma capa e linhas finas no perfil. A nova versão acrescenta um Studio visual, coleção própria de expressões e uma chamada em que compartilhar a tela não substitui a câmera.

## Recursos entregues

| Área | Comportamento |
| --- | --- |
| Studio Premium | Aba própria no Perfil, seis combinações visuais e prévia ao vivo antes de salvar |
| Bordas | Iluminação forte nas duas laterais, cores independentes, intensidade, pulso e gradiente |
| Avatar | GIF para Premium, até 10 MB; seis decorações originais: órbita, halo, coroa, asas, elétrico e flores |
| Perfil | Aurora, constelação, meteoros, brasas e prisma; fundo e destaque próprios, quatro estilos de nome e enquadramento da capa |
| Capa | Imagem ou GIF de até 10 MB para Premium; imagem estática para as outras contas |
| Conversas | Quatro temas; emojis e figurinhas próprios, seletor com páginas, envio e renderização nas mensagens |
| Coleção | Até 100 expressões por conta, até 5 MB cada; remoção reversível da coleção |
| Sons | Três sons sintetizados para calls Premium e um favorito configurável; sem URLs de áudio arbitrárias |
| Tela compartilhada | Área principal ampla, câmera e pessoa em uma coluna pequena, volumes separados, modo tela cheia e alternativa que ocupa a janela quando a API nativa não permite |
| Câmera e voz | Câmera usa um emissor de vídeo e tela usa outro. Compartilhar não exige câmera nem desliga a câmera existente. Encerrar libera as capturas |
| Qualidade | 1080p/30 como padrão; Premium pode solicitar 1080p/60, 1440p/60 e 4K/60. A interface mostra as dimensões e FPS realmente obtidos |
| Acessibilidade | Movimento reduzido e modo leve interrompem animações e mostram uma imagem parada de avatar/capa |
| Permissão | Somente o proprietário concede Premium. Estilo, envio de mídia, criação de expressões, uso de tokens e sons têm validação no servidor |

O visual e os efeitos são originais do LX. A referência de benefícios consultada foi a [página oficial do Nitro](https://discord.com/nitro) e a [documentação de perfis](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles). Recursos próprios do serviço Discord, como boosts de servidores Discord, cupons, Orbs, passes Nitro e itens licenciados da loja, não são benefícios que o LX possa conceder. Esta versão não oferece equivalência integral ao serviço Nitro, remoção de fundo da câmera, ícones personalizados do aplicativo ou aumento do limite de anexos de conversa para 1 GB. O limite de anexos existente de 25 MB é preservado. Mensagens de até 4.000 caracteres já existiam e foram preservadas.

## Proteções

- A migração é aditiva. A flag `is_premium` e suas permissões de proprietário permanecem intactas.
- A identidade é salva em uma operação atômica, com valores e cores validados; inserção e atualização do próprio perfil não concedem benefícios sem permissão.
- Coleções só são gravadas pelo endpoint de mídia. O servidor confirma a permissão e o limite no momento da inserção, inclusive se uma revogação ocorrer durante o upload. Clientes comuns não têm INSERT/UPDATE direto na tabela.
- As leituras preservam a visibilidade do diretório; coleções de perfis privados não são expostas por uma lista de IDs. Expressões indisponíveis não se transformam em URLs arbitrárias.
- A validação de GIF limita dimensões, quadros e o orçamento de pixels; imagens e corpos enviados também têm tamanho máximo.
- Tokens de expressões em mensagens e sons de chamada verificam o remetente e seu Premium no servidor. Mensagens comuns e sinais de chamada normais continuam no fluxo existente.
- O compartilhamento continua excluindo áudio geral do PC e descarta áudio sem isolamento verificável. Para som isolado, a pessoa escolhe uma aba.

## Verificação

122 testes de JavaScript/PostgreSQL passaram, incluindo aplicação repetida da migração, permissões, estilos atômicos, expressões, revogação e sons. Análise de sintaxe e build passaram.

No navegador com dados fictícios: presets, prévia, gravação, upload de emoji GIF, seletor e envio na conversa; layout móvel com 373 px úteis sem rolagem horizontal. Câmera sintética e tela sintética reproduziram simultaneamente. Na janela de 1363 × 936 px, a tela ocupou 1143 × 698 px e a coluna das pessoas 220 px de largura. Compartilhamento em chamada só de voz também foi verificado. O navegador não autorizou a API nativa de fullscreen, e o modo que ocupa a janela foi verificado.

A mídia remota não foi homologada em redes diferentes: o ambiente de teste continua sem obter candidatos ICE e as chaves TURN reais continuam pendentes. Ofertas, respostas, estado visual e capturas locais não são apresentados como prova de áudio/vídeo remoto funcionando. Resolução e FPS são solicitações sujeitas ao navegador, dispositivo, fonte e conexão; o teste sintético entregou 640 × 360 / 10 FPS.

## Corte de publicação

Aplicar `20261101183850_lx_premium_studio.sql`, atualizar a função `lx-profile-media` mantendo `verify_jwt=true`, e só então integrar o frontend testado na `main`. A integração usa o GitHub Pages existente. Não atribuir Premium nem enviar convites/mensagens reais durante a implantação. Clientes com a versão antiga aberta devem atualizar a página antes de iniciar uma nova call, pois câmera e tela agora têm transmissores distintos.
