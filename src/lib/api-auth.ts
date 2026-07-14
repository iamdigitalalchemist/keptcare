import "server-only";
import { supabaseAdmin } from "@/integrations/supabase/admin";

// Resolve the authenticated user + their organisation from a request's bearer
// token. The client sends the Supabase access token in the Authorization header
// (see Pricing.tsx). We verify it with the service-role client, then look up the
// org the user administers.
export interface AuthedOrg {
  userId: string;
  organisationId: string;
  organisationName: string;
  isOrgAdmin: boolean;
}

export async function getAuthedOrg(req: Request): Promise<AuthedOrg | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user) return null;
  const userId = userData.user.id;

  // Find the active membership + org for this user.
  const { data: membership, error: memberErr } = await supabaseAdmin
    .from("organisation_members")
    .select("organisation_id, status, organisation_roles(key), organisations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (memberErr || !membership?.organisation_id) return null;

  const role = (membership as { organisation_roles?: { key?: string } }).organisation_roles;
  const org = (membership as { organisations?: { name?: string } }).organisations;

  return {
    userId,
    organisationId: membership.organisation_id,
    organisationName: org?.name ?? "",
    isOrgAdmin: role?.key === "org_admin",
  };
}
