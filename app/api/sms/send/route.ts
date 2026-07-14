import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  getTwilioConfig,
  mapTwilioStatus,
  normalizePhone,
  renderTemplate,
  sendSms,
  TwilioError,
} from "@/lib/twilio";

export const runtime = "nodejs";

// POST /api/sms/send
// Body: { patientId: string } plus either
//   { message: string }                                — free-form SMS, or
//   { templateId: string, variables?: Record<string,string> } — render a stored
//   sms template; patient_name / first_name / last_name / practice_name are
//   filled in automatically and can be overridden via `variables`.
// Sends via Twilio and records the attempt in communication_logs. Delivery
// updates arrive later on /api/sms/status.
export async function POST(req: Request) {
  const authed = await getAuthedOrg(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    patientId?: string;
    message?: string;
    templateId?: string;
    variables?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.patientId || (!body.message && !body.templateId)) {
    return NextResponse.json(
      { error: "patientId and either message or templateId are required" },
      { status: 400 },
    );
  }

  const config = getTwilioConfig();
  if (!config) {
    return NextResponse.json({ error: "SMS is not configured" }, { status: 500 });
  }

  // Patient must belong to the caller's organisation. The template lookup (when
  // asked for) only depends on the request body, so fetch both concurrently.
  const [patientRes, templateRes] = await Promise.all([
    supabaseAdmin
      .from("patients")
      .select("id, first_name, last_name, phone, consent_sms")
      .eq("id", body.patientId)
      .eq("organisation_id", authed.organisationId)
      .maybeSingle(),
    body.templateId
      ? supabaseAdmin
          .from("message_templates")
          .select("id, name, channel, body")
          .eq("id", body.templateId)
          .eq("organisation_id", authed.organisationId)
          .maybeSingle()
      : null,
  ]);

  const patient = patientRes.data;
  if (patientRes.error || !patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  if (!patient.consent_sms) {
    return NextResponse.json({ error: "Patient has not consented to SMS" }, { status: 409 });
  }

  const to = normalizePhone(patient.phone ?? "");
  if (!to) {
    return NextResponse.json({ error: "Patient has no valid phone number" }, { status: 422 });
  }

  // Resolve the message text and a subject line for the log.
  let text = body.message ?? "";
  let subject = "SMS";
  if (templateRes) {
    const template = templateRes.data;
    if (templateRes.error || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (template.channel !== "sms") {
      return NextResponse.json({ error: "Template is not an SMS template" }, { status: 400 });
    }

    text = renderTemplate(template.body, {
      patient_name: `${patient.first_name} ${patient.last_name}`.trim(),
      first_name: patient.first_name,
      last_name: patient.last_name,
      practice_name: authed.organisationName,
      ...body.variables,
    });
    subject = template.name;
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  let result;
  try {
    result = await sendSms(config, {
      to,
      body: text,
      statusCallback: appUrl ? `${appUrl}/api/sms/status` : undefined,
    });
  } catch (err) {
    const message = err instanceof TwilioError ? err.message : "Failed to send SMS";
    console.error("[twilio] send failed", { patientId: patient.id, err });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data: log, error: logErr } = await supabaseAdmin
    .from("communication_logs")
    .insert({
      organisation_id: authed.organisationId,
      patient_id: patient.id,
      channel: "sms",
      subject,
      body: text,
      status: mapTwilioStatus(result.status) ?? "sent",
      sent_at: new Date().toISOString(),
      provider_message_sid: result.sid,
    })
    .select("id")
    .single();

  if (logErr) {
    // The SMS went out; a logging failure shouldn't read as a send failure.
    console.error("[twilio] failed to write communication log", logErr);
  }

  return NextResponse.json({ sid: result.sid, status: result.status, logId: log?.id ?? null });
}
