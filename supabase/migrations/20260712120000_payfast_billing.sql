-- PayFast recurring-subscription billing support.
-- Adds token/period tracking to organisations and an idempotent payment audit log.

-- 1. Billing columns on organisations.
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS payfast_token TEXT,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_tier public.subscription_tier;

-- 2. Payment audit log. Written only by the ITN webhook via the service role.
CREATE TABLE IF NOT EXISTS public.payfast_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  m_payment_id TEXT,
  pf_payment_id TEXT,
  token TEXT,
  tier public.subscription_tier,
  amount_gross NUMERIC(12, 2),
  payment_status TEXT NOT NULL,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: PayFast retries the ITN, so a given pf_payment_id must apply once.
CREATE UNIQUE INDEX IF NOT EXISTS payfast_payments_pf_payment_id_key
  ON public.payfast_payments (pf_payment_id)
  WHERE pf_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payfast_payments_organisation_id_idx
  ON public.payfast_payments (organisation_id);

-- 3. RLS: no client (anon/authenticated) access. Service role bypasses RLS,
--    so the webhook can still read/write. Leaving RLS enabled with no policy
--    denies everything to normal users.
ALTER TABLE public.payfast_payments ENABLE ROW LEVEL SECURITY;
