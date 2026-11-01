# Correção de envio de foto e capa

O endpoint estava publicado e aceitava o arquivo, mas a atualização do perfil falhava com HTTP 409. Os logs do banco registraram `permission denied for function valid_premium_identity`: o CHECK do Premium Studio também roda nas atualizações de avatar e capa feitas pelo serviço de mídia, cujo papel não tinha EXECUTE nesse validador.

A migração concede apenas EXECUTE no validador puro `lx_private.valid_premium_identity(jsonb)` ao papel `service_role` já usado pelo endpoint. Mantém SECURITY INVOKER, a restrição de acesso anônimo, a validação da imagem, a exigência de Premium para animações e todos os controles de aprovação e concessão de benefícios.

O cliente agora lê o corpo de erros HTTP em `FunctionsHttpError.context` e apresenta mensagens específicas para sessão, Premium, arquivo inválido, tamanho, conexão e falha de gravação. Remove o diagnóstico incorreto de que qualquer falha significa que o endpoint não foi publicado.

## Validação

- O novo teste de gravação com `service_role`, sem JWT de membro, reproduziu exatamente a falta de permissão antes da migração.
- Com a correção, avatar e capa podem ser atualizados para perfis Premium e comuns, sem alterar benefícios nem personalização.
- As migrações são reaplicadas duas vezes na suíte para verificar idempotência. Os testes também mantêm a negação de URLs arbitrárias pelo cliente.
- No banco publicado, uma atualização pelo mesmo papel de serviço passou dentro de uma transação revertida; nenhuma imagem de usuário foi substituída pelo teste.
- A migração local usa a versão retornada pelo histórico do servidor após a aplicação nativa, sem executar novamente a CLI que havia tentado enviar telemetria no fluxo anterior.

Não é necessário refazer login para a correção da permissão. O usuário pode repetir o envio da imagem; o novo tratamento de mensagens entra após o carregamento da atualização do site.
