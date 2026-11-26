"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquareWarning } from "lucide-react";
import type { MessageTemplate, Patient } from "@/lib/types";
import { renderTemplate } from "@/lib/render-template";
import { sendPatientMessage } from "@/lib/send-message";

const FREE_FORM = "free-form";

export type MessageChannel = "sms" | "whatsapp" | "email";

const LABEL: Record<MessageChannel, string> = { sms: "SMS", whatsapp: "WhatsApp", email: "Email" };

// Message parts are ~160 GSM-7 chars (70 for UCS-2); good enough as a guide.
function smsParts(text: string) {
  const len = text.length;
  if (len === 0) return 0;
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

/** Why this patient can't be messaged on this channel, or null if they can. */
export function blockedReason(patient: Patient, channel: MessageChannel): string | null {
  const consent = { sms: patient.consentSms, whatsapp: patient.consentWhatsapp, email: patient.consentEmail }[channel];
  if (!consent) return `Patient has not consented to ${LABEL[channel]}`;
  if (channel === "email" ? !patient.email : !patient.phone) {
    return channel === "email" ? "No email address on file" : "No phone number on file";
  }
  return null;
}

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: MessageChannel;
  patient: Patient;
  /** All message templates; ones matching `channel` are offered in the picker. */
  templates: MessageTemplate[];
  practiceName: string;
  organisationId: string | null;
}

export function SendMessageDialog({ open, onOpenChange, channel, patient, templates, practiceName, organisationId }: SendMessageDialogProps) {
  const queryClient = useQueryClient();
  const label = LABEL[channel];
  // WhatsApp can only open a conversation with an approved Meta template.
  const templateOnly = channel === "whatsapp";
  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel],
  );

  const [source, setSource] = useState<string>(FREE_FORM);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const selectedTemplate = channelTemplates.find((t) => t.id === source);

  // Auto-filled by the server too; filled here as well so the preview matches.
  const autoVariables = useMemo(
    () => ({
      patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
      first_name: patient.firstName,
      last_name: patient.lastName,
      practice_name: practiceName,
    }),
    [patient, practiceName],
  );

  const preview = useMemo(() => {
    if (selectedTemplate) {
      return renderTemplate(selectedTemplate.body, { ...autoVariables, ...customVariables });
    }
    return templateOnly ? "" : message;
  }, [selectedTemplate, templateOnly, message, autoVariables, customVariables]);

  // Custom variables the template declares beyond the auto-filled ones.
  const extraVariables = useMemo(
    () =>
      (selectedTemplate?.variables ?? []).filter(
        (name) => !Object.prototype.hasOwnProperty.call(autoVariables, name),
      ),
    [selectedTemplate, autoVariables],
  );

  const blocked = blockedReason(patient, channel);
  const canSend =
    !sending &&
    !blocked &&
    preview.trim().length > 0 &&
    (!selectedTemplate || extraVariables.every((name) => customVariables[name]?.trim()));

  const reset = () => {
    setSource(FREE_FORM);
    setMessage("");
    setSubject("");
    setCustomVariables({});
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    const result = await sendPatientMessage({
      channel,
      patientId: patient.id,
      ...(selectedTemplate
        ? { templateId: selectedTemplate.id, variables: customVariables }
        : { message: preview.trim(), subject: subject.trim() || undefined }),
    });
    setSending(false);

    if (result.ok === false) {
      toast.error(result.error);
      return;
    }

    toast.success(`${label} sent to ${patient.firstName} ${patient.lastName}.`);
    reset();
    onOpenChange(false);
    if (organisationId) {
      queryClient.invalidateQueries({ queryKey: ["practice-data", organisationId] });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send {label}</DialogTitle>
          <DialogDescription>
            To {patient.firstName} {patient.lastName} at {(channel === "email" ? patient.email : patient.phone) || "—"}
          </DialogDescription>
        </DialogHeader>

        {blocked && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <MessageSquareWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {blocked}. Edit the patient to fix this before sending.
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="msg-source">{templateOnly ? "Template" : "Message source"}</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="msg-source">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templateOnly ? (
                  <SelectItem value={FREE_FORM} disabled>Choose a template</SelectItem>
                ) : (
                  <SelectItem value={FREE_FORM}>Write a message</SelectItem>
                )}
                {channelTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {channelTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No {label} templates yet — create one on the Messages page.
              </p>
            )}
            {templateOnly && (
              <p className="text-xs text-muted-foreground">
                WhatsApp needs a Meta-approved template; the template name must match the one approved in Sendexa.
              </p>
            )}
          </div>

          {selectedTemplate ? (
            <>
              {extraVariables.map((name) => (
                <div key={name} className="space-y-2">
                  <Label htmlFor={`var-${name}`}>{name.replace(/_/g, " ")}</Label>
                  <Input
                    id={`var-${name}`}
                    value={customVariables[name] ?? ""}
                    onChange={(e) =>
                      setCustomVariables((vars) => ({ ...vars, [name]: e.target.value }))
                    }
                    placeholder={`Value for {{${name}}}`}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                  {preview || <span className="text-muted-foreground">Empty template</span>}
                </div>
              </div>
            </>
          ) : templateOnly ? null : (
            <>
              {channel === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="msg-subject">Subject</Label>
                  <Input
                    id="msg-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={`Message from ${practiceName}`}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="msg-body">Message</Label>
                <Textarea
                  id="msg-body"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={channel === "email" ? 8 : 4}
                  placeholder={`Type your ${label} here…`}
                />
              </div>
            </>
          )}

          {channel === "sms" && (
            <p className="text-xs text-muted-foreground text-right">
              {preview.length} characters{preview.length > 0 && ` · ${smsParts(preview)} SMS part${smsParts(preview) === 1 ? "" : "s"}`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? "Sending…" : `Send ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
