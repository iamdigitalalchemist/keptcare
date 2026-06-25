"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Filter, Plus, Users, TrendingUp, UserCheck, Tag, Layers, ArrowUpRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";
import { AddSegmentDialog } from "@/components/AddSegmentDialog";
import { SegmentDetailDialog } from "@/components/SegmentDetailDialog";
import type { PatientSegment } from "@/lib/types";

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  demographic: { icon: <Users className="h-3.5 w-3.5" />, color: "bg-info/10 text-info", label: "Demographic" },
  behavioral: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: "bg-warning/10 text-warning", label: "Behavioral" },
  revenue: { icon: <UserCheck className="h-3.5 w-3.5" />, color: "bg-success/10 text-success", label: "Revenue" },
  custom: { icon: <Tag className="h-3.5 w-3.5" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Custom" },
};

const operatorLabels: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  greater_than: ">",
  less_than: "<",
  contains: "contains",
  not_contains: "doesn't contain",
  between: "between",
  in: "in",
};

export default function Segments() {
  const { data } = usePracticeData();
  const { addPatientSegment, updatePatientSegment, deletePatientSegment } = usePracticeMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<PatientSegment | null>(null);
  const { patientSegments, patients } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Segments</h1>
          <p className="page-subtitle">Build patient cohorts with custom rules &amp; filters</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Segment</Button>
      </div>
      <AddSegmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patients={patients}
        onAdd={(segment) => addPatientSegment.mutate(segment)}
      />
      <SegmentDetailDialog
        open={Boolean(selectedSegment)}
        onOpenChange={(open) => { if (!open) setSelectedSegment(null); }}
        segment={selectedSegment}
        patients={patients}
        onUpdate={(segment) => updatePatientSegment.mutate(segment)}
        onDelete={(segmentId) => deletePatientSegment.mutate(segmentId)}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Segments", value: patientSegments.length, icon: Layers },
          { label: "System Segments", value: patientSegments.filter(s => s.isSystem).length, icon: Filter },
          { label: "Custom Segments", value: patientSegments.filter(s => !s.isSystem).length, icon: Tag },
          { label: "Patients Covered", value: patients.length, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className="h-8 w-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segments list */}
      <div className="grid gap-4">
        {patientSegments.map((seg) => {
          const tc = typeConfig[seg.type];
          return (
            <Card key={seg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Filter className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{seg.name}</h3>
                        <Badge variant="secondary" className={`gap-1 text-[10px] ${tc.color}`}>
                          {tc.icon} {tc.label}
                        </Badge>
                        {seg.isSystem && <Badge variant="outline" className="text-[10px]">System</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{seg.description}</p>

                      {/* Rules preview */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {seg.groups.flatMap((g, gi) =>
                          g.conditions.map((c, ci) => (
                            <Badge key={c.id} variant="outline" className="text-[10px] font-mono gap-1">
                              {gi > 0 && ci === 0 && <span className="text-primary font-semibold">{seg.groupLogic}</span>}
                              {ci > 0 && <span className="text-muted-foreground">{g.logic}</span>}
                              {c.field} {operatorLabels[c.operator]} {String(c.value)}
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {seg.patientCount} patients</span>
                        <span>Updated {formatDate(seg.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSegment(seg)} aria-label={`Open ${seg.name}`}>
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
