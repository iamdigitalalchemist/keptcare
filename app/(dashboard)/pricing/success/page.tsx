"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function CheckoutSuccess() {
  const { refreshSubscription } = useSubscription();

  // The plan is activated by the ITN webhook (server-to-server), which may land a
  // moment after the browser returns here. Refresh a couple of times to pick it up.
  useEffect(() => {
    refreshSubscription();
    const t = setTimeout(() => refreshSubscription(), 3000);
    return () => clearTimeout(t);
  }, [refreshSubscription]);

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardContent className="flex flex-col items-center text-center gap-4 py-10">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h1 className="text-xl font-semibold">Payment received</h1>
          <p className="text-sm text-muted-foreground">
            Thanks! Your subscription is being activated. It can take a few moments
            to reflect while we confirm the payment.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
