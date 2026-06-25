-- Organisation tenancy, hybrid RBAC, invitations, and platform super-admins.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE,
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  subscription_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organisation_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, key)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.organisation_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.organisation_roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS organisation_members_one_active_org_per_user
  ON public.organisation_members (user_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.organisation_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES public.organisation_roles(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organisations_created_by ON public.organisations(created_by);
CREATE INDEX IF NOT EXISTS idx_organisation_roles_org ON public.organisation_roles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_organisation_members_org ON public.organisation_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_user ON public.organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_invitations_org ON public.organisation_invitations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_invitations_email ON public.organisation_invitations(lower(email));

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_invitations ENABLE ROW LEVEL SECURITY;

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
$$;

CREATE OR REPLACE FUNCTION public.current_organisation_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_organisation_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.organisation_members
      WHERE organisation_id = _organisation_id
        AND user_id = _user_id
        AND status = 'active'
    )
$$;

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
      JOIN public.organisation_roles role ON role.id = om.role_id
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
      JOIN public.role_permissions rp ON rp.role_id = om.role_id
      WHERE om.organisation_id = _organisation_id
        AND om.user_id = _user_id
        AND om.status = 'active'
        AND rp.permission_key = _permission_key
    )
$$;

INSERT INTO public.permissions (key, label, description, category)
VALUES
  ('patients.read', 'View patients', 'View patient records.', 'patients'),
  ('patients.write', 'Manage patients', 'Create and update patient records.', 'patients'),
  ('patients.delete', 'Delete patients', 'Delete patient records.', 'patients'),
  ('appointments.read', 'View appointments', 'View appointment records.', 'appointments'),
  ('appointments.write', 'Manage appointments', 'Create and update appointments.', 'appointments'),
  ('appointments.delete', 'Delete appointments', 'Delete appointments.', 'appointments'),
  ('users.manage', 'Manage users', 'Invite and manage organisation users.', 'organisation'),
  ('roles.manage', 'Manage roles', 'Create roles and assign permissions.', 'organisation'),
  ('organisation.manage', 'Manage organisation', 'Edit organisation settings.', 'organisation'),
  ('billing.manage', 'Manage billing', 'Manage plans and billing.', 'billing'),
  ('platform.manage', 'Manage platform', 'Manage all organisations and users.', 'platform')
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

