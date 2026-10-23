-- Security fixes from the 2026-10-23 audit (findings 1 and 2).
--
-- BEFORE RUNNING: make sure every real owner account has a row in
-- public.platform_admins. After this migration the user-metadata
-- `is_super_admin` flag no longer grants anything.

-- 1. Platform admin = a row in platform_admins, nothing else.
--    raw_user_meta_data is editable by the user themself
--    (supabase.auth.updateUser({ data: { is_super_admin: "true" } })),
--    so it must never grant privileges.
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = _user_id
  );
$$;

-- 2. Signed-in users may only edit an organisation's profile fields.
--    Billing columns (subscription_tier, subscription_active,
--    subscription_period_end, trial_ends_at, payfast_token, pending_tier,
--    status) are written only by server routes (service role) and the
--    SECURITY DEFINER admin RPCs, which these grants don't affect.
REVOKE UPDATE ON public.organisations FROM anon, authenticated;
GRANT UPDATE (name, email, logo_url, phone, website) ON public.organisations TO authenticated;
