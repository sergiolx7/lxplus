-- Profile uploads use the existing service role and must satisfy the same pure JSON check as member profile edits.
-- Keep the validator private and invoker-only; do not grant any additional table or entitlement access.
grant execute on function lx_private.valid_premium_identity(jsonb) to service_role;
