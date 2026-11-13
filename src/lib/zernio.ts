import crypto from "crypto";

// Zernio messaging integration (SMS, WhatsApp, email).
// https://docs.zernio.com/quickstart
//
// Plain fetch against the REST API, same approach as twilio.ts / payfast-api.ts:
// we use three send endpoints and one webhook check, so no SDK is needed.
//
// Env:
//   ZERNIO_API_KEY              — required for every channel (sk_...)
//   ZERNIO_SMS_FROM             — SMS: a Zernio number (E.164) or sender ID
//   ZERNIO_WHATSAPP_ACCOUNT_ID  — WhatsApp: connected account id
//   ZERNIO_WHATSAPP_LANGUAGE    — WhatsApp: template language, default "en"
//   ZERNIO_EMAIL_ACCOUNT_ID     — email: connected mailbox account id
//   ZERNIO_WEBHOOK_SECRET       — the secret set on the Zernio webhook endpoint

const BASE_URL = "https://zernio.com/api/v1";

export type Channel = "sms" | "whatsapp" | "email";

export class ZernioError extends Error {
  constructor(message: string, public readonly httpStatus: number) {
    super(message);
    this.name = "ZernioError";
  }
}

/** Which env vars a channel still needs; empty array means it's ready. */
export function missingZernioEnv(channel: Channel): string[] {
  const needed = ["ZERNIO_API_KEY"];
  if (channel === "sms") needed.push("ZERNIO_SMS_FROM");
  if (channel === "whatsapp") needed.push("ZERNIO_WHATSAPP_ACCOUNT_ID");
  if (channel === "email") needed.push("ZERNIO_EMAIL_ACCOUNT_ID");
  return needed.filter((name) => !process.env[name]);
}

async function zernioPost<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: unknown; message?: string };
  if (!res.ok) {
    const err = json.error;
    const message =
      (typeof err === "string" ? err : (err as { message?: string } | undefined)?.message) ??
      json.message ??
      `Zernio request failed (${res.status})`;
    throw new ZernioError(message, res.status);
  }
  return json;
}

export interface SendResult {
  id: string;
  status: string;
}

/** POST /v1/sms/messages — `to` must be E.164. */
export async function sendZernioSms(opts: { to: string; text: string; idempotencyKey?: string }): Promise<SendResult> {
  const data = await zernioPost<{ id: string; status?: string }>(
    "/sms/messages",
    { from: process.env.ZERNIO_SMS_FROM, to: opts.to, text: opts.text },
    opts.idempotencyKey,
  );
  return { id: data.id, status: data.status ?? "sent" };
}

/**
 * POST /v1/inbox/conversations — opens a WhatsApp conversation with an
 * approved Meta template (required outside the 24-hour reply window).
 * `params` fill the template's {{1}}, {{2}}… in order.
 */
export async function sendZernioWhatsAppTemplate(opts: {
  to: string;
  templateName: string;
  params: string[];
  idempotencyKey?: string;
}): Promise<SendResult> {
  const res = await zernioPost<{ data: { messageId: string } }>(
    "/inbox/conversations",
    {
      accountId: process.env.ZERNIO_WHATSAPP_ACCOUNT_ID,
      participantId: opts.to.replace(/^\+/, ""), // Zernio wants the number without "+"
      templateName: opts.templateName,
      templateLanguage: process.env.ZERNIO_WHATSAPP_LANGUAGE || "en",
      templateParams: opts.params,
    },
    opts.idempotencyKey,
  );
  return { id: res.data.messageId, status: "sent" };
}

/** POST /v1/email/messages — sends from the connected practice mailbox. */
export async function sendZernioEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const res = await zernioPost<{ data: { id: string } }>(
    "/email/messages",
    {
      accountId: process.env.ZERNIO_EMAIL_ACCOUNT_ID,
      to: [{ email: opts.to, name: opts.toName }],
      subject: opts.subject,
      html: opts.html,
    },
    opts.idempotencyKey,
  );
  return { id: res.data.id, status: "sent" };
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

/** X-Zernio-Signature: lowercase hex HMAC-SHA256 of the raw body. */
export function validZernioSignature(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Map a Zernio webhook event name to a communication_logs status. */
export function mapZernioEvent(event: string): "delivered" | "failed" | null {
  if (event === "message.delivered" || event === "message.read") return "delivered";
  if (event === "message.failed") return "failed";
  return null;
}
