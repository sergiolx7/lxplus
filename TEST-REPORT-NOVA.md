# Verificação da LX Plus NOVA R4

## Executado

- Confirmação de que a versão `main` anterior publicava o marcador R1, embora o commit R3B já tivesse corrigido o fluxo de áudio. A R4 parte da R3B e mantém os arquivos adicionais do repositório.
- Consulta somente leitura ao Supabase: `lx_catalog` contém 31 músicas publicadas; CUIDA DO PET, Para Ti Eu Vou e SEMI NUA 2 referenciam arquivos privados `cloud:media/...` e possuem uma faixa cada. A tabela `lx_user_state` possui `user_id` e `data jsonb`, compatíveis com coleções por conta.
- `node --check` nos quatro JavaScript da distribuição e em 11 scripts embutidos no HTML; verificação de IDs estáticos duplicados (zero).
- `node qa-music-r4.cjs`: confirma que o clique no card chega ao player, o dock abre antes do carregamento, uma música sem arquivo não desaparece, a fila automática preserva o gênero, a fila pessoal segue a coleção e as coleções entram e saem do estado sincronizado.
- GitHub `main`: commit `8fb3f3210671d8914e118bdd38a796b9a4fc2b37`; os hashes dos oito arquivos enviados coincidiram com os hashes locais. No site público, a página carregou HTML, JavaScript e CSS com marcador `NOVA-20260924-R5`, e o botão de adicionar à coleção existe no DOM.
- Console do navegador público: sem erro originado no site durante a tela de login. Os avisos observados vieram apenas da extensão do navegador de teste.

## Requer sessão autenticada

- Ouvir de fato uma MP3 privada no navegador: duração, avanço, pausa, seek, próxima faixa e navegação sem interrupção.
- Reproduzir YouTube e Spotify por seus players oficiais e salvar uma coleção na conta real, recarregar e conferir persistência no Supabase.

Os testes acima não são substituídos por `node --check`; não declarar reprodução audível ou sincronização confirmada antes de fazê-los.


# R5 — regressão Música/Playlists
- Verificação sintática do bundle JavaScript.
- QA de interações do player executado.
- Verificação estática de ponte entre IIFEs (`musicGenresOf`, `musicHasGenre`, `musicCatalog`).
- Build R5 aplicado no HTML, bundle e service worker.
