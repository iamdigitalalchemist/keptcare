"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type {
  Alert,
  Appointment,
  AutomationRule,
  Campaign,
  CommunicationLog,
  LoyaltyMember,
  LoyaltyReward,
  MessageTemplate,
  Patient,
  PatientSegment,
  ReferralRecord,
} from "@/lib/types";

type PracticeData = {
  patients: Patient[];
  appointments: Appointment[];
  communicationLogs: CommunicationLog[];
  automationRules: AutomationRule[];
  messageTemplates: MessageTemplate[];
  campaigns: Campaign[];
  alerts: Alert[];
  loyaltyMembers: LoyaltyMember[];
  rewardsCatalog: LoyaltyReward[];
  referralRecords: ReferralRecord[];
  patientSegments: PatientSegment[];
  dashboardStats: {
    totalPatients: number;
    activePatients: number;
    overduePatients: number;
    appointmentsThisWeek: number;
    missedAppointmentsMonth: number;
    revenueThisMonth: number;
    retentionRate: number;
    avgVisitsPerPatient: number;
  };
  loyaltyStats: {
    totalMembers: number;
    totalPointsIssued: number;
    totalRewardsClaimed: number;
    activeStreaks: number;
    avgPoints: number;
    referralConversionRate: number;
  };
};

const emptyData: PracticeData = {
  patients: [],
  appointments: [],
  communicationLogs: [],
  automationRules: [],
  messageTemplates: [],
  campaigns: [],
  alerts: [],
  loyaltyMembers: [],
  rewardsCatalog: [],
  referralRecords: [],
  patientSegments: [],
  dashboardStats: {
    totalPatients: 0,
    activePatients: 0,
    overduePatients: 0,
    appointmentsThisWeek: 0,
    missedAppointmentsMonth: 0,
    revenueThisMonth: 0,
    retentionRate: 0,
    avgVisitsPerPatient: 0,
  },
  loyaltyStats: {
    totalMembers: 0,
    totalPointsIssued: 0,
    totalRewardsClaimed: 0,
    activeStreaks: 0,
    avgPoints: 0,
    referralConversionRate: 0,
  },
};

function requireOrganisation(organisationId?: string | null, userId?: string | null) {
  if (!organisationId || !userId) {
    throw new Error("No active organisation membership found.");
  }

  return { organisationId, userId };
}

function mapPatient(row: any): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    gender: row.gender ?? "other",
    lastVisit: row.last_visit ?? "",
    nextAppointment: row.next_appointment,
    visitCount: row.visit_count ?? 0,
    status: row.status ?? "active",
    tags: row.tags ?? [],
    consentSms: Boolean(row.consent_sms),
    consentEmail: Boolean(row.consent_email),
    consentWhatsapp: Boolean(row.consent_whatsapp),
    notes: row.notes ?? "",
    revenue: Number(row.revenue ?? 0),
  };
}

function mapAppointment(row: any): Appointment {
  const notes = row.notes ?? "";
  const doctorMatch = notes.match(/^Doctor: ([^.]+)\.\s?(.*)$/);

  return {
    id: row.id,
    patientId: row.patient_id,
    date: row.appointment_date,
    time: row.appointment_time ?? "",
    type: row.type,
    doctor: doctorMatch?.[1] ?? "Practice team",
    status: row.status === "scheduled" ? "upcoming" : row.status,
    notes: doctorMatch?.[2] ?? notes,
  };
}

function mapCommunicationLog(row: any): CommunicationLog {
  return {
    id: row.id,
    patientId: row.patient_id,
    date: row.sent_at,
    channel: row.channel,
    subject: row.subject,
    status: row.status,
  };
}

function mapMessageTemplate(row: any): MessageTemplate {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    subject: row.subject ?? undefined,
    body: row.body,
    variables: row.variables ?? [],
  };
}

function mapAutomationRule(row: any): AutomationRule {
  return {
    id: row.id,
    name: row.name,
    trigger: {
      type: row.trigger_type,
      value: row.trigger_value,
      unit: row.trigger_unit,
    },
    action: {
      type: row.action_type,
      templateId: row.template_id ?? "",
    },
    active: row.active,
    patientsAffected: row.patients_affected,
    lastTriggered: row.last_triggered,
  };
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    channel: row.channel,
    templateId: row.template_id ?? "",
    segment: row.segment,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    openRate: Number(row.open_rate ?? 0),
    scheduledDate: row.scheduled_date,
    sentDate: row.sent_date,
  };
}

