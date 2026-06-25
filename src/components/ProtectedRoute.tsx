"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { membership, isPlatformAdmin, loading: subLoading } = useSubscription();
  const router = useRouter();
  const loading = authLoading || subLoading;

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

  return <>{children}</>;
}
