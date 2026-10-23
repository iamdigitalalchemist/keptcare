"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

// Nav header CTA: signed-out visitors get "Book a demo"; signed-in users keep "Open dashboard".
export function NavBookDemo({ className }: { className?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <AuthCta className={className} />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    // demo_requests isn't in the generated types yet.
    const { error } = await (supabase as any).from("demo_requests").insert({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      mobile: String(form.get("mobile")).trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not send your request. Please check your details and try again.");
      return;
    }
    toast.success("Thanks! We'll be in touch to book your demo.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>Book a demo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a demo</DialogTitle>
          <DialogDescription>Leave your details and we'll contact you to set up a time.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="demo-name">Name</Label>
            <Input id="demo-name" name="name" required maxLength={200} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-email">Email</Label>
            <Input id="demo-email" name="email" type="email" required maxLength={320} autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-mobile">Mobile number</Label>
            <Input
              id="demo-mobile"
              name="mobile"
              type="tel"
              required
              pattern="\+?[0-9 \(\)\-]{7,20}"
              title="Digits only, optionally starting with +"
              autoComplete="tel"
              placeholder="+27 82 123 4567"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Request demo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
