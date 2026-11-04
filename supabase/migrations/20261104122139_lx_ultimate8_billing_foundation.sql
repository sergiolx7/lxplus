-- Additive billing foundation. Existing accounts, subscriptions and Premium grants are untouched.
-- There is deliberately no switch that can enable real payments in this migration.
create table lx_private.premium_coupons (
 code text primary key check(code ~ '^[A-Z0-9_-]{3,40}$'),
 kind text not null check(kind in ('percent','fixed')),
 value integer not null check(value > 0),
 enabled boolean not null default true,
 expires_at timestamptz,
 max_uses integer check(max_uses > 0),
 per_user integer not null default 1 check(per_user between 1 and 100),
 plans text[] not null default array['monthly','annual']::text[] check(cardinality(plans) between 1 and 2 and plans <@ array['monthly','annual']::text[]),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((kind='percent' and value<=100) or (kind='fixed' and value<=9990))
);
create table lx_private.premium_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 plan text not null check(plan in ('monthly','annual')),
 base_cents integer not null,
 discount_cents integer not null default 0 check(discount_cents>=0),
 amount_cents integer not null check(amount_cents>=0),
 currency text not null default 'BRL' check(currency='BRL'),
 status text not null default 'pending' check(status in ('pending','paid','failed','canceled','refunded')),
 idempotency_key text not null check(char_length(idempotency_key) between 8 and 100),
 provider text, provider_payment_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key),unique(provider,provider_payment_id),
 check((plan='monthly' and base_cents=990) or (plan='annual' and base_cents=9990)),
 check(discount_cents<=base_cents and amount_cents=base_cents-discount_cents)
);
create index premium_coupons_creator on lx_private.premium_coupons(created_by);
create index premium_orders_user_created on lx_private.premium_orders(user_id,created_at desc);
create table lx_private.premium_redemptions (
 order_id uuid primary key references lx_private.premium_orders(id),
 code text not null references lx_private.premium_coupons(code),
 user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index premium_redemptions_coupon_user on lx_private.premium_redemptions(code,user_id);
create index premium_redemptions_user on lx_private.premium_redemptions(user_id);
create table lx_private.premium_webhook_events (
 provider text not null, event_id text not null,
 order_id uuid references lx_private.premium_orders(id),
 payload_digest text not null check(payload_digest ~ '^[a-f0-9]{64}$'),
 status text not null check(status in ('verified','processed','rejected')),
 created_at timestamptz not null default now(),
 primary key(provider,event_id)
);
create index premium_webhook_order on lx_private.premium_webhook_events(order_id);
create table lx_private.premium_billing_audit (
 id bigint generated always as identity primary key,
 actor uuid not null references auth.users(id),action text not null,target text,
 details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create index premium_billing_audit_actor on lx_private.premium_billing_audit(actor);
create table lx_private.premium_quote_budget (
 user_id uuid primary key references auth.users(id),
 window_start timestamptz not null default now(),attempts integer not null default 1
);

alter table lx_private.premium_coupons enable row level security;
alter table lx_private.premium_orders enable row level security;
alter table lx_private.premium_redemptions enable row level security;
alter table lx_private.premium_webhook_events enable row level security;
alter table lx_private.premium_billing_audit enable row level security;
alter table lx_private.premium_quote_budget enable row level security;
revoke all on lx_private.premium_coupons,lx_private.premium_orders,lx_private.premium_redemptions,lx_private.premium_webhook_events,lx_private.premium_billing_audit,lx_private.premium_quote_budget from public,anon,authenticated;

create function lx_private.billing_action(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 viewer uuid:=auth.uid(); role_name text; result jsonb; coupon_row lx_private.premium_coupons;
 chosen text; code_value text; base integer; discount integer:=0; total_used bigint; user_used bigint; tries integer;
 target_user uuid; enabled_value boolean; reason text; old_coupon jsonb;
 plans_json constant jsonb:='[{"id":"monthly","name":"Mensal","amount_cents":990,"currency":"BRL","period":"month"},{"id":"annual","name":"Anual","amount_cents":9990,"currency":"BRL","period":"year"}]'::jsonb;
begin
 if viewer is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.lx_is_approved() then raise exception 'APPROVAL_REQUIRED';end if;
 p_data:=coalesce(p_data,'{}'::jsonb);
 if jsonb_typeof(p_data)<>'object' then raise exception 'INVALID_REQUEST';end if;
 if p_action='status' then
  return jsonb_build_object('plans',plans_json,'checkout_available',false,'provider_configured',false,
   'is_premium',coalesce((select is_premium from public.lx_profiles where user_id=viewer),false),
   'subscription',(select jsonb_build_object('plan',plan,'active',active,'status',status,'current_period_end',current_period_end) from public.lx_subscriptions where user_id=viewer),
   'payments',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,plan,amount_cents,currency,status,created_at from lx_private.premium_orders where user_id=viewer order by created_at desc limit 50)x),'[]'::jsonb));
 end if;
 if p_action in ('checkout','cancel') then
  return jsonb_build_object('available',false,'code','GATEWAY_NOT_CONFIGURED','checkout_available',false);
 end if;
 if p_action='quote' then
  insert into lx_private.premium_quote_budget(user_id) values(viewer)
   on conflict(user_id) do update set attempts=case when premium_quote_budget.window_start<now()-interval '1 minute' then 1 else premium_quote_budget.attempts+1 end,
    window_start=case when premium_quote_budget.window_start<now()-interval '1 minute' then now() else premium_quote_budget.window_start end
   returning attempts into tries;
  if tries>60 then raise exception 'QUOTE_RATE_LIMIT';end if;
  chosen:=p_data->>'plan';
  if chosen is null or chosen not in ('monthly','annual') then raise exception 'INVALID_PLAN';end if;
  base:=case chosen when 'monthly' then 990 else 9990 end;
  code_value:=upper(btrim(coalesce(p_data->>'coupon','')));
  if code_value<>'' then
   if code_value!~'^[A-Z0-9_-]{3,40}$' then raise exception 'COUPON_UNAVAILABLE';end if;
   select * into coupon_row from lx_private.premium_coupons where code=code_value;
   if not found or not coupon_row.enabled or (coupon_row.expires_at is not null and coupon_row.expires_at<=now()) or not (chosen=any(coupon_row.plans)) then raise exception 'COUPON_UNAVAILABLE';end if;
   select count(*),count(*) filter(where r.user_id=viewer) into total_used,user_used
    from lx_private.premium_redemptions r join lx_private.premium_orders o on o.id=r.order_id where r.code=code_value and o.status in ('pending','paid');
   if (coupon_row.max_uses is not null and total_used>=coupon_row.max_uses) or user_used>=coupon_row.per_user then raise exception 'COUPON_UNAVAILABLE';end if;
   discount:=least(base,case when coupon_row.kind='percent' then round(base*coupon_row.value::numeric/100)::integer else coupon_row.value end);
  end if;
  return jsonb_build_object('plan',chosen,'base_cents',base,'discount_cents',discount,'total_cents',base-discount,'currency','BRL','coupon',nullif(code_value,''),'checkout_available',false);
 end if;
 role_name:=public.lx_admin_role();
 if role_name is null or role_name not in ('owner','administrator') then raise exception 'ADMIN_REQUIRED';end if;
 if p_action='admin' then
  return jsonb_build_object('plans',plans_json,'checkout_available',false,'provider_configured',false,
   'revenue_cents',coalesce((select sum(amount_cents) from lx_private.premium_orders where status='paid'),0),
   'pending_count',(select count(*) from lx_private.premium_orders where status='pending'),
   'coupons',coalesce((select jsonb_agg(to_jsonb(x)) from (select pc.*,(select count(*) from lx_private.premium_redemptions r join lx_private.premium_orders o on o.id=r.order_id where r.code=pc.code and o.status in('pending','paid')) as uses from lx_private.premium_coupons pc order by pc.created_at desc limit 200)x),'[]'::jsonb),
   'payments',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,user_id,plan,amount_cents,status,created_at from lx_private.premium_orders order by created_at desc limit 100)x),'[]'::jsonb),
   'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.name,'is_premium',p.is_premium,'plan',s.plan,'status',s.status,'current_period_end',s.current_period_end)) from public.lx_profiles p left join public.lx_subscriptions s using(user_id) where p.is_premium or s.user_id is not null),'[]'::jsonb),
   'audit',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,actor,action,target,details,created_at from lx_private.premium_billing_audit order by id desc limit 100)x),'[]'::jsonb));
 end if;
 if p_action='coupon_save' then
  code_value:=upper(btrim(p_data->>'code'));
  if code_value is null or code_value!~'^[A-Z0-9_-]{3,40}$' then raise exception 'INVALID_COUPON';end if;
  select to_jsonb(x) into old_coupon from lx_private.premium_coupons x where code=code_value;
  insert into lx_private.premium_coupons(code,kind,value,enabled,expires_at,max_uses,per_user,plans,created_by)
   values(code_value,p_data->>'kind',(p_data->>'value')::integer,coalesce((p_data->>'enabled')::boolean,true),nullif(p_data->>'expires_at','')::timestamptz,
    nullif(p_data->>'max_uses','')::integer,coalesce((p_data->>'per_user')::integer,1),array(select jsonb_array_elements_text(coalesce(p_data->'plans','["monthly","annual"]'::jsonb))),viewer)
   on conflict(code) do update set kind=excluded.kind,value=excluded.value,enabled=excluded.enabled,expires_at=excluded.expires_at,max_uses=excluded.max_uses,per_user=excluded.per_user,plans=excluded.plans,updated_at=now();
  insert into lx_private.premium_billing_audit(actor,action,target,details) values(viewer,'coupon_save',code_value,jsonb_build_object('before',old_coupon,'after',p_data));
  return jsonb_build_object('saved',true,'code',code_value);
 end if;
 if p_action='coupon_toggle' then
  code_value:=upper(btrim(p_data->>'code'));enabled_value:=(p_data->>'enabled')::boolean;
  if enabled_value is null then raise exception 'INVALID_COUPON';end if;
  update lx_private.premium_coupons set enabled=enabled_value,updated_at=now() where code=code_value;
  if not found then raise exception 'INVALID_COUPON';end if;
  insert into lx_private.premium_billing_audit(actor,action,target,details) values(viewer,'coupon_toggle',code_value,jsonb_build_object('enabled',enabled_value));
  return jsonb_build_object('saved',true);
 end if;
 if p_action='grant' then
  if role_name<>'owner' then raise exception 'OWNER_REQUIRED';end if;
  target_user:=(p_data->>'user_id')::uuid;enabled_value:=(p_data->>'enabled')::boolean;reason:=btrim(p_data->>'reason');
  if target_user is null or enabled_value is null or reason is null or char_length(reason) not between 3 and 500 then raise exception 'INVALID_REQUEST';end if;
  if not exists(select 1 from public.lx_profiles where user_id=target_user) then raise exception 'INVALID_REQUEST';end if;
  perform public.lx_admin_set_premium(target_user,enabled_value);
  insert into lx_private.premium_billing_audit(actor,action,target,details) values(viewer,'manual_premium',target_user::text,jsonb_build_object('enabled',enabled_value,'reason',reason));
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'INVALID_ACTION';
exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
 raise exception 'INVALID_COUPON';
end;$$;

create function public.lx_billing(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select lx_private.billing_action(p_action,p_data)$$;
revoke all on function lx_private.billing_action(text,jsonb),public.lx_billing(text,jsonb) from public,anon,authenticated;
grant execute on function lx_private.billing_action(text,jsonb),public.lx_billing(text,jsonb) to authenticated;
comment on function public.lx_billing(text,jsonb) is 'LX Premium: authenticated status, server-side coupon quotes and audited admin actions. Real checkout is intentionally disabled until a gateway is implemented and validated.';
