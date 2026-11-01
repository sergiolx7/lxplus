# LX Plus — voz, assistir juntos e perfil Premium

Preparado em 1 de novembro de 2026, sobre a revisão Ambient 2.0 do PR #31. Esta revisão não aplica migrações, não publica funções e não altera contas reais.

## Comportamento implementado

- **Voz:** botões explícitos no LX Social e no chat, chamada privada entre amigos, microfone independente, minimizar, reconectar, estado da conexão e encerramento com liberação das capturas.
- **Tela na chamada de voz ou vídeo:** não exige câmera. Há prévia local, parar compartilhamento e escolha de enviar apenas o som da aba selecionada. Microfone e áudio compartilhado usam emissores separados; parar a tela não desliga o microfone. Encerrar a call encerra ambas as capturas.
- **Áudio da tela:** a captura pede `systemAudio: exclude`, `windowAudio: window`, exclui monitores e desativa troca automática da fonte. Somente áudio de uma fonte identificada como aba (`displaySurface: browser`) é encaminhado. A API não oferece uma confirmação portátil de que o áudio de uma janela está isolado: nesse caso, o som é descartado e a interface orienta a escolher uma aba. Não se substitui isso por áudio geral do PC.
- **Assistir juntos:** convite privado para um amigo aprovado, aceite ou recusa, play, pausa, posição e velocidade compartilhados. Cada conta acessa sua própria fonte autorizada. O par aguarda quando um dos players carrega; retomar o vídeo restaura a prontidão após reconectar. Encerrar a sessão pausa a reprodução. O fim do vídeo pausa o par, sem repetir os últimos quadros.
- **Sincronização:** estado canônico e revisões no Postgres, Realtime com RLS, consulta de recuperação, compensação do relógio e correção gradual de pequenas diferenças. Um canal WebRTC opcional transporta estados pequenos; o fallback pelo servidor continua disponível. Há uma pequena espera programada para iniciar em conjunto. Não existe promessa de latência zero ou ausência universal de travamentos.
- **Perfil Premium:** capa GIF até 5 MB, duas cores nas bordas, intensidade e efeitos fixo, pulso e gradiente. Modo leve ou movimento reduzido usa um quadro da capa e interrompe os movimentos.
- **Liberação:** ADM Studio → Usuários → Liberar/Remover Premium. Só o cargo `owner`, verificado no servidor, pode conceder o benefício. Administrador, moderador e membro não podem se conceder Premium. Criar ou atualizar o próprio perfil não contorna essa regra. Reabrir o perfil consulta a permissão atual; após revogar, a capa é estática e os LEDs ficam desligados.

## Segurança e limites

As sessões têm dois participantes, expiram em duas horas e só aceitam títulos de cinema publicados. Outros membros não podem ler ou controlar o par. A troca de episódio é exclusiva de quem criou a sessão. O player externo incorporado por iframe não oferece os controles necessários; assistir juntos exige vídeo direto, HLS ou DASH autorizado. Salas com mais de duas pessoas permanecem fora desta revisão.

O servidor valida os bytes das imagens, limita o corpo recebido e a imagem, bloqueia capas animadas sem Premium e não confia em extensão ou tipo MIME enviados pelo cliente. Uploads usam um caminho gerado para o usuário autenticado. Uma revogação durante o envio impede a publicação da capa animada e remove apenas o objeto recém-criado. A atualização do banco restringe gravações diretas na pasta `profiles/` para manter a validação obrigatória.

Credenciais TURN são temporárias, obtidas por uma função autenticada após checar participação e cota. Segredos do provedor ficam no servidor. Sem as chaves reais configuradas, a implementação informa a limitação e usa STUN. A conexão por relay e a mídia entre redes diferentes ainda precisam ser homologadas após configurar TURN.

## Validação realizada

- `npm test`: **116 testes aprovados**. Inclui banco Postgres local, aplicação repetida das duas migrações, RLS, permissões Premium, criação de perfil, concorrência de revogação no upload, sinalização privada, orçamento TURN, expiração, relógio, deriva e filtragem do áudio de captura.
- `npm run build`: pacote de frontend gerado. Testes, fixtures, SQL, funções e documentação não entram em `dist/`.
- Navegador, duas contas fictícias: convite e aceite; dois vídeos reproduzindo; comandos compartilhados de pausa, posição e velocidade; fim do vídeo pausado; concessão de Premium; envio do GIF; ativação dos LEDs; revogação com LEDs desligados e capa em canvas estático.
- Navegador com áudio e tela sintéticos: atendimento, oferta/resposta WebRTC, opção de áudio isolado, início e parada do compartilhamento sem câmera. Nenhuma câmera, microfone, conversa ou convite real foi utilizado. O navegador de teste não obteve candidatos ICE; portanto não houve confirmação de transporte de voz/tela entre as contas. A revisão não apresenta essa negociação como teste de áudio ponta a ponta.

## Publicação posterior, em conjunto

1. Revisar esta alteração e sua dependência Ambient 2.0 (PR #31). A implantação permanece pendente da autorização final do proprietário.
2. Validar as duas migrações em homologação com o schema completo existente e confirmar a publicação Realtime das duas tabelas novas. Não recriar tabelas antigas nem alterar perfis para conceder Premium durante a implantação.
3. Fazer o corte coordenado da migração `20261101151930_lx_premium_profile_cosmetics.sql`, função `lx-profile-media` e frontend. A migração bloqueia o envio antigo direto à pasta de perfis; clientes antigos abertos precisam recarregar. Não aplicar apenas a restrição de Storage antes de disponibilizar o novo fluxo.
4. Aplicar `20261101150814_lx_private_watch_together.sql`, publicar `lx-rtc-config` e configurar `LX_TURN_KEY_ID` e `LX_TURN_API_TOKEN` no servidor. Nunca colocar os valores no frontend ou repositório. As variáveis Supabase da plataforma também são necessárias para as funções.
5. Homologar voz, vídeo e tela em HTTPS com dois dispositivos, Wi-Fi e rede móvel, bloqueio de UDP, cancelamento do seletor, microfone desligado, parar pela barra nativa e reconexão. Confirmar modo relay, áudio recebido e captura encerrada. Testar fontes HLS/DASH reais e cache dos clientes antes da liberação geral.
6. Publicar somente o conteúdo de `dist/`, após os checks. A função de mídia exige a chave de serviço apenas em seu ambiente servidor. Para reverter o frontend, manter as restrições de mídia ou preparar explicitamente um fluxo validado compatível; não reabrir gravações arbitrárias em Storage.

Documentação primária consultada: [captura de tela W3C](https://www.w3.org/TR/screen-capture/), [controles de compartilhamento do Chrome](https://developer.chrome.com/docs/web-platform/screen-sharing-controls) e [credenciais TURN Cloudflare](https://developers.cloudflare.com/realtime/turn/generate-credentials/).
