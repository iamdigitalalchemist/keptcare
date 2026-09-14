-- New organisations are NOT paid subscribers at creation — the 14-day trial
-- (trial_ends_at) is what grants initial access. The old TRUE default made
-- every fresh org look like an active paid subscription forever, because
-- subscription_period_end stays NULL until the first PayFast ITN and the
-- client-side access rules ("active + null period end never expires") treated
-- that as valid paid access. That hole let no-card orgs past the card-capture
-- gate and past trial expiry.
--
-- This only changes the default for NEW rows; existing rows keep their value.
ALTER TABLE public.organisations
  ALTER COLUMN subscription_active SET DEFAULT FALSE;

-- Align the admin stats helper with the same rule: a NULL subscription_period_end
-- means "never successfully paid", not "active forever". (Used only for the
-- platform-admin dashboard; access enforcement is client-side.)
CREATE OR REPLACE FUNCTION public.organisation_subscription_state(
  _subscription_active BOOLEAN,
  _status TEXT,
  _trial_ends_at TIMESTAMPTZ,
  _subscription_period_end TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _status = 'suspended' THEN 'suspended'
    WHEN _status = 'archived'  THEN 'archived'
    WHEN _subscription_active
         AND _subscription_period_end IS NOT NULL
         AND _subscription_period_end > now()
         THEN 'active'
    WHEN _subscription_active
         AND _subscription_period_end IS NOT NULL
         AND _subscription_period_end <= now()
         AND _subscription_period_end > now() - INTERVAL '3 days'
         THEN 'grace'
    WHEN NOT _subscription_active AND _trial_ends_at > now()
         THEN 'trial'
    ELSE 'expired'
  END;
$$;
