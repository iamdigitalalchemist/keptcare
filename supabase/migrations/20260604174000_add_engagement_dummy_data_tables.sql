-- Organisation-scoped tables for the remaining dummy-data domains.

INSERT INTO public.permissions (key, label, description, category)
VALUES
  ('communications.read', 'View communications', 'View patient communication logs and templates.', 'communications'),
  ('communications.write', 'Manage communications', 'Create and update communication logs and templates.', 'communications'),
  ('automations.read', 'View automations', 'View automation rules.', 'automations'),
  ('automations.write', 'Manage automations', 'Create and update automation rules.', 'automations'),
  ('campaigns.read', 'View campaigns', 'View campaigns and campaign performance.', 'campaigns'),
  ('campaigns.write', 'Manage campaigns', 'Create and update campaigns.', 'campaigns'),
  ('alerts.read', 'View alerts', 'View patient alerts.', 'alerts'),
  ('alerts.write', 'Manage alerts', 'Create and update patient alerts.', 'alerts'),
  ('loyalty.read', 'View loyalty', 'View loyalty, rewards, and referrals.', 'loyalty'),
  ('loyalty.write', 'Manage loyalty', 'Create and update loyalty, rewards, and referrals.', 'loyalty'),
  ('segments.read', 'View segments', 'View patient segments.', 'segments'),
  ('segments.write', 'Manage segments', 'Create and update patient segments.', 'segments')
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT role.id, permission.key
FROM public.organisation_roles role
CROSS JOIN public.permissions permission
WHERE role.key = 'org_admin'
  AND permission.category <> 'platform'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT role.id, permission.key
FROM public.organisation_roles role
CROSS JOIN public.permissions permission
WHERE role.key = 'manager'
  AND permission.key IN (
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
SELECT role.id, permission.key
FROM public.organisation_roles role
CROSS JOIN public.permissions permission
WHERE role.key = 'staff'
  AND permission.key IN (
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
SELECT role.id, permission.key
FROM public.organisation_roles role
CROSS JOIN public.permissions permission
WHERE role.key = 'viewer'
  AND permission.key IN (
    'communications.read',
    'automations.read',
    'campaigns.read',
    'alerts.read',
    'loyalty.read',
    'segments.read'
  )
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'opened')),
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('no_visit', 'missed_appointment', 'follow_up_due', 'checkup_due')),
  trigger_value INTEGER NOT NULL,
  trigger_unit TEXT NOT NULL CHECK (trigger_unit IN ('days', 'weeks', 'months')),
  action_type TEXT NOT NULL CHECK (action_type IN ('sms', 'email', 'whatsapp')),
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  patients_affected INTEGER NOT NULL DEFAULT 0,
  last_triggered DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sent', 'active')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  segment TEXT NOT NULL DEFAULT '',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  scheduled_date DATE,
  sent_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('missed_appointment', 'overdue_visit', 'high_value', 'follow_up')),
  message TEXT NOT NULL,
  alert_date DATE NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('discount', 'free_service', 'gift', 'priority')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  referral_count INTEGER NOT NULL DEFAULT 0,
  referral_points INTEGER NOT NULL DEFAULT 0,
  last_points_earned DATE,
  joined_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, patient_id)
);

CREATE TABLE IF NOT EXISTS public.loyalty_member_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  loyalty_member_id UUID NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loyalty_member_id, reward_id)
);

CREATE TABLE IF NOT EXISTS public.referral_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  referrer_name TEXT NOT NULL DEFAULT '',
  referred_name TEXT NOT NULL,
  referred_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'registered', 'first_visit', 'expired')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('demographic', 'behavioral', 'revenue', 'custom')),
  groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_logic TEXT NOT NULL CHECK (group_logic IN ('AND', 'OR')),
  patient_count INTEGER NOT NULL DEFAULT 0,
  last_updated DATE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_organisation_id ON public.message_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_organisation_id ON public.communication_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_patient_id ON public.communication_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_organisation_id ON public.automation_rules(organisation_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organisation_id ON public.campaigns(organisation_id);
CREATE INDEX IF NOT EXISTS idx_alerts_organisation_id ON public.alerts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON public.alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_organisation_id ON public.loyalty_rewards(organisation_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_organisation_id ON public.loyalty_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_patient_id ON public.loyalty_members(patient_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_member_rewards_member_id ON public.loyalty_member_rewards(loyalty_member_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_organisation_id ON public.referral_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_referrer_id ON public.referral_records(referrer_id);
CREATE INDEX IF NOT EXISTS idx_patient_segments_organisation_id ON public.patient_segments(organisation_id);

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_logs_updated_at
  BEFORE UPDATE ON public.communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_members_updated_at
  BEFORE UPDATE ON public.loyalty_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_member_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_member_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_records_updated_at
  BEFORE UPDATE ON public.referral_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_segments_updated_at
  BEFORE UPDATE ON public.patient_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_member_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organisation message templates"
  ON public.message_templates FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'communications.read'));

CREATE POLICY "Members can manage organisation message templates"
  ON public.message_templates FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'communications.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'communications.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation communication logs"
  ON public.communication_logs FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'communications.read'));

CREATE POLICY "Members can manage organisation communication logs"
  ON public.communication_logs FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'communications.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'communications.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation automation rules"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'automations.read'));

CREATE POLICY "Members can manage organisation automation rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'automations.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'automations.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'campaigns.read'));

CREATE POLICY "Members can manage organisation campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'campaigns.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'campaigns.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'alerts.read'));

CREATE POLICY "Members can manage organisation alerts"
  ON public.alerts FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'alerts.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'alerts.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation loyalty rewards"
  ON public.loyalty_rewards FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.read'));

CREATE POLICY "Members can manage organisation loyalty rewards"
  ON public.loyalty_rewards FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'loyalty.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation loyalty members"
  ON public.loyalty_members FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.read'));

CREATE POLICY "Members can manage organisation loyalty members"
  ON public.loyalty_members FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'loyalty.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation loyalty member rewards"
  ON public.loyalty_member_rewards FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.read'));

CREATE POLICY "Members can manage organisation loyalty member rewards"
  ON public.loyalty_member_rewards FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'loyalty.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation referral records"
  ON public.referral_records FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.read'));

CREATE POLICY "Members can manage organisation referral records"
  ON public.referral_records FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'loyalty.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'loyalty.write')
    AND organisation_id = public.current_organisation_id()
  );

CREATE POLICY "Members can view organisation patient segments"
  ON public.patient_segments FOR SELECT TO authenticated
  USING (public.has_org_permission(organisation_id, 'segments.read'));

CREATE POLICY "Members can manage organisation patient segments"
  ON public.patient_segments FOR ALL TO authenticated
  USING (public.has_org_permission(organisation_id, 'segments.write'))
  WITH CHECK (
    public.has_org_permission(organisation_id, 'segments.write')
    AND organisation_id = public.current_organisation_id()
  );
