export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      account_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          questions_used: number
          usage_date: string
          user_id: string
        }
        Insert: {
          id?: string
          questions_used?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          id?: string
          questions_used?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      astrologer_applications: {
        Row: {
          about: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          bank_name: string | null
          certificate_paths: string[]
          consultation_modes: string[]
          created_at: string
          display_name: string | null
          email: string | null
          experience_years: number | null
          id: string
          languages: string[]
          legal_name: string | null
          pan_document_path: string | null
          pan_number: string | null
          phone: string | null
          profile_photo_url: string | null
          qualification: string | null
          rejection_reason: string | null
          requested_price_per_minute: number | null
          reviewed_at: string | null
          skills: string[]
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          certificate_paths?: string[]
          consultation_modes?: string[]
          created_at?: string
          display_name?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          languages?: string[]
          legal_name?: string | null
          pan_document_path?: string | null
          pan_number?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          qualification?: string | null
          rejection_reason?: string | null
          requested_price_per_minute?: number | null
          reviewed_at?: string | null
          skills?: string[]
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          certificate_paths?: string[]
          consultation_modes?: string[]
          created_at?: string
          display_name?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          languages?: string[]
          legal_name?: string | null
          pan_document_path?: string | null
          pan_number?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          qualification?: string | null
          rejection_reason?: string | null
          requested_price_per_minute?: number | null
          reviewed_at?: string | null
          skills?: string[]
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "astrologer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      astrologer_billing_ledger: {
        Row: {
          astrologer_amount: number | null
          astrologer_id: string
          astrologer_percentage: number | null
          available_at: string | null
          calculation_status: string
          commission_calculated_at: string | null
          commission_rule_id: string | null
          commission_source: string | null
          company_amount: number | null
          company_percentage: number | null
          consultation_id: string
          created_at: string
          earned_at: string
          gross_amount: number
          id: string
          payout_reference: string | null
          settled_at: string | null
          updated_at: string
        }
        Insert: {
          astrologer_amount?: number | null
          astrologer_id: string
          astrologer_percentage?: number | null
          available_at?: string | null
          calculation_status?: string
          commission_calculated_at?: string | null
          commission_rule_id?: string | null
          commission_source?: string | null
          company_amount?: number | null
          company_percentage?: number | null
          consultation_id: string
          created_at?: string
          earned_at?: string
          gross_amount: number
          id?: string
          payout_reference?: string | null
          settled_at?: string | null
          updated_at?: string
        }
        Update: {
          astrologer_amount?: number | null
          astrologer_id?: string
          astrologer_percentage?: number | null
          available_at?: string | null
          calculation_status?: string
          commission_calculated_at?: string | null
          commission_rule_id?: string | null
          commission_source?: string | null
          company_amount?: number | null
          company_percentage?: number | null
          consultation_id?: string
          created_at?: string
          earned_at?: string
          gross_amount?: number
          id?: string
          payout_reference?: string | null
          settled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "astrologer_billing_ledger_astrologer_id_fkey"
            columns: ["astrologer_id"]
            isOneToOne: false
            referencedRelation: "astrologers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "astrologer_billing_ledger_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      astrologer_commission_overrides: {
        Row: {
          astrologer_id: string
          astrologer_percentage: number
          company_percentage: number
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          astrologer_id: string
          astrologer_percentage: number
          company_percentage: number
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          astrologer_id?: string
          astrologer_percentage?: number
          company_percentage?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "astrologer_commission_overrides_astrologer_id_fkey"
            columns: ["astrologer_id"]
            isOneToOne: false
            referencedRelation: "astrologers"
            referencedColumns: ["id"]
          },
        ]
      }
      astrologer_payout_accounts: {
        Row: {
          account_holder_name: string
          account_number_last4: string
          account_number_secret_id: string
          astrologer_id: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string
          rejection_reason: string | null
          status: string
          submitted_at: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_holder_name: string
          account_number_last4: string
          account_number_secret_id: string
          astrologer_id: string
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number_last4?: string
          account_number_secret_id?: string
          astrologer_id?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "astrologer_payout_accounts_astrologer_id_fkey"
            columns: ["astrologer_id"]
            isOneToOne: true
            referencedRelation: "astrologers"
            referencedColumns: ["id"]
          },
        ]
      }
      astrologer_withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          astrologer_id: string
          bank_reference: string | null
          created_at: string
          currency: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          paid_at: string | null
          paid_by: string | null
          payout_account_id: string
          payout_account_last4: string
          payout_bank_name: string
          payout_reference: string | null
          processing_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          astrologer_id: string
          bank_reference?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payout_account_id: string
          payout_account_last4: string
          payout_bank_name: string
          payout_reference?: string | null
          processing_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          astrologer_id?: string
          bank_reference?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payout_account_id?: string
          payout_account_last4?: string
          payout_bank_name?: string
          payout_reference?: string | null
          processing_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "astrologer_withdrawal_requests_astrologer_id_fkey"
            columns: ["astrologer_id"]
            isOneToOne: false
            referencedRelation: "astrologers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "astrologer_withdrawal_requests_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "astrologer_payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      astrologers: {
        Row: {
          about: string | null
          application_id: string | null
          consultations: number
          created_at: string
          experience: string
          id: string
          image: string | null
          is_published: boolean
          languages: string[]
          last_seen: string
          name: string
          next_available_at: string | null
          price_per_minute: number
          rating: number
          skills: string[]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          about?: string | null
          application_id?: string | null
          consultations?: number
          created_at?: string
          experience: string
          id?: string
          image?: string | null
          is_published?: boolean
          languages: string[]
          last_seen?: string
          name: string
          next_available_at?: string | null
          price_per_minute: number
          rating?: number
          skills: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          about?: string | null
          application_id?: string | null
          consultations?: number
          created_at?: string
          experience?: string
          id?: string
          image?: string | null
          is_published?: boolean
          languages?: string[]
          last_seen?: string
          name?: string
          next_available_at?: string | null
          price_per_minute?: number
          rating?: number
          skills?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "astrologers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "astrologer_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "astrologers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          astrologer_percentage: number
          company_percentage: number
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          astrologer_percentage: number
          company_percentage: number
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          astrologer_percentage?: number
          company_percentage?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultation_astrologer_notes: {
        Row: {
          astrologer_id: string
          created_at: string
          id: string
          notes: string
          session_id: string
          updated_at: string
        }
        Insert: {
          astrologer_id: string
          created_at?: string
          id?: string
          notes?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          astrologer_id?: string
          created_at?: string
          id?: string
          notes?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_astrologer_notes_astrologer_id_fkey"
            columns: ["astrologer_id"]
            isOneToOne: false
            referencedRelation: "astrologers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_astrologer_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_billing_entries: {
        Row: {
          amount: number
          billed_at: string
          id: string
          minute_number: number
          session_id: string
          user_id: string
        }
        Insert: {
          amount: number
          billed_at?: string
          id?: string
          minute_number: number
          session_id: string
          user_id: string
        }
        Update: {
          amount?: number
          billed_at?: string
          id?: string
          minute_number?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_billing_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_billing_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          client_message_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_text: string | null
          message_type: string
          metadata: Json
          sender: string
          sender_user_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_message_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_text?: string | null
          message_type?: string
          metadata?: Json
          sender: string
          sender_user_id?: string | null
          session_id: string
          status?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_message_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_text?: string | null
          message_type?: string
          metadata?: Json
          sender?: string
          sender_user_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_sessions: {
        Row: {
          astrologer_id: string | null
          billed_minutes: number
          customer_display_name: string | null
          elapsed_seconds: number
          ended_at: string | null
          id: string
          kundli_profile_id: string | null
          last_billed_at: string | null
          rate_per_minute: number
          recharge_deadline_at: string | null
          requested_at: string
          started_at: string | null
          status: string
          total_charged: number
          user_id: string
        }
        Insert: {
          astrologer_id?: string | null
          billed_minutes?: number
          customer_display_name?: string | null
          elapsed_seconds?: number
          ended_at?: string | null
          id?: string
          kundli_profile_id?: string | null
          last_billed_at?: string | null
          rate_per_minute: number
          recharge_deadline_at?: string | null
          requested_at?: string
          started_at?: string | null
          status: string
          total_charged?: number
          user_id: string
        }
        Update: {
          astrologer_id?: string | null
          billed_minutes?: number
          customer_display_name?: string | null
          elapsed_seconds?: number
          ended_at?: string | null
          id?: string
          kundli_profile_id?: string | null
          last_billed_at?: string | null
          rate_per_minute?: number
          recharge_deadline_at?: string | null
          requested_at?: string
          started_at?: string | null
          status?: string
          total_charged?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_sessions_astrologer_id_fkey"
            columns: ["astrologer_id"]
            isOneToOne: false
            referencedRelation: "astrologers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_sessions_kundli_profile_id_fkey"
            columns: ["kundli_profile_id"]
            isOneToOne: false
            referencedRelation: "kundli_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_settings: {
        Row: {
          billing_interval_seconds: number
          heartbeat_interval_seconds: number
          id: boolean
          low_balance_minutes: number
          minimum_minutes: number
          recharge_grace_seconds: number
          request_timeout_seconds: number
          updated_at: string
        }
        Insert: {
          billing_interval_seconds: number
          heartbeat_interval_seconds: number
          id?: boolean
          low_balance_minutes: number
          minimum_minutes: number
          recharge_grace_seconds: number
          request_timeout_seconds: number
          updated_at?: string
        }
        Update: {
          billing_interval_seconds?: number
          heartbeat_interval_seconds?: number
          id?: boolean
          low_balance_minutes?: number
          minimum_minutes?: number
          recharge_grace_seconds?: number
          request_timeout_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      kundli_matching_reports: {
        Row: {
          boy_profile_id: string | null
          boy_snapshot: Json
          compatibility_result: Json
          created_at: string
          engine_version: string
          girl_profile_id: string | null
          girl_snapshot: Json
          id: string
          idempotency_key: string
          input_fingerprint: string
          owner_id: string
          provider: string
          status: string
          total_score: number
        }
        Insert: {
          boy_profile_id?: string | null
          boy_snapshot: Json
          compatibility_result: Json
          created_at?: string
          engine_version?: string
          girl_profile_id?: string | null
          girl_snapshot: Json
          id?: string
          idempotency_key: string
          input_fingerprint: string
          owner_id: string
          provider?: string
          status?: string
          total_score: number
        }
        Update: {
          boy_profile_id?: string | null
          boy_snapshot?: Json
          compatibility_result?: Json
          created_at?: string
          engine_version?: string
          girl_profile_id?: string | null
          girl_snapshot?: Json
          id?: string
          idempotency_key?: string
          input_fingerprint?: string
          owner_id?: string
          provider?: string
          status?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "kundli_matching_reports_boy_profile_id_fkey"
            columns: ["boy_profile_id"]
            isOneToOne: false
            referencedRelation: "kundli_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kundli_matching_reports_girl_profile_id_fkey"
            columns: ["girl_profile_id"]
            isOneToOne: false
            referencedRelation: "kundli_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kundli_profiles: {
        Row: {
          birth_city: string
          birth_district: string
          birth_state: string
          created_at: string
          dob: string
          gender: string
          id: string
          is_default: boolean | null
          lagna: string | null
          latitude: number | null
          longitude: number | null
          mahadasha: string | null
          nakshatra: string | null
          name: string
          owner_id: string
          profile_scope: string
          rashi: string | null
          relation: string
          timezone: string | null
          tob: string
        }
        Insert: {
          birth_city: string
          birth_district: string
          birth_state: string
          created_at?: string
          dob: string
          gender: string
          id?: string
          is_default?: boolean | null
          lagna?: string | null
          latitude?: number | null
          longitude?: number | null
          mahadasha?: string | null
          nakshatra?: string | null
          name: string
          owner_id: string
          profile_scope?: string
          rashi?: string | null
          relation?: string
          timezone?: string | null
          tob: string
        }
        Update: {
          birth_city?: string
          birth_district?: string
          birth_state?: string
          created_at?: string
          dob?: string
          gender?: string
          id?: string
          is_default?: boolean | null
          lagna?: string | null
          latitude?: number | null
          longitude?: number | null
          mahadasha?: string | null
          nakshatra?: string | null
          name?: string
          owner_id?: string
          profile_scope?: string
          rashi?: string | null
          relation?: string
          timezone?: string | null
          tob?: string
        }
        Relationships: [
          {
            foreignKeyName: "kundli_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kundli_reports: {
        Row: {
          engine: string
          generated_at: string
          id: string
          profile_id: string
          report_json: Json
          version: string
        }
        Insert: {
          engine?: string
          generated_at?: string
          id?: string
          profile_id: string
          report_json: Json
          version?: string
        }
        Update: {
          engine?: string
          generated_at?: string
          id?: string
          profile_id?: string
          report_json?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "kundli_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "kundli_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount_paise: number
          created_at: string
          currency: string
          id: string
          package_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          currency?: string
          id?: string
          package_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          currency?: string
          id?: string
          package_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          metadata: Json
          payment_order_id: string
          razorpay_payment_id: string
          razorpay_refund_id: string
          reconciliation_status: string
          status: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          metadata?: Json
          payment_order_id: string
          razorpay_payment_id: string
          razorpay_refund_id: string
          reconciliation_status?: string
          status?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          metadata?: Json
          payment_order_id?: string
          razorpay_payment_id?: string
          razorpay_refund_id?: string
          reconciliation_status?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_city: string | null
          birth_district: string | null
          birth_state: string | null
          created_at: string
          dob: string | null
          email: string | null
          gender: string | null
          id: string
          name: string
          onboarding_completed_at: string | null
          phone: string | null
          tob: string | null
          welcome_chat_started_at: string | null
        }
        Insert: {
          birth_city?: string | null
          birth_district?: string | null
          birth_state?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          gender?: string | null
          id: string
          name: string
          onboarding_completed_at?: string | null
          phone?: string | null
          tob?: string | null
          welcome_chat_started_at?: string | null
        }
        Update: {
          birth_city?: string | null
          birth_district?: string | null
          birth_state?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          tob?: string | null
          welcome_chat_started_at?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          status: string
          subscription_id: string
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          status: string
          subscription_id: string
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          status?: string
          subscription_id?: string
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          auto_renew: boolean | null
          created_at: string
          expiry_date: string | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          plan: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          auto_renew?: boolean | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan: string
          start_date?: string
          status: string
          user_id: string
        }
        Update: {
          amount?: number | null
          auto_renew?: boolean | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          device_type: string | null
          fcm_token: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_type?: string | null
          fcm_token: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_type?: string | null
          fcm_token?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
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
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_astrologer_consultation: {
        Args: { p_astrologer_user_id: string; p_session_id: string }
        Returns: Json
      }
      admin_adjust_wallet: {
        Args: {
          p_amount: number
          p_description: string
          p_title: string
          p_user_email: string
        }
        Returns: Json
      }
      admin_approve_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: Json
      }
      admin_mark_withdrawal_failed:
        | {
            Args: {
              p_bank_reference?: string
              p_failure_reason: string
              p_payout_reference?: string
              p_withdrawal_id: string
            }
            Returns: Json
          }
        | { Args: { p_reason: string; p_withdrawal_id: string }; Returns: Json }
      admin_mark_withdrawal_paid: {
        Args: {
          p_bank_reference?: string
          p_payout_reference: string
          p_withdrawal_id: string
        }
        Returns: Json
      }
      admin_mark_withdrawal_processing: {
        Args: { p_withdrawal_id: string }
        Returns: Json
      }
      admin_reject_withdrawal: {
        Args: { p_reason: string; p_withdrawal_id: string }
        Returns: Json
      }
      admin_verify_payout_account: {
        Args: { p_account_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
      approve_astrologer_application:
        | { Args: { p_application_id: string }; Returns: undefined }
        | {
            Args: {
              p_application_id: string
              p_approved_price_per_minute: number
            }
            Returns: string
          }
      assert_current_user_is_admin: { Args: never; Returns: undefined }
      bill_consultation_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      calculate_astrologer_withdrawable_balance: {
        Args: { p_astrologer_id: string }
        Returns: Json
      }
      cancel_customer_consultation: {
        Args: { p_customer_user_id: string; p_session_id: string }
        Returns: Json
      }
      complete_onboarding: {
        Args: {
          p_city: string
          p_district: string
          p_dob: string
          p_gender: string
          p_name: string
          p_phone: string
          p_state: string
          p_tob: string
        }
        Returns: {
          birth_city: string | null
          birth_district: string | null
          birth_state: string | null
          created_at: string
          dob: string | null
          email: string | null
          gender: string | null
          id: string
          name: string
          onboarding_completed_at: string | null
          phone: string | null
          tob: string | null
          welcome_chat_started_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_consultation_session:
        | {
            Args: { p_astrologer_id: string; p_user_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_astrologer_id: string
              p_kundli_profile_id?: string
              p_user_id: string
            }
            Returns: Json
          }
      deactivate_astrologer_commission_override: {
        Args: { p_astrologer_id: string }
        Returns: Json
      }
      demo_debit_wallet: {
        Args: { p_amount: number; p_idempotency_key: string }
        Returns: {
          balance: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      demo_recharge_wallet: {
        Args: { p_amount: number; p_idempotency_key: string }
        Returns: {
          balance: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_self_kundli_profile: { Args: never; Returns: Json }
      expire_waiting_consultation: {
        Args: { p_session_id: string }
        Returns: Json
      }
      finish_consultation_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: Json
      }
      get_admin_astrologer_applications: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      get_admin_astrologers: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_commission_overview: { Args: never; Returns: Json }
      get_admin_consultations: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_dashboard_summary: {
        Args: { p_from?: string; p_timezone?: string; p_to?: string }
        Returns: Json
      }
      get_admin_dashboard_timeseries: {
        Args: {
          p_from: string
          p_granularity?: string
          p_timezone?: string
          p_to: string
        }
        Returns: {
          astrologer_earnings: number
          bucket: string
          company_commission_revenue: number
          consultation_count: number
          consultation_gross_billing: number
          new_astrologers: number
          new_users: number
          successful_payment_volume: number
          wallet_recharge_volume: number
        }[]
      }
      get_admin_financial_alerts: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          alert_type: string
          description: string
          detected_at: string
          entity_id: string
          entity_type: string
          severity: string
          title: string
        }[]
      }
      get_admin_payments: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_payments_summary:
        | { Args: never; Returns: Json }
        | { Args: { p_time_filter?: string }; Returns: Json }
      get_admin_payout_accounts: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_subscriptions: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_users: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_wallet_summary: {
        Args: { p_time_filter?: string }
        Returns: Json
      }
      get_admin_wallet_transactions: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_admin_withdrawals: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_my_astrologer_dashboard_summary: {
        Args: { p_timezone?: string }
        Returns: Json
      }
      get_my_earnings_payout_summary: {
        Args: { p_timezone?: string }
        Returns: Json
      }
      get_my_payment_statements: { Args: never; Returns: Json[] }
      get_my_payout_account: { Args: never; Returns: Json }
      get_my_withdrawal_requests: { Args: never; Returns: Json[] }
      process_commission_for_ledger: {
        Args: { p_ledger_id: string }
        Returns: string
      }
      process_pending_commissions: { Args: { p_limit?: number }; Returns: Json }
      process_razorpay_payment: {
        Args: { p_order_id: string; p_razorpay_payment_id: string }
        Returns: {
          balance: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_razorpay_subscription: {
        Args: {
          p_amount: number
          p_duration_months: number
          p_plan: string
          p_razorpay_order_id: string
          p_razorpay_payment_id: string
          p_user_id: string
        }
        Returns: Json
      }
      recharge_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_ref_id?: string
          p_ref_type?: string
          p_title: string
          p_user_id: string
        }
        Returns: {
          balance: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_astrologer_application: {
        Args: { p_application_id: string; p_reason: string }
        Returns: undefined
      }
      reject_astrologer_consultation: {
        Args: { p_astrologer_user_id: string; p_session_id: string }
        Returns: Json
      }
      request_my_withdrawal: { Args: { p_amount: number }; Returns: Json }
      save_kundli_matching_report: {
        Args: {
          p_boy_profile_id?: string
          p_boy_profile_usage?: string
          p_boy_snapshot: Json
          p_compatibility_result: Json
          p_create_boy_profile?: Json
          p_create_girl_profile?: Json
          p_engine_version?: string
          p_girl_profile_id?: string
          p_girl_profile_usage?: string
          p_girl_snapshot: Json
          p_idempotency_key: string
          p_input_fingerprint: string
          p_owner_id: string
          p_provider?: string
          p_total_score: number
        }
        Returns: string
      }
      save_payout_account: {
        Args: {
          p_account_holder_name: string
          p_account_number: string
          p_bank_name: string
          p_ifsc_code: string
        }
        Returns: Json
      }
      set_astrologer_commission_override: {
        Args: {
          p_astrologer_id: string
          p_astrologer_percentage: number
          p_company_percentage: number
          p_effective_from: string
        }
        Returns: Json
      }
      set_global_commission_rule: {
        Args: {
          p_astrologer_percentage: number
          p_company_percentage: number
          p_effective_from: string
        }
        Returns: Json
      }
      severity_rank: { Args: { p_severity: string }; Returns: number }
      start_consultation_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      start_welcome_chat: {
        Args: never
        Returns: {
          birth_city: string | null
          birth_district: string | null
          birth_state: string | null
          created_at: string
          dob: string | null
          email: string | null
          gender: string | null
          id: string
          name: string
          onboarding_completed_at: string | null
          phone: string | null
          tob: string | null
          welcome_chat_started_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_my_payout_account: {
        Args: {
          p_account_holder_name: string
          p_account_number: string
          p_bank_name: string
          p_ifsc_code: string
        }
        Returns: Json
      }
      sync_self_kundli_profile: {
        Args: {
          p_birth_city: string
          p_birth_district: string
          p_birth_state: string
          p_dob: string
          p_gender: string
          p_latitude: number
          p_longitude: number
          p_name: string
          p_owner_id: string
          p_timezone: string
          p_tob: string
        }
        Returns: Json
      }
      toggle_astrologer_status: {
        Args: { p_astrologer_id: string; p_status: string }
        Returns: undefined
      }
      transition_waiting_consultation: {
        Args: { p_session_id: string; p_target_status: string }
        Returns: Json
      }
      upgrade_subscription_wallet: {
        Args: {
          p_amount: number
          p_duration_months: number
          p_plan: string
          p_user_id: string
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
