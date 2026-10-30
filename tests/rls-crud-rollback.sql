begin;
do $actors$
declare a uuid;b uuid;c uuid;
begin
 select p.user_id into a from public.lx_profiles p where p.approved and not exists(select 1 from public.lx_admins x where x.user_id=p.user_id) order by p.user_id limit 1;
 select p.user_id into b from public.lx_profiles p where p.approved and p.user_id<>a and not exists(select 1 from public.lx_admins x where x.user_id=p.user_id) order by p.user_id limit 1;
 select user_id into c from public.lx_admins where role='owner' limit 1;
 if a is null or b is null or c is null then raise exception 'TEST_ACTOR_MISSING';end if;
 perform set_config('qa.member',a::text,true);perform set_config('qa.other',b::text,true);perform set_config('qa.admin',c::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
end $actors$;
set local role authenticated;
do $crud$
declare post_id uuid;list_id uuid;ticket bigint;denied boolean;report jsonb;test_title text;data_before jsonb;data_after jsonb;
begin
 insert into public.lx_posts(author_id,body,visibility) values(auth.uid(),'__QA_PRIVATE_POST__','private') returning id into post_id;
 perform set_config('qa.post',post_id::text,true);
 insert into public.lx_post_likes(post_id,user_id) values(post_id,auth.uid());
 insert into public.lx_post_comments(post_id,user_id,body) values(post_id,auth.uid(),'__QA_COMMENT__');
 insert into public.lx_playlists(owner_id,name) values(auth.uid(),'__QA_PRIVATE_PLAYLIST__') returning id into list_id;
 perform set_config('qa.playlist',list_id::text,true);
 insert into public.lx_support_tickets(user_id,topic) values(auth.uid(),'__QA_SUPPORT_CONSENT__') returning id into ticket;
 perform set_config('qa.ticket',ticket::text,true);
 insert into public.lx_support_consents(ticket_id,user_id,diagnostics) values(ticket,auth.uid(),'{"qa":true}'::jsonb);
 select data into data_before from public.lx_user_state where user_id=auth.uid();
 select public.lx_set_user_field('qa_guard','true'::jsonb) into data_after;
 if data_after-'qa_guard' is distinct from coalesce(data_before,'{}'::jsonb)-'qa_guard' then raise exception 'UNRELATED_PREFERENCES_CHANGED';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.other'),'role','authenticated')::text,true);
 if exists(select 1 from public.lx_posts where id=post_id) then raise exception 'PRIVATE_POST_LEAK';end if;
 if exists(select 1 from public.lx_post_likes where lx_post_likes.post_id=current_setting('qa.post')::uuid) then raise exception 'PRIVATE_LIKES_LEAK';end if;
 if exists(select 1 from public.lx_playlists where id=list_id) then raise exception 'PRIVATE_PLAYLIST_LEAK';end if;
 if exists(select 1 from public.lx_support_consents where ticket_id=current_setting('qa.ticket')::bigint) then raise exception 'CONSENT_LEAK';end if;
 denied:=false;begin insert into public.lx_posts(author_id,body) values(current_setting('qa.member')::uuid,'__QA_FORGED_AUTHOR__');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'AUTHOR_FORGERY_ALLOWED';end if;
 denied:=false;begin perform public.lx_studio_archive(array[1]::bigint[],true);exception when others then denied:=true;end;
 if not denied then raise exception 'MEMBER_ADMIN_MUTATION_ALLOWED';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.admin'),'role','authenticated')::text,true);
 if not exists(select 1 from public.lx_support_consents where ticket_id=current_setting('qa.ticket')::bigint) then raise exception 'ACTIVE_CONSENT_UNAVAILABLE';end if;
 test_title:='__QA_DRAFT__'||gen_random_uuid()::text;
 select public.lx_stage_catalog_batch(jsonb_build_array(jsonb_build_object('title',test_title,'type','Filme','sourceUrl','https://example.invalid/'||test_title||'.mp4'))) into report;
 if (report->>'added')::integer<>1 then raise exception 'DRAFT_STAGE_FAILED';end if;
 if not exists(select 1 from public.lx_catalog where payload->>'title'=test_title and not published) then raise exception 'DRAFT_BECAME_PUBLIC';end if;
 select public.lx_stage_catalog_batch(jsonb_build_array(jsonb_build_object('title',test_title,'type','Filme','sourceUrl','https://example.invalid/'||test_title||'.mp4'))) into report;
 if (report->>'duplicates')::integer<>1 or (report->>'added')::integer<>0 then raise exception 'DUPLICATE_SOURCE_ACCEPTED';end if;
end $crud$;
reset role;
update public.lx_support_consents set expires_at=now()-interval '1 second' where ticket_id=current_setting('qa.ticket')::bigint;
set local role authenticated;
do $expiry$begin
 if exists(select 1 from public.lx_support_consents where ticket_id=current_setting('qa.ticket')::bigint) then raise exception 'EXPIRED_CONSENT_VISIBLE_TO_ADMIN';end if;
end $expiry$;
rollback;
select 'PASS: private posts, likes/comments, playlists, support consent and expiry, actor ownership, administrative denial, atomic state merge, draft ingestion and duplicate rejection. All fixture writes rolled back.' as result;
