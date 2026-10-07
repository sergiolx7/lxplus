# LX Plus · player próprio e textos completos

Build: `R12.14-V40-NATIVE-20261007`. Branch: `lxplus-v40-completa`.

## Comportamento

O modo padrão usa somente o player LX para vídeo e áudio. Links de YouTube,
Spotify e outros players incorporados não habilitam o botão de reprodução e
não são usados quando uma fonte nativa falha. Arquivos já enviados pelo dono
do site continuam disponíveis. Cada episódio precisa de sua própria fonte.

Livros com `textAsset` abrem no leitor LX. O texto é buscado quando o usuário
abre a obra, conferido por tamanho e SHA-256, e dividido em partes leves. O
leitor mantém navegação, tamanho de letra, tema e progresso. Fechar durante o
carregamento cancela a requisição e impede que o leitor reapareça sozinho.

## Conteúdo desta atualização

| Conteúdo | Quantidade | Origem e acesso |
| --- | ---: | --- |
| MP3 completos | 24 novos | Kevin MacLeod / Incompetech, CC BY 4.0; arquivos hospedados pela LX |
| Livros completos | 20 atualizados | Project Gutenberg; obras originais em domínio público no Brasil; 14 em português e 6 em inglês |
| Longa-metragem | 1 novo | Valkaama, Tim Baumann, 2010, 93 minutos, CC BY-SA 3.0; arquivo remoto reproduzido no player LX |

Valkaama tem imagem de 854 × 480 e áudio AAC. O nome do arquivo de origem
contém “720p”, mas essa indicação não corresponde à resolução real: a LX não
o anuncia como HD. Foi conferida a duração e decodificado o início do filme
por leitura de intervalos de bytes; não foi baixado o longa inteiro.

Os registros anteriores continuam no catálogo. Ter uma capa e sinopse não
significa ter um arquivo reproduzível. Títulos sem fonte autorizada aparecem
como “Em breve”. Esta atualização não copia obras protegidas de fontes
piratas nem atribui à LX a autoria das obras de terceiros.

## Autoria, licenças e capas

- Música: [licenciamento do autor](https://incompetech.com/music/royalty-free/licenses/) e [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Valkaama: [página do produtor](https://www.valkaama.com/index.php?page=movie) e [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- Livros: [licença da edição](https://www.gutenberg.org/policy/license.html) e [espelhos oficiais](https://www.gutenberg.org/MIRRORS.ALL).

Cada registro conserva título, autor, fonte, licença e indicação das mudanças.
Os arquivos de texto preservam a licença completa da edição. Os MP3 e o filme
não foram editados. As 24 novas capas musicais são composições gráficas da LX,
com título e nome do autor, e podem ser trocadas pelo ADM. Capas de livros
existentes foram preservadas.

## Publicação e manutenção

`catalog/native-collection.json` é o manifesto dos arquivos e atualizações.
`tools/native-collection.mjs` valida as evidências e produz um lote SQL
transacional que exige o fingerprint do catálogo e os hashes dos livros.
Ele insere os novos títulos e acrescenta os textos aos livros existentes,
sem excluir registros nem mudar configurações de acesso ou contas.

A transferência de arquivos verificou 44 objetos por tamanho e SHA-256. O
endpoint temporário de transferência foi desativado após a conclusão. O
manifesto guarda URLs públicas dos arquivos e nenhuma credencial de servidor.

Os testes cobrem fontes nativas, ausência de fallback externo, identificação
de episódios, integridade e paginação dos livros, reuso do texto, preservação
de arquivos do dono, duplicatas e rejeição de alterações concorrentes. A
verificação de navegador cobre leitura em 390, 820 e 1280 pixels, fechamento
durante download, MP3 real hospedado e texto completo de Dom Casmurro.

O código de compatibilidade dos provedores antigos permanece desabilitado no
modo padrão; só é usado nos testes explícitos de regressão. Para novos títulos
protegidos, o ADM pode enviar arquivos próprios ou fontes cuja reprodução
tenha sido autorizada.
