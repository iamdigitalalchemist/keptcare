import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Patient } from "@/lib/types";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (patients: Patient[]) => void;
}

interface ParseResult {
  valid: Patient[];
  errors: { row: number; message: string }[];
}

const REQUIRED_FIELDS = ["firstName", "lastName"];
const FIELD_MAP: Record<string, string> = {
  "first_name": "firstName", "firstname": "firstName", "first name": "firstName",
  "last_name": "lastName", "lastname": "lastName", "last name": "lastName",
  "email": "email", "email_address": "email",
  "phone": "phone", "phone_number": "phone", "mobile": "phone",
  "date_of_birth": "dateOfBirth", "dob": "dateOfBirth", "dateofbirth": "dateOfBirth",
  "gender": "gender", "sex": "gender",
  "last_visit": "lastVisit", "lastvisit": "lastVisit",
  "next_appointment": "nextAppointment", "nextappointment": "nextAppointment",
  "visit_count": "visitCount", "visitcount": "visitCount", "visits": "visitCount",
  "status": "status",
  "tags": "tags",
  "consent_sms": "consentSms", "consentsms": "consentSms",
  "consent_email": "consentEmail", "consentemail": "consentEmail",
  "consent_whatsapp": "consentWhatsapp", "consentwhatsapp": "consentWhatsapp",
  "notes": "notes",
};

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { valid: [], errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const mappedHeaders = headers.map(h => FIELD_MAP[h] || h);

  const missingRequired = REQUIRED_FIELDS.filter(f => !mappedHeaders.includes(f));
  if (missingRequired.length > 0) {
    return { valid: [], errors: [{ row: 0, message: `Missing required columns: ${missingRequired.join(", ")}` }] };
  }

  const valid: Patient[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    if (values.length !== headers.length) {
      errors.push({ row: i + 1, message: `Expected ${headers.length} columns, got ${values.length}` });
      continue;
    }

    const row: Record<string, string> = {};
    mappedHeaders.forEach((h, idx) => { row[h] = values[idx]; });

    if (!row.firstName || !row.lastName) {
      errors.push({ row: i + 1, message: "Missing first or last name" });
      continue;
    }

    const toBool = (v?: string) => v ? ["true", "yes", "1"].includes(v.toLowerCase()) : false;

    valid.push({
      id: crypto.randomUUID(),
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email || "",
      phone: row.phone || "",
      dateOfBirth: row.dateOfBirth || "",
      gender: (row.gender as Patient["gender"]) || "other",
      lastVisit: row.lastVisit || new Date().toISOString().split("T")[0],
      nextAppointment: row.nextAppointment || null,
      visitCount: parseInt(row.visitCount) || 0,
      status: (row.status as Patient["status"]) || "active",
      tags: row.tags ? row.tags.split(";").map(t => t.trim()) : [],
      consentSms: toBool(row.consentSms),
      consentEmail: toBool(row.consentEmail),
      consentWhatsapp: toBool(row.consentWhatsapp),
      notes: row.notes || "",
      revenue: 0,
    });
  }

  return { valid, errors };
}

export function CSVImportDialog({ open, onOpenChange, onImport }: CSVImportDialogProps) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResult(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  };

  const handleImport = () => {
    if (result && result.valid.length > 0) {
      onImport(result.valid);
      setResult(null);
      setFileName("");
      onOpenChange(false);
    }
  };

  const reset = () => { setResult(null); setFileName(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Patients from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with patient data. Required columns: firstName, lastName.{" "}
            <a href="/patients-example.csv" download className="font-medium text-primary underline-offset-4 hover:underline">
              Download example.csv
            </a>
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <Button variant="ghost" size="sm" onClick={reset} className="ml-auto text-xs">Change file</Button>
            </div>

            {result.valid.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-success">{result.valid.length} patients ready to import</span>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{result.errors.length} errors found</span>
                </div>
                <div className="max-h-32 overflow-y-auto bg-muted/50 rounded p-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] mr-1">Row {err.row}</Badge>
                      {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.valid.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-2 py-1.5">Name</th>
                      <th className="text-left px-2 py-1.5">Email</th>
                      <th className="text-left px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.valid.slice(0, 10).map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1">{p.firstName} {p.lastName}</td>
                        <td className="px-2 py-1 text-muted-foreground">{p.email || "—"}</td>
                        <td className="px-2 py-1">{p.status}</td>
                      </tr>
                    ))}
                    {result.valid.length > 10 && (
                      <tr><td colSpan={3} className="px-2 py-1 text-muted-foreground text-center">...and {result.valid.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleImport} disabled={!result || result.valid.length === 0}>
            Import {result?.valid.length || 0} Patients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
