// Supabase Database Types
// Generated based on consolidated schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          email: string | null;
          phone: string | null;
          billing_address: Json | null;
          preferred_locale: string;
          newsletter_subscribed: boolean;
          marketing_consent: boolean;
          is_beta_tester: boolean;
          is_active: boolean;
          banned_at: string | null;
          ban_reason: string | null;
          first_login_at: string | null;
          last_login_at: string | null;
          login_count: number;
          registration_source: string;
          tenant_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          phone?: string | null;
          billing_address?: Json | null;
          preferred_locale?: string;
          newsletter_subscribed?: boolean;
          marketing_consent?: boolean;
          is_beta_tester?: boolean;
          is_active?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
          first_login_at?: string | null;
          last_login_at?: string | null;
          login_count?: number;
          registration_source?: string;
          tenant_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          phone?: string | null;
          billing_address?: Json | null;
          preferred_locale?: string;
          newsletter_subscribed?: boolean;
          marketing_consent?: boolean;
          is_beta_tester?: boolean;
          is_active?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
          first_login_at?: string | null;
          last_login_at?: string | null;
          login_count?: number;
          registration_source?: string;
          tenant_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      export_credits: {
        Row: {
          id: string;
          user_id: string;
          credits_total: number;
          credits_used: number;
          package_type: string;
          valid_until: string | null;
          payment_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credits_total?: number;
          credits_used?: number;
          package_type: string;
          valid_until?: string | null;
          payment_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credits_total?: number;
          credits_used?: number;
          package_type?: string;
          valid_until?: string | null;
          payment_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      guest_credits: {
        Row: {
          id: string;
          session_id: string;
          email: string | null;
          credits_total: number;
          credits_used: number;
          expires_at: string;
          last_payment_id: string | null;
          migrated_to_user_id: string | null;
          migrated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          email?: string | null;
          credits_total?: number;
          credits_used?: number;
          expires_at: string;
          last_payment_id?: string | null;
          migrated_to_user_id?: string | null;
          migrated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          email?: string | null;
          credits_total?: number;
          credits_used?: number;
          expires_at?: string;
          last_payment_id?: string | null;
          migrated_to_user_id?: string | null;
          migrated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      export_sessions: {
        Row: {
          id: string;
          credit_id: string | null;
          guest_credit_id: string | null;
          project_hash: string;
          started_at: string;
          expires_at: string;
          exports_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          credit_id?: string | null;
          guest_credit_id?: string | null;
          project_hash: string;
          started_at?: string;
          expires_at: string;
          exports_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          credit_id?: string | null;
          guest_credit_id?: string | null;
          project_hash?: string;
          started_at?: string;
          expires_at?: string;
          exports_count?: number;
          created_at?: string;
        };
      };
      export_history: {
        Row: {
          id: string;
          user_id: string | null;
          guest_session_id: string | null;
          session_id: string | null;
          project_hash: string;
          parts_count: number;
          format: string;
          columns: string[] | null;
          is_free_reexport: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          session_id?: string | null;
          project_hash: string;
          parts_count: number;
          format?: string;
          columns?: string[] | null;
          is_free_reexport?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          session_id?: string | null;
          project_hash?: string;
          parts_count?: number;
          format?: string;
          columns?: string[] | null;
          is_free_reexport?: boolean;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          payment_type: string;
          user_id: string | null;
          guest_session_id: string | null;
          provider: string;
          external_order_id: string;
          provider_order_id: string | null;
          provider_transaction_id: string | null;
          amount: number;
          currency: string;
          status: string;
          status_history: Json;
          provider_response: Json;
          redirect_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          payment_type: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          provider: string;
          external_order_id: string;
          provider_order_id?: string | null;
          provider_transaction_id?: string | null;
          amount: number;
          currency?: string;
          status?: string;
          status_history?: Json;
          provider_response?: Json;
          redirect_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          payment_type?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          provider?: string;
          external_order_id?: string;
          provider_order_id?: string | null;
          provider_transaction_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          status_history?: Json;
          provider_response?: Json;
          redirect_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Functions: {
      get_my_credit_balance: {
        Args: Record<string, never>;
        Returns: {
          total_credits: number;
          used_credits: number;
          available_credits: number;
          has_unlimited: boolean;
          unlimited_expires_at: string | null;
        }[];
      };
      use_my_export_credit: {
        Args: { p_project_hash: string };
        Returns: {
          success: boolean;
          session_id: string | null;
          credits_remaining: number;
          message: string;
          is_free_reexport: boolean;
        }[];
      };
    };
  };
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
