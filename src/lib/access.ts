// Subscription access rules, shared by the client gates (SubscriptionContext,
// ProtectedRoute) and server routes (e.g. /api/sms/send) so they can't drift.
// Pure functions — safe in client components and server code.
import { TIER_LIMITS } from "@/lib/limits";
import type { Tier } from "@/lib/payfast";

/** Grace after subscription_period_end that absorbs late renewal ITNs. */
export const PERIOD_END_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export interface BillingState {
  subscription_tier: Tier;
  subscription_active: boolean;
  subscription_period_end: string | null;
  trial_ends_at: string | null;
  status?: string | null;
}

/**
 * Paid access: the ITN marked the org active and the paid period (plus grace)
 * hasn't run out. A NULL period end means the org never successfully paid.
 */
export function hasPaidAccess(org: BillingState, now = Date.now()): boolean {
  if (!org.subscription_active || !org.subscription_period_end) return false;
  return now < new Date(org.subscription_period_end).getTime() + PERIOD_END_GRACE_MS;
}

export function isTrialActive(org: Pick<BillingState, "trial_ends_at">, now = Date.now()): boolean {
  return !!org.trial_ends_at && now < new Date(org.trial_ends_at).getTime();
}

/** Any access at all: paid, or still inside the free trial. */
export function hasAccess(org: BillingState, now = Date.now()): boolean {
  return hasPaidAccess(org, now) || isTrialActive(org, now);
}

/**
 * Whether the org may send SMS: the tier must include the SMS channel and the
 * org must have PAID access — trial access never counts. The free trial only
 * exists on Starter, which has no SMS channel; Growth/Pro bill in full from
 * day one, so a paying Growth org inside its first 14 days is allowed even
 * though trial_ends_at is still in the future.
 */
export function canSendSms(org: BillingState, now = Date.now()): boolean {
  if (org.status && org.status !== "active") return false;
  if (!TIER_LIMITS[org.subscription_tier].channels.includes("sms")) return false;
  return hasPaidAccess(org, now);
}
