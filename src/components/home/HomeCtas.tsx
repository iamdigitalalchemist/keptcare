"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Auth-aware CTAs for the landing page. These are the only parts of the page
// that need client state — everything else renders on the server.

export function AuthCta({
  size,
  className,
  withArrow = false,
}: {
  size?: "default" | "sm" | "lg";
  className?: string;
  withArrow?: boolean;
}) {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/auth";
  const label = user ? "Open dashboard" : "Start free trial";
  return (
    <Button asChild size={size} className={className}>
      <Link href={href}>
        {label} {withArrow && <ArrowRight className="h-4 w-4 ml-1.5" />}
      </Link>
    </Button>
  );
}

export function NavSignIn() {
  const { user } = useAuth();
  if (user) return null;
  return (
    <Button asChild variant="ghost" className="text-white/75 hover:text-white hover:bg-white/10">
      <Link href="/auth">Sign in</Link>
    </Button>
  );
}

export function PlanCta({ popular }: { popular: boolean }) {
  const { user } = useAuth();
  return (
    <Button asChild className="w-full mt-6" variant={popular ? "default" : "outline"}>
      <Link href={user ? "/pricing" : "/auth"}>{user ? "Manage plan" : "Start free trial"}</Link>
    </Button>
  );
}
