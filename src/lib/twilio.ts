import crypto from "crypto";

// Twilio SMS integration helpers.
//
// We call the Twilio REST API directly with fetch rather than pulling in the
// twilio SDK — we only need one endpoint (create Message) plus webhook
// signature validation, both of which are small and easy to test.
//
// Required env:
//   TWILIO_ACCOUNT_SID   — from the Twilio console
//   TWILIO_AUTH_TOKEN    — from the Twilio console (also signs status webhooks)
// and ONE of:
//   TWILIO_MESSAGING_SERVICE_SID — preferred; Twilio picks the sender
//   TWILIO_FROM_NUMBER           — a specific Twilio number in E.164 form

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
  fromNumber?: string;
}

export function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken) return null;
  if (!messagingServiceSid && !fromNumber) return null;
  return { accountSid, authToken, messagingServiceSid, fromNumber };
}

/**
 * Normalise a stored phone number to E.164. Patient numbers are free-text and
 * mostly South African, so a leading 0 becomes +27 (override via defaultDialCode).
 * Returns null when the number can't be made dialable.
 */
export function normalizePhone(raw: string, defaultDialCode = "+27"): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (!cleaned) return null;

  let e164: string;
  if (cleaned.startsWith("+")) {
    e164 = cleaned;
  } else if (cleaned.startsWith("00")) {
    e164 = `+${cleaned.slice(2)}`;
  } else if (cleaned.startsWith("0")) {
    e164 = `${defaultDialCode}${cleaned.slice(1)}`;
  } else {
    // Assume the dial code is present but the "+" was dropped (e.g. "27821234567").
    e164 = `+${cleaned}`;
  }

  // E.164: "+" then 8–15 digits, no leading zero after the dial code.
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/**
 * Render a message template body by substituting {{variable}} placeholders.
 * Unknown placeholders are left intact so missing data is visible, not silent.
 */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match,
  );
}

/**
 * Map a Twilio message status to our communication_logs status values
 * ('sent' | 'delivered' | 'failed').
 */
export function mapTwilioStatus(twilioStatus: string): "sent" | "delivered" | "failed" | null {
  switch (twilioStatus) {
    case "accepted":
    case "scheduled":
    case "queued":
    case "sending":
    case "sent":
      return "sent";
    case "delivered":
    case "read":
      return "delivered";
    case "undelivered":
    case "failed":
    case "canceled":
      return "failed";
    default:
      return null;
  }
}

export interface SendSmsResult {
  sid: string;
  status: string;
}

export class TwilioError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly twilioCode?: number,
  ) {
    super(message);
    this.name = "TwilioError";
  }
}

/**
 * Send an SMS via the Twilio REST API. `statusCallback`, when set, receives
 * delivery updates (see /api/sms/status).
 */
export async function sendSms(
  config: TwilioConfig,
  opts: { to: string; body: string; statusCallback?: string },
): Promise<SendSmsResult> {
  const params = new URLSearchParams({ To: opts.to, Body: opts.body });
  if (config.messagingServiceSid) {
    params.set("MessagingServiceSid", config.messagingServiceSid);
  } else if (config.fromNumber) {
    params.set("From", config.fromNumber);
  }
  if (opts.statusCallback) params.set("StatusCallback", opts.statusCallback);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    status?: string;
    message?: string;
    code?: number;
  };

  if (!res.ok || !json.sid) {
    throw new TwilioError(json.message ?? `Twilio request failed (${res.status})`, res.status, json.code);
  }

  return { sid: json.sid, status: json.status ?? "queued" };
}

/**
 * Validate an X-Twilio-Signature header on an incoming webhook: HMAC-SHA1 over
 * the full request URL followed by the POST params sorted by key (key then
 * value concatenated), base64-encoded, compared timing-safe.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false;
  let data = url;
  for (const key of Object.keys(params).sort()) {
    data += key + params[key];
  }
  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
