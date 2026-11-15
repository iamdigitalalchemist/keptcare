import { buildApiSignature, PAYFAST_API_BASE, SANDBOX } from "@/lib/payfast";

// Thin client for PayFast's subscription-management API (api.payfast.co.za).
// Used to anchor a new subscription's first charge to the trial end
// (PATCH /update run_date), to change the billed amount on upgrade/downgrade,
// and to cancel. Endpoints and signing mirror the official SDK
// (payfast-php-sdk lib/Services/Subscriptions.php, lib/Request.php).
// Auth: merchant-id / version / timestamp headers + MD5 signature over the
// headers AND body fields.

// PHP date("Y-m-d\TH:i:sO"), as the SDK sends: 2026-10-12T08:30:00+0000.
function apiTimestamp(): string {
  return `${new Date().toISOString().slice(0, 19)}+0000`;
}

function authHeaders(body?: Record<string, string | number>): Record<string, string> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId) throw new Error("Billing is not configured");
  const headers: Record<string, string> = {
    "merchant-id": merchantId,
    version: "v1",
    timestamp: apiTimestamp(),
  };
  const signed: Record<string, string> = { ...headers };
  for (const [k, v] of Object.entries(body ?? {})) signed[k] = String(v);
  return { ...headers, signature: buildApiSignature(signed, passphrase) };
}

/**
 * Call the PayFast subscription API. `body` fields are included in the
 * signature per the API spec (sorted, URL-encoded). Returns true on 2xx.
 */
export async function payfastApiRequest(
  method: "PUT" | "PATCH" | "GET",
  path: string,
  body?: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `${PAYFAST_API_BASE}${path}${SANDBOX ? "?testing=true" : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(body),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

/** Set the date of the subscription's next (and then monthly) charge. */
export async function setSubscriptionNextRun(
  token: string,
  runDate: string, // YYYY-MM-DD
): Promise<boolean> {
  const r = await payfastApiRequest("PATCH", `/subscriptions/${encodeURIComponent(token)}/update`, {
    run_date: runDate,
  });
  if (!r.ok) console.error("[payfast] set run_date failed", r.status, r.text);
  return r.ok;
}

/** Change the subscription's recurring amount (cents). Takes effect at the next run. */
export async function setSubscriptionAmount(
  token: string,
  amountCents: number,
): Promise<boolean> {
  const r = await payfastApiRequest("PATCH", `/subscriptions/${encodeURIComponent(token)}/update`, {
    amount: amountCents,
  });
  if (!r.ok) console.error("[payfast] set amount failed", r.status, r.text);
  return r.ok;
}

/**
 * Cancel a subscription token; future charges stop. A 404 means the token no
 * longer exists at the gateway (e.g. an earlier cancel went through but the
 * local update failed) — treat it as success so retries converge.
 */
export async function cancelSubscription(token: string): Promise<boolean> {
  const r = await payfastApiRequest("PUT", `/subscriptions/${encodeURIComponent(token)}/cancel`);
  if (!r.ok && r.status !== 404) {
    console.error("[payfast] cancel failed", r.status, r.text);
    return false;
  }
  return true;
}
