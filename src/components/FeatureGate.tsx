"use client";

import { useSubscription, type Feature } from "@/contexts/SubscriptionContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export function FeatureGate({ feature, children, fallbackMessage }: FeatureGateProps) {
  const { canAccess, isSubscriptionActive, tier } = useSubscription();
  const router = useRouter();

  if (!isSubscriptionActive) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your trial has expired. Subscribe to continue using KeptCare.
          </p>
          <Button onClick={() => router.push("/pricing")}>View Plans</Button>
        </CardContent>
      </Card>
    );
  }

  if (!canAccess(feature)) {
    return (
      <Card className="border-warning/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {fallbackMessage || `This feature is not available on the ${tier} plan.`}
          </p>
          <Button variant="outline" onClick={() => router.push("/pricing")}>
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
