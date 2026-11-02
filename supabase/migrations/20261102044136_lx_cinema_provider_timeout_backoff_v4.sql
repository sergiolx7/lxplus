-- Retry existing Wikidata job conservatively after a verified provider timeout.
-- Preserve per-day limits, lease, existing media and publication settings.
update public.lx_auto_jobs
set batch_size=least(batch_size,20),
    next_run_at=greatest(next_run_at,now()+interval '3 minutes')
where kind='films'
  and enabled=true
  and batch_size>0
  and status='retry'
  and last_error ilike '%timed out%';
