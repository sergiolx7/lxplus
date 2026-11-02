CREATE OR REPLACE FUNCTION public.lx_cinema_priority_publish(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare q public.lx_cinema_priority_queue; catalog_target bigint; already bigint;published_count integer:=0;skipped integer:=0;
begin
 if public.lx_admin_can('catalog') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 if p_limit is null or p_limit<1 or p_limit>30 then raise exception 'INVALID_LIMIT';end if;
 perform pg_advisory_xact_lock(hashtextextended('lx_priority_publish',47));
 for q in select * from public.lx_cinema_priority_queue
 where status='ready' and rights_verified and age_verified
 and coalesce(poster_url,'')<>'' and length(trim(coalesce(poster_evidence,'')))>=12
 and length(trim(coalesce(synopsis,'')))>=20
 order by editorial_rank,kind,id limit p_limit for update skip locked
 loop
   catalog_target:=8800000000000+q.id;
   select c.id into already from public.lx_catalog c
   where (c.payload->>'type'=q.kind and lower(trim(c.payload->>'title'))=lower(trim(q.title))
    and c.payload->>'year'=q.release_year::text)
   or (q.source_id is not null and c.payload->>'metadataSourceId'=q.source_id)
   order by c.published desc,c.id limit 1;
   if already is not null then
    -- Reuse only an automated, hidden metadata-only draft. Never overwrite a human upload.
    update public.lx_catalog c
    set published=true,payload=c.payload || jsonb_build_object(
       'cover',q.poster_url,
       'coverRights',jsonb_build_object('evidence',q.poster_evidence,'credit',q.poster_credit,'verified',true),
       'desc',q.synopsis,'editorialRank',q.editorial_rank,'editorialPriority',true,
       'availability','coming_soon','ageReviewed',true,'reviewedPosterAt',now(),
       'published',true,'reviewReason','POSTER_APPROVED'),
       updated_at=now()
    where c.id=already and not c.published
       and c.payload->>'metadataOnly'='true'
       and nullif(c.payload->>'cover','') is null
       and nullif(c.payload->>'mediaKey','') is null
       and coalesce(c.payload->>'manualLocked','false')<>'true'
       and coalesce(c.payload->>'archived','false')<>'true'
       and not exists(select 1 from public.lx_catalog_tombstones t where t.id=c.id);
    if found then
      update public.lx_cinema_priority_queue set status='published',catalog_id=already,updated_at=now() where id=q.id;
      published_count:=published_count+1;continue;
    end if;
    update public.lx_cinema_priority_queue set status='duplicate',catalog_id=already,updated_at=now() where id=q.id;
    skipped:=skipped+1;continue;
   end if;
   if exists(select 1 from public.lx_catalog_tombstones where id=catalog_target) then
    update public.lx_cinema_priority_queue set status='duplicate',updated_at=now() where id=q.id;
    skipped:=skipped+1;continue;
   end if;
   insert into public.lx_catalog(id,payload,published,updated_at)
   values(catalog_target,jsonb_build_object(
    'type',q.kind,'title',q.title,'year',q.release_year,'desc',q.synopsis,
    'cover',q.poster_url,'coverRights',jsonb_build_object('evidence',q.poster_evidence,'credit',q.poster_credit,'verified',true),
    'editorialRank',q.editorial_rank,
    'editorialPriority',true,'metadataOnly',true,'catalogOnly',true,
    'availability','coming_soon','published',true,
    'ageReviewed',true,'reviewedPosterAt',now()
   ),true,now()) on conflict(id) do nothing;
   if found then
    update public.lx_cinema_priority_queue set status='published',catalog_id=catalog_target,updated_at=now() where id=q.id;
    published_count:=published_count+1;
   else skipped:=skipped+1;end if;
 end loop;
 return jsonb_build_object('published',published_count,'skipped',skipped);
end $function$
;