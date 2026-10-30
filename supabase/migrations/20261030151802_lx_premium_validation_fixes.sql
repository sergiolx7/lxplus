CREATE OR REPLACE FUNCTION lx_private.plus_directory()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.name,'username',p.username,'verified',p.verified,'avatar_url',p.avatar_url,'banner_url',p.banner_url,'bio',p.bio,'calls_enabled',p.calls_enabled,'ranking_visible',p.ranking_visible,'social_visible',p.social_visible,'relation',coalesce(f.status,'none'),'direction',case when f.status='pending' then case when f.requested_by=auth.uid() then 'outgoing' else 'incoming' end else 'none' end) order by p.name),'[]'::jsonb)
 from public.lx_profiles p left join public.lx_friendships f on ((f.user_low=auth.uid() and f.user_high=p.user_id) or (f.user_high=auth.uid() and f.user_low=p.user_id))
 where auth.uid() is not null and public.lx_is_approved() and p.approved and (p.user_id=auth.uid() or p.social_visible or f.status in('accepted','pending'));
$function$;
CREATE OR REPLACE FUNCTION lx_private.publish_import(p_item uuid, p_rights boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i public.lx_import_items%rowtype;content_id bigint;data jsonb;
begin
 if auth.uid() is null or public.lx_admin_can('catalog') is not true then raise exception 'ADMIN_REQUIRED';end if;
 if p_rights is not true then raise exception 'DISTRIBUTION_RIGHTS_REQUIRED';end if;
 select * into i from public.lx_import_items where id=p_item for update;
 if not found or i.status<>'ready' then raise exception 'ITEM_NOT_READY';end if;
 if i.source_key !~ '^drive:[A-Za-z0-9_-]{10,128}$' or i.payload->>'type' not in('Filme','Música') or i.confidence<0.9 then raise exception 'MANUAL_REVIEW_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(i.source_key,0));
 select id into content_id from public.lx_catalog where coalesce(payload->>'archived','false')<>'true' and payload->>'catalogIdentity'=i.source_key limit 1;
 if found then update public.lx_import_items set status='duplicate',catalog_id=content_id,reason='Arquivo já cadastrado, inclusive no arquivo antigo' where id=p_item;return jsonb_build_object('status','duplicate','id',content_id);end if;
 content_id:=(extract(epoch from clock_timestamp())*1000000)::bigint;
 data:=i.payload||jsonb_build_object('id',content_id,'catalogIdentity',i.source_key,'sourceVerified',true,'license',jsonb_build_object('authorized',true,'basis','admin-attested','confirmedBy',auth.uid(),'confirmedAt',now()),'importedAt',now());
 insert into public.lx_catalog(id,payload,published) values(content_id,data,true);
 update public.lx_import_items set status='published',catalog_id=content_id,reason='Publicado após revisão do ADM' where id=p_item;
 return jsonb_build_object('status','published','id',content_id);
end $function$;
create index if not exists lx_catalog_kind_page_idx on public.lx_catalog(published,(payload->>'type'),updated_at desc,id desc);
create index if not exists lx_catalog_source_active_idx on public.lx_catalog((payload->>'sourceUrl')) where coalesce(payload->>'archived','false')<>'true';

create function public.lx_save_watch_progress(p_content bigint,p_progress jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare pos integer;dur integer;progress jsonb;
begin
 if auth.uid() is null or jsonb_typeof(p_progress)<>'object' then raise exception 'INVALID_PROGRESS';end if;
 pos:=(p_progress->>'position')::integer;dur:=(p_progress->>'duration')::integer;
 if pos is null or dur is null or pos not between 0 and 604800 or dur not between 0 and 604800 then raise exception 'INVALID_PROGRESS';end if;
 progress:=jsonb_build_object('position',pos,'duration',dur,'episodeIndex',p_progress->'episodeIndex','updatedAt',now());
 insert into public.lx_user_state(user_id,data,updated_at) values(auth.uid(),jsonb_build_object('history',jsonb_build_object(p_content::text,progress)),now())
 on conflict(user_id) do update set data=jsonb_set(coalesce(lx_user_state.data,'{}'),'{history}',coalesce(lx_user_state.data->'history','{}')||jsonb_build_object(p_content::text,progress)),updated_at=now();
end $$;
revoke all on function public.lx_save_watch_progress(bigint,jsonb) from public,anon;
grant execute on function public.lx_save_watch_progress(bigint,jsonb) to authenticated;

create function lx_private.stage_catalog_batch(p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare entry jsonb;data jsonb;cid bigint;source text;title text;kind text;added integer:=0;duplicates integer:=0;attempt integer;
begin
 if auth.uid() is null or public.lx_admin_can('catalog') is not true then raise exception 'ADMIN_REQUIRED';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 or octet_length(p_items::text)>1000000 then raise exception 'BATCH_LIMIT';end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  title:=left(trim(coalesce(entry->>'title','')),200);kind:=entry->>'type';
  if title='' or kind not in('Filme','Série','Dorama','Anime','Música','Livro','Ao Vivo') then raise exception 'INVALID_CONTENT';end if;
  source:=coalesce(nullif(entry->>'authorizedAudioUrl',''),nullif(entry->>'authorizedVideoUrl',''),entry->>'sourceUrl','');
  if source<>'' and source !~ '^https://[^/@?#[:space:]]+([/?#]|$)' then raise exception 'INVALID_SOURCE';end if;
  if source<>'' then
   perform pg_advisory_xact_lock(hashtextextended(source,0));
   if exists(select 1 from public.lx_catalog where payload->>'sourceUrl'=source and coalesce(payload->>'archived','false')<>'true') then duplicates:=duplicates+1;continue;end if;
  end if;
  data:=jsonb_build_object('type',kind,'title',title,'sourceUrl',source,'cover',left(coalesce(entry->>'cover',''),3000),'banner',left(coalesce(entry->>'banner',''),3000),'bannerMobile',left(coalesce(entry->>'bannerMobile',''),3000),'year',entry->'year','desc',left(coalesce(entry->>'desc',entry->>'description',''),2400),'artist',left(coalesce(entry->>'artist',''),200),'author',left(coalesce(entry->>'author',''),200),'album',left(coalesce(entry->>'album',''),200),'genre',left(coalesce(entry->>'genre',''),200),'duration',entry->'duration','importedAt',now(),'importMethod','reviewed-text-draft');
  for attempt in 1..5 loop
   cid:=(extract(epoch from clock_timestamp())*1000000)::bigint;
   begin
    insert into public.lx_catalog(id,payload,published,updated_at) values(cid,data||jsonb_build_object('id',cid),false,now());added:=added+1;exit;
   exception when unique_violation then if attempt=5 then raise;end if;
   end;
  end loop;
 end loop;
 return jsonb_build_object('added',added,'duplicates',duplicates);
end $$;
revoke all on function lx_private.stage_catalog_batch(jsonb) from public,anon;
grant execute on function lx_private.stage_catalog_batch(jsonb) to authenticated;
create function public.lx_stage_catalog_batch(p_items jsonb) returns jsonb language sql security invoker set search_path='' as $$select lx_private.stage_catalog_batch(p_items)$$;
revoke all on function public.lx_stage_catalog_batch(jsonb) from public,anon;
grant execute on function public.lx_stage_catalog_batch(jsonb) to authenticated;
