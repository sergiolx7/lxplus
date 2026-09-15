-- Mantém os segredos R2 existentes e adiciona Spotify sob controle exclusivo do Dono.
create or replace function public.lx_admin_set_integration_secret(p_key text,p_value text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_key text := lower(trim(coalesce(p_key,'')));
begin
  if not public.lx_admin_can('integrations') then raise exception 'owner required'; end if;
  if v_key not in (
    'spotify_client_id','spotify_client_secret',
    'r2_account_id','r2_bucket','r2_access_key_id','r2_secret_access_key'
  ) then raise exception 'integration key not allowed'; end if;
  if nullif(trim(coalesce(p_value,'')),'') is null then
    delete from public.lx_integrations where key=v_key;
    return true;
  end if;
  insert into public.lx_integrations(key,secret,updated_at,updated_by)
  values(v_key,trim(p_value),now(),auth.uid())
  on conflict(key) do update set secret=excluded.secret,updated_at=now(),updated_by=auth.uid();
  return true;
end;
$$;
revoke all on function public.lx_admin_set_integration_secret(text,text) from public,anon;
grant execute on function public.lx_admin_set_integration_secret(text,text) to authenticated;
