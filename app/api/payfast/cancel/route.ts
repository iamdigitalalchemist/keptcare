import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { buildApiSignature, PAYFAST_API_BASE, SANDBOX } from "@/lib/payfast";

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

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const version = "v1";
  if (!merchantId) {
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

  const token = org.payfast_token;
  // Timestamp is required by the API. Format: ISO 8601 with offset.
  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    "merchant-id": merchantId,
    version,
    timestamp,
  };
  const signature = buildApiSignature(headers, passphrase);

  const url = `${PAYFAST_API_BASE}/subscriptions/${encodeURIComponent(token)}/cancel${
    SANDBOX ? "?testing=true" : ""
  }`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      signature,
      "content-type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[payfast] cancel failed", res.status, text);
    return NextResponse.json({ error: "Cancellation failed at gateway" }, { status: 502 });
  }

  // Clear the token locally; the org keeps access until subscription_period_end.
  await supabaseAdmin
    .from("organisations")
    .update({ payfast_token: null })
    .eq("id", authed.organisationId);

  return NextResponse.json({ ok: true });
}
