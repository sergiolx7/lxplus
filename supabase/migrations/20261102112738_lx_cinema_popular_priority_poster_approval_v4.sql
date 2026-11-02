-- Popular-first editorial queue. This is an editorial priority, NOT invented viewer statistics.
-- Only authenticated catalog admins can view or change the queue.
create table if not exists public.lx_cinema_priority_queue(
 id bigint generated always as identity primary key,
 kind text not null check(kind in ('Filme','Série','Dorama','Anime')),
 title text not null,
 release_year integer not null check(release_year between 1880 and 2100),
 editorial_rank integer not null check(editorial_rank between 1 and 9999),
 source_id text,
 synopsis text,
 poster_url text,
 poster_evidence text,
 poster_credit text,
 rights_verified boolean not null default false,
 age_verified boolean not null default false,
 status text not null default 'awaiting_poster'
 check(status in ('awaiting_poster','ready','published','duplicate','needs_metadata')),
 catalog_id bigint,
 updated_at timestamptz not null default now()
);
create unique index if not exists lx_cinema_priority_title_yr_idx
on public.lx_cinema_priority_queue(kind,lower(trim(title)),release_year);
create index if not exists lx_cinema_priority_queue_sort_idx
on public.lx_cinema_priority_queue(status,editorial_rank);
alter table public.lx_cinema_priority_queue enable row level security;
revoke all on public.lx_cinema_priority_queue from public,anon,authenticated;
insert into public.lx_cinema_priority_queue(kind,title,release_year,editorial_rank)
values
('Filme','Titanic',1997,1),
('Filme','Avatar',2009,2),
('Filme','Spider-Man: No Way Home',2021,3),
('Filme','Avengers: Endgame',2019,4),
('Filme','Avengers: Infinity War',2018,5),
('Filme','The Avengers',2012,6),
('Filme','Spider-Man',2002,7),
('Filme','The Dark Knight',2008,8),
('Filme','Interstellar',2014,9),
('Filme','Inception',2010,10),
('Filme','The Matrix',1999,11),
('Filme','Barbie',2023,12),
('Filme','Oppenheimer',2023,13),
('Filme','Dune: Part Two',2024,14),
('Filme','Inside Out 2',2024,15),
('Filme','The Lion King',1994,16),
('Filme','Frozen',2013,17),
('Filme','Harry Potter and the Philosopher''s Stone',2001,18),
('Filme','Harry Potter and the Chamber of Secrets',2002,19),
('Filme','Harry Potter and the Prisoner of Azkaban',2004,20),
('Filme','Top Gun: Maverick',2022,21),
('Filme','Jurassic World',2015,22),
('Filme','Shrek',2001,23),
('Filme','Toy Story',1995,24),
('Filme','Black Panther',2018,25),
('Filme','The Super Mario Bros. Movie',2023,26),
('Filme','The Batman',2022,27),
('Filme','Spider-Man: Across the Spider-Verse',2023,28),
('Filme','The Lord of the Rings: The Fellowship of the Ring',2001,29),
('Filme','Moana',2016,30),
('Série','Stranger Things',2016,1),
('Série','Game of Thrones',2011,2),
('Série','Breaking Bad',2008,3),
('Série','The Last of Us',2023,4),
('Série','Squid Game',2021,5),
('Série','Wednesday',2022,6),
('Série','Money Heist',2017,7),
('Série','Bridgerton',2020,8),
('Série','The Walking Dead',2010,9),
('Série','Friends',1994,10),
('Série','Grey''s Anatomy',2005,11),
('Série','Peaky Blinders',2013,12),
('Série','Loki',2021,13),
('Série','The Mandalorian',2019,14),
('Série','Cobra Kai',2018,15),
('Dorama','Queen of Tears',2024,1),
('Dorama','Crash Landing on You',2019,2),
('Dorama','True Beauty',2020,3),
('Dorama','Business Proposal',2022,4),
('Dorama','Extraordinary Attorney Woo',2022,5),
('Dorama','Vincenzo',2021,6),
('Dorama','All of Us Are Dead',2022,7),
('Dorama','It''s Okay to Not Be Okay',2020,8),
('Dorama','Hometown Cha-Cha-Cha',2021,9),
('Dorama','My Demon',2023,10),
('Dorama','Goblin',2016,11),
('Dorama','Descendants of the Sun',2016,12),
('Dorama','The Glory',2022,13),
('Dorama','Lovely Runner',2024,14),
('Anime','Demon Slayer',2019,1),
('Anime','Naruto',2002,2),
('Anime','One Piece',1999,3),
('Anime','Attack on Titan',2013,4),
('Anime','Jujutsu Kaisen',2020,5),
('Anime','Death Note',2006,6),
('Anime','Spy × Family',2022,7),
('Anime','Solo Leveling',2024,8),
('Anime','Dragon Ball Z',1989,9),
('Anime','Frieren: Beyond Journey''s End',2023,10),
('Anime','My Hero Academia',2016,11),
('Anime','Chainsaw Man',2022,12),
('Anime','Bleach',2004,13),
('Anime','Fullmetal Alchemist: Brotherhood',2009,14)
on conflict do nothing;

