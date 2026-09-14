"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { startPayFastCheckout } from "@/lib/start-checkout";
import { TIER_LIMITS, limitLabel, type TierLimit } from "@/lib/limits";

type Tier = "starter" | "growth" | "pro";

const plans: Array<{
  name: string;
  tier: Tier;
  price: number;
  description: string;
  features: string[];
  popular: boolean;
}> = [
  {
    name: "Starter",
    tier: "starter",
    price: 3500,
    description: "For solo practitioners getting started",
    features: [
      "Up to 200 patients",
      "2 automation rules",
      "Email reminders only",
      "Basic reporting",
      "1 user seat",
    ],
    popular: false,
  },
  {
    name: "Growth",
    tier: "growth",
    price: 5000,
    description: "For growing practices",
    features: [
      "Up to 1,000 patients",
      "10 automation rules",
      "SMS + Email reminders",
      "Campaign messaging",
      "Advanced reporting",
      "3 user seats",
      "Message templates",
    ],
    popular: true,
  },
  {
    name: "Pro",
    tier: "pro",
    price: 7000,
    description: "For established multi-location practices",
    features: [
      "Unlimited patients",
      "Unlimited automation rules",
      "SMS + Email + WhatsApp",
      "Campaign messaging",
      "Full analytics suite",
      "Unlimited user seats",
      "Custom templates",
      "API access",
      "Priority support",
    ],
    popular: false,
  },
];

const TIER_ORDER: Record<Tier, number> = { starter: 0, growth: 1, pro: 2 };

interface DowngradeInfo {
  tier: Tier;
  patients: number;
  automations: number;
  seats: number;
}

export default function Pricing() {
  const { tier: currentTier, pendingTier, organisation, isOrgAdmin, isTrialActive, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [downgradeInfo, setDowngradeInfo] = useState<DowngradeInfo | null>(null);

  const hasToken = !!organisation?.payfast_token;
  const periodEnd = organisation?.subscription_period_end
    ? new Date(organisation.subscription_period_end).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
      })
    : null;

  const startCheckout = async (tier: Tier) => {
    const error = await startPayFastCheckout(tier);
    if (error) {
      toast({ title: "Could not start checkout", description: error, variant: "destructive" });
    }
  };

  const changePlan = async (tier: Tier) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast({ title: "Please sign in again", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/payfast/change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tier }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) {
      // No subscription on file — fall back to hosted checkout.
      await startCheckout(tier);
      return;
    }
    if (!res.ok) {
      toast({ title: "Could not change plan", description: body.error, variant: "destructive" });
      return;
    }
    await refreshSubscription();
    if (body.isUpgrade) {
      toast({
        title: `Welcome to ${plans.find((p) => p.tier === tier)?.name}!`,
        description: `New price of R${body.newAmountZar.toLocaleString("en-ZA")}/month applies from your next billing date.`,
      });
    } else {
      toast({
        title: "Plan change scheduled",
        description: `You'll switch to ${plans.find((p) => p.tier === tier)?.name} on ${periodEnd ?? "your next billing date"}.`,
      });
    }
  };

  const prepareDowngrade = async (tier: Tier) => {
    // Gather current usage so the confirmation can state exactly what the
    // grace model will restrict.
    const orgId = organisation?.id;
    if (!orgId) return;
    const [patients, automations, members] = await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }).eq("organisation_id", orgId),
      supabase.from("automation_rules").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("active", true),
      supabase.from("organisation_members").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
    ]);
    setDowngradeInfo({
      tier,
      patients: patients.count ?? 0,
      automations: automations.count ?? 0,
      seats: members.count ?? 0,
    });
  };

  const handleSelect = async (tier: Tier) => {
    if (!isOrgAdmin) {
      toast({
        title: "Admins only",
        description: "Only organisation admins can change the plan.",
        variant: "destructive",
      });
      return;
    }

    setLoadingTier(tier);
    try {
      if (hasToken && TIER_ORDER[tier] < TIER_ORDER[currentTier]) {
        await prepareDowngrade(tier); // confirmation dialog takes over from here
        return;
      }
      if (hasToken) {
        await changePlan(tier);
      } else {
        await startCheckout(tier);
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  const confirmDowngrade = async () => {
    if (!downgradeInfo) return;
    setLoadingTier(downgradeInfo.tier);
    try {
      await changePlan(downgradeInfo.tier);
    } finally {
      setLoadingTier(null);
      setDowngradeInfo(null);
    }
  };

  const downgradeNotes = (info: DowngradeInfo): string[] => {
    const limits: TierLimit = TIER_LIMITS[info.tier];
    const notes: string[] = [];
    if (info.patients >= limits.patients) {
      notes.push(
        `You have ${info.patients.toLocaleString("en-ZA")} patients — the ${info.tier} plan allows ${limitLabel(limits.patients)}. Nothing is deleted, but adding patients will be blocked until you're under the limit.`,
      );
    }
    if (info.automations >= limits.automations) {
      const excess = limits.automations === Infinity ? 0 : info.automations - limits.automations;
      notes.push(
        `${excess} of your ${info.automations} active automation rules will be paused when the change takes effect (you choose which ones, otherwise the newest are paused first).`,
      );
    }
    if (info.seats >= limits.seats) {
      notes.push(
        `You have ${info.seats} active seats — the ${info.tier} plan allows ${limitLabel(limits.seats)}. Existing team members keep access, but inviting new users will be blocked until you're under the limit.`,
      );
    }
    return notes.filter(Boolean);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="page-header text-3xl">Simple, transparent pricing</h1>
        <p className="page-subtitle mt-2">
          Start free for 14 days on Starter — R0 today. Upgrade, downgrade or cancel anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier && !pendingTier;
          const isPending = plan.tier === pendingTier;
          const isLoading = loadingTier === plan.tier;
          return (
            <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}>
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R{plan.price.toLocaleString("en-ZA")}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {hasToken && isTrialActive && plan.tier !== "starter"
                    ? "Bills in full today — the free trial applies to Starter only"
                    : hasToken
                      ? "New price applies at your next billing date"
                      : plan.tier === "starter"
                        ? "First 14 days free — R0 today, card required"
                        : "Billed in full from day one — the free trial applies to Starter"}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent || isPending || isLoading}
                  onClick={() => handleSelect(plan.tier)}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent
                    ? "Current plan"
                    : isPending
                      ? `Switches on ${periodEnd ?? "next billing date"}`
                      : "Subscribe"}
                </Button>
                {isCurrent && pendingTier && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Switching to {plans.find((p) => p.tier === pendingTier)?.name} on {periodEnd}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!downgradeInfo} onOpenChange={(open) => !open && setDowngradeInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Switch to {plans.find((p) => p.tier === downgradeInfo?.tier)?.name}?
            </DialogTitle>
            <DialogDescription>
              Your new price of R
              {downgradeInfo ? plans.find((p) => p.tier === downgradeInfo.tier)?.price.toLocaleString("en-ZA") : ""}
              /month applies from {periodEnd ?? "your next billing date"}. Your data is never deleted.
            </DialogDescription>
          </DialogHeader>
          {downgradeInfo && downgradeNotes(downgradeInfo).length > 0 && (
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {downgradeNotes(downgradeInfo).map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDowngradeInfo(null)}>
              Keep current plan
            </Button>
            <Button onClick={confirmDowngrade} disabled={loadingTier !== null}>
              {loadingTier !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
