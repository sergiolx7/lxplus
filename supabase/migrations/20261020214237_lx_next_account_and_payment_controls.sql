-- Staging candidate. Apply only after the verified backup and isolated staging gates.
-- No account, catalog, media or existing subscription is deleted by this migration.
begin;

create schema if not exists lx_next_private;
revoke all on schema lx_next_private from public, anon;
grant usage on schema lx_next_private to authenticated;

-- JWTs remain usable after sign-out/deletion unless sensitive operations also
-- verify that the Auth session still exists. User metadata never grants access.
create or replace function lx_next_private.identity_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
      and u.deleted_at is null
      and not exists (select 1 from public.lx_profiles p where p.user_id=u.id
        and p.approval_status in ('rejected','suspended','banned'))
      and exists (select 1 from auth.sessions s where s.user_id=u.id
        and s.id::text = (select auth.jwt()->>'session_id')
        and (s.not_after is null or s.not_after > now()))
  );
$$;
revoke all on function lx_next_private.identity_active() from public, anon;
grant execute on function lx_next_private.identity_active() to authenticated;

create or replace function lx_next_private.admin_role()
returns text language sql stable security definer set search_path = '' as $$
  select a.role from public.lx_admins a
  where a.user_id=(select auth.uid()) and lx_next_private.identity_active() limit 1;
$$;
revoke all on function lx_next_private.admin_role() from public, anon;
grant execute on function lx_next_private.admin_role() to authenticated;

create or replace function public.lx_admin_role()
returns text language sql stable security invoker set search_path = '' as $$
  select lx_next_private.admin_role();
$$;
create or replace function public.lx_is_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select lx_next_private.admin_role() is not null;
$$;
revoke all on function public.lx_admin_role(),public.lx_is_admin() from public,anon;
grant execute on function public.lx_admin_role(),public.lx_is_admin() to authenticated;

create or replace function lx_next_private.is_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select lx_next_private.identity_active() and (
    lx_next_private.admin_role() is not null or (
      exists(select 1 from public.lx_profiles p where p.user_id=(select auth.uid())
        and p.approved and p.approval_status in ('approved','approved_admin'))
      and not coalesce((select (value->'maintenance'->>'enabled')::boolean
        from public.lx_settings where key='branding'),false)
    )
  );
$$;
revoke all on function lx_next_private.is_approved() from public,anon;
grant execute on function lx_next_private.is_approved() to authenticated;
create or replace function public.lx_is_approved()
returns boolean language sql stable security invoker set search_path = '' as $$
  select lx_next_private.is_approved();
$$;
revoke all on function public.lx_is_approved() from public,anon;
grant execute on function public.lx_is_approved() to authenticated;

