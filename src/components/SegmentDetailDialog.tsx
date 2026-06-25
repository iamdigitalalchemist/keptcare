import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Patient, PatientSegment, SegmentCondition, SegmentOperator } from "@/lib/types";
import { getMatchingPatients, SEGMENT_FIELD_OPTIONS, SEGMENT_OPERATOR_OPTIONS } from "@/components/AddSegmentDialog";

interface SegmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: PatientSegment | null;
  patients: Patient[];
  onUpdate: (segment: PatientSegment) => void;
  onDelete: (segmentId: string) => void;
}

function firstCondition(segment: PatientSegment | null): SegmentCondition {
  return segment?.groups[0]?.conditions[0] ?? {
    id: crypto.randomUUID(),
    field: "status",
    operator: "equals",
    value: "active",
  };
}

export function SegmentDetailDialog({ open, onOpenChange, segment, patients, onUpdate, onDelete }: SegmentDetailDialogProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    field: "status",
    operator: "equals" as SegmentOperator,
    value: "active",
  });

  useEffect(() => {
    if (!segment) return;
    const condition = firstCondition(segment);
    setForm({
      name: segment.name,
      description: segment.description,
      field: condition.field,
      operator: condition.operator,
      value: String(condition.value),
    });
  }, [segment]);

  const selectedField = SEGMENT_FIELD_OPTIONS.find((field) => field.value === form.field) ?? SEGMENT_FIELD_OPTIONS[0];
  const previewSegment = useMemo<PatientSegment | null>(() => {
    if (!segment) return null;
    return {
      ...segment,
      name: form.name,
      description: form.description,
      type: selectedField.type,
      groups: [
        {
          id: segment.groups[0]?.id ?? crypto.randomUUID(),
          logic: "AND",
          conditions: [
            {
              id: segment.groups[0]?.conditions[0]?.id ?? crypto.randomUUID(),
              field: form.field,
              operator: form.operator,
              value: form.value,
            },
          ],
        },
      ],
      groupLogic: "AND",
    };
  }, [form, segment, selectedField.type]);

  const matchingPatients = previewSegment ? getMatchingPatients(patients, previewSegment) : [];

  if (!segment || !previewSegment) return null;

  const canEdit = !segment.isSystem;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    onUpdate({
      ...previewSegment,
      description: form.description || `${selectedField.label} ${form.operator.replace("_", " ")} ${form.value}`,
      patientCount: matchingPatients.length,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{canEdit ? "Edit Segment" : "Segment Details"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="detailSegmentName">Segment name</Label>
              <Input id="detailSegmentName" value={form.name} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Input value={selectedField.type} disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="detailSegmentDescription">Description</Label>
            <Textarea id="detailSegmentDescription" value={form.description} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={2} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Select disabled={!canEdit} value={form.field} onValueChange={(value) => setForm((current) => ({ ...current, field: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENT_FIELD_OPTIONS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Operator</Label>
              <Select disabled={!canEdit} value={form.operator} onValueChange={(value) => setForm((current) => ({ ...current, operator: value as SegmentOperator }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENT_OPERATOR_OPTIONS.map((operator) => (
                    <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="detailSegmentValue">Value</Label>
              <Input id="detailSegmentValue" value={form.value} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Matching Patients</p>
              <Badge variant="secondary">{matchingPatients.length} patient{matchingPatients.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border">
              {matchingPatients.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">No patients match this segment.</p>
              ) : (
                matchingPatients.map((patient) => (
                  <Link key={patient.id} href={`/patients/${patient.id}`} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{patient.firstName} {patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{patient.status} · last visit {patient.lastVisit ? formatDate(patient.lastVisit) : "unknown"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">£{formatNumber(patient.revenue)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {canEdit && (
                <Button type="button" variant="destructive" onClick={() => { onDelete(segment.id); onOpenChange(false); }}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {canEdit && <Button type="submit">Save Changes</Button>}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
