import crypto from "crypto";

// Sendexa messaging integration (SMS, WhatsApp, email).
// https://docs.sendexa.co/
//
// Plain fetch against the REST API, same approach as payfast-api.ts. The
// Sendexa Node SDK isn't published on npm, and we only need three send calls
// and one webhook check.
//
// Env:
//   SENDEXA_API_TOKEN       — required; the ready-made Base64 token from
//                             Dashboard → Settings → API Keys → Copy Token
//   SENDEXA_SMS_FROM        — SMS: an approved sender ID
//   SENDEXA_EMAIL_FROM      — email: an address on a verified domain
//   SENDEXA_WHATSAPP_LANGUAGE — WhatsApp template language, default "en"
//   SENDEXA_WEBHOOK_SECRET  — the secret generated for the Sendexa webhook

const BASE_URL = "https://api.sendexa.co/v1";

export type Channel = "sms" | "whatsapp" | "email";

export class SendexaError extends Error {
  constructor(message: string, public readonly httpStatus: number) {
    super(message);
    this.name = "SendexaError";
  }
}

/** Which env vars a channel still needs; empty array means it's ready. */
export function missingSendexaEnv(channel: Channel): string[] {
  const needed = ["SENDEXA_API_TOKEN"];
  if (channel === "sms") needed.push("SENDEXA_SMS_FROM");
  if (channel === "email") needed.push("SENDEXA_EMAIL_FROM");
  return needed.filter((name) => !process.env[name]);
}

/** Sendexa takes international numbers without the leading "+". */
const toSendexaPhone = (e164: string) => e164.replace(/^\+/, "");

async function sendexaPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${process.env.SENDEXA_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    code?: string;
    message?: string;
    error?: string | { message?: string };
  };
  if (!res.ok || json.success === false) {
    const err = json.error;
    const message =
      (typeof err === "string" ? err : err?.message) ??
      json.message ??
      json.code ??
      `Sendexa request failed (${res.status})`;
    throw new SendexaError(message, res.status);
  }
  return json;
}

export interface SendResult {
  id: string;
  status: string;
}

/** POST /v1/sms/send — `to` must be E.164. */
export async function sendSendexaSms(opts: { to: string; text: string }): Promise<SendResult> {
  const res = await sendexaPost<{ data: { messageId: string; delivery?: { status?: string } } }>(
    "/sms/send",
    { from: process.env.SENDEXA_SMS_FROM, to: toSendexaPhone(opts.to), message: opts.text },
  );
  return { id: res.data.messageId, status: res.data.delivery?.status ?? "sent" };
}

/**
 * POST /v1/whatsapp/send with type "template" — needed to open a conversation
 * (Meta only allows free text inside the 24-hour reply window).
 * `params` fill the template's {{1}}, {{2}}… in order.
 */
export async function sendSendexaWhatsAppTemplate(opts: {
  to: string;
  templateName: string;
  params: string[];
}): Promise<SendResult> {
  // shortcut: Sendexa's docs don't show the template body yet; this follows the
  // Meta Cloud API shape their text messages use. Confirm with a real send.
  const res = await sendexaPost<{ data: { messageId: string; status?: string } }>("/whatsapp/send", {
    to: toSendexaPhone(opts.to),
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: process.env.SENDEXA_WHATSAPP_LANGUAGE || "en" },
      components: opts.params.length
        ? [{ type: "body", parameters: opts.params.map((text) => ({ type: "text", text })) }]
        : [],
    },
  });
  return { id: res.data.messageId, status: res.data.status ?? "sent" };
}

/** POST /v1/email/send — `from` must be on a domain verified in Sendexa. */
export async function sendSendexaEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const res = await sendexaPost<{ messageId: string }>("/email/send", {
    from: process.env.SENDEXA_EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return { id: res.messageId, status: "sent" };
}

/** Plain text → safe HTML for email bodies (escape, keep line breaks). */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return `<p>${escaped.replace(/\r?\n/g, "<br>")}</p>`;
}

/** X-Signature: "sha256=<hex HMAC-SHA256 of the raw body>". */
export function validSendexaSignature(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.replace(/^sha256=/, "").toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Map a Sendexa event name (e.g. "sms.delivered") or status value (e.g.
 * "DELIVERED", "BOUNCED") to a communication_logs status.
 */
export function mapSendexaStatus(value: string): "delivered" | "failed" | null {
  const s = value.toLowerCase().split(".").pop() ?? "";
  if (["delivered", "read", "opened", "clicked"].includes(s)) return "delivered";
  if (["failed", "expired", "bounced", "undelivered", "rejected", "spam"].includes(s)) return "failed";
  return null;
}
