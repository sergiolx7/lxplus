# LX Plus — Comunidade e notificações · Ultimate 8
Entrega de 4 de novembro de 2026, continuação da versão `1fb3f1cf5d600848a765251e339da14bc9b604cd`.

## O que mudou

- **Editar mensagens de texto:** ação nas próprias mensagens, em conversas individuais e grupos. O resultado mostra “Editada”. O servidor exige autoria, aprovação da conta e participação atual no grupo.
- **Encaminhar textos:** janela com prévia e escolha de um amigo ou grupo. O servidor consulta a mensagem permitida e cria uma cópia marcada como “Encaminhada”, enviada pela conta que encaminhou. A cópia não expõe identificadores dos participantes da conversa original.
- **Envio repetido:** cada encaminhamento tem um identificador de tentativa. Repetir a mesma solicitação devolve o resultado anterior, sem duplicar a mensagem. Reutilizar a identificação com outro destino é recusado.
- **Atualização do chat:** escuta alterações de mensagens enviadas e recebidas e alterações de grupos. Mensagens cujo conteúdo não mudou preservam seus elementos e controles; o polling deixa de reconstruir toda a conversa.
- **Pausar avisos por conversa:** botão no cabeçalho de conversas individuais e grupos. A preferência é salva na conta e aplicada aos novos avisos no servidor; a conversa continua acessível.
- **Preferências de notificações:** mensagens, amizades, chamadas perdidas, interações, novidades e prévia de texto. As opções valem para os novos avisos em todos os aparelhos. Avisos antigos e comunicados da equipe são preservados.
- **Notificações de grupos:** novos avisos para os outros integrantes atuais, respeitando as preferências de cada conta.
- **Abrir conversa:** notificações de mensagem levam à conversa correspondente quando ela continua disponível para a conta. Avisos de chamadas levam ao histórico.
- **Acessibilidade e celular:** foco inicial no formulário, Escape para fechar, foco contido na janela, ações que se ajustam à largura e opções de notificação com descrição.

## Dados e autorização

A migração aditiva `20261104131051_lx_ultimate8_social_controls.sql` acrescenta os indicadores de encaminhamento/edição e quatro tabelas privadas para preferências, conversas silenciadas, identificação dos eventos e tentativas de encaminhamento.

As quatro tabelas têm RLS e não permitem leitura direta por contas anônimas ou autenticadas. As rotinas públicas são invoker; as operações privadas verificam autenticação, aprovação, autoria e acesso à conversa. As regras atuais de expressões Premium continuam sendo aplicadas.

A identificação de avisos duplicados usa somente IDs estáveis de mensagem ou chamada. Avisos independentes com conteúdo igual continuam distintos. Nenhum aviso histórico foi deduplicado ou removido.

A manutenção não apagou/restaurou contas, mensagens, amizades, catálogo, ranking ou assinaturas. Não concedeu Premium nem criou cobranças. Nenhuma mensagem real foi enviada a membros durante os testes.

## Validação

- Suíte completa: **352 testes aprovados**, sem falhas ou testes ignorados.
- 24 testes novos de banco e ações: autoria, conteúdo vazio/excessivo, acesso a grupos, origem privada, mensagens ocultas/excluídas, arquivos privados, destinos, idempotência, colisão de IDs, conta não aprovada, anonimato, isolamento, preferências, prévias e avisos.
- PostgreSQL/PGlite com as rotinas preexistentes de envio/notificação capturadas antes da alteração.
- Produção: verificação das rotinas em transação encerrada com **rollback**, incluindo preferência salva, edição inexistente recusada, origem indisponível recusada, leitura privada negada e aviso desativado suprimido. Nenhum aviso de teste foi mantido.
- Produção: quatro tabelas privadas com RLS e sem SELECT para anon/authenticated; quatro RPCs públicas invoker sem EXECUTE para anon.
- Build e análise de sintaxe aprovados. CI e identificação da publicação serão registrados no relatório final de entrega.
- Navegador local com dados fictícios: edição individual, encaminhamento para grupo e recebimento em segunda sessão, edição de grupo e recepção, pausa persistente, salvamento de preferências, abertura direta da conversa por aviso e rascunho preservado ao cancelar.
- Layout inspecionado em 360/390 px. O teste não equivale a uma homologação em aparelho físico.
- Revisão de segurança do Supabase: as estruturas privadas novas aparecem como informação por RLS sem policy; não há acesso direto. As novas RPCs públicas não são SECURITY DEFINER. Avisos antigos do projeto não foram corrigidos indiscriminadamente.

## Limites e continuidade

O encaminhamento desta etapa abrange **texto**. Arquivos de imagem, áudio e outros anexos privados não são encaminhados: precisam de uma cópia autorizada do arquivo para a nova audiência. A aplicação não reutiliza uma URL privada para expô-la a outro destinatário.

Pausar avisos afeta novas notificações de mensagens, sem encerrar amizades/grupos nem desativar chamadas recebidas. Desativar prévias afeta os novos avisos; não reescreve os antigos.

Continuam pendentes do briefing amplo: homologação real de áudio/vídeo/transmissão entre aparelhos e redes distintas, chamadas em grupo, integração do gateway e compra avulsa/posse de cosméticos. A manutenção anterior já registrou que o ambiente de teste não estabeleceu uma rota remota de mídia; esta etapa não altera essa conclusão.

## Preservação da publicação

- Branch: `main`, sobre a versão moderna existente.
- Backup remoto anterior à etapa: `backup/ultimate8-social-20261104-1fb3f1c`.
- Domínio e workflow existentes preservados.
- O commit publicado pode ser conferido em `/build.json`, campo `source_commit`.
