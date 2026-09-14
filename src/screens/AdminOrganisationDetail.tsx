"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Building2, Calendar, CreditCard, Mail, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type SubscriptionTier = "starter" | "growth" | "pro";
type OrgStatus = "active" | "suspended" | "archived";
type SubscriptionState = "active" | "trial" | "grace" | "expired" | "suspended" | "archived";

interface Organisation {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  status: OrgStatus;
  subscription_tier: SubscriptionTier;
  subscription_active: boolean;
  trial_ends_at: string;
  subscription_period_end: string | null;
  payfast_token: string | null;
  created_at: string;
  subscription_state: SubscriptionState;
  days_remaining: number | null;
}

interface Member {
  id: string;
  user_id: string;
  email: string | null;
  role_name: string | null;
  role_key: string | null;
  status: string;
  joined_at: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role_name: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  m_payment_id: string | null;
  pf_payment_id: string | null;
  tier: SubscriptionTier | null;
  amount_gross: number | null;
  payment_status: string;
  created_at: string;
}

interface OrganisationDetail {
  organisation: Organisation | null;
  members: Member[];
  invitations: Invitation[];
  payments: Payment[];
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
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
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function AdminOrganisationDetail() {
  const params = useParams();
  const router = useRouter();
  const { isPlatformAdmin } = useSubscription();
  const organisationId = String(params.id ?? "");

  const [detail, setDetail] = useState<OrganisationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Extend trial dialog state
  const [trialDate, setTrialDate] = useState("");
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);

  // Subscription edit dialog state
  const [subTier, setSubTier] = useState<SubscriptionTier>("starter");
  const [subActive, setSubActive] = useState(false);
  const [subPeriodEnd, setSubPeriodEnd] = useState("");
  const [subDialogOpen, setSubDialogOpen] = useState(false);

