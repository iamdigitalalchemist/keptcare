import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { PLAN_PRICES_ZAR, planPriceCents, type Tier } from "@/lib/payfast";
import { cancelSubscription, setSubscriptionAmount } from "@/lib/payfast-api";

export const runtime = "nodejs";

const TIER_ORDER: Record<Tier, number> = { starter: 0, growth: 1, pro: 2 };

// POST /api/payfast/change
// Body: { tier }
// Changes what an existing PayFast subscription bills. PayFast applies the new
// amount at the next scheduled run (no proration), which is exactly the policy:
// the new price takes effect at the next billing date.
//
// - Upgrade: features switch immediately (subscription_tier updated now).
// - Downgrade: features switch at the period end (pending_tier); the renewal
//   ITN applies it and pauses any automations over the new tier's cap.
export async function POST(req: Request) {
  const authed = await getAuthedOrg(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!authed.isOrgAdmin) {
    return NextResponse.json({ error: "Only organisation admins can manage billing" }, { status: 403 });
  }

  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const tier = body.tier as Tier;
  if (!["starter", "growth", "pro"].includes(tier)) {
    return NextResponse.json({ error: "Unknown tier" }, { status: 400 });
  }

  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organisations")
    .select("payfast_token, subscription_tier, pending_tier, subscription_period_end, trial_ends_at")
    .eq("id", authed.organisationId)
    .maybeSingle();

  if (orgErr || !org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }
  if (!org.payfast_token) {
    // No subscription on file (e.g. trial without card) — the client must run
    // the normal checkout flow for the chosen tier instead.
    return NextResponse.json({ error: "No subscription on file — use checkout" }, { status: 409 });
  }

  // Mid-trial move to a paid tier. The free trial (and its R0 subscription)
  // only ever applies to Starter; Growth/Pro must bill in full from day one.
  // A PUT amount change only takes effect at next_run — the trial end date —
  // which would hand out free days on a paid tier. Cancel the trial
  // subscription instead and have the client run a fresh full-price checkout,
  // which charges immediately. The client's 409 handler does exactly that.
  const trialStillRunning = org.trial_ends_at ? new Date(org.trial_ends_at) > new Date() : false;
  if (trialStillRunning && tier !== "starter") {
    const cancelled = await cancelSubscription(org.payfast_token);
    if (!cancelled) {
      return NextResponse.json(
        { error: "Could not stop the trial subscription at the gateway" },
        { status: 502 },
      );
    }
    const { error: clearErr } = await supabaseAdmin
      .from("organisations")
      .update({ payfast_token: null, pending_tier: null })
      .eq("id", authed.organisationId);
    if (clearErr) {
      // The gateway subscription is already cancelled — retrying this request
      // is safe (cancel tolerates 404) and will converge on a cleared token.
      console.error("[payfast] failed to clear cancelled trial token", clearErr);
      return NextResponse.json({ error: "Failed to clear the trial subscription" }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Paid tiers bill immediately — use checkout" },
      { status: 409 },
    );
  }

  const currentTier = (org.pending_tier ?? org.subscription_tier) as Tier;
  if (currentTier === tier) {
    return NextResponse.json({ error: "Already on that plan" }, { status: 400 });
  }

  const applied = await setSubscriptionAmount(org.payfast_token, planPriceCents(tier));
  if (!applied) {
    return NextResponse.json({ error: "Could not update the subscription at the gateway" }, { status: 502 });
  }

  const isUpgrade = TIER_ORDER[tier] > TIER_ORDER[currentTier];
  const update: { subscription_tier?: Tier; pending_tier?: Tier | null } = isUpgrade
    ? { subscription_tier: tier, pending_tier: null }
    : { pending_tier: tier };
  const { error: updErr } = await supabaseAdmin
    .from("organisations")
    .update(update)
    .eq("id", authed.organisationId);
  if (updErr) {
    console.error("[payfast] failed to record plan change", updErr);
    return NextResponse.json({ error: "Failed to record the plan change" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    effectiveAt: org.subscription_period_end ?? null,
    isUpgrade,
    newAmountZar: PLAN_PRICES_ZAR[tier],
  });
}
