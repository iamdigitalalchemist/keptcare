import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { Patient } from "@/lib/types";

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (patient: Patient) => void;
  patient?: Patient | null;
  mode?: "add" | "edit";
}

const defaultForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "other" as "male" | "female" | "other",
  status: "active" as Patient["status"],
  lastVisit: "",
  nextAppointment: "",
  visitCount: "0",
  tags: "",
  notes: "",
  revenue: "0",
  consentSms: false,
  consentEmail: false,
  consentWhatsapp: false,
};

export function AddPatientDialog({ open, onOpenChange, onAdd, patient, mode = "add" }: AddPatientDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const isEdit = mode === "edit" && patient;

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        status: patient.status,
        lastVisit: patient.lastVisit,
        nextAppointment: patient.nextAppointment ?? "",
        visitCount: String(patient.visitCount),
        tags: patient.tags.join(", "),
        notes: patient.notes,
        revenue: String(patient.revenue),
        consentSms: patient.consentSms,
        consentEmail: patient.consentEmail,
        consentWhatsapp: patient.consentWhatsapp,
      });
      return;
    }

    setForm(defaultForm);
  }, [isEdit, open, patient]);

  const reset = () => setForm(defaultForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patientRecord: Patient = {
      id: patient?.id ?? `p-${Date.now()}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      lastVisit: form.lastVisit || new Date().toISOString().split("T")[0],
      nextAppointment: form.nextAppointment || null,
      visitCount: Number.parseInt(form.visitCount, 10) || 0,
      status: form.status,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      consentSms: form.consentSms,
      consentEmail: form.consentEmail,
      consentWhatsapp: form.consentWhatsapp,
      notes: form.notes,
      revenue: Number.parseFloat(form.revenue) || 0,
    };
    onAdd(patientRecord);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) reset(); onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Patient" : "Add New Patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as Patient["gender"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Patient["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lastVisit">Last Visit</Label>
              <Input id="lastVisit" type="date" value={form.lastVisit} onChange={e => setForm(f => ({ ...f, lastVisit: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextAppointment">Next Appointment</Label>
              <Input id="nextAppointment" type="date" value={form.nextAppointment} onChange={e => setForm(f => ({ ...f, nextAppointment: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visitCount">Visits</Label>
              <Input id="visitCount" type="number" min="0" value={form.visitCount} onChange={e => setForm(f => ({ ...f, visitCount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revenue">Revenue</Label>
              <Input id="revenue" type="number" min="0" step="0.01" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="regular, high-value, dental-plan" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Communication Consent</Label>
            <div className="flex gap-4">
              {(["Sms", "Email", "Whatsapp"] as const).map(ch => (
                <label key={ch} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={form[`consent${ch}`]} onCheckedChange={v => setForm(f => ({ ...f, [`consent${ch}`]: !!v }))} />
                  {ch === "Whatsapp" ? "WhatsApp" : ch}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Add Patient"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
