-- Issue #4: switch off legacy test organisations that have access but never paid.
-- Manual script, NOT a migration. Run it by hand in the Supabase SQL editor (production).
--
-- "Legacy test org" = subscription_active is true but there is no PayFast token,
-- i.e. no card was ever captured. Real paying or trialling customers always have one
-- (ProtectedRoute requires a payfast_token before anyone gets in).

-- STEP 1: look first. Expect the 4 legacy test orgs. If anything else shows up, stop.
select id, name, email, subscription_tier, subscription_active, trial_ends_at, created_at
from public.organisations
where subscription_active = true
  and payfast_token is null
order by created_at;

-- STEP 2: only after checking step 1, paste the ids you saw and run this.
-- Reversible: set subscription_active back to true for the same ids.
-- update public.organisations
-- set subscription_active = false, updated_at = now()
-- where id in (
--   '00000000-0000-0000-0000-000000000000'  -- replace with the ids from step 1
-- )
-- and payfast_token is null;
