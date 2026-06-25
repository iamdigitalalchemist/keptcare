"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Smartphone, MessageSquare, Plus, Copy, Pencil } from "lucide-react";
import { AddMessageTemplateDialog } from "@/components/AddMessageTemplateDialog";
import type { MessageTemplate } from "@/lib/types";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";
import { toast } from "sonner";

const channelConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  sms: { icon: <Smartphone className="h-4 w-4" />, color: "bg-info/10 text-info" },
  email: { icon: <Mail className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  whatsapp: { icon: <MessageSquare className="h-4 w-4" />, color: "bg-success/10 text-success" },
};

export default function Messages() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const { data } = usePracticeData();
  const { addMessageTemplate, updateMessageTemplate, deleteMessageTemplate } = usePracticeMutations();
  const templates = data.messageTemplates;

  const duplicateTemplate = (t: MessageTemplate) => {
    addMessageTemplate.mutate({ ...t, id: "", name: `${t.name} (copy)` });
  };

  const removeTemplate = (template: MessageTemplate) => {
    deleteMessageTemplate.mutate(template.id);
    toast.success("Template deleted");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Message Templates</h1>
          <p className="page-subtitle">Create reusable templates with dynamic variables</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Template</Button>
      </div>
      <AddMessageTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={(t) => addMessageTemplate.mutate(t)} />
      <AddMessageTemplateDialog
        open={Boolean(editingTemplate)}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
        template={editingTemplate}
        mode="edit"
        onAdd={(t) => updateMessageTemplate.mutate(t)}
        onDelete={removeTemplate}
      />

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t) => {
          const ch = channelConfig[t.channel];
          return (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-sm">{t.name}</h3>
                    {t.subject && <p className="text-xs text-muted-foreground mt-0.5">Subject: {t.subject}</p>}
                  </div>
                  <Badge variant="secondary" className={`gap-1 ${ch.color}`}>
                    {ch.icon} {t.channel.toUpperCase()}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                  {t.body}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => duplicateTemplate(t)}><Copy className="h-3 w-3 mr-1" /> Duplicate</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingTemplate(t)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
