"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { formatDate } from "@/lib/utils";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground",
};

type StatusFilter = 'all' | 'active' | 'overdue' | 'inactive';

export default function Patients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const { data, isLoading } = usePracticeData();
  const { addPatients } = usePracticeMutations();
  const patientsList = data.patients;

  const filtered = patientsList.filter((p) => {
    const matchesSearch = `${p.firstName} ${p.lastName} ${p.email} ${p.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Patients</h1>
          <p className="page-subtitle">{isLoading ? "Loading patients..." : `${patientsList.length} total patients`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4 mr-1.5" />Import CSV</Button>
          <Button onClick={() => setDialogOpen(true)}>+ Add Patient</Button>
        </div>
      </div>
      <AddPatientDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={(p) => addPatients.mutate([p])} />
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImport={(imported) => addPatients.mutate(imported)} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "overdue", "inactive"] as StatusFilter[]).map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Last Visit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Next Appt</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Visits</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Consent</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">{p.firstName[0]}{p.lastName[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(p.lastVisit)}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{p.nextAppointment ? formatDate(p.nextAppointment) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell">{p.visitCount}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className={statusColors[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1">
                      {p.consentSms && <Badge variant="outline" className="text-[10px] px-1.5">SMS</Badge>}
                      {p.consentEmail && <Badge variant="outline" className="text-[10px] px-1.5">Email</Badge>}
                      {p.consentWhatsapp && <Badge variant="outline" className="text-[10px] px-1.5">WA</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/patients/${p.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No patients found</div>
        )}
      </div>
    </div>
  );
}
