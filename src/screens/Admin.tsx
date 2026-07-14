"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { format } from "date-fns";

interface PlatformOrganisation {
  id: string;
  name: string;
  status: string;
  subscription_tier: string;
  subscription_active: boolean;
  trial_ends_at: string;
  created_at: string;
  member_count: number;
}

interface PlatformMember {
  id: string;
  organisation_name: string;
  email: string;
  role_name: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const { isPlatformAdmin, loading } = useSubscription();
  const router = useRouter();
  const [organisations, setOrganisations] = useState<PlatformOrganisation[]>([]);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    const fetchAll = async () => {
      const { data, error } = await (supabase as any).rpc("get_platform_admin_overview");
      if (!error && data) {
        setOrganisations(data.organisations || []);
        setMembers(data.members || []);
      }
      setLoadingData(false);
    };
    fetchAll();
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (!loading && !isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [isPlatformAdmin, loading, router]);

  if (loading || !isPlatformAdmin) return null;

  const tierCounts = organisations.reduce(
    (acc, p) => {
      acc[p.subscription_tier] = (acc[p.subscription_tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const activeCount = organisations.filter((p) => p.subscription_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Platform Admin</h1>
        <p className="page-subtitle">Manage organisations, users, roles, and policies across KeptCare</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{organisations.length}</p>
              <p className="text-xs text-muted-foreground">Organisations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{members.length}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisations</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Trial ends</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organisations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{org.subscription_tier}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.subscription_active ? "default" : "destructive"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.member_count}</TableCell>
                    <TableCell>{format(new Date(org.trial_ends_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(org.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.email || "—"}</TableCell>
                  <TableCell>{member.organisation_name}</TableCell>
                  <TableCell>{member.role_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{member.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pro / Growth / Starter: {tierCounts["pro"] || 0}/{tierCounts["growth"] || 0}/{tierCounts["starter"] || 0}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
