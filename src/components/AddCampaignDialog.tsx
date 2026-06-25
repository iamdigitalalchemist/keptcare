import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign, MessageTemplate, PatientSegment } from "@/lib/types";

interface AddCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (campaign: Campaign) => void;
  messageTemplates: MessageTemplate[];
  patientSegments: PatientSegment[];
}

export function AddCampaignDialog({ open, onOpenChange, onAdd, messageTemplates, patientSegments }: AddCampaignDialogProps) {
  const [form, setForm] = useState({
    name: "",
    channel: "email" as "sms" | "email" | "whatsapp",
    templateId: "",
    segment: "",
    scheduledDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const campaign: Campaign = {
      id: `cp-${Date.now()}`,
      name: form.name,
      status: form.scheduledDate ? "scheduled" : "draft",
      channel: form.channel,
      templateId: form.templateId,
      segment: form.segment || "All patients",
      recipientCount: Math.floor(Math.random() * 100) + 10,
      sentCount: 0,
      openRate: 0,
      scheduledDate: form.scheduledDate || null,
      sentDate: null,
    };
    onAdd(campaign);
    onOpenChange(false);
    setForm({ name: "", channel: "email", templateId: "", segment: "", scheduledDate: "" });
  };

  const filteredTemplates = messageTemplates.filter(t => t.channel === form.channel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaignName">Campaign Name *</Label>
            <Input id="campaignName" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spring Check-up Drive" />
          </div>
          <div className="space-y-1.5">
            <Label>Channel *</Label>
            <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v as any, templateId: "" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={form.templateId} onValueChange={v => setForm(f => ({ ...f, templateId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                {filteredTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target Segment</Label>
            <Select value={form.segment} onValueChange={v => setForm(f => ({ ...f, segment: v }))}>
              <SelectTrigger><SelectValue placeholder="Select a segment" /></SelectTrigger>
              <SelectContent>
                {patientSegments.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name} ({s.patientCount})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduleDate">Schedule Date (optional)</Label>
            <Input id="scheduleDate" type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Campaign</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
