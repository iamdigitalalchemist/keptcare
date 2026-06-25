"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Permission {
  key: string;
  label: string;
  description: string | null;
  category: string;
}

function createRoleKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export default function CreateOrganisationRole() {
  const router = useRouter();
  const { organisation, hasPermission } = useSubscription();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const canManageRoles = hasPermission("roles.manage");

  useEffect(() => {
    async function loadPermissions() {
      setLoading(true);
      const { data, error } = await supabase
        .from("permissions")
        .select("key,label,description,category")
        .neq("category", "platform")
        .order("category", { ascending: true })
        .order("label", { ascending: true });

      if (error) {
        toast.error(error.message);
      } else {
        setPermissions(data ?? []);
      }
      setLoading(false);
    }

    if (canManageRoles) {
      loadPermissions();
    } else {
      setLoading(false);
    }
  }, [canManageRoles]);

  const permissionsByCategory = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      groups[permission.category] = groups[permission.category] ?? [];
      groups[permission.category].push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissions((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey],
    );
  };

  const createCustomRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organisation?.id || !canManageRoles) return;

    const key = createRoleKey(roleName);
    if (!key) {
      toast.error("Role name is required.");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Select at least one permission for this role.");
      return;
    }

    const { data: role, error: roleError } = await supabase
      .from("organisation_roles")
      .insert({
        organisation_id: organisation.id,
        key,
        name: roleName.trim(),
        description: roleDescription.trim() || null,
        is_builtin: false,
      })
      .select("id")
      .single();

    if (roleError) {
      toast.error(roleError.message);
      return;
    }

    const { error: permissionsError } = await supabase
      .from("role_permissions")
      .insert(selectedPermissions.map((permissionKey) => ({
        role_id: role.id,
        permission_key: permissionKey,
      })));

    if (permissionsError) {
      toast.error(permissionsError.message);
      return;
    }

    toast.success("Custom role created.");
    router.push("/organisation");
  };

  if (!canManageRoles) {
    return (
      <div className="space-y-2">
        <h1 className="page-header">Create Role</h1>
        <p className="page-subtitle">You do not have permission to manage organisation roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/organisation" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to organisation
      </Link>

      <div>
        <h1 className="page-header">Create Role</h1>
        <p className="page-subtitle">Define a custom role and choose its organisation permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
          <CardDescription>Custom roles can be assigned to members and invitations immediately after creation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createCustomRole} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">Role name *</Label>
                <Input id="role-name" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Treatment Coordinator" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-key">Role key</Label>
                <Input id="role-key" value={createRoleKey(roleName) || "auto-generated"} disabled />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-description">Description</Label>
              <Textarea id="role-description" value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} rows={2} placeholder="Describe what this role is responsible for." />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Permissions</p>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading permissions..." : "Choose what this role can access and manage."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category} className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{category}</p>
                    <div className="space-y-3">
                      {categoryPermissions.map((permission) => (
                        <label key={permission.key} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={selectedPermissions.includes(permission.key)}
                            onCheckedChange={() => togglePermission(permission.key)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">{permission.label}</span>
                            <span className="block text-xs text-muted-foreground">{permission.key}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/organisation">Cancel</Link>
              </Button>
              <Button type="submit">Create Role</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
