import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only Supabase client using the service-role key. This bypasses RLS and
// must NEVER be imported into a client component. It exists so trusted server
// routes (e.g. the PayFast ITN webhook) can update billing state without a user
// session. The "server-only" import above makes the build fail if that happens.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service-role environment variables.");
}

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
