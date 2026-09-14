import { buildApiSignature, PAYFAST_API_BASE, SANDBOX } from "@/lib/payfast";

// Thin client for PayFast's subscription-management API (api.payfast.co.za).
// Used to anchor a new subscription's first charge to the trial end
// (PUT next_run) and to change the billed amount on upgrade/downgrade.
// Auth: merchant-id / version / timestamp headers + MD5 signature.

function authHeaders(): Record<string, string> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId) throw new Error("Billing is not configured");
  const headers: Record<string, string> = {
    "merchant-id": merchantId,
    version: "v1",
    timestamp: new Date().toISOString(),
  };
  return { ...headers, signature: buildApiSignature(headers, passphrase) };
}

/**
 * Call the PayFast subscription API. `body` fields are included in the
 * signature per the API spec (sorted, URL-encoded). Returns true on 2xx.
 */
export async function payfastApiRequest(
  method: "PUT" | "GET" | "DELETE",
  path: string,
  body?: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `${PAYFAST_API_BASE}${path}${SANDBOX ? "?testing=true" : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(),
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
  nextRun: string, // YYYY-MM-DD
): Promise<boolean> {
  const r = await payfastApiRequest("PUT", `/subscriptions/${encodeURIComponent(token)}`, {
    next_run: nextRun,
  });
  if (!r.ok) console.error("[payfast] set next_run failed", r.status, r.text);
  return r.ok;
}

/** Change the subscription's recurring amount (cents). Takes effect at next_run. */
export async function setSubscriptionAmount(
  token: string,
  amountCents: number,
): Promise<boolean> {
  const r = await payfastApiRequest("PUT", `/subscriptions/${encodeURIComponent(token)}`, {
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
