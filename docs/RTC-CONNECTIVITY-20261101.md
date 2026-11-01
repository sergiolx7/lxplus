# Conectividade de chamadas — bloqueio de TURN

O erro apresentado ao usuário indica que o WebRTC não conseguiu estabelecer uma rota de mídia. A versão publicada possuía STUN e suporte ao emissor de credenciais Cloudflare, mas não havia configuração de TURN no servidor. Não foi encontrado um segredo de TURN nas integrações do banco ou no Vault.

Uma alternativa de autenticação estática publicada pelo Open Relay foi testada com dois peers e vídeo sintético, sem captura de dispositivos reais. O navegador não obteve candidatos relay (erro ICE 701); a alternativa não foi incluída na versão publicada.

## Mudanças

- Painel **Administração → Conectividade**, restrito ao proprietário, para validar e salvar o TURN Key ID e o API Token da Cloudflare.
- As chaves são verificadas na API oficial antes de salvar. O par é gravado em uma única operação no armazenamento de integrações já protegido pelo projeto e não é devolvido ao cliente.
- O endpoint mantém verificação de JWT, consulta o usuário real e exige aprovação e papel de proprietário para configurar. A entrega de credenciais temporárias para chamadas e sessões continua exigindo participação autorizada e o orçamento do servidor.
- Teste de rota com `iceTransportPolicy: relay`, sem câmera, microfone ou chamada. Uma rota só é anunciada como encontrada após um candidato relay real.
- Reconexão manual recarrega a configuração dos dois participantes. Uma tentativa manual continua disponível depois das três tentativas automáticas; recuperação de rede também solicita reconexão.
- Tentativas automáticas usam um intervalo crescente e seus temporizadores são removidos ao encerrar.

## Ativação necessária

O proprietário escolheu Cloudflare. Falta informar no painel o **Key ID e API Token específicos de Realtime TURN** da conta. Chaves de R2 não servem para este endpoint. Sem essas credenciais, a infraestrutura de relay continua sem ativação; esta entrega não deve ser apresentada como chamada entre redes já validada.

Após salvar, executar **Testar rota TURN**, voltar à chamada e usar **Reconectar**. Validar áudio, vídeo e tela entre dois aparelhos em redes diferentes.

Documentação oficial consultada: `https://developers.cloudflare.com/realtime/turn/` e `https://developers.cloudflare.com/realtime/turn/faq/`. O serviço tem franquia e cobrança por uso conforme o plano da conta; não foi criada conta, contratado plano ou habilitada cobrança neste trabalho.
