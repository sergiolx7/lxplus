-- LX Plus v40 reference release hardening.
-- Trigger helper remains available to PostgreSQL triggers/service role but is not exposed as a public RPC.
revoke execute on function public.lx_support_touch_ticket() from public;
revoke execute on function public.lx_support_touch_ticket() from anon;
revoke execute on function public.lx_support_touch_ticket() from authenticated;
grant execute on function public.lx_support_touch_ticket() to service_role;
