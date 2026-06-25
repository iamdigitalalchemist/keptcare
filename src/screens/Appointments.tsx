"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar, CalendarCheck, CalendarX, Clock, Plus, Filter, Pencil, Trash2, ChevronsUpDown, Check, Search, ArrowUp, ArrowDown } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { usePracticeData, usePracticeMutations } from "@/lib/practice-data";
import { cn } from "@/lib/utils";
import type { Patient } from "@/lib/types";

type AppointmentStatus = "scheduled" | "completed" | "missed" | "cancelled";
type SortField = "patient" | "date" | "time" | "type" | "status";
type SortDirection = "asc" | "desc";

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  type: string;
  status: AppointmentStatus;
  notes: string;
  searchText: string;
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  missed: { label: "Missed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const APPOINTMENT_TYPES = ["Check-up", "Cleaning", "Consultation", "Follow-up", "Treatment", "Emergency", "Other"];

const emptyAppointmentForm = { patientId: "", date: "", time: "", type: "Check-up", status: "scheduled" as AppointmentStatus, notes: "" };

function fuzzyMatch(value: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = value.toLowerCase();
  if (haystack.includes(needle)) return true;

  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) index += 1;
    if (index === needle.length) return true;
  }

  return false;
}

function compareStrings(left: string, right: string, direction: SortDirection) {
  const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function PatientCombobox({
  patients,
  value,
  onValueChange,
}: {
  patients: Patient[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedPatient = patients.find((patient) => patient.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Search patient..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Type a name, email, or phone..." />
          <CommandList>
            <CommandEmpty>No patient found.</CommandEmpty>
            <CommandGroup>
              {patients.map((patient) => {
                const label = `${patient.firstName} ${patient.lastName}`;
                const searchValue = `${label} ${patient.email} ${patient.phone}`;

                return (
                  <CommandItem
                    key={patient.id}
                    value={searchValue}
                    onSelect={() => {
                      onValueChange(patient.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === patient.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <p className="truncate">{label}</p>
                      <p className="truncate text-xs text-muted-foreground">{patient.email || patient.phone || "No contact details"}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AppointmentsPage() {
  const [filter, setFilter] = useState<AppointmentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAppt, setNewAppt] = useState(emptyAppointmentForm);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editAppt, setEditAppt] = useState({ id: "", ...emptyAppointmentForm });
  const { data } = usePracticeData();
  const { addAppointment: addAppointmentMutation, updateAppointmentStatus, updateAppointment, deleteAppointment } = usePracticeMutations();
  const appointments: Appointment[] = data.appointments.map((appointment) => {
    const patient = data.patients.find((p) => p.id === appointment.patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient";
    return {
      id: appointment.id,
      patientName,
      patientId: appointment.patientId,
      date: appointment.date,
      time: appointment.time ?? "",
      type: appointment.type,
      status: appointment.status === "upcoming" ? "scheduled" : appointment.status,
      notes: appointment.notes,
      searchText: [
        patientName,
        patient?.email,
        patient?.phone,
        appointment.date,
        appointment.time,
        appointment.type,
        appointment.status,
        appointment.notes,
      ].filter(Boolean).join(" "),
    };
  });

  const filtered = appointments.filter((appointment) => {
    const matchesStatus = filter === "all" || appointment.status === filter;
    const matchesSearch = fuzzyMatch(appointment.searchText, search);
    return matchesStatus && matchesSearch;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "date") return compareStrings(`${a.date} ${a.time}`, `${b.date} ${b.time}`, sortDirection);
    if (sortField === "patient") return compareStrings(a.patientName, b.patientName, sortDirection);
    return compareStrings(String(a[sortField]), String(b[sortField]), sortDirection);
  });

  const todayCount = appointments.filter((a) => a.date === format(new Date(), "yyyy-MM-dd")).length;
  const scheduledCount = appointments.filter((a) => a.status === "scheduled").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const missedCount = appointments.filter((a) => a.status === "missed").length;

  const updateStatus = (id: string, status: AppointmentStatus) => {
    updateAppointmentStatus.mutate({ id, status });
    toast.success(`Appointment marked as ${status}`);
  };

  const addAppointment = () => {
    if (!newAppt.patientId || !newAppt.date || !newAppt.time) {
      toast.error("Please select a patient, date, and time");
      return;
    }
    addAppointmentMutation.mutate(newAppt);
    setNewAppt(emptyAppointmentForm);
    setDialogOpen(false);
    toast.success("Appointment added");
  };

  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditAppt({
      id: appointment.id,
      patientId: appointment.patientId,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type,
      status: appointment.status,
      notes: appointment.notes,
    });
  };

  const saveAppointment = () => {
    if (!editAppt.patientId || !editAppt.date || !editAppt.time) {
      toast.error("Please select a patient, date, and time");
      return;
    }
    updateAppointment.mutate(editAppt);
    setEditingAppointment(null);
    toast.success("Appointment updated");
  };

  const removeAppointment = () => {
    if (!editingAppointment) return;
    deleteAppointment.mutate(editingAppointment.id);
    setEditingAppointment(null);
    toast.success("Appointment deleted");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "date" ? "desc" : "asc");
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    const Icon = sortDirection === "asc" ? ArrowUp : ArrowDown;

    return (
      <Button variant="ghost" size="sm" className="h-7 px-1.5 -ml-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide" onClick={() => toggleSort(field)}>
        {children}
        {isActive && <Icon className="ml-1 h-3.5 w-3.5" />}
      </Button>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Appointments</h1>
          <p className="page-subtitle">Track and manage patient appointments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Appointment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Patient</Label>
                <PatientCombobox
                  patients={data.patients}
                  value={newAppt.patientId}
                  onValueChange={(v) => setNewAppt((p) => ({ ...p, patientId: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={newAppt.date} onChange={(e) => setNewAppt((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={newAppt.time} onChange={(e) => setNewAppt((p) => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newAppt.type} onValueChange={(v) => setNewAppt((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes..." value={newAppt.notes} onChange={(e) => setNewAppt((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={addAppointment}>Schedule Appointment</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={Boolean(editingAppointment)} onOpenChange={(open) => { if (!open) setEditingAppointment(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Patient</Label>
                <PatientCombobox
                  patients={data.patients}
                  value={editAppt.patientId}
                  onValueChange={(v) => setEditAppt((p) => ({ ...p, patientId: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={editAppt.date} onChange={(e) => setEditAppt((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={editAppt.time} onChange={(e) => setEditAppt((p) => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editAppt.type} onValueChange={(v) => setEditAppt((p) => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editAppt.status} onValueChange={(v) => setEditAppt((p) => ({ ...p, status: v as AppointmentStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes..." value={editAppt.notes} onChange={(e) => setEditAppt((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="destructive" onClick={removeAppointment}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingAppointment(null)}>Cancel</Button>
                  <Button onClick={saveAppointment}>Save Changes</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{todayCount}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <CalendarX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{missedCount}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">All Appointments</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, email, type, status..."
                  className="h-8 pl-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {sorted.length} of {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton field="patient">Patient</SortButton></TableHead>
                <TableHead><SortButton field="date">Date</SortButton></TableHead>
                <TableHead><SortButton field="time">Time</SortButton></TableHead>
                <TableHead><SortButton field="type">Type</SortButton></TableHead>
                <TableHead><SortButton field="status">Status</SortButton></TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No appointments found
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">{appt.patientName}</TableCell>
                    <TableCell>
                      <span className={isToday(parseISO(appt.date)) ? "font-semibold text-primary" : ""}>
                        {format(parseISO(appt.date), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>{appt.time}</TableCell>
                    <TableCell>{appt.type}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[appt.status].variant}>
                        {STATUS_CONFIG[appt.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                      {appt.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {appt.status === "scheduled" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEditDialog(appt)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(appt.id, "completed")}>
                            ✓ Attended
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateStatus(appt.id, "missed")}>
                            Missed
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus(appt.id, "cancelled")}>
                            Cancel
                          </Button>
                        </div>
                      )}
                      {appt.status !== "scheduled" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEditDialog(appt)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus(appt.id, "scheduled")}>
                            Reschedule
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
