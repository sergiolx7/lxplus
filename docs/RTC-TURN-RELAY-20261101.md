# LX Plus — Conexões WebRTC em redes restritas

## Diagnóstico

A chamada direta pode completar a sinalização Supabase sem estabelecer o transporte de mídia entre navegadores em redes com NAT simétrico, UDP bloqueado ou firewalls rígidos. STUN isolado não resolve isso. O servidor `lx-rtc-config` de produção tem suporte Cloudflare TURN, mas não havia interface no ADM Studio para configurá-lo. Nenhuma chave TURN foi encontrada nas entradas `rtc_turn_key_id` / `rtc_turn_api_token` do banco durante esta análise. Também é possível fornecer credenciais através de `LX_TURN_KEY_ID` e `LX_TURN_API_TOKEN` no ambiente Supabase, não acessível pelo navegador.

## Instalação e ativação

1. Abra [Cloudflare Realtime TURN](https://developers.cloudflare.com/realtime/turn/generate-credentials/), crie uma **TURN key** e guarde seu ID e token. Esses dados não são a `username`/`credential` temporária de WebRTC.
2. Entre com a conta proprietária na LX Plus e abra **ADM Studio → Visão geral → Servidor TURN para chamadas → Configurar Cloudflare TURN**. Somente a role `owner` pode abrir e concluir a ação; o servidor também autentica a sessão e comprova o cargo.
3. Cole o ID e o token. A função `lx-rtc-config` valida a criação de credenciais efêmeras com a Cloudflare antes de salvar a configuração. As chaves de longo prazo ficam em `lx_integrations` restrito a `service_role` e não são mostradas novamente; não devem ser enviadas por mensagens ou incluídas no GitHub.
4. Clique **Testar conexão TURN**. O navegador recebe credenciais efêmeras e primeiro tenta descobrir um candidato relay usando **somente** `turns:...:443` com `iceTransportPolicy: 'relay'`. Se falhar, testa o conjunto de relays disponíveis e diferencia um relay alcançável de TLS/443 indisponível.
5. Homologue com duas contas e dispositivos reais em **redes diferentes** (Wi-Fi e 4G/5G), com câmera, microfone, compartilhamento de tela (sem câmera), encerramento e reconexão. Repetir com UDP bloqueado se possível. Abrir/fechar o seletor de tela deve preservar o microfone.

## Limites e verificação

- A Cloudflare fornece URLs TURN UDP, TCP e TLS/443 quando a chave está válida. A aplicação preserva esse conjunto no `RTCPeerConnection` e atualiza credenciais temporárias de longa duração. Não há token fixo público, relay "grátis" sem conta, nem retirada de permissões para chamadas privadas.
- Conseguir um candidato `relay` prova que o navegador alcançou o servidor, mas não comprova mídia remota, qualidade, bateria ou ausência de travamento. Firewalls com proxies HTTP explícitos, inspeção TLS ou bloqueios direcionados podem continuar impedindo a conexão.
- TURN pode gerar custo de tráfego. O serviço Cloudflare Realtime TURN informa custo por GB para usos fora do seu SFU; verificar o plano e limite antes de habilitar.
- Não alterar o PostgreSQL, chamadas antigas, os perfis ou o esquema RLS. Se a configuração não estiver completa, o fallback STUN continua acessível e a interface informa a limitação; não declarar que todas as redes estão cobertas.
- Diagnóstico sem microfone/câmera e sem salvar credenciais efêmeras no navegador. Concluir conexão de mídia real é etapa de homologação separada.

Fontes: [Cloudflare TURN](https://developers.cloudflare.com/realtime/turn/), [Credenciais Cloudflare](https://developers.cloudflare.com/realtime/turn/generate-credentials/), [WebRTC TURN](https://webrtc.org/getting-started/turn-server).
