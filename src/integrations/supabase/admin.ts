import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only Supabase client using the service-role key. This bypasses RLS and
// must NEVER be imported into a client component. It exists so trusted server
// routes (e.g. the PayFast ITN webhook) can update billing state without a user
// session. The "server-only" import above makes the build fail if that happens.
//
// Created lazily on first use, not at module load: `next build` imports every
// route while collecting page data, and a build must not need runtime secrets
// (Preview deployments may not have them). A missing key surfaces as an error
// from the API route that needed it, at request time.

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Missing Supabase service-role environment variables.");
    }
    client = createClient<Database>(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const real = getClient();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
