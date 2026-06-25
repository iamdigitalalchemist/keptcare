export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  lastVisit: string;
  nextAppointment: string | null;
  visitCount: number;
  status: 'active' | 'inactive' | 'overdue';
  tags: string[];
  consentSms: boolean;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  notes: string;
  revenue: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time?: string;
  type: string;
  doctor: string;
  status: 'completed' | 'missed' | 'cancelled' | 'upcoming';
  notes: string;
}

export interface CommunicationLog {
  id: string;
  patientId: string;
  date: string;
  channel: 'sms' | 'email' | 'whatsapp';
  subject: string;
  status: 'sent' | 'delivered' | 'failed' | 'opened';
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: 'no_visit' | 'missed_appointment' | 'follow_up_due' | 'checkup_due';
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };
  action: {
    type: 'sms' | 'email' | 'whatsapp';
    templateId: string;
  };
  active: boolean;
  patientsAffected: number;
  lastTriggered: string | null;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: 'sms' | 'email' | 'whatsapp';
  subject?: string;
  body: string;
  variables: string[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sent' | 'active';
  channel: 'sms' | 'email' | 'whatsapp';
  templateId: string;
  segment: string;
  recipientCount: number;
  sentCount: number;
  openRate: number;
  scheduledDate: string | null;
  sentDate: string | null;
}

export interface Alert {
  id: string;
  type: 'missed_appointment' | 'overdue_visit' | 'high_value' | 'follow_up';
  patientId: string;
  patientName: string;
  message: string;
  date: string;
  read: boolean;
}

export type PlanTier = 'starter' | 'growth' | 'pro';

// Loyalty Program types
export interface LoyaltyMember {
  id: string;
  patientId: string;
  patientName: string;
  points: number;
  lifetimePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  currentStreak: number;
  longestStreak: number;
  referralCount: number;
  referralPoints: number;
  lastPointsEarned: string;
  joinedAt: string;
  rewards: LoyaltyReward[];
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  category: 'discount' | 'free_service' | 'gift' | 'priority';
  claimed: boolean;
  claimedAt?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerName: string;
  referredName: string;
  referredEmail: string;
  status: 'pending' | 'registered' | 'first_visit' | 'expired';
  pointsAwarded: number;
  createdAt: string;
}

// Segmentation types
export type SegmentOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'between' | 'in';
export type SegmentLogic = 'AND' | 'OR';

export interface SegmentCondition {
  id: string;
  field: string;
  operator: SegmentOperator;
  value: string | number | string[];
}

export interface SegmentGroup {
  id: string;
  logic: SegmentLogic;
  conditions: SegmentCondition[];
}

export interface PatientSegment {
  id: string;
  name: string;
  description: string;
  type: 'demographic' | 'behavioral' | 'revenue' | 'custom';
  groups: SegmentGroup[];
  groupLogic: SegmentLogic;
  patientCount: number;
  lastUpdated: string;
  isSystem: boolean;
}
