-- Keep activity counts private even when a public ranking level is visible.
create or replace function lx_private.community_identity() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'username',p.username,
   'progress',case when p.ranking_visible or p.user_id=auth.uid() then case when p.user_id=auth.uid() then lx_private.member_progress(p.user_id) else lx_private.member_progress(p.user_id)-array['music','watched','books'] end else null end)),'[]'::jsonb)
 from public.lx_profiles p where auth.uid() is not null and public.lx_is_approved() and
 (p.user_id=auth.uid() or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id))
$$;
create or replace function lx_private.member_profile(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.lx_profiles; accessible boolean; results_visible boolean; progress jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 select * into p from public.lx_profiles where user_id=p_user;
 accessible:=p.user_id=auth.uid() or (p.approved and (p.ranking_visible or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id)));
 if not coalesce(accessible,false) then return jsonb_build_object('private',true); end if;
 results_visible:=p.user_id=auth.uid() or (p.activity_visible and (p.social_visible or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id and d.relation='accepted')));
 if p.ranking_visible or p.user_id=auth.uid() then progress:=lx_private.member_progress(p_user); end if;
 if not results_visible then progress:=progress-array['music','watched','books']; end if;
 return jsonb_build_object('user_id',p.user_id,'name',p.name,'username',p.username,'avatar_url',p.avatar_url,
  'banner_url',p.banner_url,'verified',p.verified,'bio',p.bio,'created_at',p.created_at,'private',false,
  'progress',progress,'results_visible',results_visible,'favorites_visible',(p.user_id=auth.uid() or p.favorites_visible) and results_visible,
  'favorite_ids',case when (p.user_id=auth.uid() or p.favorites_visible) and results_visible then p.favorite_ids else '[]'::jsonb end,
  'listening_seconds',case when results_visible then (select coalesce(sum(seconds),0) from public.lx_listening_daily where user_id=p_user) else null end);
end $$;
create or replace function lx_private.ranking_insights(p_period text,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare since timestamptz; rows jsonb; me jsonb; total integer;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_period not in ('Semanal','Mensal','Geral') or p_kind not in ('Geral','Assistiu','Ouviu','Leu') then raise exception 'INVALID_FILTER'; end if;
 since:=case p_period when 'Semanal' then date_trunc('week',now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza' when 'Mensal' then date_trunc('month',now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza' else '-infinity'::timestamptz end;
 with scores as (
  select row_number() over(order by sum(e.points) desc,p.name,p.user_id) position,p.user_id,p.name,p.username,p.avatar_url,p.verified,sum(e.points) score,(lx_private.member_progress(p.user_id)-array['music','watched','books']) progress
  from public.lx_rank_events e join public.lx_profiles p on p.user_id=e.user_id
  where e.created_at>=since and e.status='confirmed' and p.ranking_visible and p.approved and (p_kind='Geral' or e.event_type=case p_kind when 'Assistiu' then 'watch_valid' when 'Ouviu' then 'music_valid' else 'read_valid' end)
  group by p.user_id having sum(e.points)>0
 ) select coalesce(jsonb_agg(to_jsonb(s) order by position) filter(where position<=200),'[]'::jsonb),
  (jsonb_agg(to_jsonb(s)) filter(where user_id=auth.uid()))->0,count(*) into rows,me,total from scores s;
 return jsonb_build_object('rows',rows,'me',me,'participants',total,'progress',lx_private.member_progress(auth.uid()),'since',case when isfinite(since) then since else null end);
end $$;
