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
import { sendPatientSms } from "@/lib/send-sms";

const FREE_FORM = "free-form";

// Message parts are ~160 GSM-7 chars (70 for UCS-2); good enough as a guide.
function smsParts(text: string) {
  const len = text.length;
  if (len === 0) return 0;
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  /** All message templates; SMS-channel ones are offered in the picker. */
  templates: MessageTemplate[];
  practiceName: string;
  organisationId: string | null;
}

export function SendSmsDialog({ open, onOpenChange, patient, templates, practiceName, organisationId }: SendSmsDialogProps) {
  const queryClient = useQueryClient();
  const smsTemplates = useMemo(
    () => templates.filter((t) => t.channel === "sms"),
    [templates],
  );

  const [source, setSource] = useState<string>(FREE_FORM);
  const [message, setMessage] = useState("");
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const selectedTemplate = smsTemplates.find((t) => t.id === source);

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
    return message;
  }, [selectedTemplate, message, autoVariables, customVariables]);

  // Custom variables the template declares beyond the auto-filled ones.
  const extraVariables = useMemo(
    () =>
      (selectedTemplate?.variables ?? []).filter(
        (name) => !Object.prototype.hasOwnProperty.call(autoVariables, name),
      ),
    [selectedTemplate, autoVariables],
  );

  const canSend =
    !sending &&
    patient.consentSms &&
    Boolean(patient.phone) &&
    preview.trim().length > 0 &&
    (!selectedTemplate || extraVariables.every((name) => customVariables[name]?.trim()));

  const reset = () => {
    setSource(FREE_FORM);
    setMessage("");
    setCustomVariables({});
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    const result = await sendPatientSms({
      patientId: patient.id,
      ...(selectedTemplate
        ? { templateId: selectedTemplate.id, variables: customVariables }
        : { message: preview.trim() }),
    });
    setSending(false);

    if (result.ok === false) {
      toast.error(result.error);
      return;
    }

    toast.success(`SMS sent to ${patient.firstName} ${patient.lastName}.`);
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
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription>
            To {patient.firstName} {patient.lastName} at {patient.phone || "—"}
          </DialogDescription>
        </DialogHeader>

        {!patient.consentSms && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <MessageSquareWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
            This patient has not consented to SMS. Enable SMS consent by editing the patient before sending.
          </div>
        )}
        {patient.consentSms && !patient.phone && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <MessageSquareWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
            This patient has no phone number on file. Add one by editing the patient.
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sms-source">Message source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="sms-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FREE_FORM}>Write a message</SelectItem>
                {smsTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {smsTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No SMS templates yet — create one on the Messages page.
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your SMS here…"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-right">
            {preview.length} characters{preview.length > 0 && ` · ${smsParts(preview)} SMS part${smsParts(preview) === 1 ? "" : "s"}`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? "Sending…" : "Send SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
