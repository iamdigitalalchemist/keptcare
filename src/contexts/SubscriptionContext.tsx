import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

type Tier = "starter" | "growth" | "pro";

export interface Organisation {
  id: string;
  name: string;
  email: string | null;
  logo_url: string | null;
  phone: string | null;
  website: string | null;
  subscription_tier: Tier;
  trial_ends_at: string;
  subscription_active: boolean;
  status: string;
}

export interface OrganisationRole {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  is_builtin?: boolean;
}

export interface OrganisationMembership {
  id: string;
  organisation_id: string;
  user_id: string;
  role_id: string | null;
  status: string;
  role?: OrganisationRole | null;
}

interface SubscriptionContextType {
  tier: Tier;
  trialEndsAt: Date | null;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  isPlatformAdmin: boolean;
  organisation: Organisation | null;
  membership: OrganisationMembership | null;
  permissions: string[];
  loading: boolean;
  canAccess: (feature: Feature) => boolean;
  hasPermission: (permission: string) => boolean;
  patientLimit: number;
  refreshSubscription: () => Promise<void>;
  refreshOrganisationAuth: () => Promise<void>;
}

export type Feature =
  | "automation"
  | "segmentation"
  | "messaging"
  | "campaigns"
  | "advanced_automation"
  | "priority_support"
  | "bulk_messaging";

const TIER_FEATURES: Record<Tier, Feature[]> = {
  starter: [],
  growth: ["automation", "segmentation", "messaging"],
  pro: ["automation", "segmentation", "messaging", "campaigns", "advanced_automation", "priority_support", "bulk_messaging"],
};

const TIER_PATIENT_LIMITS: Record<Tier, number> = {
  starter: 50,
  growth: 500,
  pro: Infinity,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "starter",
  trialEndsAt: null,
  isTrialActive: false,
  isSubscriptionActive: false,
  isAdmin: false,
  isOrgAdmin: false,
  isPlatformAdmin: false,
  organisation: null,
  membership: null,
  permissions: [],
  loading: true,
  canAccess: () => false,
  hasPermission: () => false,
  patientLimit: 50,
  refreshSubscription: async () => {},
  refreshOrganisationAuth: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("starter");
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [membership, setMembership] = useState<OrganisationMembership | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setTier("starter");
      setTrialEndsAt(null);
      setSubscriptionActive(false);
      setIsPlatformAdmin(false);
      setOrganisation(null);
      setMembership(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await (supabase as any).rpc("get_current_auth_context");
    if (error) {
      console.error("Failed to load organisation auth context", error);
      setIsPlatformAdmin(false);
      setOrganisation(null);
      setMembership(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const nextOrganisation = data?.organisation as Organisation | null;
    const nextMembership = data?.membership as OrganisationMembership | null;
    const nextPermissions = Array.isArray(data?.permissions) ? data.permissions : [];

    setOrganisation(nextOrganisation);
    setMembership(nextMembership);
    setPermissions(nextPermissions);
    setIsPlatformAdmin(Boolean(data?.is_platform_admin));

    if (nextOrganisation) {
      setTier(nextOrganisation.subscription_tier);
      setTrialEndsAt(nextOrganisation.trial_ends_at ? new Date(nextOrganisation.trial_ends_at) : null);
      setSubscriptionActive(nextOrganisation.subscription_active);
    } else {
      setTier("starter");
      setTrialEndsAt(null);
      setSubscriptionActive(false);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isTrialActive = trialEndsAt ? new Date() < trialEndsAt : false;
  const isSubscriptionActive = subscriptionActive || isTrialActive;
  const isOrgAdmin = membership?.role?.key === "org_admin";
  const isAdmin = isPlatformAdmin;

  const hasPermission = (permission: string): boolean => {
    if (isPlatformAdmin) return true;
    return permissions.includes(permission);
  };

  const canAccess = (feature: Feature): boolean => {
    if (!isSubscriptionActive) return false;
    if (isPlatformAdmin) return true;
    return TIER_FEATURES[tier].includes(feature);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        trialEndsAt,
        isTrialActive,
        isSubscriptionActive,
        isAdmin,
        isOrgAdmin,
        isPlatformAdmin,
        organisation,
        membership,
        permissions,
        loading,
        canAccess,
        hasPermission,
        patientLimit: TIER_PATIENT_LIMITS[tier],
        refreshSubscription: fetchSubscription,
        refreshOrganisationAuth: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
