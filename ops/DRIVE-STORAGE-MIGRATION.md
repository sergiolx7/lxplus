# Migração privada de arquivos para Google Drive

O destino autorizado é o Drive da LX Plus, na conta `lxgroup383@gmail.com`.
Os arquivos continuam privados. O acesso do site ao Supabase permanece bloqueado
enquanto a quota de armazenamento não for regularizada.

## Estado em 13/11/2026

- Pasta privada de armazenamento e backups criada, com propriedade da conta LX.
- Catálogo (3.299 registros), inventário (456 objetos), definições dos três buckets e plano de revisão exportados.
- O ZIP de pré-migração foi enviado ao Drive, baixado novamente e validado por SHA-256. Ele contém metadados e catálogo; **não contém as mídias originais**.
- Há 215 candidatos à revisão de cópia externa, somando 837.208.387 bytes, nos prefixos `lx-assets/automated/`, `lx-assets/licensed/` e `lx-media/media/`, sem referência em título atualmente publicado.
- Nenhuma mídia foi removida ou declarada copiada. O login no painel administrativo ainda precisa ser concluído para exportar as mídias bloqueadas pelo HTTP 402.

## Controle da migração

`drive-storage-migration.mjs` calcula o plano e valida recibos de cópia.

```sh
node ops/drive-storage-migration.mjs inventario.json
node ops/drive-storage-migration.mjs inventario-original.json inventario-atual.json recibos-verificados.json
```

Sem recibos, o resultado é `waiting_for_verified_copies`. O programa apenas
prepara um plano de revisão; ele não possui operações de exclusão nem altera
metadados do Supabase.

Cada recibo precisa ser criado por `verifyDriveCopy`, a partir dos bytes do
original e dos bytes de uma nova leitura da cópia do Drive. São conferidos:

1. Mesmo tamanho e mesmo SHA-256.
2. Propriedade da conta LX e ausência de compartilhamento.
3. Identidade, caminho, versão e ETag originais preservados no recibo.
4. Nova leitura do inventário antes da revisão de limpeza. Arquivos modificados
   ou publicados depois do backup saem do plano.

Imagens de perfis, anexos de conversas e artes fora dos prefixos aprovados nunca
entram no plano por ausência de referência no catálogo. Títulos arquivados e
versões históricas devem manter um mapa de restauração com o ID do Drive e o
caminho original antes de uma limpeza efetiva.

Os inventários, recibos e backups reais são privados e não devem ser enviados
ao repositório público. Para eventual remoção, usar a Storage API depois da
verificação; nunca apagar linhas diretamente de `storage.objects`.

Google Drive conectado no ChatGPT permite organizar e armazenar cópias nesta
operação. Isso não fornece ao site uma credencial de Drive reutilizável. Uma
integração permanente do player exige autenticação de servidor própria,
armazenada fora do frontend, com teste de download e suporte a Range.
