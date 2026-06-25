"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const { organisation, hasPermission, loading, refreshOrganisationAuth } = useSubscription();
  const [form, setForm] = useState({
    name: "",
    email: "",
    logoUrl: "",
    phone: "",
    website: "",
  });
  const [saving, setSaving] = useState(false);
  const canManageOrganisation = hasPermission("organisation.manage");

  useEffect(() => {
    if (!organisation) return;
    setForm({
      name: organisation.name ?? "",
      email: organisation.email ?? "",
      logoUrl: organisation.logo_url ?? "",
      phone: organisation.phone ?? "",
      website: organisation.website ?? "",
    });
  }, [organisation]);

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Please upload an image smaller than 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, logoUrl: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  };

  const saveOrganisation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organisation?.id || !canManageOrganisation) return;

    setSaving(true);
    const { error } = await supabase
      .from("organisations")
      .update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        logo_url: form.logoUrl || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
      })
      .eq("id", organisation.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await refreshOrganisationAuth();
    toast.success("Practice information updated.");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="page-subtitle">Manage your practice details and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveOrganisation} className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Organisation logo preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-primary">Logo</span>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <Label htmlFor="logo">Logo</Label>
                <p className="text-xs text-muted-foreground">Upload a square image under 1MB for best results.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  disabled={loading || !canManageOrganisation}
                  onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                  className="max-w-xs"
                />
                {form.logoUrl && (
                  <Button type="button" variant="outline" disabled={loading || !canManageOrganisation} onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Practice Name</Label>
              <Input
                id="name"
                value={form.name}
                disabled={loading || !canManageOrganisation}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                disabled={loading || !canManageOrganisation}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                disabled={loading || !canManageOrganisation}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                disabled={loading || !canManageOrganisation}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              />
            </div>
          </div>
          <Separator />
          {!canManageOrganisation && (
            <p className="text-sm text-muted-foreground">You do not have permission to update practice information.</p>
          )}
          <Button type="submit" disabled={saving || loading || !canManageOrganisation}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Connect external systems to sync data automatically.</p>
          <div className="space-y-3">
            {["Appointment Booking System", "Electronic Health Records (EHR)", "WhatsApp Business API"].map((name) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">{name}</span>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
