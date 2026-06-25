"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Calendar, MessageSquare, CheckCircle, XCircle, Clock, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, formatNumber } from "@/lib/utils";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground",
};

const apptStatusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4 text-success" />,
  missed: <XCircle className="h-4 w-4 text-destructive" />,
  cancelled: <XCircle className="h-4 w-4 text-muted-foreground" />,
  upcoming: <Clock className="h-4 w-4 text-info" />,
};

const channelColors: Record<string, string> = {
  sms: "bg-info/10 text-info",
  email: "bg-primary/10 text-primary",
  whatsapp: "bg-success/10 text-success",
};

export default function PatientDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { data, isLoading } = usePracticeData();
  const { updatePatient, deletePatient } = usePracticeMutations();
  const [editOpen, setEditOpen] = useState(false);
  const { patients, appointments, communicationLogs } = data;
  const patient = patients.find((p) => p.id === id);

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">Loading patient...</div>;
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Patient not found</p>
        <Link href="/patients" className="text-primary hover:underline text-sm mt-2 inline-block">Back to patients</Link>
      </div>
    );
  }

  const patientAppointments = appointments.filter((a) => a.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const patientComms = communicationLogs.filter((c) => c.patientId === id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to patients
      </Link>
      <AddPatientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        mode="edit"
        onAdd={(updatedPatient) => updatePatient.mutate(updatedPatient)}
      />

      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-primary">{patient.firstName[0]}{patient.lastName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-semibold">{patient.firstName} {patient.lastName}</h1>
                      <Badge variant="secondary" className={statusColors[patient.status]}>{patient.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{patient.email}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{patient.phone}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />DOB: {formatDate(patient.dateOfBirth)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete patient?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {patient.firstName} {patient.lastName} and their related patient records. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              deletePatient.mutate(patient.id, {
                                onSuccess: () => {
                                  toast.success("Patient deleted.");
                                  router.push("/patients");
                                },
                                onError: (error) => toast.error(error.message),
                              });
                            }}
                          >
                            Delete Patient
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {patient.notes && <p className="mt-3 text-sm bg-muted/50 rounded-lg px-3 py-2">{patient.notes}</p>}
                <div className="flex gap-1.5 mt-3">
                  {patient.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:w-48">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{patient.visitCount}</p>
            <p className="text-xs text-muted-foreground">Total Visits</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">£{formatNumber(patient.revenue)}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">Communication Consent</p>
          <div className="flex gap-3">
            <Badge variant={patient.consentSms ? "default" : "outline"} className={patient.consentSms ? "" : "opacity-40"}>SMS {patient.consentSms ? "✓" : "✗"}</Badge>
            <Badge variant={patient.consentEmail ? "default" : "outline"} className={patient.consentEmail ? "" : "opacity-40"}>Email {patient.consentEmail ? "✓" : "✗"}</Badge>
            <Badge variant={patient.consentWhatsapp ? "default" : "outline"} className={patient.consentWhatsapp ? "" : "opacity-40"}>WhatsApp {patient.consentWhatsapp ? "✓" : "✗"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Appointments ({patientAppointments.length})</TabsTrigger>
          <TabsTrigger value="communications">Communications ({patientComms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4 space-y-2">
          {patientAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No appointments recorded</p>
          ) : (
            patientAppointments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                {apptStatusIcon[a.status]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{a.type}</span>
                    <span className="text-xs text-muted-foreground">• {a.doctor}</span>
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(a.date)}</span>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="communications" className="mt-4 space-y-2">
          {patientComms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No communications recorded</p>
          ) : (
            patientComms.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.subject}</span>
                    <Badge variant="secondary" className={`text-[10px] ${channelColors[c.channel]}`}>{c.channel.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Status: {c.status}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(c.date)}</span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
