create schema lx_backup_20261030;
revoke all on schema lx_backup_20261030 from public,anon,authenticated;
create table lx_backup_20261030.manifest(source_schema text,source_table text,backup_table text primary key,row_count bigint,checksum text,restore_verified boolean default false);
create table lx_backup_20261030.definitions(kind text,identity text,definition jsonb);
insert into lx_backup_20261030.definitions
select 'function',p.oid::regprocedure::text,to_jsonb(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','lx_private') and p.prokind='f';
insert into lx_backup_20261030.definitions
select 'column',table_schema||'.'||table_name||'.'||column_name,to_jsonb(c) from information_schema.columns c where table_schema in ('public','auth','storage','lx_private','vault','cron','supabase_migrations');
insert into lx_backup_20261030.definitions
select 'constraint',c.oid::text,jsonb_build_object('schema',n.nspname,'table',r.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname in ('public','auth','storage','lx_private','vault','cron','supabase_migrations');
insert into lx_backup_20261030.definitions select 'policy',schemaname||'.'||tablename||'.'||policyname,to_jsonb(p) from pg_policies p where schemaname in ('public','auth','storage','lx_private');
insert into lx_backup_20261030.definitions select 'index',schemaname||'.'||indexname,to_jsonb(i) from pg_indexes i where schemaname in ('public','auth','storage','lx_private');
insert into lx_backup_20261030.definitions select 'trigger',t.oid::text,to_jsonb(pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage','lx_private') and not t.tgisinternal;
insert into lx_backup_20261030.definitions select 'sequence',schemaname||'.'||sequencename,to_jsonb(s) from pg_sequences s where schemaname in ('public','auth','storage','lx_private');
insert into lx_backup_20261030.definitions select 'view',schemaname||'.'||viewname,to_jsonb(v) from pg_views v where schemaname in ('public','lx_private','auth','storage');
insert into lx_backup_20261030.definitions select 'grant',table_schema||'.'||table_name,to_jsonb(g) from information_schema.table_privileges g where table_schema in ('public','lx_private','auth','storage');
do $backup$
declare r record; target text; n bigint; sig text; restored text; original text; original_n bigint;
begin
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage','lx_private','vault','cron','supabase_migrations') and c.relkind='r' order by n.nspname,c.relname loop
  target:=r.nspname||'__'||r.relname;
  execute format('create table lx_backup_20261030.%I as select * from %I.%I',target,r.nspname,r.relname);
  execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'''' order by md5(to_jsonb(t)::text)),'''')) from %I.%I t',r.nspname,r.relname) into original_n,original;
  execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'''' order by md5(to_jsonb(t)::text)),'''')) from lx_backup_20261030.%I t',target) into n,sig;
  if n<>original_n or sig<>original then raise exception 'Backup mismatch: %.%',r.nspname,r.relname; end if;
  execute format('create temp table lx_restore_probe on commit drop as select * from lx_backup_20261030.%I',target);
  select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) into restored from lx_restore_probe t;
  if sig<>restored then raise exception 'Restore mismatch: %',target; end if;
  drop table lx_restore_probe;
  insert into lx_backup_20261030.manifest values(r.nspname,r.relname,target,n,sig,true);
 end loop;
end $backup$;
revoke all on all tables in schema lx_backup_20261030 from public,anon,authenticated;
alter default privileges in schema lx_backup_20261030 revoke all on tables from public,anon,authenticated;
