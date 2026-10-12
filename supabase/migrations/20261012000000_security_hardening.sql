-- Security hardening. The browser talks to Supabase directly, so grants and
-- RLS are the only enforcement. Closes:
--   1. Platform-admin self-grant via user-writable user metadata.
--   2. Billing self-grant: org admins/managers could UPDATE subscription
--      columns (tier, active, period end, token, trial end) from the browser.
--   3. Role escalation: users.manage holders could rewrite memberships and
--      invitations directly (e.g. promote themselves to org_admin), and the
--      invite/member RPCs accepted any role id, even another org's.
--   4. Tier caps only applied on INSERT; re-activating an automation or a
--      suspended member via UPDATE bypassed them.

-- 1. Platform admins ---------------------------------------------------------
-- raw_user_meta_data is writable by the user (supabase.auth.updateUser / the
-- signUp `data` option), so it must never grant privileges. Honour the flag in
-- raw_app_meta_data instead, which only the service role can set.
-- NOTE: accounts that relied on the user-metadata flag lose platform-admin
-- access; add them to public.platform_admins (or app metadata) deliberately.
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
      AND COALESCE(raw_app_meta_data->>'is_super_admin', '') = 'true'
  );
$$;

-- 2. Organisations: column-level write access ----------------------------------
-- The browser only edits practice details (Settings.tsx). Billing state is
-- written by the PayFast ITN (service role) and the platform-admin RPCs
-- (SECURITY DEFINER), neither of which is affected by these grants. RLS still
-- decides WHICH rows a user may update.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.organisations FROM anon, authenticated;
GRANT UPDATE (name, email, logo_url, phone, website) ON public.organisations TO authenticated;

-- 3a. Permission checks must use a role from the SAME organisation -------------
CREATE OR REPLACE FUNCTION public.has_org_role(_organisation_id UUID, _role_key TEXT, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.organisation_members om
      JOIN public.organisation_roles role
        ON role.id = om.role_id
       AND role.organisation_id = om.organisation_id
      WHERE om.organisation_id = _organisation_id
        AND om.user_id = _user_id
        AND om.status = 'active'
        AND role.key = _role_key
    )
$$;

CREATE OR REPLACE FUNCTION public.has_org_permission(_organisation_id UUID, _permission_key TEXT, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.organisation_members om
      JOIN public.organisation_roles role
        ON role.id = om.role_id
       AND role.organisation_id = om.organisation_id
      JOIN public.role_permissions rp ON rp.role_id = role.id
      WHERE om.organisation_id = _organisation_id
        AND om.user_id = _user_id
        AND om.status = 'active'
        AND rp.permission_key = _permission_key
    )
$$;

-- 3b. Memberships and invitations are read-only from the browser ---------------
-- All writes go through the SECURITY DEFINER RPCs below, which validate roles.
DROP POLICY IF EXISTS "User managers can manage organisation members" ON public.organisation_members;
DROP POLICY IF EXISTS "User managers can manage invitations" ON public.organisation_invitations;

DROP POLICY IF EXISTS "User managers can view invitations" ON public.organisation_invitations;
CREATE POLICY "User managers can view invitations"
  ON public.organisation_invitations FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'users.manage'));

-- 3c. Custom roles can never carry platform permissions ------------------------
DROP POLICY IF EXISTS "Role managers can manage role permissions" ON public.role_permissions;
CREATE POLICY "Role managers can manage role permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_roles role
      WHERE role.id = role_permissions.role_id
        AND public.has_org_permission(role.organisation_id, 'roles.manage')
    )
  )
  WITH CHECK (
    permission_key NOT LIKE 'platform.%'
    AND EXISTS (
      SELECT 1
      FROM public.organisation_roles role
      WHERE role.id = role_permissions.role_id
        AND public.has_org_permission(role.organisation_id, 'roles.manage')
    )
  );

