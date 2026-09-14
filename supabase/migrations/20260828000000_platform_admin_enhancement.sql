-- Platform admin owner dashboard enhancements.
-- Adds computed subscription state, richer platform admin overview, organisation
-- detail RPC, and gated owner mutation RPCs.

-- 1. Index for payment lookups on the organisation detail page.
CREATE INDEX IF NOT EXISTS idx_payfast_payments_org_created
  ON public.payfast_payments (organisation_id, created_at DESC);

-- 2. Extend platform-admin checks to also honour a user-metadata flag stored
--    in auth.users.raw_user_meta_data. This lets owner accounts be promoted
--    by setting `is_super_admin: true` in their user metadata, without needing
--    a row in public.platform_admins.
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
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND COALESCE(raw_user_meta_data->>'is_super_admin', '') = 'true'
  );
$$;

-- 3. Normalised subscription state used across the owner dashboard.
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
         AND (_subscription_period_end IS NULL OR _subscription_period_end > now())
         THEN 'active'
    WHEN _subscription_active
         AND _subscription_period_end <= now()
         AND _subscription_period_end > now() - INTERVAL '3 days'
         THEN 'grace'
    WHEN NOT _subscription_active AND _trial_ends_at > now()
         THEN 'trial'
    ELSE 'expired'
  END;
$$;

-- 4. Enhanced platform admin overview with summary, subscription state, and
--    latest payment information per organisation.
CREATE OR REPLACE FUNCTION public.get_platform_admin_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace_cutoff TIMESTAMPTZ := now() - INTERVAL '3 days';
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'total_organisations', count(*),
        'total_members', (SELECT count(*) FROM public.organisation_members),
        'active_subscriptions', count(*) FILTER (WHERE public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) = 'active'),
        'trials', count(*) FILTER (WHERE public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) = 'trial'),
        'trials_expiring_7d', count(*) FILTER (
          WHERE public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) = 'trial'
            AND o.trial_ends_at BETWEEN now() AND now() + INTERVAL '7 days'
        ),
        'mrr', COALESCE((
          SELECT sum(latest.amount_gross)
          FROM (
            SELECT DISTINCT ON (organisation_id)
              organisation_id,
              amount_gross
            FROM public.payfast_payments
            WHERE payment_status = 'COMPLETE'
              AND created_at > now() - INTERVAL '30 days'
            ORDER BY organisation_id, created_at DESC
          ) latest
        ), 0),
        'lifetime_revenue', COALESCE((
          SELECT sum(amount_gross)
          FROM public.payfast_payments
          WHERE payment_status = 'COMPLETE'
        ), 0)
      )
      FROM public.organisations o
    ),
    'organisations', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'email', o.email,
          'status', o.status,
          'subscription_tier', o.subscription_tier,
          'subscription_active', o.subscription_active,
          'trial_ends_at', o.trial_ends_at,
          'subscription_period_end', o.subscription_period_end,
          'created_at', o.created_at,
          'member_count', (SELECT count(*) FROM public.organisation_members om WHERE om.organisation_id = o.id),
          'subscription_state', public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end),
          'days_remaining', CASE
            WHEN public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) IN ('trial', 'grace') THEN
              GREATEST(0, EXTRACT(DAY FROM (o.trial_ends_at - now()))::INTEGER)
            WHEN public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) = 'active' THEN
              CASE
                WHEN o.subscription_period_end IS NULL THEN NULL
                ELSE GREATEST(0, EXTRACT(DAY FROM (o.subscription_period_end - now()))::INTEGER)
              END
            ELSE 0
          END,
          'latest_payment', (
            SELECT to_jsonb(p)
            FROM public.payfast_payments p
            WHERE p.organisation_id = o.id
            ORDER BY p.created_at DESC
            LIMIT 1
          )
        )
        ORDER BY o.created_at DESC
      ), '[]'::jsonb)
      FROM public.organisations o
    ),
    'members', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', om.id,
          'organisation_id', om.organisation_id,
          'organisation_name', o.name,
          'user_id', om.user_id,
          'email', u.email,
          'role_key', r.key,
          'role_name', r.name,
          'status', om.status,
          'created_at', om.created_at
        )
        ORDER BY om.created_at DESC
      ), '[]'::jsonb)
      FROM public.organisation_members om
      JOIN public.organisations o ON o.id = om.organisation_id
      LEFT JOIN public.organisation_roles r ON r.id = om.role_id
      LEFT JOIN auth.users u ON u.id = om.user_id
    )
  );
