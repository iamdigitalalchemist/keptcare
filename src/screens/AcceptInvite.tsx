"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refreshOrganisationAuth } = useSubscription();
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const acceptInvite = async () => {
      if (authLoading || !user || !token || accepting) return;
      setAccepting(true);
      const { error } = await (supabase as any).rpc("accept_organisation_invitation", {
        _token: token,
      });

      if (error) {
        toast.error(error.message);
        setAccepting(false);
        return;
      }

      await refreshOrganisationAuth();
      toast.success("Invitation accepted.");
      router.replace("/");
    };

    acceptInvite();
  }, [accepting, authLoading, refreshOrganisationAuth, router, token, user]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
            <CardDescription>This invitation link is missing a token.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to accept invitation</CardTitle>
            <CardDescription>
              Use the email address that received this invitation. New invited users should create an account from the auth page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/auth?inviteToken=${encodeURIComponent(token)}`}>Continue to Auth</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{accepting ? "Accepting invitation…" : "Checking invitation…"}</CardTitle>
          <CardDescription>Please wait while we attach your account to the organisation.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
