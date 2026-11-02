-- Laboratório administrativo: contadores simulados NÃO são engajamento real.
-- Nunca altera lx_post_likes, lx_friendships, ranking, anúncios ou métricas públicas.
create table if not exists public.lx_engagement_lab(
 target_type text not null check (target_type in ('post','profile')),
 target_id uuid not null,
 simulated_count integer not null default 0 check (simulated_count between 0 and 100000),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key (target_type,target_id)
);
alter table public.lx_engagement_lab enable row level security;
revoke all on public.lx_engagement_lab from public,anon,authenticated;
grant select,insert,update,delete on public.lx_engagement_lab to service_role;

create or replace function public.lx_engagement_lab_set(p_kind text,p_target uuid,p_count integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() not in ('owner','administrator') then raise exception 'ADMIN_REQUIRED'; end if;
 if p_kind is null or p_kind not in ('post','profile') or p_target is null or p_count is null or p_count < 0 or p_count > 100000
 then raise exception 'INVALID_SIMULATION'; end if;
 if p_kind='post' and not exists (select 1 from public.lx_posts where id=p_target)
 then raise exception 'POST_NOT_FOUND'; end if;
 if p_kind='profile' and not exists (select 1 from public.lx_profiles where user_id=p_target)
 then raise exception 'PROFILE_NOT_FOUND'; end if;
 if p_count=0 then
   delete from public.lx_engagement_lab where target_type=p_kind and target_id=p_target;
 else
   insert into public.lx_engagement_lab(target_type,target_id,simulated_count,updated_by,updated_at)
   values(p_kind,p_target,p_count,auth.uid(),now())
   on conflict(target_type,target_id) do update
   set simulated_count=excluded.simulated_count,updated_by=auth.uid(),updated_at=now();
 end if;
 return jsonb_build_object('ok',true,'kind',p_kind,'id',p_target,'simulated_count',p_count);
end $$;
revoke all on function public.lx_engagement_lab_set(text,uuid,integer) from public,anon;
grant execute on function public.lx_engagement_lab_set(text,uuid,integer) to authenticated;

create or replace function public.lx_engagement_lab_dashboard()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() not in ('owner','administrator') then raise exception 'ADMIN_REQUIRED'; end if;
 return jsonb_build_object(
 'posts',coalesce((
   select jsonb_agg(to_jsonb(p) order by p.created_at desc)
   from (
     select a.id, a.created_at, left(coalesce(a.body,''),105) as preview,
       (select count(*) from public.lx_post_likes l where l.post_id=a.id) as real_likes,
       coalesce(t.simulated_count,0) as simulated_likes
     from public.lx_posts a
     left join public.lx_engagement_lab t on t.target_type='post' and t.target_id=a.id
     order by a.created_at desc limit 30
   ) p
 ),'[]'::jsonb),
 'profiles',coalesce((
   select jsonb_agg(to_jsonb(p) order by p.name)
   from (
     select a.user_id as id, a.name,
       coalesce(t.simulated_count,0) as simulated_followers
     from public.lx_profiles a
     left join public.lx_engagement_lab t on t.target_type='profile' and t.target_id=a.user_id
     order by a.created_at desc limit 30
   ) p
 ),'[]'::jsonb));
end $$;
revoke all on function public.lx_engagement_lab_dashboard() from public,anon;
grant execute on function public.lx_engagement_lab_dashboard() to authenticated;

-- Somente no navegador de ADM: números simulados aparecem como PRÉVIA, nunca como métricas reais.
create or replace function public.lx_engagement_lab_previews(p_post_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() not in ('owner','administrator') then
   return '[]'::jsonb;
 end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object('post_id',t.target_id,'simulated_count',t.simulated_count))
   from public.lx_engagement_lab t
   where t.target_type='post' and t.simulated_count>0
   and t.target_id=any(coalesce(p_post_ids,'{}'::uuid[]))
 ),'[]'::jsonb);
end $$;
revoke all on function public.lx_engagement_lab_previews(uuid[]) from public,anon;
grant execute on function public.lx_engagement_lab_previews(uuid[]) to authenticated;
