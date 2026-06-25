"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";
import { usePracticeData } from "@/lib/practice-data";

const COLORS = [
  "hsl(174, 62%, 40%)", // primary
  "hsl(174, 62%, 55%)",
  "hsl(210, 20%, 70%)",
  "hsl(0, 72%, 51%)",   // destructive
];

const STATUS_COLORS = [
  "hsl(142, 71%, 45%)", // green for active/completed
  "hsl(0, 72%, 51%)",   // red for overdue/missed
  "hsl(210, 20%, 70%)", // muted for inactive/upcoming
];

export default function Analytics() {
  const { data } = usePracticeData();
  const { patients, appointments, communicationLogs, loyaltyMembers, campaigns } = data;
  const monthLabels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const patientGrowth = monthLabels.map((m, i) => ({
    month: m,
    total: 6 + i + (i % 2),
    newPatients: 1 + (i % 3),
  }));
  patientGrowth[patientGrowth.length - 1].total = patients.length;

  const statusData = [
    { name: "Active", value: patients.filter(p => p.status === "active").length },
    { name: "Overdue", value: patients.filter(p => p.status === "overdue").length },
    { name: "Inactive", value: patients.filter(p => p.status === "inactive").length },
  ];

  const appointmentTypes = [...new Set(appointments.map((appointment) => appointment.type))];
  const appointmentsByType = appointmentTypes.map(type => ({
    type,
    count: appointments.filter(a => a.type === type).length,
  })).filter(a => a.count > 0);

  const appointmentsByStatus = [
    { name: "Completed", value: appointments.filter(a => a.status === "completed").length },
    { name: "Missed", value: appointments.filter(a => a.status === "missed").length },
    { name: "Upcoming", value: appointments.filter(a => a.status === "upcoming").length },
  ];

  const channelPerf = ["sms", "email", "whatsapp"].map(ch => {
    const logs = communicationLogs.filter(c => c.channel === ch);
    return {
      channel: ch.toUpperCase(),
      sent: logs.length,
      delivered: logs.filter(c => c.status === "delivered").length,
      opened: logs.filter(c => c.status === "opened").length,
    };
  });

  const retentionData = monthLabels.map((m, i) => ({
    month: m,
    rate: 68 + i * 2 + ((i * 3) % 5),
  }));

  const visitBuckets = [
    { range: "1-3", count: patients.filter(p => p.visitCount >= 1 && p.visitCount <= 3).length },
    { range: "4-7", count: patients.filter(p => p.visitCount >= 4 && p.visitCount <= 7).length },
    { range: "8-12", count: patients.filter(p => p.visitCount >= 8 && p.visitCount <= 12).length },
    { range: "13-20", count: patients.filter(p => p.visitCount >= 13 && p.visitCount <= 20).length },
    { range: "20+", count: patients.filter(p => p.visitCount > 20).length },
  ];

  const tierData = ["bronze", "silver", "gold", "platinum"].map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: loyaltyMembers.filter(m => m.tier === t).length,
  })).filter(t => t.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Analytics</h1>
        <p className="page-subtitle">Detailed insights into your practice performance</p>
      </div>

      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patients">Patient Insights</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
        </TabsList>

        {/* PATIENT INSIGHTS TAB */}
        <TabsContent value="patients" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Patient Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="hsl(174,62%,40%)" fill="hsl(174,62%,40%)" fillOpacity={0.15} name="Total Patients" />
                    <Area type="monotone" dataKey="newPatients" stroke="hsl(174,62%,55%)" fill="hsl(174,62%,55%)" fillOpacity={0.1} name="New Patients" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Retention Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis domain={[50, 100]} className="text-xs" unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(174,62%,40%)" strokeWidth={2} dot={{ fill: "hsl(174,62%,40%)" }} name="Retention %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Visit Frequency Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={visitBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" className="text-xs" label={{ value: "Visits", position: "insideBottom", offset: -5 }} />
                    <YAxis className="text-xs" label={{ value: "Patients", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(174,62%,40%)" radius={[4, 4, 0, 0]} name="Patients" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* APPOINTMENTS TAB */}
        <TabsContent value="appointments" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Appointments by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={appointmentsByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="type" type="category" width={120} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(174,62%,40%)" radius={[0, 4, 4, 0]} name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Appointment Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={appointmentsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {appointmentsByStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ENGAGEMENT TAB */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={channelPerf}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="channel" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="hsl(210,20%,70%)" name="Sent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" fill="hsl(174,62%,55%)" name="Delivered" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="opened" fill="hsl(174,62%,40%)" name="Opened" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {campaigns.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.channel.toUpperCase()} · {c.recipientCount} recipients</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{c.openRate}%</p>
                      <p className="text-xs text-muted-foreground">open rate</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LOYALTY TAB */}
        <TabsContent value="loyalty" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Loyalty Tier Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {tierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Loyalty Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {[...loyaltyMembers].sort((a, b) => b.points - a.points).slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{m.patientName.split(" ").map(n => n[0]).join("")}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.patientName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.tier} · {m.currentStreak} streak</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{formatNumber(m.points)} pts</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
