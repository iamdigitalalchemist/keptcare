"use client";

import { supabase } from "@/integrations/supabase/client";

// Starts a PayFast hosted checkout for the given tier by fetching the signed
// fields from /api/payfast/checkout and auto-submitting them as a hidden form.
// The browser goes straight to PayFast's page — card details never touch our
// servers. Returns an error message on failure, or null when redirecting.
export async function startPayFastCheckout(
  tier: "starter" | "growth" | "pro",
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return "Please sign in again.";

  const res = await fetch("/api/payfast/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tier }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Checkout failed" }));
    return error ?? "Checkout failed";
  }

  const { url, fields } = await res.json();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  for (const [key, value] of Object.entries(fields as Record<string, string>)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  return null;
}
