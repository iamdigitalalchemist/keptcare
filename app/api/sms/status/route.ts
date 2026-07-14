import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { mapTwilioStatus, validTwilioSignature } from "@/lib/twilio";

export const runtime = "nodejs";

// POST /api/sms/status — Twilio message status callback.
//
// Twilio posts form-encoded delivery updates (queued → sent → delivered /
// failed) for every message we send with a StatusCallback. We verify the
// X-Twilio-Signature header before trusting anything, then update the matching
// communication_logs row by message SID.
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!authToken || !appUrl) {
    return NextResponse.json({ error: "SMS is not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const data: Record<string, string> = {};
  new URLSearchParams(raw).forEach((value, key) => {
    data[key] = value;
  });

  // Twilio signs the exact URL it was given as the StatusCallback.
  const url = `${appUrl}/api/sms/status`;
  const signature = req.headers.get("x-twilio-signature");
  if (!validTwilioSignature(authToken, url, data, signature)) {
    console.error("[twilio] status callback rejected: bad signature", {
      sid: data.MessageSid,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const sid = data.MessageSid;
  const status = mapTwilioStatus(data.MessageStatus ?? "");
  if (!sid || !status) {
    // Unknown status values are ignored rather than erroring — Twilio may add
    // new intermediate states, and retries wouldn't help.
    return new NextResponse(null, { status: 204 });
  }

  const errorMessage = data.ErrorCode ? `Twilio error ${data.ErrorCode}` : "";
  let query = supabaseAdmin
    .from("communication_logs")
    .update({
      status,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_message_sid", sid);
  // Callbacks can arrive out of order; never downgrade a terminal status back to 'sent'.
  if (status === "sent") query = query.eq("status", "sent");
  const { error } = await query;

  if (error) {
    console.error("[twilio] failed to update communication log", { sid, error });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
