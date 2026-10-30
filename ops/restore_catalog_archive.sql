-- Revert ONLY the reversible archive done on 2026-10-30. Does not touch personal data.
-- Keep old importers paused while reviewing the restored catalog.
begin;
update public.lx_catalog c
set payload=b.payload,published=b.published,updated_at=now()
from lx_backup_20261030.public__lx_catalog b
where c.id=b.id and c.payload->>'archiveReason'='catalog-reset-20261030'
  and b.payload->>'type' in ('Filme','Música');
-- Discovery remains hidden; enable only sources the ADM has independently reviewed.
commit;