-- 3d. Role assignment guard used by every RPC that hands out a role ------------
-- The role must belong to the organisation, and only role managers (org
-- admins) may hand out the org_admin role.
CREATE OR REPLACE FUNCTION public.assert_assignable_role(_organisation_id UUID, _role_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key TEXT;
BEGIN
  SELECT key INTO _key
  FROM public.organisation_roles
  WHERE id = _role_id
    AND organisation_id = _organisation_id;

  IF _key IS NULL THEN
    RAISE EXCEPTION 'Role does not belong to this organisation';
  END IF;

  IF _key = 'org_admin' AND NOT public.has_org_permission(_organisation_id, 'roles.manage') THEN
    RAISE EXCEPTION 'Only organisation admins can assign the Organisation Admin role';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_assignable_role(UUID, UUID) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.add_organisation_member_by_email(_organisation_id UUID, _email TEXT, _role_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  membership public.organisation_members;
BEGIN
  IF NOT public.has_org_permission(_organisation_id, 'users.manage') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.assert_assignable_role(_organisation_id, _role_id);

  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No registered user found for email %', _email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE user_id = target_user_id AND status = 'active' AND organisation_id <> _organisation_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to another organisation';
  END IF;

  INSERT INTO public.organisation_members (organisation_id, user_id, role_id, status, invited_by, joined_at)
  VALUES (_organisation_id, target_user_id, _role_id, 'active', auth.uid(), now())
  ON CONFLICT (organisation_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id,
      status = 'active',
      updated_at = now()
  RETURNING * INTO membership;

  RETURN to_jsonb(membership);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organisation_invitation(_organisation_id UUID, _email TEXT, _role_id UUID, _token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.organisation_invitations;
BEGIN
  IF NOT public.has_org_permission(_organisation_id, 'users.manage') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.assert_assignable_role(_organisation_id, _role_id);

  INSERT INTO public.organisation_invitations (organisation_id, email, role_id, token_hash, invited_by)
  VALUES (_organisation_id, lower(_email), _role_id, encode(extensions.digest(_token, 'sha256'), 'hex'), auth.uid())
  RETURNING * INTO invitation;

  RETURN to_jsonb(invitation);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_organisation_invitation(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.organisation_invitations;
  membership public.organisation_members;
  current_email TEXT;
BEGIN
  SELECT email INTO current_email
  FROM auth.users
  WHERE id = auth.uid();

  SELECT * INTO invitation
  FROM public.organisation_invitations
  WHERE token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  IF lower(invitation.email) <> lower(current_email) THEN
    RAISE EXCEPTION 'Invitation email does not match current user';
  END IF;

  -- Invitations created before this migration were not role-checked.
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_roles
    WHERE id = invitation.role_id AND organisation_id = invitation.organisation_id
  ) THEN
    RAISE EXCEPTION 'Invitation role is invalid — ask for a new invitation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE user_id = auth.uid() AND status = 'active' AND organisation_id <> invitation.organisation_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to another organisation';
  END IF;

  INSERT INTO public.organisation_members (organisation_id, user_id, role_id, status, invited_by, joined_at)
  VALUES (invitation.organisation_id, auth.uid(), invitation.role_id, 'active', invitation.invited_by, now())
  ON CONFLICT (organisation_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id,
      status = 'active',
      joined_at = COALESCE(public.organisation_members.joined_at, now()),
      updated_at = now()
  RETURNING * INTO membership;

  UPDATE public.organisation_invitations
  SET accepted_at = now(),
      updated_at = now()
  WHERE id = invitation.id;

  RETURN to_jsonb(membership);
END;
$$;

-- 4. Tier caps also apply when an UPDATE adds to the count ---------------------
-- Re-activating a paused automation or a suspended member is an "addition" for
-- cap purposes. Inactive automations never count, so inserting one is allowed.
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
     OR public.is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  _kind := CASE TG_TABLE_NAME
    WHEN 'patients' THEN 'patients'
    WHEN 'automation_rules' THEN 'automations'
    WHEN 'organisation_members' THEN 'seats'
  END;

  -- Only changes that add an active automation / active seat are capped.
  IF _kind = 'automations' THEN
    IF NOT NEW.active OR (TG_OP = 'UPDATE' AND OLD.active) THEN
      RETURN NEW;
    END IF;
  ELSIF _kind = 'seats' THEN
    IF TG_OP = 'UPDATE' AND (NEW.status <> 'active' OR OLD.status = 'active') THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    RETURN NEW; -- patient edits never change the count
  END IF;

  _org_id := NEW.organisation_id;
  SELECT subscription_tier, pending_tier INTO _tier, _pending
  FROM public.organisations
  WHERE id = _org_id;

  IF NOT FOUND THEN
    RETURN NEW; -- org row is the insert's own problem
  END IF;

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

DROP TRIGGER IF EXISTS enforce_tier_limits_automation_rules_update ON public.automation_rules;
CREATE TRIGGER enforce_tier_limits_automation_rules_update
  BEFORE UPDATE OF active ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tier_limits();

DROP TRIGGER IF EXISTS enforce_tier_limits_organisation_members_update ON public.organisation_members;
CREATE TRIGGER enforce_tier_limits_organisation_members_update
  BEFORE UPDATE OF status ON public.organisation_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tier_limits();
