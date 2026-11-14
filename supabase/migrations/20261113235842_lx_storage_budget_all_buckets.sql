-- The native music robot previously counted only lx-assets. Private uploads,
-- profiles and attachments share the same project quota and must count too.
-- This is a read-only aggregate; object metadata and files are never modified.
create or replace function public.lx_auto_asset_usage()
returns bigint language sql stable security invoker set search_path='' as $$
 select coalesce(sum((metadata->>'size')::bigint),0)::bigint
 from storage.objects;
$$;
