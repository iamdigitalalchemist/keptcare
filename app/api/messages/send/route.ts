import { NextResponse } from "next/server";
import { getAuthedOrg } from "@/lib/api-auth";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { normalizePhone } from "@/lib/twilio";
import { renderTemplate } from "@/lib/render-template";
import { DAILY_MESSAGE_CAP, TIER_LIMITS } from "@/lib/limits";
import { canSendOn } from "@/lib/access";
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

  // Gates (same rules as the UI, src/lib/access.ts): communications.write
  // permission, an active org whose tier includes the channel (SMS and WhatsApp
  // need paid access, never the trial), and a per-org daily cap.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [permissionRes, orgRes, sentRes] = await Promise.all([
    supabaseAdmin.rpc("has_org_permission", {
      _organisation_id: authed.organisationId,
      _permission_key: "communications.write",
      _user_id: authed.userId,
    }),
    supabaseAdmin
      .from("organisations")
      .select("subscription_tier, subscription_active, subscription_period_end, trial_ends_at, status")
      .eq("id", authed.organisationId)
      .maybeSingle(),
    supabaseAdmin
      .from("communication_logs")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", authed.organisationId)
      .gte("sent_at", since),
  ]);
  if (permissionRes.error || permissionRes.data !== true) {
    return NextResponse.json({ error: "You don't have permission to send messages" }, { status: 403 });
  }
  if (orgRes.error || !orgRes.data) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }
  const org = orgRes.data;
  if (!canSendOn(org, channel)) {
    const onPlan = TIER_LIMITS[org.subscription_tier].channels.includes(channel);
    return NextResponse.json(
      {
        error: !onPlan
          ? `${LABEL[channel]} is not included in the ${org.subscription_tier} plan`
          : channel === "email"
            ? "Your subscription is not active"
            : `${LABEL[channel]} needs an active paid plan (not available during the trial)`,
      },
      { status: 403 },
    );
  }
  // shortcut: count-then-send can overshoot by a few under concurrent sends; fine for a cost guard.
  if (sentRes.error || (sentRes.count ?? 0) >= DAILY_MESSAGE_CAP) {
    return NextResponse.json(
      { error: `Daily limit of ${DAILY_MESSAGE_CAP} messages reached. Try again later.` },
      { status: 429 },
    );
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
