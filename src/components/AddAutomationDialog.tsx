import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AutomationRule, MessageTemplate } from "@/lib/types";

interface AddAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (rule: AutomationRule) => void;
  messageTemplates: MessageTemplate[];
}

export function AddAutomationDialog({ open, onOpenChange, onAdd, messageTemplates }: AddAutomationDialogProps) {
  const [form, setForm] = useState({
    name: "",
    triggerType: "no_visit" as "no_visit" | "missed_appointment" | "follow_up_due" | "checkup_due",
    triggerValue: "6",
    triggerUnit: "months" as "days" | "weeks" | "months",
    actionType: "sms" as "sms" | "email" | "whatsapp",
    templateId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: AutomationRule = {
      id: `r-${Date.now()}`,
      name: form.name,
      trigger: {
        type: form.triggerType,
        value: parseInt(form.triggerValue) || 1,
        unit: form.triggerUnit,
      },
      action: {
        type: form.actionType,
        templateId: form.templateId,
      },
      active: true,
      patientsAffected: Math.floor(Math.random() * 10) + 1,
      lastTriggered: null,
    };
    onAdd(rule);
    onOpenChange(false);
    setForm({ name: "", triggerType: "no_visit", triggerValue: "6", triggerUnit: "months", actionType: "sms", templateId: "" });
  };

  const filteredTemplates = messageTemplates.filter(t => t.channel === form.actionType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Automation Rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ruleName">Rule Name *</Label>
            <Input id="ruleName" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 3-Month Recall Reminder" />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger *</Label>
            <Select value={form.triggerType} onValueChange={v => setForm(f => ({ ...f, triggerType: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no_visit">No visit in</SelectItem>
                <SelectItem value="missed_appointment">Missed appointment</SelectItem>
                <SelectItem value="follow_up_due">Follow-up due after</SelectItem>
                <SelectItem value="checkup_due">Check-up due in</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="triggerValue">Value</Label>
              <Input id="triggerValue" type="number" min="1" value={form.triggerValue} onChange={e => setForm(f => ({ ...f, triggerValue: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={form.triggerUnit} onValueChange={v => setForm(f => ({ ...f, triggerUnit: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Send via *</Label>
            <Select value={form.actionType} onValueChange={v => setForm(f => ({ ...f, actionType: v as any, templateId: "" }))}>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Rule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
