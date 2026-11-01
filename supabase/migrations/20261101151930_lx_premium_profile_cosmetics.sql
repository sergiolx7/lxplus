-- Premium is an entitlement granted by an owner. It is never taken from user metadata.
alter table public.lx_profiles add column if not exists is_premium boolean not null default false;
alter table public.lx_profiles add column if not exists profile_style jsonb not null default '{"enabled":false,"color":"#b8a2ff","secondColor":"#8be2e2","intensity":55,"mode":"static"}'::jsonb;
alter table public.lx_profiles drop constraint if exists lx_profile_style_valid;
alter table public.lx_profiles add constraint lx_profile_style_valid check(jsonb_typeof(profile_style)='object' and profile_style ?& array['enabled','color','secondColor','intensity','mode'] and (profile_style-array['enabled','color','secondColor','intensity','mode'])='{}'::jsonb and jsonb_typeof(profile_style->'enabled')='boolean' and profile_style->>'color' ~ '^#[a-fA-F0-9]{6}$' and profile_style->>'secondColor' ~ '^#[a-fA-F0-9]{6}$' and jsonb_typeof(profile_style->'intensity')='number' and (profile_style->>'intensity')::numeric between 0 and 100 and profile_style->>'mode' in ('static','pulse','gradient'));
create or replace function public.lx_guard_premium_profile() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.is_premium and (auth.uid() is null or public.lx_admin_role() is distinct from 'owner') then raise exception 'PREMIUM_OWNER_REQUIRED';end if;
  if new.profile_style<>'{"enabled":false,"color":"#b8a2ff","secondColor":"#8be2e2","intensity":55,"mode":"static"}'::jsonb and (auth.uid() is null or new.user_id<>auth.uid() or not new.is_premium) then raise exception 'PREMIUM_REQUIRED';end if;
  if current_user='authenticated' and (nullif(new.banner_url,'') is not null or nullif(new.avatar_url,'') is not null) then raise exception 'PROFILE_MEDIA_ENDPOINT_REQUIRED';end if;
  return new;
 end if;
 if new.is_premium is distinct from old.is_premium and (auth.uid() is null or public.lx_admin_role() is distinct from 'owner') then raise exception 'PREMIUM_OWNER_REQUIRED';end if;
 if new.profile_style is distinct from old.profile_style and (auth.uid() is null or new.user_id<>auth.uid() or not new.is_premium) then raise exception 'PREMIUM_REQUIRED';end if;
 -- Authenticated clients cannot assign an arbitrary animated URL or bypass media validation.
 -- The media endpoint validates bytes, ownership and entitlement before its service-role update.
 if current_user<>'service_role' and ((new.banner_url is distinct from old.banner_url and nullif(new.banner_url,'') is not null) or (new.avatar_url is distinct from old.avatar_url and nullif(new.avatar_url,'') is not null)) then raise exception 'PROFILE_MEDIA_ENDPOINT_REQUIRED';end if;
 return new;
end;$$;
drop trigger if exists lx_guard_premium_profile on public.lx_profiles;
create trigger lx_guard_premium_profile before insert or update on public.lx_profiles for each row execute function public.lx_guard_premium_profile();
create or replace function lx_private.set_premium(p_user uuid,p_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() is distinct from 'owner' then raise exception 'PREMIUM_OWNER_REQUIRED';end if;
 if p_enabled is null then raise exception 'INVALID_PREMIUM';end if;
 update public.lx_profiles set is_premium=p_enabled where user_id=p_user;
 if not found then raise exception 'PROFILE_NOT_FOUND';end if;return p_enabled;
end;$$;
create or replace function public.lx_admin_set_premium(p_user_id uuid,p_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select lx_private.set_premium(p_user_id,p_enabled)$$;
create or replace function lx_private.profile_cosmetics(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'PROFILE_ACCESS_DENIED';end if;
 if p_user<>auth.uid() and not exists(select 1 from jsonb_array_elements(public.lx_plus_directory()) x where x->>'user_id'=p_user::text) then return null;end if;
 return (select jsonb_build_object('is_premium',is_premium,'profile_style',case when is_premium then profile_style else null end,'banner_url',banner_url) from public.lx_profiles where user_id=p_user);
end;$$;
create or replace function public.lx_profile_cosmetics(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.profile_cosmetics(p_user)$$;
create or replace function lx_private.premium_directory() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() not in ('owner','administrator') or public.lx_admin_role() is null then raise exception 'ADMIN_REQUIRED';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'is_premium',is_premium)) from public.lx_profiles),'[]'::jsonb);
end;$$;
create or replace function public.lx_admin_premium_directory() returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.premium_directory()$$;
create or replace function public.lx_set_profile_style(p_style jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 update public.lx_profiles set profile_style=p_style where user_id=auth.uid() and is_premium returning profile_style into result;
 if not found then raise exception 'PREMIUM_REQUIRED';end if;return result;
end;$$;
revoke all on function lx_private.set_premium(uuid,boolean),public.lx_admin_set_premium(uuid,boolean),lx_private.profile_cosmetics(uuid),public.lx_profile_cosmetics(uuid),lx_private.premium_directory(),public.lx_admin_premium_directory(),public.lx_set_profile_style(jsonb),public.lx_guard_premium_profile() from public,anon;
grant execute on function lx_private.set_premium(uuid,boolean),public.lx_admin_set_premium(uuid,boolean),lx_private.profile_cosmetics(uuid),public.lx_profile_cosmetics(uuid),lx_private.premium_directory(),public.lx_admin_premium_directory(),public.lx_set_profile_style(jsonb) to authenticated;
-- Keep public reads and other media folders unchanged. Only profile writes move to validation.
drop policy if exists lx_profile_validated_insert on storage.objects;
create policy lx_profile_validated_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'lx-assets' or name not like 'profiles/%');
drop policy if exists lx_profile_validated_update on storage.objects;
create policy lx_profile_validated_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'lx-assets' or name not like 'profiles/%') with check(bucket_id<>'lx-assets' or name not like 'profiles/%');
