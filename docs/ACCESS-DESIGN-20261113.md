# Acesso e estrutura visual — 13 de novembro de 2026

Estado: correção preparada em branch separada; não publicada em produção.

## Bloqueio de acesso confirmado

O endpoint público `/auth/v1/health` do projeto retornou HTTP 402, com o motivo `exceed_storage_size_quota`. Os registros do projeto também mostraram HTTP 402 em login, renovação de sessão, cadastro, reenvio de confirmação e recuperação de senha. A restrição é do serviço e não demonstra um erro de senha de uma conta específica.

O plano consultado é Free. A liberação depende de regularizar a cota do provedor; esta alteração de frontend não remove a restrição. Não foram feitas mudanças no banco, nas contas, nos arquivos armazenados ou no plano financeiro.

Referências oficiais: [HTTP 402](https://supabase.com/kb/troubleshooting/http-status-codes), [uso de armazenamento](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size). A medição de cota usa GB-hora; reduzir o volume atual pode não liberar o projeto imediatamente. Migrar arquivos exige preservar as cópias e atualizar referências e permissões antes de remover os originais. Contratar outro plano depende da decisão do proprietário.

## Mudanças preparadas

- A tela de acesso verifica a disponibilidade por uma consulta de leitura, com tempo limite, sem enviar credenciais de usuários.
- HTTP 402 e falhas do serviço recebem aviso específico. A interface deixa de orientar recuperação de senha como solução para uma restrição geral.
- Login, cadastro e envios de e-mail ficam suspensos na interface enquanto a indisponibilidade está confirmada. O botão de verificação permite tentar novamente, sem atualização periódica ou repetição de envios.
- A verificação mantém os campos já preenchidos. Erros de rede ou respostas ambíguas na primeira verificação permitem a tentativa normal de login.
- A confirmação de nova senha informa quando os dois campos são diferentes.
- O destaque da Home ocupa a largura disponível antes das colunas de conteúdo e atividade. A navegação identifica a seção atual no cabeçalho.
- A folha visual principal recebe superfícies mais escuras, cantos mais quadrados e textos auxiliares maiores. As preferências de cor, LEDs, densidade e movimento permanecem disponíveis.

## Validação e limites

- `npm test`: 406 testes aprovados, incluindo as novas verificações de indisponibilidade, recuperação do serviço, falha de rede e tempo limite.
- `npm run build`: concluído. `git diff --check`: sem erros.
- A nova interface não recebeu validação visual nesta execução: o navegador local não pôde iniciar, e o navegador remoto não conseguiu acessar o servidor local. A captura antiga em `docs/evidence/lx5-20261109` é referência da versão anterior, não evidência desta alteração.
- Login real após a liberação do provedor, recuperação por e-mail e responsividade nos cinco tamanhos da matriz continuam necessários antes da publicação.

## Pendências preservadas do escopo maior

A entrega não conclui todos os pedidos da plataforma. Continuam pendentes a homologação de chamadas e transmissão entre dispositivos e redes diferentes, a configuração/homologação do gateway e a verificação das demais funcionalidades solicitadas contra o briefing. Os documentos de 4, 6 e 9 de novembro registram essas limitações. Nenhuma dessas dependências foi marcada como concluída nesta revisão.
