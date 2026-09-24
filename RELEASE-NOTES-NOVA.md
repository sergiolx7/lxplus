# LX Plus NOVA — build NOVA-20260924-R1

HTML, CSS, JavaScript, manifest e service worker compartilham o identificador da build. O service worker busca a rede e elimina caches anteriores.

- Comunidade: a conversa aberta não é substituída quando chegam atualizações de perfil ou amizade.
- Música: Próxima/Anterior percorrem o catálogo publicado do mesmo gênero; player MP3 nativo preserva capa, duração, progresso e navegação. YouTube e Spotify usam seus players oficiais, em área compacta.
- Música: botão «Ajustes de áudio MP3» com amplificação 50–180%, graves −6 a +12 dB, presets, liga/desliga e limitador. O som do YouTube e do Spotify é controlado pelos próprios provedores.
- ADM → Músicas: abas Todas, MP3 e Links/outros; envio automático de MP3 próprios ou download de links HTTPS diretos autorizados, leitura ID3, duração, capa, qualidade original e opção de substituir a fonte de música existente. O importador em massa do Spotify busca título/capa da faixa exata e permite revisão.
- Ajuda: respostas por assunto no botão superior e chat humano persistido no Supabase; ADM → Suporte reúne chamados e respostas. A antiga função `lx-ai` continua implantada, mas não é chamada por essa interface.
- Carrossel: comparação independente dos campos salvos elimina a falsa mensagem de erro causada pela ordem das chaves JSONB. Prévia do título e ponto focal corrigidos.
- Ao Vivo: ADM informa título, capa e fonte; aceita YouTube incorporável e MP4/HLS/DASH/WebM diretos. A página pública mostra os eventos cadastrados ou a mensagem de ausência.
- Tela de assistir: controles móveis reorganizados, transmissão por Google Cast ou transmissão nativa do navegador quando a mídia e a TV são compatíveis. Qualidades adicionais 1440p, 360p e 240p só aparecem com fontes reais cadastradas.

O armazenamento, contas, catálogo, mídia, favoritos e histórico existentes foram preservados. Leia `TEST-REPORT-NOVA.md` para distinguir verificações executadas de reprodução ainda não comprovada no navegador.
