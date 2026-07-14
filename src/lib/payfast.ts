import crypto from "crypto";

// PayFast integration helpers.
//
// PayFast processes in ZAR only. The amounts below are PLACEHOLDERS mirroring the
// GBP numbers shown on the pricing page (R29 / R79 / R149). Replace them with real
// ZAR prices before going live — the ITN webhook validates the paid amount against
// these values, so they must match exactly what the checkout charges.
export type Tier = "starter" | "growth" | "pro";

export const PLAN_PRICES_ZAR: Record<Exclude<Tier, "starter">, number> = {
  // TODO(pricing): replace placeholder ZAR amounts with real prices.
  growth: 79.0,
  pro: 149.0,
};

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

/**
 * Build the PayFast signature for a set of parameters.
 *
 * PayFast rules: take the parameters in the exact order they will be posted,
 * skip the `signature` field itself, URL-encode each value (spaces as `+`,
 * uppercase percent-encoding), join as `key=value&...`, append the passphrase
 * if set, then MD5.
 */
export function buildSignature(
  params: Record<string, string | number | undefined>,
  passphrase?: string,
): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (key === "signature") continue;
    if (value === undefined || value === null || value === "") continue;
    pairs.push(`${key}=${encodeValue(String(value))}`);
  }
  let base = pairs.join("&");
  if (passphrase && passphrase.length > 0) {
    base += `&passphrase=${encodeValue(passphrase)}`;
  }
  return crypto.createHash("md5").update(base).digest("hex");
}

// PayFast expects application/x-www-form-urlencoded encoding: spaces as "+" and
// uppercase hex. encodeURIComponent produces lowercase hex and %20 for spaces.
function encodeValue(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
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
  // ITN preserves field order as posted; rebuild from the received data minus signature.
  const expected = buildSignature(data, passphrase);
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
  const body = new URLSearchParams(data).toString();
  const res = await fetch(PAYFAST_HOSTS.validate, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = (await res.text()).trim();
  return text === "VALID";
}

/**
 * Check the gross amount PayFast reports matches the expected price for the tier,
 * to the cent. Guards against a tampered checkout amount.
 */
export function validAmount(amountGross: string | number, tier: Tier): boolean {
  if (tier === "starter") return false; // starter is not a paid recurring plan here
  const expected = PLAN_PRICES_ZAR[tier];
  const paid = typeof amountGross === "string" ? parseFloat(amountGross) : amountGross;
  if (!Number.isFinite(paid)) return false;
  return Math.abs(paid - expected) < 0.01;
}

// --- PayFast subscription-management API (for cancelling a token) ---
// This API signs differently to the checkout: build an MD5 over ALL header
// fields plus any body params, sorted alphabetically by key, URL-encoded, with
// the passphrase appended. See https://developers.payfast.co.za/api

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
