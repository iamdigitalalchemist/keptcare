"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

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
    price: 29,
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
    price: 79,
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
    price: 149,
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

// Auto-submit a hidden form to PayFast's hosted checkout.
function redirectToPayFast(url: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export default function Pricing() {
  const { tier: currentTier, isOrgAdmin } = useSubscription();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);

  const handleSelect = async (tier: Tier) => {
    if (tier === "starter") {
      toast({ title: "Starter is the free trial plan", description: "No payment needed to start." });
      return;
    }
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast({ title: "Please sign in again", variant: "destructive" });
        return;
      }

      const res = await fetch("/api/payfast/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Checkout failed" }));
        toast({ title: "Could not start checkout", description: error, variant: "destructive" });
        return;
      }

      const { url, fields } = await res.json();
      redirectToPayFast(url, fields);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="page-header text-3xl">Simple, transparent pricing</h1>
        <p className="page-subtitle mt-2">Choose the plan that fits your practice. Upgrade anytime.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
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
                  <span className="text-4xl font-bold">£{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
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
                  disabled={isCurrent || isLoading}
                  onClick={() => handleSelect(plan.tier)}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent ? "Current plan" : plan.tier === "starter" ? "Get Started" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
