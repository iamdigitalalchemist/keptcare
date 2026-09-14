"use client";

import { supabase } from "@/integrations/supabase/client";

export interface SendSmsInput {
  patientId: string;
  message?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export type SendSmsResult = { ok: true } | { ok: false; error: string };

// Sends an SMS to a patient via /api/sms/send, which relays through Twilio
// and records the attempt in communication_logs. The caller's Supabase access
// token authorizes the request (same pattern as startPayFastCheckout).
export async function sendPatientSms(input: SendSmsInput): Promise<SendSmsResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "Please sign in again." };

  const res = await fetch("/api/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Failed to send SMS" }));
    return { ok: false, error: error ?? "Failed to send SMS" };
  }

  return { ok: true };
}