create or replace function public.lx_cinema_priority_dashboard(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare result jsonb;
begin
 if public.lx_admin_can('catalog') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 if p_limit is null or p_limit<1 or p_limit>150 then raise exception 'INVALID_LIMIT';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(
   select id,kind,title,release_year,editorial_rank,source_id,
   left(coalesce(synopsis,''),380) synopsis,poster_url,poster_credit,
   status,rights_verified,age_verified,catalog_id,updated_at
   from public.lx_cinema_priority_queue order by editorial_rank,kind,title limit p_limit
 )x;
 return jsonb_build_object('rows',result,'total',(select count(*) from public.lx_cinema_priority_queue),
  'waiting_poster',(select count(*) from public.lx_cinema_priority_queue where status='awaiting_poster'),
  'ready',(select count(*) from public.lx_cinema_priority_queue where status='ready'),
  'published',(select count(*) from public.lx_cinema_priority_queue where status='published'));
end $fn$;
revoke all on function public.lx_cinema_priority_dashboard(integer) from public,anon;
grant execute on function public.lx_cinema_priority_dashboard(integer) to authenticated;

create or replace function public.lx_cinema_priority_submit(
 p_id bigint,p_url text,p_evidence text,p_credit text,p_synopsis text,p_age_confirmed boolean
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare current_row public.lx_cinema_priority_queue;
begin
 if public.lx_admin_can('catalog') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 if p_age_confirmed is distinct from true then raise exception 'AGE_REVIEW_REQUIRED';end if;
 if p_url is null or p_url !~ '^https://ubidogquzpdvrbzbhxda[.]supabase[.]co/storage/v1/object/public/lx-assets/artwork/uploads/[A-Za-z0-9-]{12,80}[.](jpg|jpeg|png|webp)$'
 or length(trim(coalesce(p_evidence,'')))<12 or length(trim(coalesce(p_credit,'')))<3
 or length(trim(coalesce(p_synopsis,'')))<20 or length(trim(p_synopsis))>1000
 then raise exception 'UPLOAD_LICENSE_EVIDENCE_AND_SYNOPSIS_REQUIRED';end if;
 select * into current_row from public.lx_cinema_priority_queue where id=p_id for update;
 if not found or current_row.status='published' then raise exception 'QUEUE_ITEM_NOT_EDITABLE';end if;
 update public.lx_cinema_priority_queue set poster_url=p_url,
 poster_evidence=left(trim(p_evidence),1500),poster_credit=left(trim(p_credit),180),
 synopsis=left(trim(p_synopsis),1000),rights_verified=true,age_verified=true,
 status='ready',updated_at=now() where id=p_id;
 return jsonb_build_object('ready',true,'id',p_id);
end $fn$;
revoke all on function public.lx_cinema_priority_submit(bigint,text,text,text,text,boolean) from public,anon;
grant execute on function public.lx_cinema_priority_submit(bigint,text,text,text,text,boolean) to authenticated;

-- Publication is poster-first and requires administrator-verified rights evidence.
-- Popularity is a curated display order, not a claim about views.
create or replace function public.lx_cinema_priority_publish(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' as $fn$
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
   if already is not null or exists(select 1 from public.lx_catalog_tombstones where id=catalog_target) then
    update public.lx_cinema_priority_queue
    set status='duplicate',catalog_id=already,updated_at=now() where id=q.id;
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
end $fn$;
revoke all on function public.lx_cinema_priority_publish(integer) from public,anon;
grant execute on function public.lx_cinema_priority_publish(integer) to authenticated;