CREATE OR REPLACE FUNCTION public.seed_organisation_roles(_organisation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_admin_role UUID;
  manager_role UUID;
  staff_role UUID;
  viewer_role UUID;
BEGIN
  INSERT INTO public.organisation_roles (organisation_id, key, name, description, is_builtin)
  VALUES
    (_organisation_id, 'org_admin', 'Organisation Admin', 'Full organisation administration.', TRUE),
    (_organisation_id, 'manager', 'Manager', 'Manage day-to-day operations and users.', TRUE),
    (_organisation_id, 'staff', 'Staff', 'Manage patient and appointment workflows.', TRUE),
    (_organisation_id, 'viewer', 'Viewer', 'Read-only access.', TRUE)
  ON CONFLICT (organisation_id, key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_builtin = TRUE,
      updated_at = now();

  SELECT id INTO org_admin_role FROM public.organisation_roles WHERE organisation_id = _organisation_id AND key = 'org_admin';
  SELECT id INTO manager_role FROM public.organisation_roles WHERE organisation_id = _organisation_id AND key = 'manager';
  SELECT id INTO staff_role FROM public.organisation_roles WHERE organisation_id = _organisation_id AND key = 'staff';
  SELECT id INTO viewer_role FROM public.organisation_roles WHERE organisation_id = _organisation_id AND key = 'viewer';

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT org_admin_role, key FROM public.permissions WHERE category <> 'platform'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT manager_role, key FROM public.permissions
  WHERE key IN ('patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'users.manage', 'organisation.manage')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT staff_role, key FROM public.permissions
  WHERE key IN ('patients.read', 'patients.write', 'appointments.read', 'appointments.write')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT viewer_role, key FROM public.permissions
  WHERE key IN ('patients.read', 'appointments.read')
  ON CONFLICT DO NOTHING;
END;
$$;

INSERT INTO public.organisations (id, name, phone, website, subscription_tier, trial_ends_at, subscription_active, created_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  COALESCE(NULLIF(p.practice_name, ''), split_part(p.email, '@', 1), 'Organisation'),
  p.phone,
  p.website,
  p.subscription_tier,
  p.trial_ends_at,
  p.subscription_active,
  p.id,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organisation_members om
  WHERE om.user_id = p.id
);

SELECT public.seed_organisation_roles(id)
FROM public.organisations;

INSERT INTO public.organisation_members (organisation_id, user_id, role_id, status, joined_at, created_at, updated_at)
SELECT
  o.id,
  o.created_by,
  r.id,
  'active',
  COALESCE(o.created_at, now()),
  COALESCE(o.created_at, now()),
  COALESCE(o.updated_at, now())
FROM public.organisations o
JOIN public.organisation_roles r ON r.organisation_id = o.id AND r.key = 'org_admin'
WHERE o.created_by IS NOT NULL
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO public.platform_admins (user_id, created_at)
SELECT user_id, now()
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

UPDATE public.patients p
SET organisation_id = om.organisation_id
FROM public.organisation_members om
WHERE p.organisation_id IS NULL
  AND p.user_id = om.user_id
  AND om.status = 'active';

UPDATE public.appointments a
SET organisation_id = p.organisation_id
FROM public.patients p
WHERE a.organisation_id IS NULL
  AND a.patient_id = p.id;

CREATE INDEX IF NOT EXISTS idx_patients_organisation_id ON public.patients(organisation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_organisation_id ON public.appointments(organisation_id);

ALTER TABLE public.patients ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN organisation_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;

CREATE POLICY "Members can view organisation patients"
  ON public.patients FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'patients.read'));

CREATE POLICY "Members can insert organisation patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_permission(organisation_id, 'patients.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can update organisation patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (public.has_org_permission(organisation_id, 'patients.write'))
  WITH CHECK (public.has_org_permission(organisation_id, 'patients.write'));

CREATE POLICY "Members can delete organisation patients"
  ON public.patients FOR DELETE TO authenticated
  USING (public.has_org_permission(organisation_id, 'patients.delete'));

DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

CREATE POLICY "Members can view organisation appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'appointments.read'));

CREATE POLICY "Members can insert organisation appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_permission(organisation_id, 'appointments.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can update organisation appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_org_permission(organisation_id, 'appointments.write'))
  WITH CHECK (public.has_org_permission(organisation_id, 'appointments.write'));

CREATE POLICY "Members can delete organisation appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_org_permission(organisation_id, 'appointments.delete'));

CREATE POLICY "Members can view own organisation"
  ON public.organisations FOR SELECT TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY "Organisation managers can update organisation"
  ON public.organisations FOR UPDATE TO authenticated
  USING (public.has_org_permission(id, 'organisation.manage'))
  WITH CHECK (public.has_org_permission(id, 'organisation.manage'));

CREATE POLICY "Platform admins can manage organisations"
  ON public.organisations FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins can manage platform admins"
  ON public.platform_admins FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users can view themselves as platform admins"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "Platform admins can manage permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Members can view organisation roles"
  ON public.organisation_roles FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Role managers can manage organisation roles"
  ON public.organisation_roles FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'roles.manage'))
  WITH CHECK (public.has_org_permission(organisation_id, 'roles.manage'));

CREATE POLICY "Members can view role permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_roles role
      WHERE role.id = role_permissions.role_id
        AND public.is_org_member(role.organisation_id)
    )
  );

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
    EXISTS (
      SELECT 1
      FROM public.organisation_roles role
      WHERE role.id = role_permissions.role_id
        AND public.has_org_permission(role.organisation_id, 'roles.manage')
    )
  );

CREATE POLICY "Members can view organisation members"
  ON public.organisation_members FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "User managers can manage organisation members"
  ON public.organisation_members FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'users.manage'))
  WITH CHECK (public.has_org_permission(organisation_id, 'users.manage'));

CREATE POLICY "User managers can manage invitations"
  ON public.organisation_invitations FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'users.manage'))
  WITH CHECK (public.has_org_permission(organisation_id, 'users.manage'));

CREATE POLICY "Invitees can read their pending invitations"
  ON public.organisation_invitations FOR SELECT TO authenticated
  USING (
    lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  );

