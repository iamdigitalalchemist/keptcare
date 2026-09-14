"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { startPayFastCheckout } from "@/lib/start-checkout";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        router.push(inviteToken ? `/accept-invite?token=${encodeURIComponent(inviteToken)}` : "/dashboard");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            practice_name: practiceName,
            signup_mode: inviteToken ? "invited" : "new_organisation",
          },
          emailRedirectTo: inviteToken
            ? `${window.location.origin}/accept-invite?token=${encodeURIComponent(inviteToken)}`
            : `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(error.message);
      } else if (!inviteToken && data.session) {
        // Organisation was created synchronously by handle_new_user, so we can
        // capture the card right away: R0 today (Starter trial), first charge
        // on day 14. If email confirmation is enabled there is no session yet
        // — after confirming, the card-capture gate on ProtectedRoute forces
        // checkout before the dashboard opens.
        const checkoutError = await startPayFastCheckout("starter");
        if (checkoutError) toast.error(checkoutError);
        else toast.success("Confirm your details with PayFast to start your trial.");
      } else {
        toast.success("Check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">PR</span>
          </div>
          <CardTitle className="text-xl">{isLogin ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to your KeptCare account"
              : inviteToken
                ? "Create your account to join the organisation"
                : "14-day free trial on Starter — add your card to begin. R0 charged today, R3,500/month from day 14. Cancel anytime."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !inviteToken && (
              <div className="space-y-1.5">
                <Label htmlFor="practice">Practice Name</Label>
                <Input
                  id="practice"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  placeholder="e.g. Bright Smile Dental"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@practice.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : isLogin
                  ? "Sign In"
                  : inviteToken
                    ? "Create Account"
                    : "Start Free Trial & Add Card"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
