-- LX Plus v27 — migração incremental segura
-- Execute UMA vez no Supabase SQL Editor depois do schema que a LX Plus já usa.
-- Esta migração não substitui RPCs/tabelas administrativas existentes.

create or replace function public.lx_chat_pair_streak(p_other uuid)
returns integer
language sql
security definer
set search_path = public
as $$
with me as (
  select auth.uid() as id, p_other as other_id,
         (now() at time zone 'America/Fortaleza')::date as today
), days as (
  select (m.created_at at time zone 'America/Fortaleza')::date as d,
         bool_or(m.sender_id = me.id) as sent_me,
         bool_or(m.sender_id = me.other_id) as sent_other
  from public.lx_messages m cross join me
  where me.id is not null and me.other_id is not null
    and m.deleted_at is null
    and ((m.sender_id=me.id and m.recipient_id=me.other_id)
      or (m.sender_id=me.other_id and m.recipient_id=me.id))
  group by 1
), bilateral as (
  select d from days where sent_me and sent_other
), anchor as (
  select case
    when exists(select 1 from bilateral b,me where b.d=me.today) then (select today from me)
    when exists(select 1 from bilateral b,me where b.d=me.today-1) then (select today-1 from me)
    else null::date end as d
), gap as (
  select min(g.n)::int as first_missing
  from anchor a
  cross join generate_series(0,3650) as g(n)
  where a.d is not null
    and not exists(select 1 from bilateral b where b.d=a.d-g.n)
)
select coalesce((select first_missing from gap),0)::int;
$$;
revoke all on function public.lx_chat_pair_streak(uuid) from public;
grant execute on function public.lx_chat_pair_streak(uuid) to authenticated;

-- Papéis ADM da v27 usam a estrutura administrativa já presente na sua LX Plus.
-- Valores esperados pelo frontend: owner, admin, editor, moderator.
-- O código tenta, nesta ordem: lx_admin_set_admin_role RPC, lx_admin_roles e lx_admins.
-- Não recriamos nem sobrescrevemos esses objetos aqui para preservar as regras de segurança atuais.
