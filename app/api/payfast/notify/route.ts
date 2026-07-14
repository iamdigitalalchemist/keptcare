import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  validSignature,
  validSourceIp,
  validServerConfirmation,
  validAmount,
  type Tier,
} from "@/lib/payfast";

export const runtime = "nodejs";

// POST /api/payfast/notify — PayFast Instant Transaction Notification (ITN).
//
// PayFast calls this server-to-server after every payment and each recurring
// renewal. We NEVER trust the payload alone. Four checks must all pass before we
// grant access: (1) signature, (2) source IP, (3) server postback confirmation,
// (4) amount matches the plan price. We always return 200 so PayFast stops
// retrying; failures are logged but not surfaced.
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
  const tier = data.custom_str2 as Tier;
  const paymentStatus = data.payment_status;

  if (!organisationId || (tier !== "growth" && tier !== "pro")) {
    console.error("[payfast] ITN missing org/tier attribution", { organisationId, tier });
    return new NextResponse("OK", { status: 200 });
  }

  // (4) Amount check — only meaningful for a COMPLETE payment.
  if (paymentStatus === "COMPLETE" && !validAmount(data.amount_gross, tier)) {
    console.error("[payfast] ITN rejected: amount mismatch", {
      amount_gross: data.amount_gross,
      tier,
    });
    return new NextResponse("OK", { status: 200 });
  }

  // Record the payment (audit log). The partial unique index on pf_payment_id
  // doubles as the idempotency gate: PayFast retries the ITN, and two
  // concurrent deliveries can't both pass a SELECT-then-INSERT, so we insert
  // first and treat a unique violation as "already processed".
  const { error: insertErr } = await supabaseAdmin.from("payfast_payments").insert({
    organisation_id: organisationId,
    m_payment_id: data.m_payment_id ?? null,
    pf_payment_id: data.pf_payment_id ?? null,
    token: data.token ?? null,
    tier,
    amount_gross: data.amount_gross ? Number(data.amount_gross) : null,
    payment_status: paymentStatus ?? "UNKNOWN",
    raw: data,
  });
  if (insertErr) {
    if (insertErr.code === "23505") {
      // Duplicate pf_payment_id — this notification was already handled.
      return new NextResponse("OK", { status: 200 });
    }
    // Audit logging must not block activating a genuinely paid subscription.
    console.error("[payfast] failed to record payment", insertErr);
  }

  // Apply the state change to the organisation.
  if (paymentStatus === "COMPLETE") {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const { error } = await supabaseAdmin
      .from("organisations")
      .update({
        subscription_active: true,
        subscription_tier: tier,
        subscription_period_end: periodEnd.toISOString(),
        payfast_token: data.token ?? null,
        pending_tier: null,
      })
      .eq("id", organisationId);
    if (error) console.error("[payfast] failed to activate org", error);
  } else if (paymentStatus === "CANCELLED") {
    // Subscription cancelled by PayFast — let it lapse. We keep access until the
    // known period end (set at last successful charge); just clear the token.
    const { error } = await supabaseAdmin
      .from("organisations")
      .update({ payfast_token: null })
      .eq("id", organisationId);
    if (error) console.error("[payfast] failed to record cancellation", error);
  }

  return new NextResponse("OK", { status: 200 });
}
