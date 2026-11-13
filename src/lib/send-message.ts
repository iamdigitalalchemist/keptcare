"use client";

import { supabase } from "@/integrations/supabase/client";

export interface SendMessageInput {
  channel: "sms" | "whatsapp" | "email";
  patientId: string;
  message?: string;
  subject?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export type SendMessageResult = { ok: true } | { ok: false; error: string };

// Sends a patient message via /api/messages/send, which relays through Zernio
// and records the attempt in communication_logs. The caller's Supabase access
// token authorizes the request (same pattern as startPayFastCheckout).
export async function sendPatientMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "Please sign in again." };

  const res = await fetch("/api/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Failed to send message" }));
    return { ok: false, error: error ?? "Failed to send message" };
  }

  return { ok: true };
}
