-- Original LX cosmetics, validated collections and owner-controlled entitlement.
alter table public.lx_profiles add column if not exists premium_profile jsonb not null default '{"preset":"nova","decoration":"none","effect":"none","nameStyle":"solid","avatarShape":"circle","chatTheme":"midnight","entrance":"none","background":"#171325","accent":"#b69cff","bannerPosition":50}'::jsonb;
create or replace function lx_private.valid_premium_identity(p jsonb) returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_typeof(p)='object' and p ?& array['preset','decoration','effect','nameStyle','avatarShape','chatTheme','entrance','background','accent','bannerPosition'] and p-array['preset','decoration','effect','nameStyle','avatarShape','chatTheme','entrance','background','accent','bannerPosition']='{}'::jsonb and p->>'preset' in('nova','aurora','ember','ocean','rose','eclipse') and p->>'decoration' in('none','orbit','halo','crown','wings','electric','bloom') and p->>'effect' in('none','aurora','stars','meteors','embers','prism') and p->>'nameStyle' in('solid','gradient','glow','shimmer') and p->>'avatarShape' in('circle','rounded') and p->>'chatTheme' in('midnight','aurora','rose','ocean') and p->>'entrance' in('none','sparkle','chime','pulse') and p->>'background' ~ '^#[0-9a-fA-F]{6}$' and p->>'accent' ~ '^#[0-9a-fA-F]{6}$' and jsonb_typeof(p->'bannerPosition')='number' and (p->>'bannerPosition')::numeric between 0 and 100,false)
$$;
alter table public.lx_profiles drop constraint if exists lx_premium_identity_valid;
alter table public.lx_profiles add constraint lx_premium_identity_valid check(lx_private.valid_premium_identity(premium_profile));
create or replace function lx_private.guard_premium_identity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.premium_profile<>'{"preset":"nova","decoration":"none","effect":"none","nameStyle":"solid","avatarShape":"circle","chatTheme":"midnight","entrance":"none","background":"#171325","accent":"#b69cff","bannerPosition":50}'::jsonb and (auth.uid() is null or new.user_id<>auth.uid() or not new.is_premium) then raise exception 'PREMIUM_REQUIRED';end if;
 elsif new.premium_profile is distinct from old.premium_profile and (auth.uid() is null or new.user_id<>auth.uid() or not new.is_premium) then raise exception 'PREMIUM_REQUIRED';end if;
 return new;