function mapAlert(row: any): Alert {
  return {
    id: row.id,
    type: row.type,
    patientId: row.patient_id ?? "",
    patientName: row.patient_name,
    message: row.message,
    date: row.alert_date,
    read: row.read,
  };
}

function mapReward(row: any): LoyaltyReward {
  return {
    id: row.id,
    name: row.name,
    pointsCost: row.points_cost,
    description: row.description,
    category: row.category,
    claimed: Boolean(row.claimed),
    claimedAt: row.claimed_at ?? undefined,
  };
}

function mapLoyaltyMember(row: any): LoyaltyMember {
  const patientName = row.patients
    ? `${row.patients.first_name} ${row.patients.last_name}`
    : "Unknown Patient";
  const rewards = (row.loyalty_member_rewards ?? []).map((memberReward: any) => ({
    ...mapReward(memberReward.loyalty_rewards),
    claimed: memberReward.claimed,
    claimedAt: memberReward.claimed_at ?? undefined,
  }));

  return {
    id: row.id,
    patientId: row.patient_id,
    patientName,
    points: row.points,
    lifetimePoints: row.lifetime_points,
    tier: row.tier,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    referralCount: row.referral_count,
    referralPoints: row.referral_points,
    lastPointsEarned: row.last_points_earned ?? "",
    joinedAt: row.joined_at,
    rewards,
  };
}

function mapReferralRecord(row: any): ReferralRecord {
  return {
    id: row.id,
    referrerId: row.referrer_id ?? "",
    referrerName: row.referrer_name,
    referredName: row.referred_name,
    referredEmail: row.referred_email,
    status: row.status,
    pointsAwarded: row.points_awarded,
    createdAt: row.created_at,
  };
}

function mapPatientSegment(row: any): PatientSegment {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    groups: Array.isArray(row.groups) ? row.groups : [],
    groupLogic: row.group_logic,
    patientCount: row.patient_count,
    lastUpdated: row.last_updated ?? "",
    isSystem: row.is_system,
  };
}

function getThisWeekCount(appointments: Appointment[]) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return appointments.filter((appointment) => {
    const date = new Date(appointment.date);
    return date >= start && date < end;
  }).length;
}

function getThisMonthMissedCount(appointments: Appointment[]) {
  const now = new Date();
  return appointments.filter((appointment) => {
    const date = new Date(appointment.date);
    return appointment.status === "missed" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
}

function buildStats(data: Omit<PracticeData, "dashboardStats" | "loyaltyStats">) {
  const totalVisits = data.patients.reduce((sum, patient) => sum + patient.visitCount, 0);
  const totalReferrals = data.referralRecords.length;
  const convertedReferrals = data.referralRecords.filter((record) => record.status === "registered" || record.status === "first_visit").length;
  const totalPoints = data.loyaltyMembers.reduce((sum, member) => sum + member.lifetimePoints, 0);
  const claimedRewards = data.loyaltyMembers.reduce((sum, member) => sum + member.rewards.filter((reward) => reward.claimed).length, 0);

  return {
    dashboardStats: {
      totalPatients: data.patients.length,
      activePatients: data.patients.filter((patient) => patient.status === "active").length,
      overduePatients: data.patients.filter((patient) => patient.status === "overdue").length,
      appointmentsThisWeek: getThisWeekCount(data.appointments),
      missedAppointmentsMonth: getThisMonthMissedCount(data.appointments),
      revenueThisMonth: data.patients.reduce((sum, patient) => sum + patient.revenue, 0),
      retentionRate: data.patients.length ? Math.round((data.patients.filter((patient) => patient.status === "active").length / data.patients.length) * 100) : 0,
      avgVisitsPerPatient: data.patients.length ? Number((totalVisits / data.patients.length).toFixed(1)) : 0,
    },
    loyaltyStats: {
      totalMembers: data.loyaltyMembers.length,
      totalPointsIssued: totalPoints,
      totalRewardsClaimed: claimedRewards,
      activeStreaks: data.loyaltyMembers.filter((member) => member.currentStreak > 0).length,
      avgPoints: data.loyaltyMembers.length ? Math.round(data.loyaltyMembers.reduce((sum, member) => sum + member.points, 0) / data.loyaltyMembers.length) : 0,
      referralConversionRate: totalReferrals ? Math.round((convertedReferrals / totalReferrals) * 100) : 0,
    },
  };
}

async function fetchPracticeData(organisationId: string): Promise<PracticeData> {
  const [
    patientsResult,
    appointmentsResult,
    communicationLogsResult,
    automationRulesResult,
    messageTemplatesResult,
    campaignsResult,
    alertsResult,
    rewardsResult,
    loyaltyMembersResult,
    referralRecordsResult,
    patientSegmentsResult,
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("organisation_id", organisationId).order("last_visit", { ascending: false }),
    supabase.from("appointments").select("*").eq("organisation_id", organisationId).order("appointment_date", { ascending: false }),
    supabase.from("communication_logs").select("*").eq("organisation_id", organisationId).order("sent_at", { ascending: false }),
    supabase.from("automation_rules").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false }),
    supabase.from("message_templates").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false }),
    supabase.from("campaigns").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false }),
    supabase.from("alerts").select("*").eq("organisation_id", organisationId).order("alert_date", { ascending: false }),
    supabase.from("loyalty_rewards").select("*").eq("organisation_id", organisationId).order("points_cost", { ascending: true }),
    supabase
      .from("loyalty_members")
      .select("*, patients(first_name,last_name), loyalty_member_rewards(*, loyalty_rewards(*))")
      .eq("organisation_id", organisationId)
      .order("points", { ascending: false }),
    supabase.from("referral_records").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false }),
    supabase.from("patient_segments").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: true }),
  ]);

  const results = [
    patientsResult,
    appointmentsResult,
    communicationLogsResult,
    automationRulesResult,
    messageTemplatesResult,
    campaignsResult,
    alertsResult,
    rewardsResult,
    loyaltyMembersResult,
    referralRecordsResult,
    patientSegmentsResult,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const baseData = {
    patients: (patientsResult.data ?? []).map(mapPatient),
    appointments: (appointmentsResult.data ?? []).map(mapAppointment),
    communicationLogs: (communicationLogsResult.data ?? []).map(mapCommunicationLog),
    automationRules: (automationRulesResult.data ?? []).map(mapAutomationRule),
    messageTemplates: (messageTemplatesResult.data ?? []).map(mapMessageTemplate),
    campaigns: (campaignsResult.data ?? []).map(mapCampaign),
    alerts: (alertsResult.data ?? []).map(mapAlert),
    loyaltyMembers: (loyaltyMembersResult.data ?? []).map(mapLoyaltyMember),
    rewardsCatalog: (rewardsResult.data ?? []).map(mapReward),
    referralRecords: (referralRecordsResult.data ?? []).map(mapReferralRecord),
    patientSegments: (patientSegmentsResult.data ?? []).map(mapPatientSegment),
  };

  return {
    ...baseData,
    ...buildStats(baseData),
  };
}

