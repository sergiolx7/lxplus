-- Read-only preflight. Never interprets every account as disposable.
select jsonb_build_object(
  'captured_at',now(),
  'auth_users',(select count(*) from auth.users),
  'profiles',(select count(*) from public.lx_profiles),
  'catalog',(select count(*) from public.lx_catalog),
  'administrators',(select count(*) from public.lx_admins),
  'storage_objects',(select count(*) from storage.objects),
  'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public)) from storage.buckets),
  'backups_verified',false,
  'cleanup_allowed',false
);
-- The owner reviews this exact inventory in the private administrative channel.
-- This returns identifiers and account states, deliberately excluding passwords/tokens.
select u.id as user_id,p.name,u.email_confirmed_at is not null as email_confirmed,
  p.approved,p.approval_status,a.role as administrator_role,
  exists(select 1 from auth.sessions s where s.user_id=u.id) as has_sessions,
  false as confirmed_test_account
from auth.users u left join public.lx_profiles p on p.user_id=u.id
left join public.lx_admins a on a.user_id=u.id
order by u.created_at;
