"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Building2, ShieldCheck, Users, CreditCard, Calendar, TrendingUp, AlertTriangle, Search } from "lucide-react";
import { format } from "date-fns";

interface PlatformOrganisation {
  id: string;
  name: string;
  email: string | null;
  status: "active" | "suspended" | "archived";
  subscription_tier: "starter" | "growth" | "pro";
  subscription_active: boolean;
  trial_ends_at: string;
  subscription_period_end: string | null;
  created_at: string;
  member_count: number;
  subscription_state: "active" | "trial" | "grace" | "expired" | "suspended" | "archived";
  days_remaining: number | null;
  latest_payment: {
    amount_gross: number;
    payment_status: string;
    created_at: string;
  } | null;
}

interface PlatformMember {
  id: string;
  organisation_name: string;
  email: string | null;
  role_name: string | null;
  status: string;
  created_at: string;
}

interface PlatformSummary {
  total_organisations: number;
  total_members: number;
  active_subscriptions: number;
  trials: number;
  trials_expiring_7d: number;
  mrr: number;
  lifetime_revenue: number;
}

interface PlatformOverview {
  summary: PlatformSummary;
  organisations: PlatformOrganisation[];
  members: PlatformMember[];
}

type SubscriptionState = PlatformOrganisation["subscription_state"];

const TIER_LABELS = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const stateBadgeVariant: Record<SubscriptionState, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trial: "secondary",
  grace: "outline",
  expired: "destructive",
  suspended: "destructive",
  archived: "outline",
};

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "R0.00";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function AdminPage() {
  const { isPlatformAdmin, loading } = useSubscription();
  const router = useRouter();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<SubscriptionState | "all">("all");

  useEffect(() => {
    if (!isPlatformAdmin) return;
    const fetchAll = async () => {
      const { data, error } = await (supabase as any).rpc("get_platform_admin_overview");
      if (!error && data) {
        setOverview({
          summary: data.summary || {
            total_organisations: 0,
            total_members: 0,
            active_subscriptions: 0,
            trials: 0,
            trials_expiring_7d: 0,
            mrr: 0,
            lifetime_revenue: 0,
          },
          organisations: data.organisations || [],
          members: data.members || [],
        });
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

  const filteredOrganisations = useMemo(() => {
    const list = overview?.organisations ?? [];
    return list.filter((org) => {
      const matchesSearch = `${org.name || ""} ${org.email || ""}`.toLowerCase().includes(search.toLowerCase());
      const matchesState = stateFilter === "all" || org.subscription_state === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [overview?.organisations, search, stateFilter]);

  const filteredMembers = useMemo(() => {
    const list = overview?.members ?? [];
    if (!search) return list;
    return list.filter((member) =>
      `${member.email || ""} ${member.organisation_name || ""} ${member.role_name || ""}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [overview?.members, search]);

  if (loading || !isPlatformAdmin) return null;

  const summary = overview?.summary;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Platform Admin</h1>
        <p className="page-subtitle">Manage organisations, subscriptions, users, and billing across KeptCare.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary?.total_organisations ?? 0}</p>
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
              <p className="text-2xl font-semibold">{summary?.total_members ?? 0}</p>
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
              <p className="text-2xl font-semibold">{summary?.active_subscriptions ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{formatCurrency(summary?.mrr ?? 0)}</p>
              <p className="text-xs text-muted-foreground">MRR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{formatCurrency(summary?.lifetime_revenue ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Lifetime revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary?.trials ?? 0}</p>
              <p className="text-xs text-muted-foreground">Trials</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary?.trials_expiring_7d ?? 0}</p>
              <p className="text-xs text-muted-foreground">Trials expiring (7d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organisations">
        <TabsList>
          <TabsTrigger value="organisations">Organisations</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="organisations" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="space-y-3 pb-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Organisations</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search organisations..."
                      className="h-8 pl-9 text-sm"
                    />
                  </div>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value as SubscriptionState | "all")}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All states</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="grace">Grace</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredOrganisations.length} of {overview?.organisations.length ?? 0} organisations
              </p>
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
                      <TableHead>State</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Trial / Period end</TableHead>
                      <TableHead>Latest payment</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganisations.map((org) => (
                      <TableRow key={org.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link href={`/admin/organisations/${org.id}`} className="hover:text-primary transition-colors">
                            {org.name || "—"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{TIER_LABELS[org.subscription_tier]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stateBadgeVariant[org.subscription_state]} className="capitalize">
                            {org.subscription_state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{org.status}</Badge>
                        </TableCell>
                        <TableCell>{org.member_count}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs">
                              {org.subscription_state === "trial" || org.subscription_state === "expired"
                                ? format(new Date(org.trial_ends_at), "MMM d, yyyy")
                                : org.subscription_period_end
                                  ? format(new Date(org.subscription_period_end), "MMM d, yyyy")
                                  : "—"}
                            </p>
                            {org.days_remaining !== null && (
                              <p className="text-xs text-muted-foreground">{org.days_remaining} days left</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.latest_payment ? (
                            <div className="space-y-0.5">
                              <p className="text-xs">{formatCurrency(org.latest_payment.amount_gross)}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(org.latest_payment.created_at), "MMM d, yyyy")}</p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(org.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="space-y-3 pb-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Members</CardTitle>
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members..."
                    className="h-8 pl-9 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredMembers.length} of {overview?.members.length ?? 0} members
              </p>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.email || "—"}</TableCell>
                        <TableCell>{member.organisation_name}</TableCell>
                        <TableCell>{member.role_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{member.status}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(member.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
