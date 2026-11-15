import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { cancelSubscription } from "@/lib/payfast-api";

export const runtime = "nodejs";

// POST /api/payfast/cancel
// Cancels the organisation's PayFast subscription token. Access remains until
// the current period end (subscription_period_end); we just stop future charges.
export async function POST(req: Request) {
  const authed = await getAuthedOrg(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!authed.isOrgAdmin) {
    return NextResponse.json({ error: "Only organisation admins can manage billing" }, { status: 403 });
  }

  if (!process.env.PAYFAST_MERCHANT_ID) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  // Look up the org's token.
  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organisations")
    .select("payfast_token")
    .eq("id", authed.organisationId)
    .maybeSingle();

  if (orgErr || !org?.payfast_token) {
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 404 });
  }

  if (!(await cancelSubscription(org.payfast_token))) {
    return NextResponse.json({ error: "Cancellation failed at gateway" }, { status: 502 });
  }

  // Clear the token locally; the org keeps access until subscription_period_end.
  await supabaseAdmin
    .from("organisations")
    .update({ payfast_token: null })
    .eq("id", authed.organisationId);

  return NextResponse.json({ ok: true });
}
