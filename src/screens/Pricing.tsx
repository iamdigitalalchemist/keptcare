"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: 29,
    description: "For solo practitioners getting started",
    features: [
      "Up to 200 patients",
      "2 automation rules",
      "Email reminders only",
      "Basic reporting",
      "1 user seat",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Growth",
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
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Pro",
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
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="page-header text-3xl">Simple, transparent pricing</h1>
        <p className="page-subtitle mt-2">Choose the plan that fits your practice. Upgrade anytime.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
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
              <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