end;$$;
drop trigger if exists lx_guard_premium_identity on public.lx_profiles;
create trigger lx_guard_premium_identity before insert or update of premium_profile on public.lx_profiles for each row execute function lx_private.guard_premium_identity();
create or replace function public.lx_set_premium_identity(p_style jsonb,p_options jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED';end if;
 update public.lx_profiles set profile_style=p_style,premium_profile=p_options where user_id=auth.uid() and is_premium returning jsonb_build_object('profile_style',profile_style,'premium_profile',premium_profile) into result;
 if result is null then raise exception 'PREMIUM_REQUIRED';end if;return result;
end;$$;
create or replace function lx_private.profile_cosmetics(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'PROFILE_ACCESS_DENIED';end if;
 if p_user<>auth.uid() and not exists(select 1 from jsonb_array_elements(public.lx_plus_directory()) x where x->>'user_id'=p_user::text) then return null;end if;
 return (select jsonb_build_object('is_premium',is_premium,'profile_style',case when is_premium then profile_style else null end,'premium_profile',case when is_premium then premium_profile else null end,'banner_url',banner_url,'avatar_url',avatar_url) from public.lx_profiles where user_id=p_user);
end;$$;
create or replace function lx_private.cosmetics_many(p_users uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb:='[]'::jsonb;u uuid;item jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() or coalesce(array_length(p_users,1),0)>60 then raise exception 'PROFILE_ACCESS_DENIED';end if;
 for u in select distinct unnest(p_users) loop item:=lx_private.profile_cosmetics(u);if item is not null then result:=result||jsonb_build_array(item||jsonb_build_object('user_id',u));end if;end loop;return result;
end;$$;
create or replace function public.lx_profile_cosmetics_many(p_users uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.cosmetics_many(p_users)$$;
create table if not exists public.lx_premium_assets(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in('emoji','sticker')),label text not null check(char_length(label) between 2 and 30),url text not null,path text not null,archived boolean not null default false,created_at timestamptz not null default now());
create index if not exists lx_premium_assets_owner on public.lx_premium_assets(user_id,archived,created_at);
alter table public.lx_premium_assets enable row level security;
revoke all on public.lx_premium_assets from public,anon,authenticated;
grant select on public.lx_premium_assets to authenticated;
grant select,insert,update on public.lx_premium_assets to service_role;
drop policy if exists premium_asset_own_read on public.lx_premium_assets;
create policy premium_asset_own_read on public.lx_premium_assets for select to authenticated using(user_id=auth.uid() and public.lx_is_approved());
create or replace function lx_private.guard_premium_asset() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user not in('service_role','postgres') then raise exception 'MEDIA_ENDPOINT_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('premium_asset:'||new.user_id::text,0));
 if not exists(select 1 from public.lx_profiles where user_id=new.user_id and approved and is_premium) then raise exception 'PREMIUM_REQUIRED';end if;
 if (select count(*) from public.lx_premium_assets where user_id=new.user_id and not archived)>=100 then raise exception 'PREMIUM_COLLECTION_FULL';end if;return new;
end;$$;
drop trigger if exists lx_guard_premium_asset on public.lx_premium_assets;
create trigger lx_guard_premium_asset before insert on public.lx_premium_assets for each row execute function lx_private.guard_premium_asset();
create or replace function lx_private.premium_assets(p_users uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare visible uuid[];
begin
 if auth.uid() is null or not public.lx_is_approved() or coalesce(array_length(p_users,1),0)>60 then raise exception 'PROFILE_ACCESS_DENIED';end if;
 select array_agg((x->>'user_id')::uuid) into visible from jsonb_array_elements(public.lx_plus_directory()) x;
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.user_id,'kind',a.kind,'label',a.label,'url',a.url)) from public.lx_premium_assets a join public.lx_profiles p using(user_id) where a.user_id=any(p_users) and (a.user_id=auth.uid() or a.user_id=any(visible)) and p.is_premium and p.approved and not a.archived),'[]'::jsonb);
end;$$;
create or replace function public.lx_premium_assets(p_users uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.premium_assets(p_users)$$;
create or replace function lx_private.archive_premium_asset(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 update public.lx_premium_assets set archived=true where id=p_id and user_id=auth.uid();return found;
end;$$;
create or replace function public.lx_archive_premium_asset(p_id uuid) returns boolean language sql security invoker set search_path='' as $$select lx_private.archive_premium_asset(p_id)$$;
create or replace function lx_private.validate_expression_message() returns trigger language plpgsql security definer set search_path='' as $$
declare item text[];n integer:=0;
begin
 if coalesce(new.body,'') !~ '\[\[lx:[a-f0-9-]{36}\]\]' then return new;end if;
 if auth.uid() is distinct from new.sender_id or not exists(select 1 from public.lx_profiles where user_id=new.sender_id and approved and is_premium) then raise exception 'PREMIUM_EXPRESSION_REQUIRED';end if;
 for item in select regexp_matches(new.body,'\[\[lx:([a-f0-9-]{36})\]\]','g') loop
  n:=n+1;if n>50 then raise exception 'EXPRESSION_LIMIT';end if;
  if not exists(select 1 from public.lx_premium_assets a where a.id=item[1]::uuid and not a.archived and (a.user_id=auth.uid() or exists(select 1 from jsonb_array_elements(public.lx_plus_directory()) x where x->>'user_id'=a.user_id::text))) then raise exception 'EXPRESSION_UNAVAILABLE';end if;
 end loop;return new;
end;$$;
do $$declare target text;begin foreach target in array array['lx_messages','lx_group_messages'] loop if to_regclass('public.'||target) is not null then execute format('drop trigger if exists lx_validate_premium_expression on public.%I',target);execute format('create trigger lx_validate_premium_expression before insert or update of body on public.%I for each row execute function lx_private.validate_expression_message()',target);end if;end loop;end;$$;
revoke all on function lx_private.valid_premium_identity(jsonb),lx_private.guard_premium_identity(),public.lx_set_premium_identity(jsonb,jsonb),lx_private.cosmetics_many(uuid[]),public.lx_profile_cosmetics_many(uuid[]),lx_private.guard_premium_asset(),lx_private.premium_assets(uuid[]),public.lx_premium_assets(uuid[]),lx_private.archive_premium_asset(uuid),public.lx_archive_premium_asset(uuid),lx_private.validate_expression_message() from public,anon;
grant execute on function lx_private.valid_premium_identity(jsonb),public.lx_set_premium_identity(jsonb,jsonb),lx_private.cosmetics_many(uuid[]),public.lx_profile_cosmetics_many(uuid[]),lx_private.premium_assets(uuid[]),public.lx_premium_assets(uuid[]),lx_private.archive_premium_asset(uuid),public.lx_archive_premium_asset(uuid) to authenticated;

create or replace function lx_private.validate_premium_call_sound() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='reaction' and new.payload ? 'sound' then
  if auth.uid() is distinct from new.sender_id or not exists(select 1 from public.lx_profiles where user_id=new.sender_id and approved and is_premium) or new.payload->>'sound' not in('sparkle','chime','pulse') then raise exception 'PREMIUM_SOUND_REQUIRED';end if;
 end if;return new;
end;$$;
revoke all on function lx_private.validate_premium_call_sound() from public,anon,authenticated;
drop trigger if exists lx_validate_premium_call_sound on public.lx_call_signals;
create trigger lx_validate_premium_call_sound before insert on public.lx_call_signals for each row execute function lx_private.validate_premium_call_sound();
