-- Sponsored posts actually get a clearly labeled, first-page placement
-- while remaining authenticated, published and public. No artificial likes.
create or replace function public.lx_featured_sponsored_posts()
returns uuid[] language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then '{}'::uuid[]
 else coalesce(array_agg(x.post_id order by x.start_at desc),'{}'::uuid[]) end
 from (
   select s.post_id,s.start_at from public.lx_sponsored_posts s
   join public.lx_posts p on p.id=s.post_id
   where s.active=true and s.start_at<=now() and s.expires_at>now()
   and p.visibility='public' and p.status='published'
   order by s.start_at desc limit 5
 ) x
$$;
revoke all on function public.lx_featured_sponsored_posts() from public,anon;
grant execute on function public.lx_featured_sponsored_posts() to authenticated;
