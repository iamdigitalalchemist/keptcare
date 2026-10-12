import crypto from "crypto";

// PayFast integration helpers.
//
// PayFast processes in ZAR. Prices are the ones shown on the public home page:
// Starter R3,500 / Growth R5,000 / Pro R7,000 per month. The ITN webhook
// validates paid amounts against these values, so they must match exactly what
// the checkout charges.
export type Tier = "starter" | "growth" | "pro";

export const PLAN_PRICES_ZAR: Record<Tier, number> = {
  starter: 3500.0,
  growth: 5000.0,
  pro: 7000.0,
};

/** Monthly price in cents, as required by the PayFast subscription API. */
export function planPriceCents(tier: Tier): number {
  return Math.round(PLAN_PRICES_ZAR[tier] * 100);
}

export const PLAN_NAMES: Record<Tier, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const SANDBOX = process.env.PAYFAST_SANDBOX !== "false"; // default to sandbox unless explicitly disabled

export const PAYFAST_HOSTS = {
  process: SANDBOX
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process",
  validate: SANDBOX
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate",
};

// PayFast server hostnames whose IPs are allowed to hit the ITN webhook.
const PAYFAST_VALID_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
];

// Checkout attributes in the order PayFast's attribute reference lists them.
// PayFast recomputes the checkout signature in THIS order, regardless of the
// order the form posts them, so the signature must be built in it too. Taken
// from the official SDK (payfast-php-sdk lib/Auth.php generateSignature).
export const CHECKOUT_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "notify_method",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "currency",
  "payment_method",
  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles",
  "subscription_notify_email",
  "subscription_notify_webhook",
  "subscription_notify_buyer",
] as const;

/**
 * Build the signature for a checkout (hosted payment page) request.
 *
 * PayFast rules: take the known attributes in documented order (see
 * CHECKOUT_FIELD_ORDER — NOT insertion order), skip blank values, trim and
 * URL-encode each value like PHP urlencode, join as `key=value&...`, append
 * the passphrase if set, then MD5. Unknown keys are not signed.
 */
export function buildSignature(
  params: Record<string, string | number | undefined>,
  passphrase?: string,
): string {
  const pairs: string[] = [];
  for (const key of CHECKOUT_FIELD_ORDER) {
    const value = params[key];
    if (value === undefined || value === null || String(value).trim() === "") continue;
    pairs.push(`${key}=${encodeValue(String(value).trim())}`);
  }
  let base = pairs.join("&");
  if (passphrase && passphrase.trim().length > 0) {
    base += `&passphrase=${encodeValue(passphrase.trim())}`;
  }
  return crypto.createHash("md5").update(base).digest("hex");
}

/**
 * The ITN parameter string: every posted field in the order received, blanks
 * INCLUDED and values untrimmed, stopping at `signature`. This differs from
 * the checkout rules — PayFast posts empty fields (custom_str3, name_first,
 * ...) on the ITN and signs them. Also the body for the server postback.
 */
export function itnParamString(data: Record<string, string>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "signature") break;
    pairs.push(`${key}=${encodeValue(value)}`);
  }
  return pairs.join("&");
}

// Match PHP urlencode, which PayFast uses server-side: everything except
// [A-Za-z0-9-_.] is percent-encoded with uppercase hex, and spaces become "+".
// encodeURIComponent leaves !'()*~ alone and uses %20 for spaces.
function encodeValue(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Validate the signature on an incoming ITN payload against what we compute from
 * the same fields. Uses a timing-safe comparison.
 */
export function validSignature(
  data: Record<string, string>,
  passphrase?: string,
): boolean {
  const received = data.signature;
  if (!received) return false;
  let base = itnParamString(data);
  if (passphrase && passphrase.trim().length > 0) {
    base += `&passphrase=${encodeValue(passphrase.trim())}`;
  }
  const expected = crypto.createHash("md5").update(base).digest("hex");
  return timingSafeEqualHex(received, expected);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Resolved PayFast IPs, cached briefly so each ITN doesn't pay four DNS round
// trips. An empty result (resolver outage) is never cached — the next request
// retries rather than rejecting legitimate notifications for the full TTL.
let payfastIpCache: { ips: Set<string>; expires: number } | null = null;
const PAYFAST_IP_TTL_MS = 10 * 60 * 1000;

/**
 * Confirm the request source resolves to a known PayFast host. `remoteIp` is the
 * connecting IP (from the platform); we resolve the allowlisted hostnames and
 * check membership. Returns a promise because DNS resolution is async.
 */
export async function validSourceIp(remoteIp: string | null): Promise<boolean> {
  if (!remoteIp) return false;
  if (!payfastIpCache || payfastIpCache.expires < Date.now()) {
    const dns = await import("node:dns/promises");
    const allowed = new Set<string>();
    await Promise.all(
      PAYFAST_VALID_HOSTS.map(async (host) => {
        try {
          const addrs = await dns.resolve4(host);
          addrs.forEach((a) => allowed.add(a));
        } catch {
          // ignore hosts that fail to resolve
        }
      }),
    );
    if (allowed.size === 0) return false;
    payfastIpCache = { ips: allowed, expires: Date.now() + PAYFAST_IP_TTL_MS };
  }
  return payfastIpCache.ips.has(remoteIp);
}

/**
 * Server-to-server postback: ask PayFast to confirm the ITN data we received is
 * genuine. This is the strongest of the four ITN checks.
 */
export async function validServerConfirmation(
  data: Record<string, string>,
): Promise<boolean> {
  const body = itnParamString(data);
  const res = await fetch(PAYFAST_HOSTS.validate, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = (await res.text()).trim();
  return text === "VALID";
}

/**
 * Check the gross amount PayFast reports matches the expected price, to the
 * cent. Guards against a tampered checkout amount.
 *
 * Two legitimate shapes:
 * - `isTrialSetup`: the initial R0.00 charge when a subscription is created
 *   for a trial org (card captured now, first real charge on day 14).
 * - otherwise the paid amount must equal `expectedZar` — the price of whatever
 *   tier the subscription is currently scheduled to bill (current tier for
 *   upgrades, pending tier for downgrades), not necessarily the tier the
 *   checkout was originally created with.
 */
export function validAmount(
  amountGross: string | number,
  expectedZar: number,
  opts: { isTrialSetup?: boolean } = {},
): boolean {
  const paid = typeof amountGross === "string" ? parseFloat(amountGross) : amountGross;
  if (!Number.isFinite(paid)) return false;
  if (opts.isTrialSetup) return Math.abs(paid) < 0.01;
  return Math.abs(paid - expectedZar) < 0.01;
}

// --- PayFast subscription-management API ---
// This API signs differently to the checkout: build an MD5 over ALL header
// fields plus any body params, with the passphrase added as a field, sorted
// alphabetically by key, URL-encoded. See https://developers.payfast.co.za/api

// Same host in sandbox and live; sandbox is selected via the testing=true query param.
export const PAYFAST_API_BASE = "https://api.payfast.co.za";

export function buildApiSignature(
  headers: Record<string, string>,
  passphrase?: string,
): string {
  const merged: Record<string, string> = { ...headers };
  if (passphrase && passphrase.length > 0) merged.passphrase = passphrase;
  const base = Object.keys(merged)
    .sort()
    .map((k) => `${k}=${encodeValue(merged[k])}`)
    .join("&");
  return crypto.createHash("md5").update(base).digest("hex");
}

export { SANDBOX };
