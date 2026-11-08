import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  validSignature,
  validSourceIp,
  validServerConfirmation,
  validAmount,
  PLAN_PRICES_ZAR,
  type Tier,
} from "@/lib/payfast";
import { cancelSubscription, setSubscriptionNextRun } from "@/lib/payfast-api";

export const runtime = "nodejs";

// POST /api/payfast/notify — PayFast Instant Transaction Notification (ITN).
//
// PayFast calls this server-to-server after every payment and each recurring
// renewal. We NEVER trust the payload alone. Four checks must all pass before we
// grant access: (1) signature, (2) source IP, (3) server postback confirmation,
// (4) amount matches what the subscription is scheduled to bill. We always
// return 200 so PayFast stops retrying; failures are logged but not surfaced.
//
// Tier attribution: custom_str2 reflects the tier at checkout time. After an
// upgrade/downgrade the subscription bills a different amount, so renewals must
// NOT derive the tier from custom_str2 — the DB (pending_tier ?? subscription_tier)
// is the source of truth for what PayFast should be charging.
//
// One subscription per org: checkout refuses to start while a token is on file
// (409) and a mid-trial upgrade clears the token before re-checkout, so a
// COMPLETE for any other token is an orphaned duplicate (e.g. "Add card"
// completed in two tabs) and is cancelled at PayFast.
export async function POST(req: Request) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const data: Record<string, string> = {};
  params.forEach((value, key) => {
    data[key] = value;
  });

  const passphrase = process.env.PAYFAST_PASSPHRASE;

  // (1) Signature.
  if (!validSignature(data, passphrase)) {
    console.error("[payfast] ITN rejected: bad signature", { m_payment_id: data.m_payment_id });
    return new NextResponse("OK", { status: 200 });
  }

  // (2) Source IP. The connecting IP is provided by the platform.
  const remoteIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip");
  if (!(await validSourceIp(remoteIp))) {
    console.error("[payfast] ITN rejected: untrusted source IP", { remoteIp });
    return new NextResponse("OK", { status: 200 });
  }

  // (3) Server-to-server postback confirmation.
  if (!(await validServerConfirmation(data))) {
    console.error("[payfast] ITN rejected: server confirmation failed");
    return new NextResponse("OK", { status: 200 });
  }

  const organisationId = data.custom_str1;
  const checkoutTier = data.custom_str2 as Tier;
  const paymentStatus = data.payment_status;

  if (!organisationId || !["starter", "growth", "pro"].includes(checkoutTier)) {
    console.error("[payfast] ITN missing org/tier attribution", { organisationId, checkoutTier });
    return new NextResponse("OK", { status: 200 });
  }

  // Current org state determines whether this is a subscription creation and
  // what amount a renewal should carry.
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("payfast_token, subscription_tier, pending_tier, subscription_period_end, trial_ends_at")
    .eq("id", organisationId)
    .maybeSingle();

  // A retry of an ITN we already handled. Checked up front because the org has
  // moved on since (e.g. a retried R0 trial setup would now fail the amount
  // check). The unique index on pf_payment_id below still settles races.
  if (data.pf_payment_id) {
    const { data: seen } = await supabaseAdmin
      .from("payfast_payments")
      .select("id")
      .eq("pf_payment_id", data.pf_payment_id)
      .maybeSingle();
    if (seen) return new NextResponse("OK", { status: 200 });
  }

  const isCreation = !org?.payfast_token && !!data.token;
  // A notification for a subscription that is no longer the org's current one
  // (e.g. the R0 trial subscription cancelled during a mid-trial upgrade, whose
  // CANCELLED ITN can land after the replacement exists) must not touch state.
  const isStaleToken = !!org?.payfast_token && !!data.token && data.token !== org.payfast_token;
  // What this payment should carry: a creation bills the tier chosen at
  // checkout (the DB row may still say "starter" for a first Growth/Pro
  // signup); a renewal bills whatever the subscription is scheduled at.
  const expectedTier: Tier = isCreation ? checkoutTier : (org?.pending_tier ?? org?.subscription_tier ?? checkoutTier);
  const expectedZar = PLAN_PRICES_ZAR[expectedTier];

  // Record the payment (audit log). The partial unique index on pf_payment_id
  // doubles as the idempotency gate: PayFast retries the ITN, and two
  // concurrent deliveries can't both pass a SELECT-then-INSERT, so we insert
  // first and treat a unique violation as "already processed".
  const recordPayment = async (): Promise<"recorded" | "duplicate"> => {
    const { error: insertErr } = await supabaseAdmin.from("payfast_payments").insert({
      organisation_id: organisationId,
      m_payment_id: data.m_payment_id ?? null,
      pf_payment_id: data.pf_payment_id ?? null,
      token: data.token ?? null,
      tier: checkoutTier,
      amount_gross: data.amount_gross ? Number(data.amount_gross) : null,
      payment_status: paymentStatus ?? "UNKNOWN",
      raw: data,
    });
    if (insertErr?.code === "23505") return "duplicate";
    // Audit logging must not block activating a genuinely paid subscription.
    if (insertErr) console.error("[payfast] failed to record payment", insertErr);
    return "recorded";
  };

  // A notification for a subscription that is no longer the org's current one
  // never touches org state. This runs before the amount check: the ITN is
  // already authenticated, and a duplicate R0 trial setup would fail it.
  if (isStaleToken) {
    await recordPayment();
    if (paymentStatus === "COMPLETE") {
      // Cancel even on a retried ITN: cancel is idempotent (404 counts as done),
      // and a retry is the only second chance if the first attempt failed.
      const cancelled = await cancelSubscription(data.token);
      console.warn("[payfast] COMPLETE for a superseded subscription token — cancelling it at PayFast", {
        organisationId,
        cancelled,
      });
    } else {
      console.warn("[payfast] ITN for a superseded subscription token — recorded, not applied", {
        organisationId,
        paymentStatus,
      });
    }
    return new NextResponse("OK", { status: 200 });
  }

  // (4) Amount check — only meaningful for a COMPLETE payment. A creation is
  // either the R0.00 trial setup (Starter only — the trial never applies to
  // Growth/Pro) or a full-price signup (including after a lapsed trial, or a
  // mid-trial move to a paid tier).
  if (paymentStatus === "COMPLETE") {
    const isTrialSetup = isCreation && checkoutTier === "starter";
    const ok = isTrialSetup
      ? validAmount(data.amount_gross, expectedZar, { isTrialSetup: true }) ||
        validAmount(data.amount_gross, expectedZar)
      : validAmount(data.amount_gross, expectedZar);
    if (!ok) {
      console.error("[payfast] ITN rejected: amount mismatch", {
        amount_gross: data.amount_gross,
        expectedZar,
        expectedTier,
        isCreation,
      });
      return new NextResponse("OK", { status: 200 });
    }
  }

  if ((await recordPayment()) === "duplicate") {
    // Duplicate pf_payment_id — this notification was already handled.
    return new NextResponse("OK", { status: 200 });
  }

  if (paymentStatus === "COMPLETE") {
    const oneMonthFrom = (d: Date) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    };

    if (isCreation) {
      // New subscription. For a trial signup nothing has been charged yet, so
      // access only runs to the trial end; the first real charge (anchored to
      // that date below) extends it by a month via the renewal branch. If that
      // charge fails, access lapses after the usual 3-day grace.
      const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
      const isTrialSignup =
        checkoutTier === "starter" &&
        Math.abs(Number(data.amount_gross)) < 0.01 &&
        !!trialEndsAt &&
        trialEndsAt > new Date();
      const periodEnd = isTrialSignup
        ? trialEndsAt.toISOString()
        : oneMonthFrom(new Date());

      // Only claim the org while no token is on file: two creation ITNs that
      // both read an empty token (two-tab checkout) must not both win, or the
      // first subscription keeps charging with nothing pointing at it.
      const { data: claimed, error } = await supabaseAdmin
        .from("organisations")
        .update({
          subscription_active: true,
          subscription_tier: checkoutTier,
          subscription_period_end: periodEnd,
          payfast_token: data.token ?? null,
          pending_tier: null,
        })
        .eq("id", organisationId)
        .is("payfast_token", null)
        .select("id");
      if (error) {
        console.error("[payfast] failed to activate org", error);
      } else if (!claimed?.length) {
        const cancelled = data.token ? await cancelSubscription(data.token) : false;
        console.warn("[payfast] creation ITN lost the race to another subscription — cancelling it at PayFast", {
          organisationId,
          cancelled,
        });
        return new NextResponse("OK", { status: 200 });
      }

      // Anchor the billing schedule: R0 today, first R3,500 charge on the day
      // the trial ends, then monthly on that date.
      if (isTrialSignup && data.token) {
        const nextRun = trialEndsAt!.toISOString().slice(0, 10);
        await setSubscriptionNextRun(data.token, nextRun);
      }
    } else {
      // Renewal. Extend the period one month from the previous period end to
      // keep the billing anchor stable, and apply a pending downgrade if one
      // is scheduled (features switch now; PayFast already billed the new
      // amount — that is what the amount check above verified).
      const prevEnd = org?.subscription_period_end ? new Date(org.subscription_period_end) : new Date();
      const update: { subscription_active: boolean; subscription_period_end: string; subscription_tier?: Tier; pending_tier?: Tier | null } = {
        subscription_active: true,
        subscription_period_end: oneMonthFrom(prevEnd > new Date() ? prevEnd : new Date()),
      };
      if (org?.pending_tier) {
        update.subscription_tier = org.pending_tier;
        update.pending_tier = null;
        const { error: fnErr } = await (supabaseAdmin.rpc as any)("pause_excess_automations", {
          _organisation_id: organisationId,
          _new_tier: org.pending_tier,
        });
        if (fnErr) console.error("[payfast] failed to pause excess automations", fnErr);
      }
      const { error } = await supabaseAdmin
        .from("organisations")
        .update(update)
        .eq("id", organisationId);
      if (error) console.error("[payfast] failed to extend subscription", error);
    }
  } else if (paymentStatus === "CANCELLED" && org?.payfast_token && data.token === org.payfast_token) {
    // The org's current subscription was cancelled at PayFast — let it lapse.
    // Access continues until the known period end (set at the last successful
    // charge); just clear the token. Cancellations of older tokens were
    // filtered out above.
    const { error } = await supabaseAdmin
      .from("organisations")
      .update({ payfast_token: null })
      .eq("id", organisationId)
      .eq("payfast_token", data.token);
    if (error) console.error("[payfast] failed to record cancellation", error);
  }

  return new NextResponse("OK", { status: 200 });
}
