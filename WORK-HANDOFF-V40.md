# LX Plus v40 — Handoff para o Work

## Branch obrigatória

Use **`lxplus-v40-completa`**. Não editar `main`, não fazer merge e não publicar produção antes da revisão final.

## Base e objetivo

- Base preservada: **LX Plus R12.4**.
- Build entregue: **`V40-COMPLETE-20260925`**.
- A v40 é uma manutenção/redesign aditivo, não um reset do projeto.
- Usuários, catálogo, histórico, mensagens, playlists, músicas, livros, filmes, séries, configurações e integrações existentes devem continuar intactos.

## Como revisar

1. Criar `lxplus-v40-completa` a partir da `main` atual.
2. Aplicar os arquivos deste ZIP nessa branch e revisar o diff.
3. Não trocar secrets/credenciais. Nenhuma chave privada é necessária dentro do repositório.
4. Subir a branch em staging/preview.
5. Rodar os testes descritos em `TEST-REPORT-V40.md` e testar os fluxos reais com Supabase/Drive configurados.
6. Aplicar **somente em staging** a migration `supabase/migrations/20260925_lxplus_v40.sql` após backup do banco.
7. Validar RLS, Ranking mensal, Presence, enquetes, mensagens salvas/fixadas e Central de Erros.
8. Validar música/filmes/Drive antes do redesign visual final.
9. Corrigir qualquer regressão encontrada.
10. Só depois preparar merge/publicação.

## Migration v40

A migration é aditiva: cria tabelas/rotinas v40 para presença, Ranking mensal, histórico, auditoria, recursos sociais, erros e fundação de múltiplos perfis. Ela **não apaga tabelas legadas e não zera dados atuais**. Existe uma exclusão de snapshots apenas dentro da própria tabela nova de snapshots quando o ADM fecha a temporada, para congelar novamente a classificação daquele mês.

## Pontos de revisão obrigatória em staging

- Supabase Auth + RLS com usuário comum e ADM.
- Google Drive/LX Storage com arquivos reais e Range 206.
- MP4 H.264/AAC e pelo menos um arquivo 4K real.
- LX Music: MP3, fila, álbum, segundo plano e Floating Player.
- Ranking: evento válido, limite diário, fechamento em auditoria, confirmação e pagamento.
- Comunidade: mensagem, resposta, editar/apagar, salvar/fixar, enquete, áudio, chamada, reconexão e compartilhamento.
- Live: YouTube/Vimeo/Drive/direto e fallback de embed bloqueado.
- Mobile 360/390/430, tablet e desktop.

## Ordem recomendada de revisão

**Storage/Player → dados/migrations → ADM/Smart Import → Comunidade → responsividade → visual/animações → regressão final.**

## Observação

O ambiente que gerou este pacote não teve acesso ao repositório GitHub remoto da LX Plus, então **nenhum commit/branch remoto foi criado e a `main` não foi tocada**. O pacote está preparado para o Work aplicar na branch acima.