END;
$$;

-- 5. Detail view for a single organisation from the platform owner context.
CREATE OR REPLACE FUNCTION public.get_platform_organisation_detail(_organisation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN jsonb_build_object(
    'organisation', (
      SELECT to_jsonb(o) || jsonb_build_object(
        'subscription_state', public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end),
        'days_remaining', CASE
          WHEN public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) IN ('trial', 'grace') THEN
            GREATEST(0, EXTRACT(DAY FROM (o.trial_ends_at - now()))::INTEGER)
          WHEN public.organisation_subscription_state(o.subscription_active, o.status, o.trial_ends_at, o.subscription_period_end) = 'active' THEN
            CASE
              WHEN o.subscription_period_end IS NULL THEN NULL
              ELSE GREATEST(0, EXTRACT(DAY FROM (o.subscription_period_end - now()))::INTEGER)
            END
          ELSE 0
        END
      )
      FROM public.organisations o
      WHERE o.id = _organisation_id
    ),
    'members', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', om.id,
          'user_id', om.user_id,
          'email', u.email,
          'role_id', r.id,
          'role_key', r.key,
          'role_name', r.name,
          'status', om.status,
          'joined_at', om.joined_at,
          'created_at', om.created_at
        )
        ORDER BY om.created_at DESC
      ), '[]'::jsonb)
      FROM public.organisation_members om
      LEFT JOIN public.organisation_roles r ON r.id = om.role_id
      LEFT JOIN auth.users u ON u.id = om.user_id
      WHERE om.organisation_id = _organisation_id
    ),
    'invitations', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', inv.id,
          'email', inv.email,
          'role_id', inv.role_id,
          'role_name', r.name,
          'status', CASE
            WHEN inv.revoked_at IS NOT NULL THEN 'revoked'
            WHEN inv.accepted_at IS NOT NULL THEN 'accepted'
            WHEN inv.expires_at < now() THEN 'expired'
            ELSE 'pending'
          END,
          'expires_at', inv.expires_at,
          'accepted_at', inv.accepted_at,
          'revoked_at', inv.revoked_at,
          'created_at', inv.created_at
        )
        ORDER BY inv.created_at DESC
      ), '[]'::jsonb)
      FROM public.organisation_invitations inv
      LEFT JOIN public.organisation_roles r ON r.id = inv.role_id
      WHERE inv.organisation_id = _organisation_id
    ),
    'payments', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'm_payment_id', p.m_payment_id,
          'pf_payment_id', p.pf_payment_id,
          'tier', p.tier,
          'amount_gross', p.amount_gross,
          'payment_status', p.payment_status,
          'created_at', p.created_at
        )
        ORDER BY p.created_at DESC
      ), '[]'::jsonb)
      FROM public.payfast_payments p
      WHERE p.organisation_id = _organisation_id
    )
  );
END;
$$;

-- 6. Owner action: suspend, reactivate, or archive an organisation.
CREATE OR REPLACE FUNCTION public.admin_update_organisation_status(
  _organisation_id UUID,
  _status TEXT,
  _subscription_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _status NOT IN ('active', 'suspended', 'archived') THEN
    RAISE EXCEPTION 'Invalid organisation status: %', _status;
  END IF;

  UPDATE public.organisations
  SET
    status = _status,
    subscription_active = _subscription_active,
    updated_at = now()
  WHERE id = _organisation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  RETURN public.get_platform_organisation_detail(_organisation_id);
END;
$$;

-- 7. Owner action: extend an organisation's trial.
CREATE OR REPLACE FUNCTION public.admin_extend_trial(
  _organisation_id UUID,
  _trial_ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.organisations
  SET
    trial_ends_at = _trial_ends_at,
    subscription_active = FALSE,
    updated_at = now()
  WHERE id = _organisation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  RETURN public.get_platform_organisation_detail(_organisation_id);
END;
$$;

-- 8. Owner action: manually set an organisation's subscription tier and state.
CREATE OR REPLACE FUNCTION public.admin_update_organisation_subscription(
  _organisation_id UUID,
  _subscription_tier public.subscription_tier,
  _subscription_active BOOLEAN,
  _subscription_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.organisations
  SET
    subscription_tier = _subscription_tier,
    subscription_active = _subscription_active,
    subscription_period_end = _subscription_period_end,
    updated_at = now()
  WHERE id = _organisation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  RETURN public.get_platform_organisation_detail(_organisation_id);
END;
$$;
