// Shared tier limits, used by the UI (disabled buttons, toasts) and mirrored by
// the Postgres trigger in the tier_limits migration. Keep the two in sync.
import type { Tier } from "@/lib/payfast";

export interface TierLimit {
  /** Max stored patients (active + archived). */
  patients: number;
  /** Max concurrently active automation rules. */
  automations: number;
  /** Max active organisation members (seats). */
  seats: number;
  /** Messaging channels available. */
  channels: Array<"email" | "sms" | "whatsapp">;
}

export const TIER_LIMITS: Record<Tier, TierLimit> = {
  starter: { patients: 200, automations: 2, seats: 1, channels: ["email"] },
  growth: { patients: 1000, automations: 10, seats: 3, channels: ["email", "sms"] },
  pro: { patients: Infinity, automations: Infinity, seats: Infinity, channels: ["email", "sms", "whatsapp"] },
};

export const UNLIMITED = Number.POSITIVE_INFINITY;

// shortcut: one flat cap for every plan (issue #25 cites 500/24h); make it per-tier
// with included credits once pricing for messaging is decided.
/** Max messages an organisation can send in any rolling 24 hours, all channels. */
export const DAILY_MESSAGE_CAP = 500;

const PERIOD_END_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Server-side twin of SubscriptionContext's isSubscriptionActive: access during
 * the trial, or while paid up to subscription_period_end + a 3-day grace for
 * late renewal notifications. A NULL period end means never paid.
 */
export function hasSubscriptionAccess(
  org: { subscription_active: boolean; subscription_period_end: string | null; trial_ends_at: string | null },
  now = Date.now(),
): boolean {
  const trial = org.trial_ends_at ? now < new Date(org.trial_ends_at).getTime() : false;
  const paid =
    org.subscription_active &&
    !!org.subscription_period_end &&
    now < new Date(org.subscription_period_end).getTime() + PERIOD_END_GRACE_MS;
  return trial || paid;
}

/** Human-readable limit for tooltips/messages, e.g. "1,000" or "Unlimited". */
export function limitLabel(value: number): string {
  return value === UNLIMITED ? "Unlimited" : value.toLocaleString("en-ZA");
}

export type LimitKind = "patients" | "automations" | "seats";

const KIND_LABELS: Record<LimitKind, string> = {
  patients: "patients",
  automations: "automation rules",
  seats: "team seats",
};

/**
 * Returns an error message if inserting one more `kind` item would breach the
 * tier limits, else null. Mirrors the enforce_tier_limits() DB trigger:
 * blocked at the current tier's cap, and frozen entirely while a pending
 * downgrade's (lower) cap is already reached.
 */
export function limitViolation(
  kind: LimitKind,
  currentCount: number,
  tier: keyof typeof TIER_LIMITS,
  pendingTier: keyof typeof TIER_LIMITS | null,
): string | null {
  const cap = TIER_LIMITS[tier][kind];
  const label = KIND_LABELS[kind];
  if (currentCount >= cap) {
    return `Plan limit reached: the ${tier} plan allows ${limitLabel(cap)} ${label}. Upgrade your plan to add more.`;
  }
  if (pendingTier && pendingTier !== tier) {
    const pendingCap = TIER_LIMITS[pendingTier][kind];
    if (currentCount >= pendingCap) {
      return `Plan change pending: your upcoming ${pendingTier} plan allows ${limitLabel(pendingCap)} ${label}. You are over that limit — remove some ${label} first.`;
    }
  }
  return null;
}