export function usePracticeData() {
  const { organisation, membership, loading } = useSubscription();
  const query = useQuery({
    queryKey: ["practice-data", organisation?.id],
    queryFn: () => fetchPracticeData(organisation!.id),
    enabled: Boolean(organisation?.id) && !loading,
  });

  return {
    ...query,
    data: query.data ?? emptyData,
    organisationId: organisation?.id ?? null,
    userId: membership?.user_id ?? null,
  };
}

export function usePracticeMutations() {
  const { organisation, membership } = useSubscription();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["practice-data", organisation?.id] });

  const addPatients = useMutation({
    mutationFn: async (patients: Patient[]) => {
      const { organisationId, userId } = requireOrganisation(organisation?.id, membership?.user_id);
      const rows = patients.map((patient) => ({
        organisation_id: organisationId,
        user_id: userId,
        first_name: patient.firstName,
        last_name: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.dateOfBirth || null,
        gender: patient.gender,
        last_visit: patient.lastVisit || new Date().toISOString().split("T")[0],
        next_appointment: patient.nextAppointment,
        visit_count: patient.visitCount,
        status: patient.status,
        tags: patient.tags,
        consent_sms: patient.consentSms,
        consent_email: patient.consentEmail,
        consent_whatsapp: patient.consentWhatsapp,
        notes: patient.notes,
        revenue: patient.revenue,
      }));
      const { error } = await supabase.from("patients").insert(rows);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updatePatient = useMutation({
    mutationFn: async (patient: Patient) => {
      const { error } = await supabase.from("patients").update({
        first_name: patient.firstName,
        last_name: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.dateOfBirth || null,
        gender: patient.gender,
        last_visit: patient.lastVisit || null,
        next_appointment: patient.nextAppointment,
        visit_count: patient.visitCount,
        status: patient.status,
        tags: patient.tags,
        consent_sms: patient.consentSms,
        consent_email: patient.consentEmail,
        consent_whatsapp: patient.consentWhatsapp,
        notes: patient.notes,
        revenue: patient.revenue,
      }).eq("id", patient.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addMessageTemplate = useMutation({
    mutationFn: async (template: MessageTemplate) => {
      const { organisationId } = requireOrganisation(organisation?.id, membership?.user_id);
      const { error } = await supabase.from("message_templates").insert({
        organisation_id: organisationId,
        name: template.name,
        channel: template.channel,
        subject: template.subject ?? null,
        body: template.body,
        variables: template.variables,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMessageTemplate = useMutation({
    mutationFn: async (template: MessageTemplate) => {
      const { error } = await supabase.from("message_templates").update({
        name: template.name,
        channel: template.channel,
        subject: template.subject ?? null,
        body: template.body,
        variables: template.variables,
      }).eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMessageTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addCampaign = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const { organisationId } = requireOrganisation(organisation?.id, membership?.user_id);
      const { error } = await supabase.from("campaigns").insert({
        organisation_id: organisationId,
        name: campaign.name,
        status: campaign.status,
        channel: campaign.channel,
        template_id: campaign.templateId || null,
        segment: campaign.segment,
        recipient_count: campaign.recipientCount,
        sent_count: campaign.sentCount,
        open_rate: campaign.openRate,
        scheduled_date: campaign.scheduledDate,
        sent_date: campaign.sentDate,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addAppointment = useMutation({
    mutationFn: async (appointment: { patientId: string; date: string; time: string; type: string; notes: string }) => {
      const { organisationId, userId } = requireOrganisation(organisation?.id, membership?.user_id);
      const { error } = await supabase.from("appointments").insert({
        organisation_id: organisationId,
        user_id: userId,
        patient_id: appointment.patientId,
        appointment_date: appointment.date,
        appointment_time: appointment.time || null,
        type: appointment.type,
        status: "scheduled",
        notes: appointment.notes,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "scheduled" | "completed" | "missed" | "cancelled" }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateAppointment = useMutation({
    mutationFn: async (appointment: { id: string; patientId: string; date: string; time: string; type: string; status: "scheduled" | "completed" | "missed" | "cancelled"; notes: string }) => {
      const { error } = await supabase.from("appointments").update({
        patient_id: appointment.patientId,
        appointment_date: appointment.date,
        appointment_time: appointment.time || null,
        type: appointment.type,
        status: appointment.status,
        notes: appointment.notes,
      }).eq("id", appointment.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addAutomationRule = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const { organisationId } = requireOrganisation(organisation?.id, membership?.user_id);
      const { error } = await supabase.from("automation_rules").insert({
        organisation_id: organisationId,
        name: rule.name,
        trigger_type: rule.trigger.type,
        trigger_value: rule.trigger.value,
        trigger_unit: rule.trigger.unit,
        action_type: rule.action.type,
        template_id: rule.action.templateId || null,
        active: rule.active,
        patients_affected: rule.patientsAffected,
        last_triggered: rule.lastTriggered,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addPatientSegment = useMutation({
    mutationFn: async (segment: PatientSegment) => {
      const { organisationId } = requireOrganisation(organisation?.id, membership?.user_id);
      const { error } = await supabase.from("patient_segments").insert({
        organisation_id: organisationId,
        name: segment.name,
        description: segment.description,
        type: segment.type,
        groups: segment.groups as unknown as Json,
        group_logic: segment.groupLogic,
        patient_count: segment.patientCount,
        last_updated: segment.lastUpdated || new Date().toISOString().split("T")[0],
        is_system: segment.isSystem,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updatePatientSegment = useMutation({
    mutationFn: async (segment: PatientSegment) => {
      const { error } = await supabase.from("patient_segments").update({
        name: segment.name,
        description: segment.description,
        type: segment.type,
        groups: segment.groups as unknown as Json,
        group_logic: segment.groupLogic,
        patient_count: segment.patientCount,
        last_updated: new Date().toISOString().split("T")[0],
        is_system: segment.isSystem,
      }).eq("id", segment.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deletePatientSegment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_segments").delete().eq("id", id).eq("is_system", false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleAutomationRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAlertRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllAlertsRead = useMutation({
    mutationFn: async () => {
      const { organisationId } = requireOrganisation(organisation?.id, membership?.user_id);
      const { error } = await supabase.from("alerts").update({ read: true }).eq("organisation_id", organisationId).eq("read", false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    addPatients,
    updatePatient,
    deletePatient,
    addMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate,
    addCampaign,
    addAppointment,
    updateAppointmentStatus,
    updateAppointment,
    deleteAppointment,
    addAutomationRule,
    addPatientSegment,
    updatePatientSegment,
    deletePatientSegment,
    toggleAutomationRule,
    markAlertRead,
    markAllAlertsRead,
  };
}
