-- Keep future organisation role seeding in sync with the expanded permission set.

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
  WHERE key IN (
    'patients.read',
    'patients.write',
    'appointments.read',
    'appointments.write',
    'users.manage',
    'organisation.manage',
    'communications.read',
    'communications.write',
    'automations.read',
    'automations.write',
    'campaigns.read',
    'campaigns.write',
    'alerts.read',
    'alerts.write',
    'loyalty.read',
    'loyalty.write',
    'segments.read',
    'segments.write'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT staff_role, key FROM public.permissions
  WHERE key IN (
    'patients.read',
    'patients.write',
    'appointments.read',
    'appointments.write',
    'communications.read',
    'communications.write',
    'alerts.read',
    'alerts.write',
    'loyalty.read',
    'loyalty.write',
    'segments.read'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT viewer_role, key FROM public.permissions
  WHERE key IN (
    'patients.read',
    'appointments.read',
    'communications.read',
    'automations.read',
    'campaigns.read',
    'alerts.read',
    'loyalty.read',
    'segments.read'
  )
  ON CONFLICT DO NOTHING;
END;
$$;
