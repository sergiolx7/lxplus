-- Candidate. Applied only after approval; frontend deployment does not run SQL.
create schema if not exists lx_private;
create table if not exists lx_private.ai_request_budget(
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(),
 window_requests integer not null default 0 check(window_requests>=0),
 budget_day date not null default current_date,
 day_requests integer not null default 0 check(day_requests>=0)
);
alter table lx_private.ai_request_budget enable row level security;
revoke all on lx_private.ai_request_budget from public,anon,authenticated;
grant usage on schema lx_private to service_role;
grant select,insert,update on lx_private.ai_request_budget to service_role;

create or replace function public.lx_ai_reserve(p_user uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare budget lx_private.ai_request_budget%rowtype;
 new_window integer;new_day integer;
 today date:=(now() at time zone 'America/Fortaleza')::date;
begin
 if current_user <> 'service_role' or p_user is null then raise exception 'SERVICE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('lxplus.ai:'||p_user::text,0));
 select * into budget from lx_private.ai_request_budget where user_id=p_user for update;
 if not found then
  insert into lx_private.ai_request_budget(user_id,window_requests,budget_day,day_requests) values(p_user,1,today,1);
  return true;
 end if;
 new_window:=case when budget.window_start<=now()-interval '1 minute' then 0 else budget.window_requests end;
 new_day:=case when budget.budget_day is distinct from today then 0 else budget.day_requests end;
 if new_window>=6 or new_day>=50 then return false;end if;
 update lx_private.ai_request_budget set
  window_start=case when new_window=0 then now() else window_start end,
  window_requests=new_window+1,budget_day=today,day_requests=new_day+1 where user_id=p_user;
 return true;
end $$;
revoke all on function public.lx_ai_reserve(uuid) from public,anon,authenticated;
grant execute on function public.lx_ai_reserve(uuid) to service_role;
