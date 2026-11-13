import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { mapSendexaStatus, validSendexaSignature } from "@/lib/sendexa";

export const runtime = "nodejs";

// POST /api/sendexa/webhook — Sendexa delivery events for SMS / WhatsApp / email.
// Add this URL in Sendexa (Dashboard → Settings → Webhooks), generate a secret
// and set it as SENDEXA_WEBHOOK_SECRET. Updates communication_logs by messageId.
export async function POST(req: Request) {
  const secret = process.env.SENDEXA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const raw = await req.text();
  if (!validSendexaSignature(secret, raw, req.headers.get("x-signature"))) {
    console.error("[sendexa] webhook rejected: bad signature", {
      webhookId: req.headers.get("x-webhook-id"),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  type Fields = { messageId?: string; status?: string; error?: string | { message?: string; code?: string } };
  let payload: Fields & { event?: string; data?: Fields };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // shortcut: Sendexa documents one flat sample ({ messageId, status }) and
  // examples using { event, data }; we accept both. Confirm with a live event.
  const fields = payload.data ?? payload;
  const id = fields.messageId;
  const status = mapSendexaStatus(payload.event ?? "") ?? mapSendexaStatus(fields.status ?? "");
  if (!id || !status) {
    // Intermediate (queued/sent) and unrelated events are acknowledged and ignored.
    return new NextResponse(null, { status: 204 });
  }

  const err = fields.error;
  const errorMessage =
    status === "failed"
      ? (typeof err === "string" ? err : err?.message ?? err?.code) ?? `Delivery ${fields.status ?? "failed"}`
      : "";

  const { error } = await supabaseAdmin
    .from("communication_logs")
    .update({ status, error_message: errorMessage, updated_at: new Date().toISOString() })
    .eq("provider_message_sid", id);

  if (error) {
    console.error("[sendexa] failed to update communication log", { id, error });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