  const loadDetail = async () => {
    if (!organisationId) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_platform_organisation_detail", {
      _organisation_id: organisationId,
    });
    if (error) {
      toast.error(error.message);
    } else {
      const org = (data?.organisation as Organisation) ?? null;
      setDetail({
        organisation: org,
        members: data?.members ?? [],
        invitations: data?.invitations ?? [],
        payments: data?.payments ?? [],
      });
      if (org) {
        setSubTier(org.subscription_tier);
        setSubActive(org.subscription_active);
        setSubPeriodEnd(org.subscription_period_end ? org.subscription_period_end.slice(0, 10) : "");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isPlatformAdmin) return;
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatformAdmin, organisationId]);

  useEffect(() => {
    if (!loading && !detail?.organisation && isPlatformAdmin) {
      toast.error("Organisation not found.");
      router.replace("/admin");
    }
  }, [detail, loading, isPlatformAdmin, router]);

  const runAction = async (rpc: string, args: Record<string, unknown>) => {
    setActionLoading(true);
    const { data, error } = await (supabase as any).rpc(rpc, args);
    setActionLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const org = (data?.organisation as Organisation) ?? null;
    setDetail({
      organisation: org,
      members: data?.members ?? [],
      invitations: data?.invitations ?? [],
      payments: data?.payments ?? [],
    });
    if (org) {
      setSubTier(org.subscription_tier);
      setSubActive(org.subscription_active);
      setSubPeriodEnd(org.subscription_period_end ? org.subscription_period_end.slice(0, 10) : "");
    }
    toast.success("Organisation updated.");
  };

  const handleStatusChange = (status: OrgStatus, subscriptionActive: boolean) => {
    runAction("admin_update_organisation_status", {
      _organisation_id: organisationId,
      _status: status,
      _subscription_active: subscriptionActive,
    });
  };

  const handleExtendTrial = () => {
    if (!trialDate) return;
    runAction("admin_extend_trial", {
      _organisation_id: organisationId,
      _trial_ends_at: new Date(trialDate).toISOString(),
    });
    setExtendDialogOpen(false);
  };

  const handleSubscriptionUpdate = () => {
    runAction("admin_update_organisation_subscription", {
      _organisation_id: organisationId,
      _subscription_tier: subTier,
      _subscription_active: subActive,
      _subscription_period_end: subPeriodEnd ? new Date(subPeriodEnd).toISOString() : null,
    });
    setSubDialogOpen(false);
  };

  if (!isPlatformAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <p className="text-sm text-muted-foreground">Loading organisation…</p>
      </div>
    );
  }

  const org = detail?.organisation;
  if (!org) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-header">{org.name || "Unnamed organisation"}</h1>
          <p className="page-subtitle">
            Owner view · Created {format(new Date(org.created_at), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={actionLoading}>
                <Calendar className="h-4 w-4 mr-1.5" /> Extend trial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Extend trial</DialogTitle>
                <DialogDescription>Set a new trial expiry date for this organisation.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="trial-date">New trial ends at</Label>
                  <Input
                    id="trial-date"
                    type="datetime-local"
                    value={trialDate}
                    onChange={(e) => setTrialDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleExtendTrial} disabled={!trialDate || actionLoading}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={actionLoading}>
                <CreditCard className="h-4 w-4 mr-1.5" /> Edit subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit subscription</DialogTitle>
                <DialogDescription>Manually set tier, active flag and period end.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Tier</Label>
                  <Select value={subTier} onValueChange={(v) => setSubTier(v as SubscriptionTier)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Subscription active</p>
                    <p className="text-xs text-muted-foreground">Marks the organisation as currently paid.</p>
                  </div>
                  <Switch checked={subActive} onCheckedChange={setSubActive} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="period-end">Period end</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={subPeriodEnd}
                    onChange={(e) => setSubPeriodEnd(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for no fixed period end.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubscriptionUpdate} disabled={actionLoading}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {org.status !== "suspended" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={actionLoading}>Suspend</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend organisation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This blocks the organisation from accessing KeptCare. You can reactivate later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusChange("suspended", false)}>Suspend</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {org.status === "suspended" && (
            <Button size="sm" onClick={() => handleStatusChange("active", true)} disabled={actionLoading}>
              Reactivate
            </Button>
          )}

          {org.status !== "archived" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={actionLoading}>Archive</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive organisation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This marks the organisation as archived. Existing data is retained but the organisation is effectively disabled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusChange("archived", false)}>Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="capitalize mt-0.5">{org.status}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription</p>
              <Badge variant={stateBadgeVariant[org.subscription_state]} className="capitalize mt-0.5">
                {org.subscription_state}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-2xl font-semibold">{detail?.members.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invitations</p>
              <p className="text-2xl font-semibold">{detail?.invitations.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription>Contact information and billing dates.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tier</p>
            <Badge variant="secondary" className="capitalize">{TIER_LABELS[org.subscription_tier]}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{org.email || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{org.phone || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Website</p>
            <p>{org.website || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Trial ends</p>
            <p>{format(new Date(org.trial_ends_at), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Period end</p>
            <p>{org.subscription_period_end ? format(new Date(org.subscription_period_end), "MMM d, yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Days remaining</p>
            <p>{org.days_remaining ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Subscription active</p>
            <p>{org.subscription_active ? "Yes" : "No"}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
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
                    <TableHead>Joined</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No members
                      </TableCell>
                    </TableRow>
                  )}
                  {detail?.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.email || "—"}</TableCell>
                      <TableCell>{member.role_name || member.role_key || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{member.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {member.joined_at ? format(new Date(member.joined_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>{format(new Date(member.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.invitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No invitations
                      </TableCell>
                    </TableRow>
                  )}
                  {detail?.invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{invitation.role_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{invitation.status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(invitation.expires_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invitation.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PayFast ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                  {detail?.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="capitalize">{payment.tier || "—"}</TableCell>
                      <TableCell>{formatCurrency(payment.amount_gross)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{payment.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{payment.pf_payment_id || payment.m_payment_id || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
