"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bot, Clock, Mail, MessageSquare, Smartphone, Users, Plus } from "lucide-react";
import { AddAutomationDialog } from "@/components/AddAutomationDialog";
import { formatDate } from "@/lib/utils";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";

const triggerLabels: Record<string, string> = {
  no_visit: "No visit in",
  missed_appointment: "Missed appointment",
  follow_up_due: "Follow-up due after",
  checkup_due: "Check-up due in",
};

const channelIcons: Record<string, React.ReactNode> = {
  sms: <Smartphone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
};

export default function Automations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data } = usePracticeData();
  const { addAutomationRule, toggleAutomationRule } = usePracticeMutations();
  const { automationRules: rules, messageTemplates } = data;

  const toggleRule = (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (rule) toggleAutomationRule.mutate({ id, active: !rule.active });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Automations</h1>
          <p className="page-subtitle">Set up rules to automate patient communication</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Rule</Button>
      </div>
      <AddAutomationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={(r) => addAutomationRule.mutate(r)}
        messageTemplates={messageTemplates}
      />

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={rule.active ? "" : "opacity-60"}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{rule.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Clock className="h-3 w-3" />
                        {triggerLabels[rule.trigger.type]} {rule.trigger.value} {rule.trigger.unit}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        {channelIcons[rule.action.type]}
                        Send {rule.action.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {rule.patientsAffected} patients affected</span>
                      {rule.lastTriggered && <span>Last triggered: {formatDate(rule.lastTriggered)}</span>}
                    </div>
                  </div>
                </div>
                <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
