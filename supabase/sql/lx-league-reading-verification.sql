-- A separate reading ledger prevents client-authored "read_valid" score claims.
-- All earning is based on server-time and a verified published LX Book.
create table if not exists public.lx_reading_sessions(
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 content_key text not null,
 seconds integer not null default 0,
 pages_seen integer[] not null default '{}'::integer[],
 last_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 primary key(user_id,session_id),
 check (seconds between 0 and 86400),
 check (cardinality(pages_seen)<=100)
);
alter table public.lx_reading_sessions enable row level security;
revoke all on public.lx_reading_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.lx_reading_sessions to service_role;
create or replace function public.lx_record_reading(p_session uuid,p_content text,p_page integer,p_pages integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); old public.lx_reading_sessions; delta integer:=0;new_seconds integer:=0;new_pages integer[];cid bigint;
begin
 if u is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED';end if;
 if p_session is null or p_content !~ '^[0-9]{1,18}$' or p_pages not between 3 and 10000 or p_page not between 1 and p_pages then raise exception 'INVALID_READING';end if;
 cid:=p_content::bigint;
 if not exists(select 1 from public.lx_catalog where id=cid and published and payload->>'type'='Livro') then raise exception 'BOOK_NOT_AVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,59));
 select * into old from public.lx_reading_sessions where user_id=u and session_id=p_session for update;
 if found and old.content_key<>p_content then raise exception 'SESSION_MISMATCH';end if;
 if found then
  delta:=least(30,greatest(0,floor(extract(epoch from now()-old.last_at))::integer));
  new_seconds:=least(86400,old.seconds+delta);
  new_pages:=case when p_page=any(old.pages_seen) then old.pages_seen else array_append(old.pages_seen,p_page) end;
 else new_pages:=array[p_page]; end if;
 insert into public.lx_reading_sessions(user_id,session_id,content_key,seconds,pages_seen,last_at)
 values(u,p_session,p_content,new_seconds,new_pages,now())
 on conflict(user_id,session_id) do update set seconds=excluded.seconds,pages_seen=excluded.pages_seen,last_at=now();
 return jsonb_build_object('seconds',new_seconds,'pages',cardinality(new_pages),'eligible',new_seconds>=110 and cardinality(new_pages)>=3);
end $$;
revoke all on function public.lx_record_reading(uuid,text,integer,integer) from public,anon;
grant execute on function public.lx_record_reading(uuid,text,integer,integer) to authenticated;

-- Extra BEFORE trigger validates read_valid events against the ledger, so a
-- scripted event can't produce points by merely asserting a content_id.
create or replace function lx_private.verify_reading_award()
returns trigger language plpgsql security definer set search_path='' as $$
declare sid uuid; readrow public.lx_reading_sessions;
begin
 if new.event_type<>'read_valid' then return new;end if;
 begin sid:=substring(new.ref_key from '^read:([0-9a-f-]{36})$')::uuid;
 exception when others then raise exception 'READING_NOT_VERIFIED';end;
 if sid is null then raise exception 'READING_NOT_VERIFIED';end if;
 select * into readrow from public.lx_reading_sessions where user_id=new.user_id and session_id=sid;
 if readrow is null or readrow.content_key<>new.metadata->>'content_id' or readrow.seconds<110 or cardinality(readrow.pages_seen)<3 then
  raise exception 'READING_NOT_VERIFIED';
 end if;
 return new;
end $$;
drop trigger if exists lx_confirm_reading on public.lx_rank_events;
create trigger lx_confirm_reading before insert on public.lx_rank_events
for each row execute function lx_private.verify_reading_award();
revoke all on function lx_private.verify_reading_award() from public,anon,authenticated;
