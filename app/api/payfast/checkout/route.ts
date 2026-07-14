import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import {
  buildSignature,
  PLAN_PRICES_ZAR,
  PLAN_NAMES,
  PAYFAST_HOSTS,
  type Tier,
} from "@/lib/payfast";

export const runtime = "nodejs";

// POST /api/payfast/checkout
// Body: { tier: "growth" | "pro" }
// Returns the PayFast process URL and the signed field set for the client to
// auto-submit as a form. We build a monthly recurring subscription.
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
  if (tier !== "growth" && tier !== "pro") {
    return NextResponse.json({ error: "Unknown or non-payable tier" }, { status: 400 });
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!merchantId || !merchantKey || !appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  const amount = PLAN_PRICES_ZAR[tier].toFixed(2);
  // Our own reference. PayFast echoes m_payment_id back on the ITN.
  const mPaymentId = `${authed.organisationId}:${tier}`;

  // Field order matters for the signature: PayFast signs fields in the order sent.
  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${appUrl}/pricing/success`,
    cancel_url: `${appUrl}/pricing/cancelled`,
    notify_url: `${appUrl}/api/payfast/notify`,
    m_payment_id: mPaymentId,
    amount,
    item_name: `KeptCare ${PLAN_NAMES[tier]} plan`,
    // Recurring subscription configuration. billing_date is omitted entirely —
    // PayFast defaults it to today.
    subscription_type: "1",
    recurring_amount: amount,
    frequency: "3", // 3 = monthly
    cycles: "0", // 0 = indefinite until cancelled
    // Custom fields echoed back on the ITN so we can attribute the payment.
    custom_str1: authed.organisationId,
    custom_str2: tier,
  };

  fields.signature = buildSignature(fields, passphrase);

  return NextResponse.json({ url: PAYFAST_HOSTS.process, fields });
}
