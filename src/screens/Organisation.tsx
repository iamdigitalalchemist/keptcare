"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface OrganisationOverview {
  organisation: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    subscription_tier: string;
    subscription_active: boolean;
    status: string;
  } | null;
  roles: OrganisationRole[];
  members: OrganisationMember[];
  invitations: OrganisationInvitation[];
}

interface OrganisationRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_builtin: boolean;
  permissions: string[];
}

interface OrganisationMember {
  id: string;
  email: string;
  role_id: string;
  role_name: string;
  status: string;
}

interface OrganisationInvitation {
  id: string;
  email: string;
  role_id: string;
  role_name: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

function createInviteToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function OrganisationPage() {
  const { organisation, hasPermission } = useSubscription();
  const [overview, setOverview] = useState<OrganisationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingEmail, setExistingEmail] = useState("");
  const [existingRoleId, setExistingRoleId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [lastInviteLink, setLastInviteLink] = useState("");
  const canManageUsers = hasPermission("users.manage");
  const canManageRoles = hasPermission("roles.manage");
  const canManageOrganisation = canManageUsers || canManageRoles || hasPermission("organisation.manage");

  const defaultRoleId = useMemo(
    () => overview?.roles.find((role) => role.key === "staff")?.id || overview?.roles[0]?.id || "",
    [overview?.roles],
  );

  const loadOverview = async () => {
    setLoading(true);
    const overviewResult = await (supabase as any).rpc("get_organisation_admin_overview", {
      _organisation_id: organisation?.id || null,
    });

    if (overviewResult.error) {
      toast.error(overviewResult.error.message);
    } else {
      setOverview(overviewResult.data);
      setExistingRoleId((current) => current || overviewResult.data?.roles?.find((role: OrganisationRole) => role.key === "staff")?.id || overviewResult.data?.roles?.[0]?.id || "");
      setInviteRoleId((current) => current || overviewResult.data?.roles?.find((role: OrganisationRole) => role.key === "staff")?.id || overviewResult.data?.roles?.[0]?.id || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (canManageOrganisation) {
      loadOverview();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageOrganisation, organisation?.id]);

  const addExistingUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const roleId = existingRoleId || defaultRoleId;
    if (!organisation?.id || !existingEmail || !roleId) return;

    const { error } = await (supabase as any).rpc("add_organisation_member_by_email", {
      _organisation_id: organisation.id,
      _email: existingEmail,
      _role_id: roleId,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("User added to organisation.");
    setExistingEmail("");
    await loadOverview();
  };

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    const roleId = inviteRoleId || defaultRoleId;
    if (!organisation?.id || !inviteEmail || !roleId) return;

    const token = createInviteToken();
    const { error } = await (supabase as any).rpc("create_organisation_invitation", {
      _organisation_id: organisation.id,
      _email: inviteEmail,
      _role_id: roleId,
      _token: token,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const link = `${window.location.origin}/accept-invite?token=${token}`;
    setLastInviteLink(link);
    setInviteEmail("");
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    toast.success("Invitation created. The invite link was copied if clipboard access is available.");
    await loadOverview();
  };

  const revokeInvitation = async (invitationId: string) => {
    const { error } = await (supabase as any).rpc("revoke_organisation_invitation", {
      _invitation_id: invitationId,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Invitation revoked.");
    await loadOverview();
  };

  if (!canManageOrganisation) {
    return (
      <div className="space-y-2">
        <h1 className="page-header">Organisation</h1>
        <p className="page-subtitle">You do not have permission to manage this organisation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Organisation</h1>
        <p className="page-subtitle">Manage organisation settings, members, invitations, roles, and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{overview?.organisation?.name || organisation?.name || "Organisation"}</CardTitle>
          <CardDescription>
            {loading ? "Loading organisation details…" : "Shared database tenancy is enforced through organisation membership and RLS policies."}
          </CardDescription>
        </CardHeader>
        {overview?.organisation && (
          <CardContent className="grid sm:grid-cols-5 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Tier</p>
              <Badge variant="secondary" className="capitalize">{overview.organisation.subscription_tier}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={overview.organisation.subscription_active ? "default" : "destructive"}>{overview.organisation.status}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{overview.organisation.phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{overview.organisation.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Website</p>
              <p>{overview.organisation.website || "—"}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invitations</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-4">
          {canManageUsers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Existing User</CardTitle>
                <CardDescription>Attach an already registered user to this organisation.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addExistingUser} className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="existing-email">Email</Label>
                    <Input id="existing-email" type="email" value={existingEmail} onChange={(event) => setExistingEmail(event.target.value)} placeholder="user@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="existing-role">Role</Label>
                    <select
                      id="existing-role"
                      value={existingRoleId || defaultRoleId}
                      onChange={(event) => setExistingRoleId(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {overview?.roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Add User</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview?.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.email || "—"}</TableCell>
                      <TableCell>{member.role_name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{member.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4 mt-4">
          {canManageUsers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite User</CardTitle>
                <CardDescription>Create an invite link for a new or existing user.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={createInvitation} className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="new.user@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-role">Role</Label>
                    <select
                      id="invite-role"
                      value={inviteRoleId || defaultRoleId}
                      onChange={(event) => setInviteRoleId(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {overview?.roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Create Invite</Button>
                </form>
                {lastInviteLink && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Latest invite link</p>
                    <p className="text-sm break-all">{lastInviteLink}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview?.invitations.map((invitation) => {
                    const status = invitation.revoked_at ? "revoked" : invitation.accepted_at ? "accepted" : "pending";
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>{invitation.role_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {!invitation.revoked_at && !invitation.accepted_at && (
                            <Button variant="outline" size="sm" onClick={() => revokeInvitation(invitation.id)}>Revoke</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-4">
          {canManageRoles && (
            <div className="flex justify-end">
              <Button asChild>
                <Link href="/organisation/roles/new">Create Role</Link>
              </Button>
            </div>
          )}

          {overview?.roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {role.name}
                      {role.is_builtin && <Badge variant="secondary">Built-in</Badge>}
                    </CardTitle>
                    {role.description && <CardDescription>{role.description}</CardDescription>}
                  </div>
                  {canManageRoles && !role.is_builtin && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/organisation/roles/${role.id}/edit`}>Edit</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">{permission}</Badge>
                  ))}
                </div>
                <Separator className="my-4" />
                <p className="text-xs text-muted-foreground">
                  Custom role editing is represented in the database model through `organisation_roles` and `role_permissions`.
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