-- Keep approvals and email verification independent. Only Auth verifies email.
create or replace function lx_next_private.approve_user(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target auth.users;
begin
  if (select auth.uid()) is null or not public.lx_admin_can('approvals') then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select * into target from auth.users where id=p_user_id and deleted_at is null for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if target.email_confirmed_at is null then raise exception 'EMAIL_CONFIRMATION_REQUIRED'; end if;
  if exists(select 1 from public.lx_profiles where user_id=p_user_id
    and approval_status in ('suspended','banned')) then raise exception 'ACCOUNT_BLOCKED'; end if;
  insert into public.lx_profiles(user_id,name,approved,approval_status,approved_at,approved_by,updated_at)
  values(p_user_id,coalesce(nullif(target.raw_user_meta_data->>'name',''),split_part(target.email,'@',1)),
    true,'approved_admin',now(),auth.uid(),now())
  on conflict(user_id) do update set approved=true,approval_status='approved_admin',
    approved_at=now(),approved_by=auth.uid(),updated_at=now();
  return true;
end;
$$;
revoke all on function lx_next_private.approve_user(uuid) from public,anon;
grant execute on function lx_next_private.approve_user(uuid) to authenticated;
create or replace function public.lx_admin_approve_user(p_user_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select lx_next_private.approve_user(p_user_id);
$$;
revoke all on function public.lx_admin_approve_user(uuid) from public,anon;
grant execute on function public.lx_admin_approve_user(uuid) to authenticated;

-- Existing UPDATE protection did not protect a self INSERT with approved=true.
create or replace function lx_next_private.guard_profile_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    if not public.lx_admin_can('approvals') and
      (new.approved or new.approval_status <> 'pending' or new.approved_at is not null or new.approved_by is not null)
      then raise exception 'APPROVAL_FIELDS_MANAGED_BY_ADMIN'; end if;
    if not public.lx_admin_can('users') and
      (new.verified or new.watched_hours<>0 or new.listened_hours<>0 or new.read_count<>0 or new.streak<>1)
      then raise exception 'PROFILE_PRIVILEGES_MANAGED_BY_SERVER'; end if;
  end if;
  return new;
end;
$$;
revoke all on function lx_next_private.guard_profile_insert() from public,anon,authenticated;
create trigger lx_next_profile_insert before insert on public.lx_profiles
  for each row execute function lx_next_private.guard_profile_insert();

create table lx_next_private.payment_settings (
  environment text primary key check (environment in ('test','production')),
  documentation_url text not null default '',
  enabled boolean not null default false,
  provider_verified boolean not null default false,
  last_test_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table lx_next_private.audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  environment text not null,
  created_at timestamptz not null default now()
);
alter table lx_next_private.payment_settings enable row level security;
alter table lx_next_private.audit enable row level security;
revoke all on lx_next_private.payment_settings,lx_next_private.audit from public,anon,authenticated;
insert into lx_next_private.payment_settings(environment) values ('test'),('production');

create or replace function lx_next_private.require_owner_mfa()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or lx_next_private.admin_role() is distinct from 'owner'
    then raise exception 'OWNER_REQUIRED'; end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then raise exception 'MFA_REQUIRED'; end if;
end;
$$;
revoke all on function lx_next_private.require_owner_mfa() from public,anon;
grant execute on function lx_next_private.require_owner_mfa() to authenticated;

create or replace function lx_next_private.punchpay_status(p_environment text default 'test')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare config lx_next_private.payment_settings;
begin
  perform lx_next_private.require_owner_mfa();
  select * into config from lx_next_private.payment_settings where environment=p_environment;
  if not found then raise exception 'INVALID_ENVIRONMENT'; end if;
  return jsonb_build_object('provider','PunchPay','environment',config.environment,
    'documentation_url',config.documentation_url,'enabled',config.enabled,
    'provider_verified',config.provider_verified,'last_test_at',config.last_test_at,
    'updated_at',config.updated_at,'status','documentation_required',
    'credential_configured',exists(select 1 from vault.secrets where name='lx_next_punchpay_'||p_environment),
    'audit',(select coalesce(jsonb_agg(x),'[]'::jsonb) from
      (select action,created_at from lx_next_private.audit where environment=p_environment order by id desc limit 10)x));
end;
$$;
revoke all on function lx_next_private.punchpay_status(text) from public,anon;
grant execute on function lx_next_private.punchpay_status(text) to authenticated;
create or replace function public.lx_next_punchpay_status(p_environment text default 'test')
returns jsonb language sql stable security invoker set search_path = '' as $$
  select lx_next_private.punchpay_status(p_environment);
$$;
revoke all on function public.lx_next_punchpay_status(text) from public,anon;
grant execute on function public.lx_next_punchpay_status(text) to authenticated;

create or replace function lx_next_private.save_punchpay(
  p_environment text,p_documentation_url text,p_api_key text default null,p_remove_credential boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare secret_id uuid; secret_name text;
begin
  perform lx_next_private.require_owner_mfa();
  if p_environment not in ('test','production') or p_environment is null then raise exception 'INVALID_ENVIRONMENT'; end if;
  if p_documentation_url is null or length(p_documentation_url)>2048 or
    (p_documentation_url<>'' and p_documentation_url !~ '^https://[^/@?#[:space:]]+(/[^?#[:space:]]*)?$')
    then raise exception 'INVALID_DOCUMENTATION_URL'; end if;
  if p_api_key is not null and (length(p_api_key)>8192 or length(trim(p_api_key))<8)
    then raise exception 'INVALID_CREDENTIAL'; end if;
  -- Serialize edits to avoid duplicate names on simultaneous first-time saves.
  perform pg_advisory_xact_lock(hashtext('lx-next-punchpay-'||p_environment));
  secret_name := 'lx_next_punchpay_'||p_environment;
  select id into secret_id from vault.secrets where name=secret_name;
  if p_remove_credential then
    if p_api_key is not null then raise exception 'CONFLICTING_CREDENTIAL_ACTION'; end if;
    delete from vault.secrets where id=secret_id;
  elsif p_api_key is not null then
    if secret_id is null then
      perform vault.create_secret(trim(p_api_key),secret_name,'LX Plus PunchPay credential');
    else
      perform vault.update_secret(secret_id,trim(p_api_key),secret_name,'LX Plus PunchPay credential');
    end if;
  end if;
  update lx_next_private.payment_settings set documentation_url=p_documentation_url,
    enabled=false,provider_verified=false,last_test_at=null,updated_at=now(),updated_by=auth.uid()
    where environment=p_environment;
  insert into lx_next_private.audit(actor_id,action,environment)
    values(auth.uid(),case when p_remove_credential then 'credential_removed' else 'configuration_saved' end,p_environment);
  return lx_next_private.punchpay_status(p_environment);
end;
$$;
revoke all on function lx_next_private.save_punchpay(text,text,text,boolean) from public,anon;
grant execute on function lx_next_private.save_punchpay(text,text,text,boolean) to authenticated;
create or replace function public.lx_next_save_punchpay(
  p_environment text,p_documentation_url text,p_api_key text default null,p_remove_credential boolean default false)
returns jsonb language sql security invoker set search_path = '' as $$
  select lx_next_private.save_punchpay(p_environment,p_documentation_url,p_api_key,p_remove_credential);
$$;
revoke all on function public.lx_next_save_punchpay(text,text,text,boolean) from public,anon;
grant execute on function public.lx_next_save_punchpay(text,text,text,boolean) to authenticated;

create or replace function lx_next_private.admin_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform lx_next_private.require_owner_mfa();
  return jsonb_build_object('users',(select count(*) from public.lx_profiles),
    'pending',(select count(*) from public.lx_profiles where not approved and approval_status='pending'),
    'email_unconfirmed',(select count(*) from auth.users where email_confirmed_at is null and deleted_at is null),
    'catalog',(select count(*) from public.lx_catalog),'published',(select count(*) from public.lx_catalog where published),
    'storage_objects',(select count(*) from storage.objects),
    'storage_bytes',(select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end),0) from storage.objects),
    'maintenance',coalesce((select (value->'maintenance'->>'enabled')::boolean from public.lx_settings where key='branding'),false),
    'backup_verified',false,'cleanup_available',false,'payment_ready',false);
end;
$$;
revoke all on function lx_next_private.admin_status() from public,anon;
grant execute on function lx_next_private.admin_status() to authenticated;
create or replace function public.lx_next_admin_status()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select lx_next_private.admin_status();
$$;
revoke all on function public.lx_next_admin_status() from public,anon;
grant execute on function public.lx_next_admin_status() to authenticated;

-- Explicit consent only; subscribers and email addresses are never publicly readable.
create table lx_next_private.return_interests (
  email text primary key,
  consent_version text not null,
  created_at timestamptz not null default now(),
  consented_at timestamptz not null default now()
);
alter table lx_next_private.return_interests enable row level security;
revoke all on lx_next_private.return_interests from public,anon,authenticated;
create or replace function lx_next_private.return_interest(p_email text,p_consent boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(trim(coalesce(p_email,'')));
begin
  if p_consent is distinct from true then raise exception 'CONSENT_REQUIRED'; end if;
  if length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then raise exception 'INVALID_EMAIL'; end if;
  perform pg_advisory_xact_lock(hashtext('lx-next-return-interest'));
  -- Apply the same response to new and existing emails at the limit so that
  -- an anonymous caller cannot use the rate limit to enumerate subscribers.
  if (select count(*) from lx_next_private.return_interests where created_at>now()-interval '1 minute')>=20
    then raise exception 'RATE_LIMITED'; end if;
  insert into lx_next_private.return_interests(email,consent_version)
    values(normalized,'return-notification-20261020')
    on conflict(email) do update set consented_at=now(),consent_version=excluded.consent_version;
  return jsonb_build_object('accepted',true);
end;
$$;
revoke all on function lx_next_private.return_interest(text,boolean) from public;
grant usage on schema lx_next_private to anon;
grant execute on function lx_next_private.return_interest(text,boolean) to anon,authenticated;
create or replace function public.lx_next_return_interest(p_email text,p_consent boolean)
returns jsonb language sql security invoker set search_path = '' as $$
  select lx_next_private.return_interest(p_email,p_consent);
$$;
revoke all on function public.lx_next_return_interest(text,boolean) from public;
grant execute on function public.lx_next_return_interest(text,boolean) to anon,authenticated;
commit;
