# Demonstração do importador Google Drive — LX Plus Next

**Status:** modo fictício, já integrado ao painel da branch de reconstrução. **Não publicado** no domínio principal.

## Como experimentar
1. Execute a versão de desenvolvimento em um ambiente de homologação com uma conta administrativa autorizada.
2. Abra **Administração → Automação do catálogo**.
3. Clique em **Testar pasta fictícia**.
4. Confira os 6 arquivos simulados, as capas ilustrativas e as classificações.
5. Clique em **Simular publicação de 2 filmes**. Nenhuma chamada de gravação ao Supabase é feita.

## O que aparece
- `Horizonte de Cristal (2024)`: 98%, pronto.
- `Cidade das Estrelas (2023)`: 96%, pronto.
- Cópia de Horizonte: duplicata, retida.
- `O Mistério do Vale (2022)`: 71%, título duvidoso, retido.
- `Série Exemplo S01E03`: episódio, retido para organização.
- `Filme sem capa`: capa ausente, retido.

Todos os nomes, IDs e capas da demonstração são fictícios. Os arquivos SVG ilustrativos estão em `assets/demo-covers`. Os dados são gerados localmente em `src/drive-import-demo.js`.

## Proteção contra publicação acidental
A UI testa `scan.demo` antes de chamar a função de publicação real e encaminha apenas para `simulateDemoPublish`. Essa função rejeita objetos sem a propriedade `demo: true`, não recebe o cliente Supabase e não executa requisições externas. A rotina real requer permissão ADM, confirmação dos direitos de distribuição e credenciais válidas de Drive/TMDb.

## Ativação futura com conteúdo real
- Informar a pasta do Drive (link ou ID), compartilhada de maneira compatível com a Google Drive API.
- Configurar as chaves de Google Drive e TMDb em ambiente seguro. Nenhuma chave deve ir para o GitHub ou frontend.
- Fazer escaneamento e confirmar os resultados, conferindo eventuais links que exijam permissão.
- Testar deduplicação, taxas, paginação, limites da API, disponibilidade da prévia e direitos de distribuição.
- Somente após homologação, configurar execução periódica no backend (não pelo navegador e não com credenciais públicas).

A rotina automática ainda **não está agendada**. O site publicado, as contas e o banco atual não foram modificados.

## Testes
`npm test` inclui a verificação de sintaxe do importador e testes de fixture, revisão e não escrita.

Amostra HTML offline separada pode ser distribuída ao administrador para abrir no navegador sem login e sem tocar em dados reais.
