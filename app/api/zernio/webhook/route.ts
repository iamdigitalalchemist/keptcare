import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { mapZernioEvent, validZernioSignature } from "@/lib/zernio";

export const runtime = "nodejs";

// POST /api/zernio/webhook — Zernio delivery events for SMS / WhatsApp / email.
// Register this URL in Zernio (dashboard or POST /v1/webhooks/settings) with
// the same secret as ZERNIO_WEBHOOK_SECRET, subscribed to message.delivered,
// message.read and message.failed. Updates communication_logs by message id.
export async function POST(req: Request) {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const raw = await req.text();
  if (!validZernioSignature(secret, raw, req.headers.get("x-zernio-signature"))) {
    console.error("[zernio] webhook rejected: bad signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: {
    event?: string;
    test?: boolean;
    message?: { id?: string; messageId?: string };
    error?: { code?: string | number; message?: string };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const status = mapZernioEvent(payload.event ?? "");
  // shortcut: Zernio's docs don't publish the delivery-event payload yet; we read
  // message.id / message.messageId. Confirm against a real test event and adjust.
  const id = payload.message?.id ?? payload.message?.messageId;
  if (payload.test || !status || !id) {
    // Other events (message.received, etc.) are acknowledged and ignored.
    return new NextResponse(null, { status: 204 });
  }

  const errorMessage =
    status === "failed"
      ? payload.error?.message ?? (payload.error?.code ? `Zernio error ${payload.error.code}` : "Delivery failed")
      : "";

  const { error } = await supabaseAdmin
    .from("communication_logs")
    .update({ status, error_message: errorMessage, updated_at: new Date().toISOString() })
    .eq("provider_message_sid", id);

  if (error) {
    console.error("[zernio] failed to update communication log", { id, error });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
