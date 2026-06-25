import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { MessageTemplate } from "@/lib/types";

interface AddMessageTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (template: MessageTemplate) => void;
  onDelete?: (template: MessageTemplate) => void;
  template?: MessageTemplate | null;
  mode?: "add" | "edit";
}

const AVAILABLE_VARIABLES = ["patient_name", "practice_name", "booking_link", "appointment_date", "appointment_time", "doctor_name", "procedure_name", "procedure_date", "practice_phone"];

export function AddMessageTemplateDialog({ open, onOpenChange, onAdd, onDelete, template, mode = "add" }: AddMessageTemplateDialogProps) {
  const [form, setForm] = useState({
    name: "",
    channel: "sms" as "sms" | "email" | "whatsapp",
    subject: "",
    body: "",
  });
  const isEdit = mode === "edit" && template;

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        name: template.name,
        channel: template.channel,
        subject: template.subject ?? "",
        body: template.body,
      });
      return;
    }

    setForm({ name: "", channel: "sms", subject: "", body: "" });
  }, [isEdit, open, template]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextTemplate: MessageTemplate = {
      id: template?.id ?? `t-${Date.now()}`,
      name: form.name,
      channel: form.channel,
      subject: form.channel === "email" ? form.subject : undefined,
      body: form.body,
      variables: extractVariables(`${form.subject} ${form.body}`),
    };
    onAdd(nextTemplate);
    onOpenChange(false);
    setForm({ name: "", channel: "sms", subject: "", body: "" });
  };

  const insertVariable = (varName: string) => {
    setForm(f => ({ ...f, body: f.body + `{{${varName}}}` }));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) setForm({ name: "", channel: "sms", subject: "", body: "" }); onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Message Template" : "New Message Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="templateName">Template Name *</Label>
            <Input id="templateName" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Appointment Reminder" />
          </div>
          <div className="space-y-1.5">
            <Label>Channel *</Label>
            <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject Line</Label>
              <Input id="subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Your appointment is coming up, {{patient_name}}" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Message Body *</Label>
            <Textarea required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} placeholder="Type your message... Use {{variable_name}} for dynamic content" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Click to insert variable:</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map(v => (
                <Badge key={v} variant="outline" className="cursor-pointer text-[10px] font-mono hover:bg-accent" onClick={() => insertVariable(v)}>
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <div className="flex w-full justify-between gap-2">
              <div>
                {isEdit && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      onDelete(template);
                      onOpenChange(false);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">{isEdit ? "Save Changes" : "Create Template"}</Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