CREATE OR REPLACE FUNCTION public.get_current_auth_context()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', to_jsonb(p),
    'organisation', to_jsonb(o),
    'membership', to_jsonb(om) || jsonb_build_object('role', to_jsonb(r)),
    'permissions', COALESCE(jsonb_agg(DISTINCT rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL), '[]'::jsonb),
    'is_platform_admin', public.is_platform_admin(auth.uid())
  )
  INTO result
  FROM public.profiles p
  LEFT JOIN public.organisation_members om ON om.user_id = p.id AND om.status = 'active'
  LEFT JOIN public.organisations o ON o.id = om.organisation_id
  LEFT JOIN public.organisation_roles r ON r.id = om.role_id
  LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
  WHERE p.id = auth.uid()
  GROUP BY p.id, o.id, om.id, r.id;

  RETURN COALESCE(result, jsonb_build_object(
    'profile', NULL,
    'organisation', NULL,
    'membership', NULL,
    'permissions', '[]'::jsonb,
    'is_platform_admin', public.is_platform_admin(auth.uid())
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_admin_overview()
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
    'organisations', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'status', o.status,
          'subscription_tier', o.subscription_tier,
          'subscription_active', o.subscription_active,
          'trial_ends_at', o.trial_ends_at,
          'created_at', o.created_at,
          'member_count', (SELECT count(*) FROM public.organisation_members om WHERE om.organisation_id = o.id)
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

CREATE OR REPLACE FUNCTION public.get_organisation_admin_overview(_organisation_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID := COALESCE(_organisation_id, public.current_organisation_id());
BEGIN
  IF org_id IS NULL OR NOT public.has_org_permission(org_id, 'users.manage') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN jsonb_build_object(
    'organisation', (SELECT to_jsonb(o) FROM public.organisations o WHERE o.id = org_id),
    'roles', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'key', r.key,
          'name', r.name,
          'description', r.description,
          'is_builtin', r.is_builtin,
          'permissions', COALESCE((
            SELECT jsonb_agg(rp.permission_key ORDER BY rp.permission_key)
            FROM public.role_permissions rp
            WHERE rp.role_id = r.id
          ), '[]'::jsonb)
        )
        ORDER BY r.is_builtin DESC, r.name
      ), '[]'::jsonb)
      FROM public.organisation_roles r
      WHERE r.organisation_id = org_id
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
      WHERE om.organisation_id = org_id
    ),
    'invitations', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', inv.id,
          'email', inv.email,
          'role_id', inv.role_id,
          'role_name', r.name,
          'expires_at', inv.expires_at,
          'accepted_at', inv.accepted_at,
          'revoked_at', inv.revoked_at,
          'created_at', inv.created_at
        )
        ORDER BY inv.created_at DESC
      ), '[]'::jsonb)
      FROM public.organisation_invitations inv
      LEFT JOIN public.organisation_roles r ON r.id = inv.role_id
      WHERE inv.organisation_id = org_id
    )
  );
END;
$$;

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

  INSERT INTO public.organisation_invitations (organisation_id, email, role_id, token_hash, invited_by)
  VALUES (_organisation_id, lower(_email), _role_id, encode(extensions.digest(_token, 'sha256'), 'hex'), auth.uid())
  RETURNING * INTO invitation;

  RETURN to_jsonb(invitation);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_organisation_invitation(_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organisation_id INTO org_id
  FROM public.organisation_invitations
  WHERE id = _invitation_id;

  IF org_id IS NULL OR NOT public.has_org_permission(org_id, 'users.manage') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.organisation_invitations
  SET revoked_at = now(),
      updated_at = now()
  WHERE id = _invitation_id;
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_admin_role_id UUID;
  org_name TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, practice_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'practice_name', ''))
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'signup_mode', 'new_organisation') = 'invited' THEN
    RETURN NEW;
  END IF;

  org_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'practice_name', ''), split_part(NEW.email, '@', 1), 'Organisation');

  INSERT INTO public.organisations (name, created_by)
  VALUES (org_name, NEW.id)
  RETURNING id INTO org_id;

  PERFORM public.seed_organisation_roles(org_id);

  SELECT id INTO org_admin_role_id
  FROM public.organisation_roles
  WHERE organisation_id = org_id
    AND key = 'org_admin';

  INSERT INTO public.organisation_members (organisation_id, user_id, role_id, status, joined_at)
  VALUES (org_id, NEW.id, org_admin_role_id, 'active', now());

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organisation_roles_updated_at
  BEFORE UPDATE ON public.organisation_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organisation_members_updated_at
  BEFORE UPDATE ON public.organisation_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organisation_invitations_updated_at
  BEFORE UPDATE ON public.organisation_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
