import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Patient, PatientSegment, SegmentCondition, SegmentOperator } from "@/lib/types";

interface AddSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  onAdd: (segment: PatientSegment) => void;
}

export const SEGMENT_FIELD_OPTIONS = [
  { value: "status", label: "Status", type: "behavioral" },
  { value: "tags", label: "Tags", type: "custom" },
  { value: "revenue", label: "Revenue", type: "revenue" },
  { value: "visitCount", label: "Visit count", type: "behavioral" },
  { value: "gender", label: "Gender", type: "demographic" },
  { value: "age", label: "Age", type: "demographic" },
  { value: "consentSms", label: "SMS consent", type: "custom" },
  { value: "consentEmail", label: "Email consent", type: "custom" },
  { value: "consentWhatsapp", label: "WhatsApp consent", type: "custom" },
] as const;

export const SEGMENT_OPERATOR_OPTIONS: { value: SegmentOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "between", label: "is between" },
];

function getPatientFieldValue(patient: Patient, field: string) {
  if (field === "age") {
    if (!patient.dateOfBirth) return null;
    const birthDate = new Date(patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return age;
  }

  return patient[field as keyof Patient];
}

export function matchesSegmentCondition(patient: Patient, condition: SegmentCondition) {
  const patientValue = getPatientFieldValue(patient, condition.field);
  const conditionValue = condition.value;

  if (condition.operator === "contains" || condition.operator === "not_contains") {
    const values = Array.isArray(patientValue) ? patientValue : [String(patientValue ?? "")];
    const match = values.some((value) => String(value).toLowerCase().includes(String(conditionValue).toLowerCase()));
    return condition.operator === "contains" ? match : !match;
  }

  if (condition.operator === "greater_than" || condition.operator === "less_than") {
    const left = Number(patientValue);
    const right = Number(conditionValue);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    return condition.operator === "greater_than" ? left > right : left < right;
  }

  if (condition.operator === "between") {
    const [min, max] = String(conditionValue).split("-").map((value) => Number(value.trim()));
    const left = Number(patientValue);
    if (Number.isNaN(left) || Number.isNaN(min) || Number.isNaN(max)) return false;
    return left >= min && left <= max;
  }

  const match = String(patientValue ?? "").toLowerCase() === String(conditionValue).toLowerCase();
  return condition.operator === "equals" ? match : !match;
}

export function getMatchingPatients(patients: Patient[], segment: Pick<PatientSegment, "groups" | "groupLogic">) {
  return patients.filter((patient) => {
    const groupResults = segment.groups.map((group) => {
      const conditionResults = group.conditions.map((condition) => matchesSegmentCondition(patient, condition));
      return group.logic === "OR" ? conditionResults.some(Boolean) : conditionResults.every(Boolean);
    });

    return segment.groupLogic === "OR" ? groupResults.some(Boolean) : groupResults.every(Boolean);
  });
}

export function AddSegmentDialog({ open, onOpenChange, patients, onAdd }: AddSegmentDialogProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    field: "status",
    operator: "equals" as SegmentOperator,
    value: "active",
  });

  const selectedField = SEGMENT_FIELD_OPTIONS.find((field) => field.value === form.field) ?? SEGMENT_FIELD_OPTIONS[0];
  const condition: SegmentCondition = {
    id: crypto.randomUUID(),
    field: form.field,
    operator: form.operator,
    value: form.value,
  };
  const patientCount = patients.filter((patient) => matchesSegmentCondition(patient, condition)).length;

  const reset = () => {
    setForm({
      name: "",
      description: "",
      field: "status",
      operator: "equals",
      value: "active",
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    onAdd({
      id: "",
      name: form.name,
      description: form.description || `${selectedField.label} ${form.operator.replace("_", " ")} ${form.value}`,
      type: selectedField.type,
      groups: [
        {
          id: crypto.randomUUID(),
          logic: "AND",
          conditions: [condition],
        },
      ],
      groupLogic: "AND",
      patientCount,
      lastUpdated: today,
      isSystem: false,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) reset(); onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Segment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="segmentName">Segment name *</Label>
            <Input id="segmentName" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Active high-value patients" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="segmentDescription">Description</Label>
            <Textarea id="segmentDescription" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={2} placeholder="Optional description" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Select value={form.field} onValueChange={(value) => setForm((current) => ({ ...current, field: value }))}>
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
              <Select value={form.operator} onValueChange={(value) => setForm((current) => ({ ...current, operator: value as SegmentOperator }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENT_OPERATOR_OPTIONS.map((operator) => (
                    <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="segmentValue">Value</Label>
              <Input id="segmentValue" required value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="active" />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            This segment currently matches <span className="font-medium text-foreground">{patientCount}</span> patient{patientCount === 1 ? "" : "s"}.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Segment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
