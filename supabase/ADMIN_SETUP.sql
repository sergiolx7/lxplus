-- LX Plus v20 — torne sua conta administradora
-- 1) Crie a conta normalmente na LX Plus.
-- 2) Troque SEU_EMAIL_AQUI pelo e-mail exato da sua conta.
-- 3) Execute no SQL Editor do Supabase.

insert into public.lx_admins(user_id)
select id
from auth.users
where lower(email)=lower('SEU_EMAIL_AQUI')
on conflict(user_id) do nothing;

-- Conferência: deve retornar a sua conta com admin = true.
select p.name, u.email, (a.user_id is not null) as admin
from public.lx_profiles p
join auth.users u on u.id=p.user_id
left join public.lx_admins a on a.user_id=p.user_id
where lower(u.email)=lower('SEU_EMAIL_AQUI');
