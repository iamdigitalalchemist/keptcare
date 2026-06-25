export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_date: string
          created_at: string
          id: string
          message: string
          organisation_id: string
          patient_id: string | null
          patient_name: string
          read: boolean
          type: string
          updated_at: string
        }
        Insert: {
          alert_date: string
          created_at?: string
          id?: string
          message: string
          organisation_id: string
          patient_id?: string | null
          patient_name?: string
          read?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          alert_date?: string
          created_at?: string
          id?: string
          message?: string
          organisation_id?: string
          patient_id?: string | null
          patient_name?: string
          read?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          created_at: string
          id: string
          notes: string | null
          organisation_id: string
          patient_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organisation_id: string
          patient_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organisation_id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_type: string
          active: boolean
          created_at: string
          id: string
          last_triggered: string | null
          name: string
          organisation_id: string
          patients_affected: number
          template_id: string | null
          trigger_type: string
          trigger_unit: string
          trigger_value: number
          updated_at: string
        }
        Insert: {
          action_type: string
          active?: boolean
          created_at?: string
          id?: string
          last_triggered?: string | null
          name: string
          organisation_id: string
          patients_affected?: number
          template_id?: string | null
          trigger_type: string
          trigger_unit: string
          trigger_value: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          active?: boolean
          created_at?: string
          id?: string
          last_triggered?: string | null
          name?: string
          organisation_id?: string
          patients_affected?: number
          template_id?: string | null
          trigger_type?: string
          trigger_unit?: string
          trigger_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string
          id: string
          name: string
          open_rate: number
          organisation_id: string
          recipient_count: number
          scheduled_date: string | null
          segment: string
          sent_count: number
          sent_date: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          name: string
          open_rate?: number
          organisation_id: string
          recipient_count?: number
          scheduled_date?: string | null
          segment?: string
          sent_count?: number
          sent_date?: string | null
          status: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          name?: string
          open_rate?: number
          organisation_id?: string
          recipient_count?: number
          scheduled_date?: string | null
          segment?: string
          sent_count?: number
          sent_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          channel: string
          created_at: string
          id: string
          organisation_id: string
          patient_id: string
          sent_at: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          organisation_id: string
          patient_id: string
          sent_at: string
          status: string
          subject?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          organisation_id?: string
          patient_id?: string
          sent_at?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_member_rewards: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          created_at: string
          id: string
          loyalty_member_id: string
          organisation_id: string
          reward_id: string
          updated_at: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          id?: string
          loyalty_member_id: string
          organisation_id: string
          reward_id: string
          updated_at?: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          id?: string
          loyalty_member_id?: string
          organisation_id?: string
          reward_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_member_rewards_loyalty_member_id_fkey"
            columns: ["loyalty_member_id"]
            isOneToOne: false
            referencedRelation: "loyalty_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_member_rewards_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_member_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_members: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          joined_at: string
          last_points_earned: string | null
          lifetime_points: number
          longest_streak: number
          organisation_id: string
          patient_id: string
          points: number
          referral_count: number
          referral_points: number
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          joined_at: string
          last_points_earned?: string | null
          lifetime_points?: number
          longest_streak?: number
          organisation_id: string
          patient_id: string
          points?: number
          referral_count?: number
          referral_points?: number
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          joined_at?: string
          last_points_earned?: string | null
          lifetime_points?: number
          longest_streak?: number
          organisation_id?: string
          patient_id?: string
          points?: number
          referral_count?: number
          referral_points?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_members_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          organisation_id: string
          points_cost: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id?: string
          name: string
          organisation_id: string
          points_cost: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          organisation_id?: string
          points_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          name: string
          organisation_id: string
          subject: string | null
          updated_at: string
          variables: string[]
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          subject?: string | null
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          subject?: string | null
          updated_at?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organisation_id: string
          revoked_at: string | null
          role_id: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organisation_id: string
          revoked_at?: string | null
          role_id?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organisation_id?: string
          revoked_at?: string | null
          role_id?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organisation_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          organisation_id: string
          role_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organisation_id: string
          role_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organisation_id?: string
          role_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organisation_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_builtin: boolean
          key: string
          name: string
          organisation_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_builtin?: boolean
          key: string
          name: string
          organisation_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_builtin?: boolean
          key?: string
          name?: string
          organisation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_roles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string | null
          status: string
          subscription_active: boolean
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          status?: string
          subscription_active?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          status?: string
          subscription_active?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      patient_segments: {
        Row: {
          created_at: string
          description: string
          group_logic: string
          groups: Json
          id: string
          is_system: boolean
          last_updated: string | null
          name: string
          organisation_id: string
          patient_count: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          group_logic: string
          groups?: Json
          id?: string
          is_system?: boolean
          last_updated?: string | null
          name: string
          organisation_id: string
          patient_count?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          group_logic?: string
          groups?: Json
          id?: string
          is_system?: boolean
          last_updated?: string | null
          name?: string
          organisation_id?: string
          patient_count?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_segments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          consent_email: boolean | null
          consent_sms: boolean | null
          consent_whatsapp: boolean | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          last_visit: string | null
          next_appointment: string | null
          notes: string | null
          organisation_id: string
          phone: string | null
          revenue: number | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          consent_email?: boolean | null
          consent_sms?: boolean | null
          consent_whatsapp?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          last_visit?: string | null
          next_appointment?: string | null
          notes?: string | null
          organisation_id: string
          phone?: string | null
          revenue?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          consent_email?: boolean | null
          consent_sms?: boolean | null
          consent_whatsapp?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          last_visit?: string | null
          next_appointment?: string | null
          notes?: string | null
          organisation_id?: string
          phone?: string | null
          revenue?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "patients_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          phone: string | null
          practice_name: string
          subscription_active: boolean
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          phone?: string | null
          practice_name?: string
          subscription_active?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          practice_name?: string
          subscription_active?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      referral_records: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          points_awarded: number
          referred_email: string
          referred_name: string
          referrer_id: string | null
          referrer_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          points_awarded?: number
          referred_email?: string
          referred_name: string
          referrer_id?: string | null
          referrer_name?: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          points_awarded?: number
          referred_email?: string
          referred_name?: string
          referrer_id?: string | null
          referrer_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_records_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_key: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_key: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organisation_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organisation_invitation: {
        Args: { _token: string }
        Returns: Json
      }
      add_organisation_member_by_email: {
        Args: { _email: string; _organisation_id: string; _role_id: string }
        Returns: Json
      }
      create_organisation_invitation: {
        Args: {
          _email: string
          _organisation_id: string
          _role_id: string
          _token: string
        }
        Returns: Json
      }
      current_organisation_id: { Args: never; Returns: string }
      get_all_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          phone: string | null
          practice_name: string
          subscription_active: boolean
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string
          updated_at: string
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_current_auth_context: { Args: never; Returns: Json }
      get_organisation_admin_overview: {
        Args: { _organisation_id?: string }
        Returns: Json
      }
      get_platform_admin_overview: { Args: never; Returns: Json }
      has_org_permission: {
        Args: {
          _organisation_id: string
          _permission_key: string
          _user_id?: string
        }
        Returns: boolean
      }
      has_org_role: {
        Args: { _organisation_id: string; _role_key: string; _user_id?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _organisation_id: string; _user_id?: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
      revoke_organisation_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      seed_organisation_roles: {
        Args: { _organisation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      appointment_status: "scheduled" | "completed" | "missed" | "cancelled"
      subscription_tier: "starter" | "growth" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
      appointment_status: ["scheduled", "completed", "missed", "cancelled"],
      subscription_tier: ["starter", "growth", "pro"],
    },
  },
} as const

