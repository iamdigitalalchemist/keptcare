"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserX, Star, Stethoscope, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  missed_appointment: { icon: <UserX className="h-4 w-4" />, color: "text-destructive", label: "Missed" },
  overdue_visit: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-warning", label: "Overdue" },
  high_value: { icon: <Star className="h-4 w-4" />, color: "text-primary", label: "High Value" },
  follow_up: { icon: <Stethoscope className="h-4 w-4" />, color: "text-info", label: "Follow-up" },
};

export default function Alerts() {
  const { data } = usePracticeData();
  const { markAlertRead, markAllAlertsRead } = usePracticeMutations();
  const alertsList = data.alerts;

  const markRead = (id: string) => {
    markAlertRead.mutate(id);
  };

  const markAllRead = () => {
    markAllAlertsRead.mutate();
  };

  const unread = alertsList.filter((a) => !a.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Alerts</h1>
          <p className="page-subtitle">{unread} unread alert{unread !== 1 ? "s" : ""}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {alertsList.map((a) => {
          const cfg = typeConfig[a.type];
          return (
            <div
              key={a.id}
              className={`flex items-center gap-3 p-4 rounded-xl border bg-card transition-colors ${!a.read ? "border-l-4 border-l-primary" : "opacity-70"}`}
            >
              <div className={cfg.color}>{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/patients/${a.patientId}`} className="text-sm font-medium hover:text-primary transition-colors">
                    {a.patientName}
                  </Link>
                  <Badge variant="secondary" className="text-[10px]">{cfg.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{formatDate(a.date)}</span>
                {!a.read && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markRead(a.id)}>
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
