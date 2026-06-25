"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus, Send, Clock, FileText, CheckCircle } from "lucide-react";
import { AddCampaignDialog } from "@/components/AddCampaignDialog";
import { formatDate } from "@/lib/utils";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  draft: { icon: <FileText className="h-3.5 w-3.5" />, color: "bg-muted text-muted-foreground" },
  scheduled: { icon: <Clock className="h-3.5 w-3.5" />, color: "bg-warning/10 text-warning" },
  sent: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-success/10 text-success" },
  active: { icon: <Send className="h-3.5 w-3.5" />, color: "bg-info/10 text-info" },
};

export default function Campaigns() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data } = usePracticeData();
  const { addCampaign } = usePracticeMutations();
  const { campaigns: campaignsList, messageTemplates, patientSegments } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Campaigns</h1>
          <p className="page-subtitle">Send targeted messages to patient segments</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Campaign</Button>
      </div>
      <AddCampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={(c) => addCampaign.mutate(c)}
        messageTemplates={messageTemplates}
        patientSegments={patientSegments}
      />

      <div className="grid gap-4">
        {campaignsList.map((c) => {
          const st = statusConfig[c.status];
          return (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.segment}</p>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        <span>{c.recipientCount} recipients</span>
                        {c.sentCount > 0 && <span>{c.sentCount} sent</span>}
                        {c.openRate > 0 && <span>{c.openRate}% open rate</span>}
                        {c.scheduledDate && <span>Scheduled: {formatDate(c.scheduledDate)}</span>}
                        {c.sentDate && <span>Sent: {formatDate(c.sentDate)}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`gap-1 ${st.color}`}>
                    {st.icon} {c.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
