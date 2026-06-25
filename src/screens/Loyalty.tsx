"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Star, Trophy, Flame, Gift, Users, TrendingUp, Award, ArrowUpRight, UserPlus, Clock, CheckCircle, XCircle,
} from "lucide-react";
import { formatDate, formatNumber } from "@/lib/utils";
import { usePracticeData } from "@/lib/practice-data";

const tierColors: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  silver: "bg-muted text-muted-foreground",
  gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  platinum: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const tierThresholds = { bronze: 0, silver: 500, gold: 1000, platinum: 2000 };

const referralStatusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "bg-muted text-muted-foreground" },
  registered: { icon: <UserPlus className="h-3.5 w-3.5" />, color: "bg-info/10 text-info" },
  first_visit: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-success/10 text-success" },
  expired: { icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-destructive/10 text-destructive" },
};

export default function Loyalty() {
  const [tab, setTab] = useState("members");
  const { data } = usePracticeData();
  const { loyaltyMembers, referralRecords, rewardsCatalog, loyaltyStats } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Loyalty Program</h1>
          <p className="page-subtitle">Reward patients for visits, streaks &amp; referrals</p>
        </div>
        <Button><UserPlus className="h-4 w-4 mr-1.5" /> Enroll Patient</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Members", value: loyaltyStats.totalMembers, icon: Users, color: "text-primary" },
          { label: "Points Issued", value: formatNumber(loyaltyStats.totalPointsIssued), icon: Star, color: "text-warning" },
          { label: "Active Streaks", value: loyaltyStats.activeStreaks, icon: Flame, color: "text-destructive" },
          { label: "Referral Rate", value: `${loyaltyStats.referralConversionRate}%`, icon: TrendingUp, color: "text-success" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="rewards">Rewards Catalog</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-3 mt-4">
          {loyaltyMembers.map((m) => {
            const nextTier = m.tier === "platinum" ? null : Object.entries(tierThresholds).find(([, v]) => v > (tierThresholds[m.tier as keyof typeof tierThresholds] ?? 0));
            const progress = nextTier ? Math.min(100, (m.lifetimePoints / nextTier[1]) * 100) : 100;

            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{m.patientName}</h3>
                          <Badge className={`text-[10px] uppercase tracking-wider ${tierColors[m.tier]}`}>{m.tier}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" /> {m.points} pts</span>
                          <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-destructive" /> {m.currentStreak} visit streak</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.referralCount} referrals</span>
                          <span className="flex items-center gap-1"><Gift className="h-3 w-3" /> {m.rewards.filter(r => r.claimed).length} rewards claimed</span>
                        </div>
                        {nextTier && (
                          <div className="mt-3 max-w-xs">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Progress to {nextTier[0]}</span>
                              <span>{m.lifetimePoints}/{nextTier[1]}</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm"><ArrowUpRight className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-3 mt-4">
          {referralRecords.map((r) => {
            const st = referralStatusConfig[r.status];
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{r.referrerName} → {r.referredName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.referredEmail}</p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          {r.pointsAwarded > 0 && <span>+{r.pointsAwarded} pts awarded</span>}
                          <span>{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`gap-1 ${st.color}`}>
                      {st.icon} {r.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Rewards Catalog Tab */}
        <TabsContent value="rewards" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewardsCatalog.map((rw) => (
              <Card key={rw.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                      <Award className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{rw.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{rw.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Star className="h-3 w-3 text-warning" /> {rw.pointsCost} pts
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{rw.category.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
