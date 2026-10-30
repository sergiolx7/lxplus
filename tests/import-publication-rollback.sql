-- Server-side validation of publication gates. All fixture records are rolled back.
-- This does not contact Google Drive or TMDB and does not validate their credentials.
begin;
do $fixtures$
declare owner_id uuid;member_id uuid;source_id uuid;job1 uuid;job2 uuid;item1 uuid;item2 uuid;identity text;
begin
 select user_id into owner_id from public.lx_admins where role='owner' limit 1;
 select p.user_id into member_id from public.lx_profiles p where p.approved and not exists(select 1 from public.lx_admins a where a.user_id=p.user_id) limit 1;
 if owner_id is null or member_id is null then raise exception 'TEST_ACTORS_MISSING';end if;
 identity:='drive:QA_'||replace(gen_random_uuid()::text,'-','');
 insert into public.lx_drive_sources(folder_id,name,created_by,enabled) values('QA_'||replace(gen_random_uuid()::text,'-',''),'__QA_ROLLBACK__',owner_id,false) returning id into source_id;
 insert into public.lx_import_jobs(source_id,created_by,status) values(source_id,owner_id,'review') returning id into job1;
 insert into public.lx_import_jobs(source_id,created_by,status) values(source_id,owner_id,'review') returning id into job2;
 insert into public.lx_import_items(job_id,source_key,filename,payload,confidence,status) values(job1,identity,'__QA_ROLLBACK__.mp4',jsonb_build_object('type','Filme','title','__QA_ROLLBACK__','catalogIdentity',identity,'sourceUrl','https://example.invalid/qa.mp4'),0.4,'ready') returning id into item1;
 insert into public.lx_import_items(job_id,source_key,filename,payload,confidence,status) values(job2,identity,'__QA_ROLLBACK__.mp4',jsonb_build_object('type','Filme','title','__QA_ROLLBACK__','catalogIdentity',identity,'sourceUrl','https://example.invalid/qa.mp4'),1,'ready') returning id into item2;
 perform set_config('qa.owner',owner_id::text,true);perform set_config('qa.member',member_id::text,true);perform set_config('qa.item1',item1::text,true);perform set_config('qa.item2',item2::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
end $fixtures$;
set local role authenticated;
do $gates$
declare denied boolean:=false;r jsonb;first_id bigint;
begin
 begin perform public.lx_publish_import(current_setting('qa.item1')::uuid,false);exception when others then if sqlerrm='DISTRIBUTION_RIGHTS_REQUIRED' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'RIGHTS_GATE_FAILED';end if;
 denied:=false;begin perform public.lx_publish_import(current_setting('qa.item1')::uuid,true);exception when others then if sqlerrm='MANUAL_REVIEW_REQUIRED' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'CONFIDENCE_GATE_FAILED';end if;
 update public.lx_import_items set confidence=1 where id=current_setting('qa.item1')::uuid;
 r:=public.lx_publish_import(current_setting('qa.item1')::uuid,true);first_id:=(r->>'id')::bigint;
 if r->>'status'<>'published' or not exists(select 1 from public.lx_catalog where id=first_id and published and payload->'license'->>'authorized'='true') then raise exception 'PUBLICATION_FAILED';end if;
 r:=public.lx_publish_import(current_setting('qa.item2')::uuid,true);
 if r->>'status'<>'duplicate' or (r->>'id')::bigint<>first_id then raise exception 'ACTIVE_SOURCE_DEDUPLICATION_FAILED';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.member'),'role','authenticated')::text,true);
 if exists(select 1 from public.lx_import_items where id=current_setting('qa.item1')::uuid) then raise exception 'MEMBER_IMPORT_VISIBILITY_LEAK';end if;
 denied:=false;begin perform public.lx_publish_import(current_setting('qa.item1')::uuid,true);exception when others then if sqlerrm='ADMIN_REQUIRED' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'MEMBER_PUBLICATION_ALLOWED';end if;
end $gates$;
rollback;
select 'PASS: rights gate, confidence gate, reviewed publication, active source duplicate, member denial and import privacy. All fixtures rolled back; no provider files touched.' result;
