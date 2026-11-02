-- Metadata preview and explicit editorial approval. Requires verified age and rights checks.
CREATE OR REPLACE FUNCTION public.lx_cinema_robot_review(p_kind text DEFAULT 'films'::text, p_term text DEFAULT ''::text, p_limit integer DEFAULT 16)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare out jsonb;
begin
 if public.lx_admin_can('catalog') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 if p_kind not in ('films','series') or p_limit<1 or p_limit>30 then raise exception 'INVALID_FILTER';end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into out
 from (
  select d.id,d.title,d.year,left(d.description,500) description,
   case when d.artwork->>'kind'='commons' then d.cover_url else '' end cover_url,
   d.source_url,d.artwork,d.media_kind,d.updated_at
  from public.lx_auto_discovery d
  where d.media_kind=p_kind and d.published=false
   and (length(trim(coalesce(p_term,'')))=0 or d.title ilike '%'||left(trim(p_term),100)||'%')
  order by d.updated_at desc,d.id desc limit p_limit
 ) r;
 return out;
end $function$;

CREATE OR REPLACE FUNCTION public.lx_cinema_robot_approve(p_source_id text, p_type text, p_age_checked boolean, p_rights_checked boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.lx_auto_discovery;item_id bigint;existing bigint;art jsonb;v_cover text:='';v_title text;
begin
 if public.lx_admin_can('catalog') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 if p_source_id !~ '^Q[1-9][0-9]{0,9}$' or p_type not in ('Filme','Série','Dorama') or
  p_age_checked is distinct from true or p_rights_checked is distinct from true
 then raise exception 'REVIEW_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('lx_cinema_review',47));
 select * into d from public.lx_auto_discovery
 where id=p_source_id and media_kind=case when p_type='Filme' then 'films' else 'series' end
 and published=false for update;
 if not found then raise exception 'ITEM_NOT_FOUND_OR_ALREADY_RELEASED';end if;
 v_title:=left(trim(d.title),200);
 if length(v_title)<2 or d.year is null or d.year<1880 or d.year>2100 or
   length(trim(coalesce(d.description,'')))<10 then raise exception 'INSUFFICIENT_METADATA';end if;
 item_id:=8700000000000+substring(d.id from 2)::bigint;
 if exists(select 1 from public.lx_catalog_tombstones where id=item_id) then
  raise exception 'CONTENT_REMOVED_BY_ADMIN';end if;
 select c.id into existing from public.lx_catalog c where c.id=item_id
  or c.payload->>'metadataSourceId'=d.id
  or (c.payload->>'type'=p_type and lower(trim(c.payload->>'title'))=lower(v_title)
    and c.payload->>'year'=d.year::text) limit 1;
 if existing is not null then return jsonb_build_object('inserted',false,'id',existing,'reason','duplicate');end if;
 art:=d.artwork;
 -- Only Wikimedia Commons art whose license was independently checked may be displayed.
 if art->>'kind'='commons' and
  (art->>'license') ~* '^(CC0|CC BY(?:-SA)? [1-4]\\.[0-9]|Public domain)$'
  and d.cover_url ~ '^https://upload\\.wikimedia\\.org/'
  and art->>'source_url' ~ '^https://commons\\.wikimedia\\.org/'
 then v_cover:=d.cover_url;end if;
 insert into public.lx_catalog(id,payload,published,updated_at)
 values(item_id,jsonb_build_object(
  'type',p_type,'title',v_title,'year',d.year,'desc',left(d.description,1500),
  'cover',v_cover,'genre','Cinema','metadataOnly',true,'catalogOnly',true,
  'availability','coming_soon','metadataProvider','Wikidata',
  'metadataSourceId',d.id,'metadataSource',d.source_url,
  'artworkRights',case when v_cover<>'' then art else '{}'::jsonb end,
  'ageReviewed',true,'editorialApprovedAt',now(),
  'published',true
 ),true,now());
 update public.lx_auto_discovery set curator_locked=true where id=d.id;
 return jsonb_build_object('inserted',true,'id',item_id,'type',p_type,'cover_verified',v_cover<>'');
end $function$;
revoke all on function public.lx_cinema_robot_review(text,text,integer) from public,anon;
grant execute on function public.lx_cinema_robot_review(text,text,integer) to authenticated;
revoke all on function public.lx_cinema_robot_approve(text,text,boolean,boolean) from public,anon;
grant execute on function public.lx_cinema_robot_approve(text,text,boolean,boolean) to authenticated;
