import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { normalizePhone } from "@/lib/twilio";
import { renderTemplate } from "@/lib/render-template";
import {
  type Channel,
  missingSendexaEnv,
  sendSendexaEmail,
  sendSendexaSms,
  sendSendexaWhatsAppTemplate,
  textToHtml,
  SendexaError,
} from "@/lib/sendexa";

export const runtime = "nodejs";

const CHANNELS: Channel[] = ["sms", "whatsapp", "email"];
const CONSENT_COLUMN = { sms: "consent_sms", whatsapp: "consent_whatsapp", email: "consent_email" } as const;
const LABEL = { sms: "SMS", whatsapp: "WhatsApp", email: "email" } as const;

// POST /api/messages/send — send a patient message through Sendexa.
// Body: { channel: "sms" | "whatsapp" | "email", patientId } plus either
//   { message, subject? }                 — free-form (sms / email only), or
//   { templateId, variables? }            — a stored template of the same channel.
// patient_name / first_name / last_name / practice_name are auto-filled.
// WhatsApp is template-only: the template's `name` must be the approved Meta
// template name in Sendexa, and its `variables` (in order) become {{1}}, {{2}}, …
// Each send is recorded in communication_logs; delivery updates arrive on
// /api/sendexa/webhook.
export async function POST(req: Request) {
  const authed = await getAuthedOrg(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    channel?: Channel;
    patientId?: string;
    message?: string;
    subject?: string;
    templateId?: string;
    variables?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const channel = body.channel ?? "sms";
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }
  if (!body.patientId || (!body.message && !body.templateId)) {
    return NextResponse.json(
      { error: "patientId and either message or templateId are required" },
      { status: 400 },
    );
  }
  if (channel === "whatsapp" && !body.templateId) {
    return NextResponse.json(
      { error: "WhatsApp messages must use an approved template" },
      { status: 400 },
    );
  }

  const missing = missingSendexaEnv(channel);
  if (missing.length) {
    console.error(`[sendexa] ${channel} not configured, missing: ${missing.join(", ")}`);
    return NextResponse.json({ error: `${LABEL[channel]} is not configured` }, { status: 500 });
  }

  const [patientRes, templateRes] = await Promise.all([
    supabaseAdmin
      .from("patients")
      .select("id, first_name, last_name, phone, email, consent_sms, consent_whatsapp, consent_email")
      .eq("id", body.patientId)
      .eq("organisation_id", authed.organisationId)
      .maybeSingle(),
    body.templateId
      ? supabaseAdmin
          .from("message_templates")
          .select("id, name, channel, subject, body, variables")
          .eq("id", body.templateId)
          .eq("organisation_id", authed.organisationId)
          .maybeSingle()
      : null,
  ]);

  const patient = patientRes.data;
  if (patientRes.error || !patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  if (!patient[CONSENT_COLUMN[channel]]) {
    return NextResponse.json(
      { error: `Patient has not consented to ${LABEL[channel]}` },
      { status: 409 },
    );
  }

  const phone = channel === "email" ? null : normalizePhone(patient.phone ?? "");
  const email = channel === "email" ? (patient.email ?? "").trim() : null;
  if (channel !== "email" && !phone) {
    return NextResponse.json({ error: "Patient has no valid phone number" }, { status: 422 });
  }
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)) {
    return NextResponse.json({ error: "Patient has no valid email address" }, { status: 422 });
  }

  const vars: Record<string, string> = {
    patient_name: `${patient.first_name} ${patient.last_name}`.trim(),
    first_name: patient.first_name,
    last_name: patient.last_name,
    practice_name: authed.organisationName,
    ...body.variables,
  };

  let text = body.message ?? "";
  let subject = body.subject?.trim() || (channel === "email" ? `Message from ${authed.organisationName}` : LABEL[channel]);
  let template: { name: string; variables: string[] } | null = null;
  if (templateRes) {
    const t = templateRes.data;
    if (templateRes.error || !t) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (t.channel !== channel) {
      return NextResponse.json({ error: `Template is not a ${LABEL[channel]} template` }, { status: 400 });
    }
    text = renderTemplate(t.body, vars);
    subject = channel === "email" && t.subject ? renderTemplate(t.subject, vars) : t.name;
    template = { name: t.name, variables: t.variables ?? [] };
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  }

  let result;
  try {
    if (channel === "sms") {
      result = await sendSendexaSms({ to: phone!, text });
    } else if (channel === "whatsapp") {
      result = await sendSendexaWhatsAppTemplate({
        to: phone!,
        templateName: template!.name,
        params: template!.variables.map((name) => vars[name] ?? ""),
      });
    } else {
      result = await sendSendexaEmail({
        to: email!,
        subject,
        html: textToHtml(text),
        text,
      });
    }
  } catch (err) {
    const message = err instanceof SendexaError ? err.message : `Failed to send ${LABEL[channel]}`;
    console.error(`[sendexa] ${channel} send failed`, { patientId: patient.id, err });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data: log, error: logErr } = await supabaseAdmin
    .from("communication_logs")
    .insert({
      organisation_id: authed.organisationId,
      patient_id: patient.id,
      channel,
      subject,
      body: text,
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_sid: result.id,
    })
    .select("id")
    .single();

  if (logErr) {
    // The message went out; a logging failure shouldn't read as a send failure.
    console.error("[sendexa] failed to write communication log", logErr);
  }

  return NextResponse.json({ id: result.id, status: result.status, logId: log?.id ?? null });
}
