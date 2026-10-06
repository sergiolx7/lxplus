# LX Plus v40 — Cinema livre

Build: `R12.12-V40-OPEN-FILMS-20261006`. Publicação exclusiva na branch `lxplus-v40-completa`.

A aba **Assistir → Filmes → Cinema livre** reúne filmes e curtas com licença aberta, capa e fonte nativa verificada. O navegador transmite o MP4 diretamente do Internet Archive no player LX Plus. Nenhum arquivo completo de filme é copiado para o Storage da LX. As versões originais mantêm seus créditos, e a ficha mostra autor, licença, fonte e evidência de autorização. As fontes comerciais do Plex continuam dependendo de uma integração de playback autorizada.

O coletor percorre todos os projetos listados no catálogo do Blender Studio e todos os candidatos da consulta de cinema do acervo Prelinger com licença explícita. Projetos não lançados, jogos, trailers, licenças ausentes e links indisponíveis ficam no relatório de exclusões. A consulta usa os assuntos drama, comedy, animation e cartoon; ela não representa todos os filmes do Internet Archive. As licenças do Blender vêm das páginas do produtor. Para o Prelinger, a licença de cada item é lida junto com a política de reutilização do acervo. Não são copiadas suas sinopses protegidas: as descrições são próprias e factuais.

Cada fonte é conferida por resposta HTTP 206, Range, assinatura MP4, H.264, áudio AAC/MP3, duração e decodificação da primeira imagem a partir de no máximo 4 MiB. A capa também é conferida. Isso valida o início do arquivo; não é uma auditoria de cada minuto de todo o filme. A reprodução depende da disponibilidade e da velocidade do serviço de origem. O manifesto contém horários, URLs e provas de cada verificação.

O importador adiciona títulos em lote e reaproveita uma ficha existente sem mídia quando título e ano correspondem de forma única. Registros originais do proprietário e conteúdos que já têm fonte são preservados. O lote exige a contagem, o hash completo do catálogo e os hashes dos alvos do snapshot real; alterações concorrentes rejeitam o lote inteiro. Não há exclusões, mudanças de RLS ou alterações em Auth. A publicação de uma ficha reaproveitada é mantida.

## Ferramentas

As etapas abaixo geram arquivos revisáveis e não obtêm credenciais de reprodução:

```bash
python3 tools/collect-open-films.py --cache /tmp/lx-open-metadata --output collected.json
python3 tools/verify-open-films.py collected.json verified.json --cache /tmp/lx-open-prefixes
node tools/prepare-open-films.mjs verified.json snapshot-real.json original-ids.json lote
```

A verificação dos codecs exige `ffprobe`. `lote.json` descreve as inserções, atualizações e exclusões; `lote.sql` contém uma transação protegida para o banco do proprietário. O limite é 100 itens por transação e 2.500 conteúdos totais. Quando houver mais candidatos, preparar cada lote com um novo snapshot após o anterior. Repetir uma varredura não duplica títulos. O lote entregue já foi aplicado e não deve ser importado novamente.

`catalog/open-films.json` contém somente os dados públicos do lote verificado. Snapshots privados do banco e relatórios de preservação são entregues no ZIP, fora do repositório público. As correções de sessão persistente, álbuns e loading da build R12.10 permanecem incluídas. Os testes usam contas fictícias; não entram na conta pessoal do proprietário.

## Fontes

- Catálogo do produtor: https://studio.blender.org/films/
- Política do Prelinger: https://archivesupport.zendesk.com/hc/en-us/articles/360004715031-Prelinger-Archive
- Licenças e evidências individuais: `catalog/open-films.json`.
