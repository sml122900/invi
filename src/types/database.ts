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
      available_times: {
        Row: {
          day_of_week: number
          id: string
          slot: string
          user_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          slot: string
          user_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "available_times_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      courses: {
        Row: {
          budget_range: string | null
          created_at: string
          duration_min: number | null
          id: string
          is_public: boolean
          name: string
          scenario: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          is_public?: boolean
          name: string
          scenario: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          is_public?: boolean
          name?: string
          scenario?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      date_schedules: {
        Row: {
          confirmed_date: string
          confirmed_time: string
          course_snapshot: Json
          created_at: string
          id: string
          invitation_id: string
          safety_checkin_at: string | null
          status: string
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          confirmed_date: string
          confirmed_time: string
          course_snapshot: Json
          created_at?: string
          id?: string
          invitation_id: string
          safety_checkin_at?: string | null
          status?: string
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          confirmed_date?: string
          confirmed_time?: string
          course_snapshot?: Json
          created_at?: string
          id?: string
          invitation_id?: string
          safety_checkin_at?: string | null
          status?: string
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_schedules_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_schedules_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "date_schedules_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ideal_types: {
        Row: {
          age_max: number | null
          age_min: number | null
          company_pref: string | null
          drinking_pref: string | null
          height_max: number | null
          height_min: number | null
          paid_until: string | null
          religion_pref: string | null
          salary_pref: string | null
          school_pref: string | null
          smoking_pref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          company_pref?: string | null
          drinking_pref?: string | null
          height_max?: number | null
          height_min?: number | null
          paid_until?: string | null
          religion_pref?: string | null
          salary_pref?: string | null
          school_pref?: string | null
          smoking_pref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          company_pref?: string | null
          drinking_pref?: string | null
          height_max?: number | null
          height_min?: number | null
          paid_until?: string | null
          religion_pref?: string | null
          salary_pref?: string | null
          school_pref?: string | null
          smoking_pref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideal_types_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      info_disclosures: {
        Row: {
          disclosed_at: string
          id: string
          match_id: string
          triggered_by: string
        }
        Insert: {
          disclosed_at?: string
          id?: string
          match_id: string
          triggered_by: string
        }
        Update: {
          disclosed_at?: string
          id?: string
          match_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "info_disclosures_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_disclosures_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invitations: {
        Row: {
          course_id: string | null
          created_at: string
          custom_places: Json | null
          decline_reason: string | null
          id: string
          match_id: string
          meeting_point: string | null
          message: string | null
          proposed_date: string
          proposed_time: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          custom_places?: Json | null
          decline_reason?: string | null
          id?: string
          match_id: string
          meeting_point?: string | null
          message?: string | null
          proposed_date: string
          proposed_time: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          custom_places?: Json | null
          decline_reason?: string | null
          id?: string
          match_id?: string
          meeting_point?: string | null
          message?: string | null
          proposed_date?: string
          proposed_time?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_history: {
        Row: {
          cooldown_until: string | null
          id: string
          last_matched_at: string
          other_user_id: string
          outcome: string
          user_id: string
        }
        Insert: {
          cooldown_until?: string | null
          id?: string
          last_matched_at?: string
          other_user_id: string
          outcome: string
          user_id: string
        }
        Update: {
          cooldown_until?: string | null
          id?: string
          last_matched_at?: string
          other_user_id?: string
          outcome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_history_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          match_date: string
          match_reasons: Json | null
          match_slot: string
          matched_user_id: string
          score: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          match_date: string
          match_reasons?: Json | null
          match_slot: string
          matched_user_id: string
          score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          match_date?: string
          match_reasons?: Json | null
          match_slot?: string
          matched_user_id?: string
          score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_match_settings: {
        Row: {
          exclude_same_company: boolean
          exclude_same_school: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          exclude_same_company?: boolean
          exclude_same_school?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          exclude_same_company?: boolean
          exclude_same_school?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_match_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      places: {
        Row: {
          category: string
          course_id: string
          created_at: string
          district: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          naver_place_id: string | null
          order_index: number
          price_range: string | null
          stay_minutes: number | null
          sub_category: string | null
          user_note: string | null
        }
        Insert: {
          category: string
          course_id: string
          created_at?: string
          district?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          naver_place_id?: string | null
          order_index?: number
          price_range?: string | null
          stay_minutes?: number | null
          sub_category?: string | null
          user_note?: string | null
        }
        Update: {
          category?: string
          course_id?: string
          created_at?: string
          district?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          naver_place_id?: string | null
          order_index?: number
          price_range?: string | null
          stay_minutes?: number | null
          sub_category?: string | null
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_regions: string[] | null
          birth_year: number
          completeness: number
          created_at: string
          drinking: string | null
          face_type: string | null
          gender: string
          height_cm: number | null
          intro_prompts: Json | null
          last_active_at: string | null
          manner_score: number
          mbti: string | null
          region: string | null
          religion: string | null
          smoking: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_regions?: string[] | null
          birth_year: number
          completeness?: number
          created_at?: string
          drinking?: string | null
          face_type?: string | null
          gender: string
          height_cm?: number | null
          intro_prompts?: Json | null
          last_active_at?: string | null
          manner_score?: number
          mbti?: string | null
          region?: string | null
          religion?: string | null
          smoking?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_regions?: string[] | null
          birth_year?: number
          completeness?: number
          created_at?: string
          drinking?: string | null
          face_type?: string | null
          gender?: string
          height_cm?: number | null
          intro_prompts?: Json | null
          last_active_at?: string | null
          manner_score?: number
          mbti?: string | null
          region?: string | null
          religion?: string | null
          smoking?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          date_schedule_id: string
          id: string
          manner_rating: number | null
          reviewee_id: string
          reviewer_id: string
          showed_up: string
        }
        Insert: {
          created_at?: string
          date_schedule_id: string
          id?: string
          manner_rating?: number | null
          reviewee_id: string
          reviewer_id: string
          showed_up: string
        }
        Update: {
          created_at?: string
          date_schedule_id?: string
          id?: string
          manner_rating?: number | null
          reviewee_id?: string
          reviewer_id?: string
          showed_up?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_date_schedule_id_fkey"
            columns: ["date_schedule_id"]
            isOneToOne: false
            referencedRelation: "date_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      time_exceptions: {
        Row: {
          date: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_exceptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      token_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          ref_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          ref_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          ref_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: { p_birth_year: number; p_gender: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

