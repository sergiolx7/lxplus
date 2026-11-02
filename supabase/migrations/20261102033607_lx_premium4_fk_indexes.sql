-- LX Plus Premium 4.0: add missing foreign-key support indexes.
-- Additive only: no changes to accounts, RLS, RPC permissions, or user data.
-- Indexes help foreign-key checks and future joins as LX Social / LX Party grow.
create index if not exists lx_auto_assets_catalog_id_fk_idx on public.lx_auto_assets(catalog_id);
create index if not exists lx_demo_preview_viewers_granted_by_fk_idx on public.lx_demo_preview_viewers(granted_by);
create index if not exists lx_demo_social_audit_updated_by_fk_idx on public.lx_demo_social_audit(updated_by);
create index if not exists lx_demo_social_metrics_updated_by_fk_idx on public.lx_demo_social_metrics(updated_by);
create index if not exists lx_drive_sources_created_by_fk_idx on public.lx_drive_sources(created_by);
create index if not exists lx_sponsored_posts_created_by_fk_idx on public.lx_sponsored_posts(created_by);
create index if not exists lx_watch_sessions_content_id_fk_idx on public.lx_watch_sessions(content_id);
create index if not exists lx_watch_sessions_host_id_fk_idx on public.lx_watch_sessions(host_id);
create index if not exists lx_watch_signals_sender_id_fk_idx on public.lx_watch_signals(sender_id);
