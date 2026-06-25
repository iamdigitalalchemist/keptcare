"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Permission {
  key: string;
  label: string;
  description: string | null;
  category: string;
}

interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_builtin: boolean;
  organisation_id: string | null;
}

function createRoleKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export default function EditOrganisationRole() {
  const router = useRouter();
  const params = useParams();
  const roleId = String(params.id ?? "");
  const { organisation, hasPermission } = useSubscription();
  const [role, setRole] = useState<RoleRecord | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const canManageRoles = hasPermission("roles.manage");

  useEffect(() => {
    async function loadRole() {
      if (!roleId || !organisation?.id) return;

      setLoading(true);
      const [roleResult, permissionsResult, rolePermissionsResult] = await Promise.all([
        supabase
          .from("organisation_roles")
          .select("id,key,name,description,is_builtin,organisation_id")
          .eq("id", roleId)
          .eq("organisation_id", organisation.id)
          .single(),
        supabase
          .from("permissions")
          .select("key,label,description,category")
          .neq("category", "platform")
          .order("category", { ascending: true })
          .order("label", { ascending: true }),
        supabase
          .from("role_permissions")
          .select("permission_key")
          .eq("role_id", roleId),
      ]);

      if (roleResult.error) {
        toast.error(roleResult.error.message);
      } else {
        setRole(roleResult.data);
        setRoleName(roleResult.data.name);
        setRoleDescription(roleResult.data.description ?? "");
      }

      if (permissionsResult.error) {
        toast.error(permissionsResult.error.message);
      } else {
        setPermissions(permissionsResult.data ?? []);
      }

      if (rolePermissionsResult.error) {
        toast.error(rolePermissionsResult.error.message);
      } else {
        setSelectedPermissions((rolePermissionsResult.data ?? []).map((permission) => permission.permission_key));
      }

      setLoading(false);
    }

    if (canManageRoles) {
      loadRole();
    } else {
      setLoading(false);
    }
  }, [canManageRoles, organisation?.id, roleId]);

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

  const updateCustomRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || !organisation?.id || role.is_builtin) return;

    const key = createRoleKey(roleName);
    if (!key) {
      toast.error("Role name is required.");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Select at least one permission for this role.");
      return;
    }

    const { error: roleError } = await supabase
      .from("organisation_roles")
      .update({
        key,
        name: roleName.trim(),
        description: roleDescription.trim() || null,
      })
      .eq("id", role.id)
      .eq("organisation_id", organisation.id)
      .eq("is_builtin", false);

    if (roleError) {
      toast.error(roleError.message);
      return;
    }

    const { error: deletePermissionsError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", role.id);

    if (deletePermissionsError) {
      toast.error(deletePermissionsError.message);
      return;
    }

    const { error: insertPermissionsError } = await supabase
      .from("role_permissions")
      .insert(selectedPermissions.map((permissionKey) => ({
        role_id: role.id,
        permission_key: permissionKey,
      })));

    if (insertPermissionsError) {
      toast.error(insertPermissionsError.message);
      return;
    }

    toast.success("Custom role updated.");
    router.push("/organisation");
  };

  const deleteCustomRole = async () => {
    if (!role || !organisation?.id || role.is_builtin) return;

    const { error } = await supabase
      .from("organisation_roles")
      .delete()
      .eq("id", role.id)
      .eq("organisation_id", organisation.id)
      .eq("is_builtin", false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Custom role deleted.");
    router.push("/organisation");
  };

  if (!canManageRoles) {
    return (
      <div className="space-y-2">
        <h1 className="page-header">Edit Role</h1>
        <p className="page-subtitle">You do not have permission to manage organisation roles.</p>
      </div>
    );
  }

  if (!loading && !role) {
    return (
      <div className="space-y-2">
        <h1 className="page-header">Edit Role</h1>
        <p className="page-subtitle">Role not found.</p>
      </div>
    );
  }

  const isBuiltin = Boolean(role?.is_builtin);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/organisation" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to organisation
      </Link>

      <div>
        <h1 className="page-header">Edit Role</h1>
        <p className="page-subtitle">{isBuiltin ? "Built-in roles are read-only." : "Update this custom role and its permissions."}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
          <CardDescription>{loading ? "Loading role..." : "Changes affect future access checks for members assigned to this role."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateCustomRole} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">Role name *</Label>
                <Input id="role-name" value={roleName} disabled={isBuiltin} onChange={(event) => setRoleName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-key">Role key</Label>
                <Input id="role-key" value={createRoleKey(roleName) || role?.key || "auto-generated"} disabled />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-description">Description</Label>
              <Textarea id="role-description" value={roleDescription} disabled={isBuiltin} onChange={(event) => setRoleDescription(event.target.value)} rows={2} />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Permissions</p>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading permissions..." : isBuiltin ? "Built-in role permissions cannot be edited here." : "Choose what this role can access and manage."}
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
                            disabled={isBuiltin}
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

            <div className="flex justify-between gap-2">
              {!isBuiltin && (
                <Button type="button" variant="destructive" onClick={deleteCustomRole}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete Role
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/organisation">Cancel</Link>
                </Button>
                {!isBuiltin && <Button type="submit">Save Changes</Button>}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
