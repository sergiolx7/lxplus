-- Bounded compatibility for the published legacy client (one catalog request).
-- The v40 client already pages by 500. No grants, data or RLS are changed.
do $lx_capacity$
declare previous_limit text;
begin
  select split_part(setting,'=',2) into previous_limit
  from pg_db_role_setting s
  join pg_roles r on r.oid=s.setrole
  cross join lateral unnest(s.setconfig) setting
  where r.rolname='authenticator' and s.setdatabase=0
    and setting like 'pgrst.db_max_rows=%';
  if previous_limit is not null and previous_limit not in ('1000','2500') then
    raise exception 'Existing API row limit differs; preserve the current configuration';
  end if;
  if (select count(*) from public.lx_catalog)>2500 then
    raise exception 'Catalog already exceeds the bounded legacy capacity';
  end if;
  alter role authenticator set pgrst.db_max_rows='2500';
end
$lx_capacity$;
notify pgrst, 'reload config';
