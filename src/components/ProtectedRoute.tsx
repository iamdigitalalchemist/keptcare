"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { startPayFastCheckout } from "@/lib/start-checkout";
import { hasPaidAccess } from "@/lib/access";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const {
    membership,
    organisation,
    isOrgAdmin,
    isPlatformAdmin,
    isTrialActive,
    trialEndsAt,
    isSubscriptionActive,
    loading: subLoading,
  } = useSubscription();
  const pathname = usePathname();
  const router = useRouter();
  const loading = authLoading || subLoading;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!membership && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-lg font-semibold">No organisation access</h1>
          <p className="text-sm text-muted-foreground">
            Your account is not attached to an active organisation. Ask an organisation admin to add you or send an invitation.
          </p>
        </div>
      </div>
    );
  }

  // Card-capture gate: an org with no PayFast token has no card on file, so we
  // don't let anyone in (except /pricing, where the card gets captured) until
  // the admin completes checkout. This applies during the trial too — the
  // trial is card-first, not card-later. The exception is an org that paid
  // and later cancelled: they keep tokenless access for what they already
  // paid (period end + the same 3-day grace as SubscriptionContext), and only
  // hit this gate once that runs out.
  const paidAccess = !!organisation && hasPaidAccess(organisation);
  const mustCaptureCard =
    Boolean(membership) && !isPlatformAdmin && !organisation?.payfast_token && !paidAccess;

  if (mustCaptureCard && pathname !== "/pricing") {
    const trialEnd = trialEndsAt
      ? trialEndsAt.toLocaleDateString("en-ZA", { day: "numeric", month: "long" })
      : null;

    const captureCard = async () => {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const err = await startPayFastCheckout("starter");
      if (err) setCheckoutError(err);
      setCheckoutLoading(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-lg font-semibold">
            {isOrgAdmin ? "Add a payment card to continue" : "Payment setup required"}
          </h1>
          {isOrgAdmin ? (
            <>
              <p className="text-sm text-muted-foreground">
                {isTrialActive
                  ? `Start your 14-day Starter trial — R0 today, first charge on ${trialEnd ?? "day 14"} (R3,500/month). Cancel anytime.`
                  : "Your access is paused — add a card to subscribe and keep your practice running. Your data is safe and exactly where you left it."}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button onClick={captureCard} disabled={checkoutLoading}>
                  {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isTrialActive ? "Add card — R0 today" : "Subscribe with card"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/pricing">Compare plans</Link>
                </Button>
              </div>
              {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your organisation hasn&apos;t added a payment card yet. Ask an organisation admin to set up billing to restore access.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Subscription gate: an expired trial or lapsed paid subscription blocks the
  // dashboard (but never /pricing itself, or we'd loop). The 3-day grace after
  // a missed renewal is already baked into isSubscriptionActive.
  if (membership && !isSubscriptionActive && !isPlatformAdmin && pathname !== "/pricing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-lg font-semibold">Your trial has ended</h1>
          <p className="text-sm text-muted-foreground">
            Choose a plan to keep your practice running. Your data is safe and exactly where you left it.
          </p>
          <Button asChild>
            <Link href="/pricing">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
