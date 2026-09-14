-- Tier limit enforcement.
-- Mirrors src/lib/limits.ts (TIER_LIMITS) — keep the two in sync.
-- Policy: additions are blocked at the current tier's cap; while a downgrade is
-- pending and the org is already at/over the pending tier's cap, ALL additions
-- are frozen (grace model — existing data is never touched).

-- Per-tier numeric limits. Pro is unlimited (NULL = no cap).
CREATE OR REPLACE FUNCTION public.tier_limit(_tier public.subscription_tier, _kind TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _kind
    WHEN 'patients'    THEN CASE _tier WHEN 'starter' THEN 200  WHEN 'growth' THEN 1000 ELSE NULL END
    WHEN 'automations' THEN CASE _tier WHEN 'starter' THEN 2    WHEN 'growth' THEN 10   ELSE NULL END
    WHEN 'seats'       THEN CASE _tier WHEN 'starter' THEN 1    WHEN 'growth' THEN 3    ELSE NULL END
  END;
$$;

-- Pause the newest active automations until the org is within the tier cap.
-- Called by the PayFast ITN webhook when a pending downgrade takes effect.
-- Returns how many rules were paused.
CREATE OR REPLACE FUNCTION public.pause_excess_automations(
  _organisation_id UUID,
  _new_tier public.subscription_tier
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lim INT;
  _excess INT;
BEGIN
  _lim := public.tier_limit(_new_tier, 'automations');
  IF _lim IS NULL THEN
    RETURN 0; -- pro: no cap
  END IF;

  SELECT GREATEST(count(*) - _lim, 0) INTO _excess
  FROM public.automation_rules
  WHERE organisation_id = _organisation_id AND active;

  IF _excess > 0 THEN
    WITH victims AS (
      SELECT id
      FROM public.automation_rules
      WHERE organisation_id = _organisation_id AND active
      ORDER BY created_at DESC, id DESC
      LIMIT _excess
    )
    UPDATE public.automation_rules r
    SET active = false
    FROM victims
    WHERE r.id = victims.id;
  END IF;

  RETURN _excess;
END;
$$;

-- BEFORE INSERT gate for patients, automation_rules and organisation_members.
-- SECURITY DEFINER: members have no SELECT on organisations, and per-table RLS
-- would otherwise hide rows from the count queries — enforcement must see the
-- org row regardless of the caller's privileges. Caller identity is still
-- available via auth.jwt() for the bypass checks.
CREATE OR REPLACE FUNCTION public.enforce_tier_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _tier public.subscription_tier;
  _pending public.subscription_tier;
  _kind TEXT;
  _cap INT;
  _pending_cap INT;
  _count INT;
  _label TEXT;
BEGIN
  -- Service role (webhooks, admin tooling), platform admins, and direct
  -- database sessions (SQL editor, seed scripts — no JWT) bypass.
  IF (auth.jwt() ->> 'role') IS NULL
     OR (auth.jwt() ->> 'role') = 'service_role'
     OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  _org_id := NEW.organisation_id;
  SELECT subscription_tier, pending_tier INTO _tier, _pending
  FROM public.organisations
  WHERE id = _org_id;

  IF NOT FOUND THEN
    RETURN NEW; -- org row is the insert's own problem
  END IF;

  _kind := CASE TG_TABLE_NAME
    WHEN 'patients' THEN 'patients'
    WHEN 'automation_rules' THEN 'automations'
    WHEN 'organisation_members' THEN 'seats'
  END;
  _label := CASE _kind
    WHEN 'patients' THEN 'patients'
    WHEN 'automations' THEN 'automation rules'
    ELSE 'team seats'
  END;

  _cap := public.tier_limit(_tier, _kind);
  IF _cap IS NULL THEN
    RETURN NEW; -- pro: unlimited
  END IF;

  _count := CASE _kind
    WHEN 'patients' THEN
      (SELECT count(*) FROM public.patients WHERE organisation_id = _org_id)
    WHEN 'automations' THEN
      (SELECT count(*) FROM public.automation_rules WHERE organisation_id = _org_id AND active)
    ELSE
      (SELECT count(*) FROM public.organisation_members WHERE organisation_id = _org_id AND status = 'active')
  END;

  IF _count >= _cap THEN
    RAISE EXCEPTION 'Plan limit reached: the % plan allows % %. Upgrade your plan to add more.',
      _tier, _cap, _label USING ERRCODE = 'P0001';
  END IF;

  -- Pending downgrade: if the org is already at/over the pending tier's (lower)
  -- cap, freeze additions until they are back within it.
  IF _pending IS NOT NULL AND _pending <> _tier THEN
    _pending_cap := public.tier_limit(_pending, _kind);
    IF _pending_cap IS NOT NULL AND _count >= _pending_cap THEN
      RAISE EXCEPTION 'Plan change pending: your upcoming % plan allows % %. You are over that limit — remove some % first.',
        _pending, _pending_cap, _label, _label USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tier_limits_patients ON public.patients;
CREATE TRIGGER enforce_tier_limits_patients
  BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tier_limits();

DROP TRIGGER IF EXISTS enforce_tier_limits_automation_rules ON public.automation_rules;
CREATE TRIGGER enforce_tier_limits_automation_rules
  BEFORE INSERT ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tier_limits();

DROP TRIGGER IF EXISTS enforce_tier_limits_organisation_members ON public.organisation_members;
CREATE TRIGGER enforce_tier_limits_organisation_members
  BEFORE INSERT ON public.organisation_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tier_limits();

-- Only the service role may pause automations (called from the ITN webhook).
REVOKE ALL ON FUNCTION public.pause_excess_automations(UUID, public.subscription_tier) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pause_excess_automations(UUID, public.subscription_tier) TO service_role;
