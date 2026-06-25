"use client";

import { Users, UserCheck, UserX, Calendar, AlertTriangle, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { usePracticeData } from "@/lib/practice-data";

const PIE_COLORS = ["hsl(142,71%,45%)", "hsl(0,72%,51%)", "hsl(210,20%,70%)"];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const { data } = usePracticeData();
  const { dashboardStats, patients, alerts } = data;
  const monthLabels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const patientTrend = monthLabels.map((m, i) => ({
    month: m,
    patients: 6 + i + (i % 2),
  }));
  patientTrend[patientTrend.length - 1].patients = patients.length;

  const statusPie = [
    { name: "Active", value: patients.filter(p => p.status === "active").length },
    { name: "Overdue", value: patients.filter(p => p.status === "overdue").length },
    { name: "Inactive", value: patients.filter(p => p.status === "inactive").length },
  ];

  const stats = [
    { label: "Total Patients", value: dashboardStats.totalPatients, icon: Users, color: "text-primary" },
    { label: "Active", value: dashboardStats.activePatients, icon: UserCheck, color: "text-success" },
    { label: "Overdue", value: dashboardStats.overduePatients, icon: UserX, color: "text-destructive" },
    { label: "This Week", value: dashboardStats.appointmentsThisWeek, icon: Calendar, color: "text-info" },
    { label: "Missed (Month)", value: dashboardStats.missedAppointmentsMonth, icon: AlertTriangle, color: "text-warning" },
    { label: "Retention", value: `${dashboardStats.retentionRate}%`, icon: TrendingUp, color: "text-primary" },
    { label: "Avg Visits", value: dashboardStats.avgVisitsPerPatient, icon: Activity, color: "text-info" },
  ];
  const recentPatients = [...patients].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit)).slice(0, 5);
  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subtitle">Overview of your practice performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Mini Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Patient Growth</CardTitle>
              <Link href="/analytics" className="text-xs text-primary hover:underline">View details</Link>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={patientTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="patients" stroke="hsl(174,62%,40%)" fill="hsl(174,62%,40%)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
              <Link href="/analytics" className="text-xs text-primary hover:underline">View details</Link>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPatients.map((p) => (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">{p.firstName[0]}{p.lastName[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-muted-foreground">Last visit: {formatDate(p.lastVisit)}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={statusColors[p.status]}>{p.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Alerts</CardTitle>
              <Link href="/alerts" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active alerts</p>
            ) : (
              unreadAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
