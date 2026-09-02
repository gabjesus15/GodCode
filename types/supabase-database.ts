/**
 * Tipos generados con Supabase MCP (`generate_typescript_types`).
 * Regenerar tras cambios de esquema. PostgREST 14.1.
 */
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
      addons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_monthly: number | null
          price_one_time: number | null
          slug: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_monthly?: number | null
          price_one_time?: number | null
          slug: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number | null
          price_one_time?: number | null
          slug?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          company_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          company_id: string | null
          country_code: string | null
          created_at: string
          event_name: string
          host: string | null
          id: string
          ip_hash: string | null
          metadata: Json
          page_type: string
          path: string
          referrer: string | null
          session_id: string | null
          tenant_slug: string | null
          title: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          company_id?: string | null
          country_code?: string | null
          created_at?: string
          event_name?: string
          host?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          page_type?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          tenant_slug?: string | null
          title?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          company_id?: string | null
          country_code?: string | null
          created_at?: string
          event_name?: string
          host?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          page_type?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          tenant_slug?: string | null
          title?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_payment_methods: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_enabled: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_tables: {
        Row: {
          branch_id: string
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          pos_x: number
          pos_y: number
          seats: number
          shape: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pos_x?: number
          pos_y?: number
          seats?: number
          shape?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pos_x?: number
          pos_y?: number
          seats?: number
          shape?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_tables_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_tables_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          account_email: string | null
          account_holder: string | null
          account_number: string | null
          account_rut: string | null
          account_type: string | null
          address: string | null
          bank_name: string | null
          company_id: string
          country: string | null
          created_at: string | null
          currency: string | null
          delivery_settings: Json | null
          efectivo: string | null
          id: string
          instagram: string | null
          instagram_url: string | null
          is_active: boolean | null
          manual_order_settings: Json
          map_url: string | null
          mercadopago: string | null
          name: string
          order_intake_pause_message: string | null
          order_intake_paused: boolean | null
          order_intake_paused_at: string | null
          order_intake_paused_by: string | null
          origin_lat: number | null
          origin_lng: number | null
          pago_movil: string | null
          payment_methods: string[] | null
          paypal: string | null
          phone: string | null
          schedule: string | null
          slug: string
          stripe: string | null
          tarjeta: string | null
          transferencia_bancaria: string | null
          updated_at: string | null
          whatsapp_url: string | null
          zelle: string | null
        }
        Insert: {
          account_email?: string | null
          account_holder?: string | null
          account_number?: string | null
          account_rut?: string | null
          account_type?: string | null
          address?: string | null
          bank_name?: string | null
          company_id: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_settings?: Json | null
          efectivo?: string | null
          id?: string
          instagram?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          manual_order_settings?: Json
          map_url?: string | null
          mercadopago?: string | null
          name: string
          order_intake_pause_message?: string | null
          order_intake_paused?: boolean | null
          order_intake_paused_at?: string | null
          order_intake_paused_by?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          pago_movil?: string | null
          payment_methods?: string[] | null
          paypal?: string | null
          phone?: string | null
          schedule?: string | null
          slug: string
          stripe?: string | null
          tarjeta?: string | null
          transferencia_bancaria?: string | null
          updated_at?: string | null
          whatsapp_url?: string | null
          zelle?: string | null
        }
        Update: {
          account_email?: string | null
          account_holder?: string | null
          account_number?: string | null
          account_rut?: string | null
          account_type?: string | null
          address?: string | null
          bank_name?: string | null
          company_id?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_settings?: Json | null
          efectivo?: string | null
          id?: string
          instagram?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          manual_order_settings?: Json
          map_url?: string | null
          mercadopago?: string | null
          name?: string
          order_intake_pause_message?: string | null
          order_intake_paused?: boolean | null
          order_intake_paused_at?: string | null
          order_intake_paused_by?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          pago_movil?: string | null
          payment_methods?: string[] | null
          paypal?: string | null
          phone?: string | null
          schedule?: string | null
          slug?: string
          stripe?: string | null
          tarjeta?: string | null
          transferencia_bancaria?: string | null
          updated_at?: string | null
          whatsapp_url?: string | null
          zelle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_info: {
        Row: {
          account_email: string | null
          account_holder: string | null
          account_number: string | null
          account_rut: string | null
          account_type: string | null
          address: string | null
          bank_details: string | null
          bank_name: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          instagram: string | null
          name: string | null
          phone: string | null
          schedule: string | null
          updated_at: string | null
        }
        Insert: {
          account_email?: string | null
          account_holder?: string | null
          account_number?: string | null
          account_rut?: string | null
          account_type?: string | null
          address?: string | null
          bank_details?: string | null
          bank_name?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          instagram?: string | null
          name?: string | null
          phone?: string | null
          schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          account_email?: string | null
          account_holder?: string | null
          account_number?: string | null
          account_rut?: string | null
          account_type?: string | null
          address?: string | null
          bank_details?: string | null
          bank_name?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          instagram?: string | null
          name?: string | null
          phone?: string | null
          schedule?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_info_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number | null
          amount_minor: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          expense_kind: string | null
          id: string
          order_id: number | null
          payment_method: string | null
          shift_id: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          amount_minor?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_kind?: string | null
          id?: string
          order_id?: number | null
          payment_method?: string | null
          shift_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          amount_minor?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_kind?: string | null
          id?: string
          order_id?: number | null
          payment_method?: string | null
          shift_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_reconciliations: {
        Row: {
          branch_id: string | null
          company_id: string | null
          counted_cash: number
          created_at: string
          created_by: string | null
          difference: number
          expected_cash: number
          id: string
          notes: string | null
          shift_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          counted_cash?: number
          created_at?: string
          created_by?: string | null
          difference?: number
          expected_cash?: number
          id?: string
          notes?: string | null
          shift_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          counted_cash?: number
          created_at?: string
          created_by?: string | null
          difference?: number
          expected_cash?: number
          id?: string
          notes?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_shift_id_fkey"
            columns: ["shift_id"]
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_shifts: {
        Row: {
          actual_balance: number | null
          actual_card_balance: number | null
          actual_online_balance: number | null
          branch_id: string | null
          cash_difference: number | null
          closed_at: string | null
          closed_by: string | null
          closed_by_admin_id: string | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          expected_balance: number | null
          expected_card_balance: number | null
          expected_cash: number | null
          expected_online_balance: number | null
          id: string
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          opened_by_admin_id: string | null
          opening_balance: number | null
          status: string | null
          total_card: number | null
          total_cash: number | null
          total_expenses: number | null
          total_income: number | null
          total_online: number | null
          total_sales: number | null
        }
        Insert: {
          actual_balance?: number | null
          actual_card_balance?: number | null
          actual_online_balance?: number | null
          branch_id?: string | null
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_admin_id?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_balance?: number | null
          expected_card_balance?: number | null
          expected_cash?: number | null
          expected_online_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opened_by_admin_id?: string | null
          opening_balance?: number | null
          status?: string | null
          total_card?: number | null
          total_cash?: number | null
          total_expenses?: number | null
          total_income?: number | null
          total_online?: number | null
          total_sales?: number | null
        }
        Update: {
          actual_balance?: number | null
          actual_card_balance?: number | null
          actual_online_balance?: number | null
          branch_id?: string | null
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_admin_id?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_balance?: number | null
          expected_card_balance?: number | null
          expected_cash?: number | null
          expected_online_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opened_by_admin_id?: string | null
          opening_balance?: number | null
          status?: string | null
          total_card?: number | null
          total_cash?: number | null
          total_expenses?: number | null
          total_income?: number | null
          total_online?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_shifts_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_closed_by_fkey"
            columns: ["closed_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_opened_by_fkey"
            columns: ["opened_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      category_branch: {
        Row: {
          branch_id: string
          category_id: string
          company_id: string | null
          created_at: string | null
          is_active: boolean
          order: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          category_id: string
          company_id?: string | null
          created_at?: string | null
          is_active?: boolean
          order?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          category_id?: string
          company_id?: string | null
          created_at?: string | null
          is_active?: boolean
          order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_branch_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_branch_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_branch_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_addresses: {
        Row: {
          address_line: string | null
          client_id: string
          company_id: string
          created_at: string | null
          delivery_km: number | null
          id: string
          last_used_at: string | null
          named_area_id: string | null
          reference: string | null
          updated_at: string | null
        }
        Insert: {
          address_line?: string | null
          client_id: string
          company_id: string
          created_at?: string | null
          delivery_km?: number | null
          id?: string
          last_used_at?: string | null
          named_area_id?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line?: string | null
          client_id?: string
          company_id?: string
          created_at?: string | null
          delivery_km?: number | null
          id?: string
          last_used_at?: string | null
          named_area_id?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string | null
          created_at: string | null
          default_delivery_address: Json | null
          first_order_at: string | null
          id: string
          is_frequent: boolean | null
          last_order_at: string | null
          name: string | null
          phone: string
          phone_normalized: string | null
          rut: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          default_delivery_address?: Json | null
          first_order_at?: string | null
          id?: string
          is_frequent?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone: string
          phone_normalized?: string | null
          rut?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          default_delivery_address?: Json | null
          first_order_at?: string | null
          id?: string
          is_frequent?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone?: string
          phone_normalized?: string | null
          rut?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          created_by: string
          currency: string | null
          custom_domain: string | null
          custom_domain_expires_at: string | null
          email: string | null
          first_payment_promo_used_at: string | null
          id: string
          integration_settings: Json
          legal_rut: string | null
          name: string
          phone: string | null
          plan_id: string | null
          public_slug: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          theme_config: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          custom_domain?: string | null
          custom_domain_expires_at?: string | null
          email?: string | null
          first_payment_promo_used_at?: string | null
          id?: string
          integration_settings?: Json
          legal_rut?: string | null
          name: string
          phone?: string | null
          plan_id?: string | null
          public_slug?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          theme_config?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          custom_domain?: string | null
          custom_domain_expires_at?: string | null
          email?: string | null
          first_payment_promo_used_at?: string | null
          id?: string
          integration_settings?: Json
          legal_rut?: string | null
          name?: string
          phone?: string | null
          plan_id?: string | null
          public_slug?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          theme_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_addons: {
        Row: {
          addon_id: string
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          price_paid: number | null
          status: string
          updated_at: string
        }
        Insert: {
          addon_id: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          price_paid?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          addon_id?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          price_paid?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_addons_addon_id_fkey"
            columns: ["addon_id"]
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addons_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branch_extra_entitlements: {
        Row: {
          amount_paid: number | null
          company_id: string
          created_at: string
          effective_months: number
          expires_at: string | null
          first_cycle_factor: number
          id: string
          months_purchased: number | null
          payment_id: string | null
          payment_reference: string | null
          quantity: number
          starts_at: string | null
          status: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          company_id: string
          created_at?: string
          effective_months?: number
          expires_at?: string | null
          first_cycle_factor?: number
          id?: string
          months_purchased?: number | null
          payment_id?: string | null
          payment_reference?: string | null
          quantity?: number
          starts_at?: string | null
          status?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          company_id?: string
          created_at?: string
          effective_months?: number
          expires_at?: string | null
          first_cycle_factor?: number
          id?: string
          months_purchased?: number | null
          payment_id?: string | null
          payment_reference?: string | null
          quantity?: number
          starts_at?: string | null
          status?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branch_extra_entitlements_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branch_extra_entitlements_payment_id_fkey"
            columns: ["payment_id"]
            referencedRelation: "payments_history"
            referencedColumns: ["id"]
          },
        ]
      }
      company_plan_change_schedules: {
        Row: {
          applied_at: string | null
          apply_error: string | null
          company_id: string
          created_at: string
          current_plan_id: string | null
          effective_at: string | null
          id: string
          metadata: Json
          reason: string | null
          requested_at: string
          requested_by_email: string | null
          status: string
          target_plan_id: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          apply_error?: string | null
          company_id: string
          created_at?: string
          current_plan_id?: string | null
          effective_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          requested_at?: string
          requested_by_email?: string | null
          status?: string
          target_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          apply_error?: string | null
          company_id?: string
          created_at?: string
          current_plan_id?: string | null
          effective_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          requested_at?: string
          requested_by_email?: string | null
          status?: string
          target_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_plan_change_schedules_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_plan_change_schedules_current_plan_id_fkey"
            columns: ["current_plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_plan_change_schedules_target_plan_id_fkey"
            columns: ["target_plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_theme_drafts: {
        Row: {
          company_id: string
          created_at: string
          theme_config: Json
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          theme_config?: Json
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          theme_config?: Json
          updated_at?: string
          updated_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_theme_drafts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_theme_versions: {
        Row: {
          company_id: string
          created_at: string
          created_by_email: string | null
          id: string
          theme_config: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_email?: string | null
          id?: string
          theme_config?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_email?: string | null
          id?: string
          theme_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_theme_versions_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_order_sequences: {
        Row: {
          branch_id: string
          business_day: string
          last_sequence: number
          sequence_group: string
        }
        Insert: {
          branch_id: string
          business_day: string
          last_sequence?: number
          sequence_group: string
        }
        Update: {
          branch_id?: string
          business_day?: string
          last_sequence?: number
          sequence_group?: string
        }
        Relationships: []
      }
      discount_coupon_redemptions: {
        Row: {
          amount_saved: number
          client_phone: string | null
          company_id: string
          coupon_id: string
          id: string
          order_id: number
          redeemed_at: string
        }
        Insert: {
          amount_saved?: number
          client_phone?: string | null
          company_id: string
          coupon_id: string
          id?: string
          order_id: number
          redeemed_at?: string
        }
        Update: {
          amount_saved?: number
          client_phone?: string | null
          company_id?: string
          coupon_id?: string
          id?: string
          order_id?: number
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          company_id: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_redemptions: number | null
          max_redemptions_per_client: number
          min_order_subtotal: number | null
          redemptions_count: number
          restricted_client_id: string | null
          scope: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          max_redemptions_per_client?: number
          min_order_subtotal?: number | null
          redemptions_count?: number
          restricted_client_id?: string | null
          scope?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          max_redemptions_per_client?: number
          min_order_subtotal?: number | null
          redemptions_count?: number
          restricted_client_id?: string | null
          scope?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupons_restricted_client_id_fkey"
            columns: ["restricted_client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          application_id: string | null
          company_id: string | null
          email_type: string
          id: string
          metadata: Json | null
          sent_at: string
          to_email: string
        }
        Insert: {
          application_id?: string | null
          company_id?: string | null
          email_type: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          to_email: string
        }
        Update: {
          application_id?: string | null
          company_id?: string | null
          email_type?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "onboarding_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          image_url: string
          is_active: boolean
          promotion_duration_days: number | null
          promotion_duration_enabled: boolean | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          promotion_duration_days?: number | null
          promotion_duration_enabled?: boolean | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          promotion_duration_days?: number | null
          promotion_duration_enabled?: boolean | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_banners_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_banners_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_branch: {
        Row: {
          branch_id: string
          current_stock: number
          id: string
          inventory_item_id: string
          min_stock: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          current_stock?: number
          id?: string
          inventory_item_id: string
          min_stock?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          current_stock?: number
          id?: string
          inventory_item_id?: string
          min_stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_branch_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          beverage_kind: string | null
          category: string | null
          company_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          item_type: string | null
          min_stock: number | null
          name: string
          tags: string[] | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          beverage_kind?: string | null
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          item_type?: string | null
          min_stock?: number | null
          name: string
          tags?: string[] | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          beverage_kind?: string | null
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          item_type?: string | null
          min_stock?: number | null
          name?: string
          tags?: string[] | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string | null
          metadata: Json
          movement_type: string
          note: string | null
          order_id: number | null
          quantity_delta: number
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          metadata?: Json
          movement_type: string
          note?: string | null
          order_id?: number | null
          quantity_delta: number
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          metadata?: Json
          movement_type?: string
          note?: string | null
          order_id?: number | null
          quantity_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          metadata: Json
          name: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          metadata?: Json
          name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          metadata?: Json
          name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_media_assets: {
        Row: {
          alt: string
          created_at: string
          is_active: boolean
          key: string
          label: string | null
          sort_order: number
          src: string
          sub: string | null
          updated_at: string
        }
        Insert: {
          alt?: string
          created_at?: string
          is_active?: boolean
          key: string
          label?: string | null
          sort_order?: number
          src: string
          sub?: string | null
          updated_at?: string
        }
        Update: {
          alt?: string
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string | null
          sort_order?: number
          src?: string
          sub?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      landing_webhook_subscriptions: {
        Row: {
          created_at: string
          destination_type: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          destination_type: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          destination_type?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      manual_order_metrics: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          event_name: string
          fulfillment: string | null
          id: number
          manual_order_mode: string | null
          step: number | null
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          event_name: string
          fulfillment?: string | null
          id?: never
          manual_order_mode?: string | null
          step?: number | null
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          event_name?: string
          fulfillment?: string | null
          id?: never
          manual_order_mode?: string | null
          step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_order_metrics_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_order_metrics_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_client_accounts: {
        Row: {
          auth_user_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          document_country: string | null
          document_normalized: string
          document_raw: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string
          phone_normalized: string | null
          preferred_branch_id: string | null
          reset_grant_expires_at: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          document_country?: string | null
          document_normalized: string
          document_raw?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone: string
          phone_normalized?: string | null
          preferred_branch_id?: string | null
          reset_grant_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          document_country?: string | null
          document_normalized?: string
          document_raw?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string
          phone_normalized?: string | null
          preferred_branch_id?: string | null
          reset_grant_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_client_accounts_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_client_accounts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_client_accounts_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_client_link_requests: {
        Row: {
          auth_user_id: string
          company_id: string
          consumed_at: string | null
          created_at: string
          document_country: string | null
          document_normalized: string
          document_raw: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          phone: string
          phone_normalized: string | null
          preferred_branch_id: string | null
        }
        Insert: {
          auth_user_id: string
          company_id: string
          consumed_at?: string | null
          created_at?: string
          document_country?: string | null
          document_normalized: string
          document_raw?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          phone: string
          phone_normalized?: string | null
          preferred_branch_id?: string | null
        }
        Update: {
          auth_user_id?: string
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          document_country?: string | null
          document_normalized?: string
          document_raw?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          phone?: string
          phone_normalized?: string | null
          preferred_branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_client_link_requests_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_client_link_requests_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_application_addons: {
        Row: {
          addon_id: string
          application_id: string
          created_at: string
          id: string
          price_snapshot: number | null
          quantity: number
        }
        Insert: {
          addon_id: string
          application_id: string
          created_at?: string
          id?: string
          price_snapshot?: number | null
          quantity?: number
        }
        Update: {
          addon_id?: string
          application_id?: string
          created_at?: string
          id?: string
          price_snapshot?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_application_addons_addon_id_fkey"
            columns: ["addon_id"]
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_application_addons_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "onboarding_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_applications: {
        Row: {
          address: string | null
          billing_address: string | null
          billing_rut: string | null
          business_name: string
          company_id: string | null
          country: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          custom_plan_name: string | null
          custom_plan_price: string | null
          description: string | null
          document_number: string | null
          document_type: string | null
          email: string
          email_verified_at: string | null
          fiscal_address: string | null
          id: string
          ip_address: Json | null
          legal_name: string | null
          logo_url: string | null
          message: string | null
          notes: string | null
          payment_amount: number | null
          payment_methods: string[] | null
          payment_months: number | null
          payment_reference: string | null
          payment_reference_url: string | null
          payment_status: string | null
          phone: string | null
          plan_id: string | null
          privacy_accepted: boolean
          responsible_name: string
          sector: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_twitter: string | null
          status: string
          subscription_payment_method: string | null
          terms_accepted: boolean
          updated_at: string
          user_agent: string | null
          verification_token: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          billing_rut?: string | null
          business_name: string
          company_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          custom_plan_name?: string | null
          custom_plan_price?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          email: string
          email_verified_at?: string | null
          fiscal_address?: string | null
          id?: string
          ip_address?: Json | null
          legal_name?: string | null
          logo_url?: string | null
          message?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_methods?: string[] | null
          payment_months?: number | null
          payment_reference?: string | null
          payment_reference_url?: string | null
          payment_status?: string | null
          phone?: string | null
          plan_id?: string | null
          privacy_accepted?: boolean
          responsible_name: string
          sector?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          status?: string
          subscription_payment_method?: string | null
          terms_accepted?: boolean
          updated_at?: string
          user_agent?: string | null
          verification_token?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          billing_rut?: string | null
          business_name?: string
          company_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          custom_plan_name?: string | null
          custom_plan_price?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string
          email_verified_at?: string | null
          fiscal_address?: string | null
          id?: string
          ip_address?: Json | null
          legal_name?: string | null
          logo_url?: string | null
          message?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_methods?: string[] | null
          payment_months?: number | null
          payment_reference?: string | null
          payment_reference_url?: string | null
          payment_status?: string | null
          phone?: string | null
          plan_id?: string | null
          privacy_accepted?: boolean
          responsible_name?: string
          sector?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          status?: string
          subscription_payment_method?: string | null
          terms_accepted?: boolean
          updated_at?: string
          user_agent?: string | null
          verification_token?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_applications_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_applications_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          id: string
          is_voided: boolean
          name: string
          notes: string | null
          order_id: number
          product_id: string | null
          quantity: number
          sort_order: number
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          is_voided?: boolean
          name: string
          notes?: string | null
          order_id: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          is_voided?: boolean
          name?: string
          notes?: string | null
          order_id?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          metadata: Json
          order_id: number
          order_line_id: string
          quantity: number | null
          reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json
          order_id: number
          order_line_id: string
          quantity?: number | null
          reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          order_id?: number
          order_line_id?: string
          quantity?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_line_events_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_events_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_events_order_line_id_fkey"
            columns: ["order_line_id"]
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_requests: {
        Row: {
          client_request_id: string
          company_id: string
          created_at: string
          operation: string
          order_id: number
          result: Json | null
        }
        Insert: {
          client_request_id: string
          company_id: string
          created_at?: string
          operation: string
          order_id: number
          result?: Json | null
        }
        Update: {
          client_request_id?: string
          company_id?: string
          created_at?: string
          operation?: string
          order_id?: number
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_line_requests_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_requests_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          id: string
          note: string | null
          order_id: number
          product_snapshot: Json
          quantity_ordered: number
          quantity_prepared: number
          quantity_preparing: number
          quantity_served: number
          quantity_voided: number
          source_item_id: string | null
          status: string
          unit_price_minor: number
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          currency: string
          id?: string
          note?: string | null
          order_id: number
          product_snapshot?: Json
          quantity_ordered: number
          quantity_prepared?: number
          quantity_preparing?: number
          quantity_served?: number
          quantity_voided?: number
          source_item_id?: string | null
          status?: string
          unit_price_minor?: number
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          order_id?: number
          product_snapshot?: Json
          quantity_ordered?: number
          quantity_prepared?: number
          quantity_preparing?: number
          quantity_served?: number
          quantity_voided?: number
          source_item_id?: string | null
          status?: string
          unit_price_minor?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_evidence: {
        Row: {
          company_id: string
          created_at: string
          error: string | null
          id: string
          method_id: string
          order_id: string
          payment_line_id: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          method_id: string
          order_id: string
          payment_line_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          method_id?: string
          order_id?: string
          payment_line_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_evidence_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payment_evidence_payment_line_id_fkey"
            columns: ["payment_line_id"]
            referencedRelation: "order_payment_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_lines: {
        Row: {
          amount_minor: number
          change_amount_minor: number | null
          client_line_id: string
          company_id: string
          created_at: string
          currency: string
          evidence_policy: string
          exchange_rate: number | null
          id: string
          method_id: string
          order_id: string
          rail: string
          settlement_amount_minor: number | null
          settlement_currency: string | null
          tendered_amount_minor: number | null
          tendered_currency: string | null
        }
        Insert: {
          amount_minor: number
          change_amount_minor?: number | null
          client_line_id: string
          company_id: string
          created_at?: string
          currency: string
          evidence_policy?: string
          exchange_rate?: number | null
          id?: string
          method_id: string
          order_id: string
          rail: string
          settlement_amount_minor?: number | null
          settlement_currency?: string | null
          tendered_amount_minor?: number | null
          tendered_currency?: string | null
        }
        Update: {
          amount_minor?: number
          change_amount_minor?: number | null
          client_line_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          evidence_policy?: string
          exchange_rate?: number | null
          id?: string
          method_id?: string
          order_id?: string
          rail?: string
          settlement_amount_minor?: number | null
          settlement_currency?: string | null
          tendered_amount_minor?: number | null
          tendered_currency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_lines_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_refunds: {
        Row: {
          amount_minor: number
          authorized_by: string
          client_request_id: string
          company_id: string
          created_at: string
          currency: string
          id: string
          order_id: string
          payment_line_id: string | null
          reason: string
        }
        Insert: {
          amount_minor: number
          authorized_by: string
          client_request_id: string
          company_id: string
          created_at?: string
          currency: string
          id?: string
          order_id: string
          payment_line_id?: string | null
          reason: string
        }
        Update: {
          amount_minor?: number
          authorized_by?: string
          client_request_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          payment_line_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_refunds_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payment_refunds_payment_line_id_fkey"
            columns: ["payment_line_id"]
            referencedRelation: "order_payment_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_settlements: {
        Row: {
          amount_minor: number
          client_request_id: string
          company_id: string
          created_at: string
          currency: string
          id: string
          order_id: string
          payment_lines: Json
        }
        Insert: {
          amount_minor: number
          client_request_id: string
          company_id: string
          created_at?: string
          currency: string
          id?: string
          order_id: string
          payment_lines: Json
        }
        Update: {
          amount_minor?: number
          client_request_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          payment_lines?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_settlements_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method_id: string | null
          method_name: string | null
          order_id: number
          paid_at: string
          provider: string | null
          provider_ref: string | null
          shift_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method_id?: string | null
          method_name?: string | null
          order_id: number
          paid_at?: string
          provider?: string | null
          provider_ref?: string | null
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method_id?: string | null
          method_name?: string | null
          order_id?: number
          paid_at?: string
          provider?: string | null
          provider_ref?: string | null
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_method_id_fkey"
            columns: ["method_id"]
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_shift_id_fkey"
            columns: ["shift_id"]
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          company_id: string | null
          id: string
          metadata: Json
          note: string | null
          order_id: number
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          company_id?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          order_id: number
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          company_id?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          order_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_transaction_requests: {
        Row: {
          client_request_id: string
          company_id: string
          created_at: string
          operation: string
          order_id: number | null
          result: Json | null
        }
        Insert: {
          client_request_id: string
          company_id: string
          created_at?: string
          operation: string
          order_id?: number | null
          result?: Json | null
        }
        Update: {
          client_request_id?: string
          company_id?: string
          created_at?: string
          operation?: string
          order_id?: number | null
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_transaction_requests_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_transaction_requests_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          business_day: string | null
          channel: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_request_id: string | null
          client_rut: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_fee_minor: number | null
          discount_coupon_id: string | null
          discount_total: number | null
          discount_total_minor: number | null
          display_id: string | null
          handoff_code: string | null
          id: number
          items: Json | null
          manual_order_mode: string | null
          note: string | null
          operator_reference: string | null
          order_number: number | null
          order_type: string | null
          paid_status: string | null
          payment_balance_minor: number | null
          payment_breakdown: Json | null
          payment_evidence_status: string | null
          payment_lines: Json | null
          payment_method_specific: string | null
          payment_ref: string | null
          payment_status: string | null
          payment_timing: string | null
          payment_type: string | null
          scheduled_for: string | null
          shift_id: string | null
          shift_sequence: number | null
          status: string | null
          subtotal: number | null
          subtotal_minor: number | null
          table_id: string | null
          table_number: string | null
          tax_total: number | null
          tip_amount: number | null
          total: number | null
          total_minor: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          business_day?: string | null
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_request_id?: string | null
          client_rut?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_minor?: number | null
          discount_coupon_id?: string | null
          discount_total?: number | null
          discount_total_minor?: number | null
          display_id?: string | null
          handoff_code?: string | null
          id?: number
          items?: Json | null
          manual_order_mode?: string | null
          note?: string | null
          operator_reference?: string | null
          order_number?: number | null
          order_type?: string | null
          paid_status?: string | null
          payment_balance_minor?: number | null
          payment_breakdown?: Json | null
          payment_evidence_status?: string | null
          payment_lines?: Json | null
          payment_method_specific?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          payment_timing?: string | null
          payment_type?: string | null
          scheduled_for?: string | null
          shift_id?: string | null
          shift_sequence?: number | null
          status?: string | null
          subtotal?: number | null
          subtotal_minor?: number | null
          table_id?: string | null
          table_number?: string | null
          tax_total?: number | null
          tip_amount?: number | null
          total?: number | null
          total_minor?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          business_day?: string | null
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_request_id?: string | null
          client_rut?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_minor?: number | null
          discount_coupon_id?: string | null
          discount_total?: number | null
          discount_total_minor?: number | null
          display_id?: string | null
          handoff_code?: string | null
          id?: number
          items?: Json | null
          manual_order_mode?: string | null
          note?: string | null
          operator_reference?: string | null
          order_number?: number | null
          order_type?: string | null
          paid_status?: string | null
          payment_balance_minor?: number | null
          payment_breakdown?: Json | null
          payment_evidence_status?: string | null
          payment_lines?: Json | null
          payment_method_specific?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          payment_timing?: string | null
          payment_type?: string | null
          scheduled_for?: string | null
          shift_id?: string | null
          shift_sequence?: number | null
          status?: string | null
          subtotal?: number | null
          subtotal_minor?: number | null
          table_id?: string | null
          table_number?: string | null
          tax_total?: number | null
          tip_amount?: number | null
          total?: number | null
          total_minor?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_discount_coupon_id_fkey"
            columns: ["discount_coupon_id"]
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shift_id_fkey"
            columns: ["shift_id"]
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            referencedRelation: "branch_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          allow_mixed_payment: boolean
          company_id: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          method_name: string
          rail: string | null
          requires_receipt: boolean
          settlement_currency: string | null
          settlement_trigger: string | null
          updated_at: string
        }
        Insert: {
          allow_mixed_payment?: boolean
          company_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          method_name: string
          rail?: string | null
          requires_receipt?: boolean
          settlement_currency?: string | null
          settlement_trigger?: string | null
          updated_at?: string
        }
        Update: {
          allow_mixed_payment?: boolean
          company_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          method_name?: string
          rail?: string | null
          requires_receipt?: boolean
          settlement_currency?: string | null
          settlement_trigger?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_history: {
        Row: {
          amount_paid: number
          card_fingerprint_hash: string | null
          company_id: string
          id: string
          months_paid: number
          payer_email_normalized: string | null
          payment_date: string | null
          payment_method: string | null
          payment_method_slug: string | null
          payment_reference: string | null
          paypal_payer_id_hash: string | null
          plan_id: string
          reference_file_url: string | null
          status: string | null
        }
        Insert: {
          amount_paid: number
          card_fingerprint_hash?: string | null
          company_id: string
          id?: string
          months_paid?: number
          payer_email_normalized?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_slug?: string | null
          payment_reference?: string | null
          paypal_payer_id_hash?: string | null
          plan_id: string
          reference_file_url?: string | null
          status?: string | null
        }
        Update: {
          amount_paid?: number
          card_fingerprint_hash?: string | null
          company_id?: string
          id?: string
          months_paid?: number
          payer_email_normalized?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_slug?: string | null
          payment_reference?: string | null
          paypal_payer_id_hash?: string | null
          plan_id?: string
          reference_file_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_history_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_history_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_payment_method_config: {
        Row: {
          created_at: string
          id: string
          key: string
          method_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          method_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          method_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_payment_method_config_method_id_fkey"
            columns: ["method_id"]
            referencedRelation: "plan_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_payment_methods: {
        Row: {
          auto_verify: boolean
          countries: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          auto_verify?: boolean
          countries?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          auto_verify?: boolean
          countries?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          features: Json
          id: string
          is_active: boolean | null
          is_public: boolean
          marketing_lines: Json
          marketing_lines_i18n: Json
          max_branches: number
          max_users: number
          name: string
          name_i18n: Json
          price: number
          prices_by_continent: Json
        }
        Insert: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          marketing_lines?: Json
          marketing_lines_i18n?: Json
          max_branches?: number
          max_users?: number
          name: string
          name_i18n?: Json
          price?: number
          prices_by_continent?: Json
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          marketing_lines?: Json
          marketing_lines_i18n?: Json
          max_branches?: number
          max_users?: number
          name?: string
          name_i18n?: Json
          price?: number
          prices_by_continent?: Json
        }
        Relationships: []
      }
      product_branch: {
        Row: {
          branch_id: string
          category_id: string | null
          company_id: string | null
          created_at: string
          id: string
          inventory_pause_reason: string | null
          inventory_paused_at: string | null
          is_active: boolean
          is_special: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          inventory_pause_reason?: string | null
          inventory_paused_at?: string | null
          is_active?: boolean
          is_special?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          inventory_pause_reason?: string | null
          inventory_paused_at?: string | null
          is_active?: boolean
          is_special?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_branch_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_branch_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_branch_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_branch_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_extras_groups: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          max_select: number
          min_select: number
          name: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_select?: number
          min_select?: number
          name: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_select?: number
          min_select?: number
          name?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_extras_groups_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_extras_groups_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_extras_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_extras_options_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "product_extras_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory_recipe: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          inventory_item_id: string
          product_id: string
          qty_per_sale: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          product_id: string
          qty_per_sale?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          product_id?: string
          qty_per_sale?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_recipe_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_recipe_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_recipe_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          discount_price: number | null
          has_discount: boolean
          id: string
          is_active: boolean
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          discount_price?: number | null
          has_discount?: boolean
          id?: string
          is_active?: boolean
          price?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          discount_price?: number | null
          has_discount?: boolean
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_upsell_beverages: {
        Row: {
          beverage_product_id: string
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          beverage_product_id: string
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          beverage_product_id?: string
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_upsell_beverages_beverage_product_id_fkey"
            columns: ["beverage_product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsell_beverages_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsell_beverages_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          dish_kind: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_special: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          dish_kind?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_special?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          dish_kind?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_special?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_admin_modules: {
        Row: {
          allowed_roles: string[]
          created_at: string
          description: string
          id: string
          is_active: boolean
          label: string
          nav_group: string
          nav_order: number
          tab_id: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[]
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          label: string
          nav_group?: string
          nav_order?: number
          tab_id: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          label?: string
          nav_group?: string
          nav_order?: number
          tab_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_broadcast_reads: {
        Row: {
          broadcast_id: string
          company_id: string
          email: string
          id: string
          read_at: string
        }
        Insert: {
          broadcast_id: string
          company_id: string
          email: string
          id?: string
          read_at?: string
        }
        Update: {
          broadcast_id?: string
          company_id?: string
          email?: string
          id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            referencedRelation: "saas_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_broadcast_reads_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_broadcasts: {
        Row: {
          broadcast_type: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          requires_ack: boolean
          starts_at: string
          target_company_ids: string[]
          target_plan_ids: string[]
          target_scope: string
          target_subdomains: string[]
          title: string
          updated_at: string
        }
        Insert: {
          broadcast_type?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          requires_ack?: boolean
          starts_at?: string
          target_company_ids?: string[]
          target_plan_ids?: string[]
          target_scope?: string
          target_subdomains?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          broadcast_type?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          requires_ack?: boolean
          starts_at?: string
          target_company_ids?: string[]
          target_plan_ids?: string[]
          target_scope?: string
          target_subdomains?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_ticket_messages: {
        Row: {
          author_email: string | null
          author_type: string
          created_at: string
          id: string
          is_internal: boolean
          message: string
          ticket_id: string
        }
        Insert: {
          author_email?: string | null
          author_type: string
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          ticket_id: string
        }
        Update: {
          author_email?: string | null
          author_type?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            referencedRelation: "saas_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tickets: {
        Row: {
          assigned_admin_id: string | null
          assigned_to: string | null
          category: string
          company_id: string
          created_at: string
          created_by_email: string
          description: string
          first_response_at: string | null
          first_response_due_at: string | null
          id: string
          internal_comments: string | null
          last_message_at: string
          priority: string
          resolution_due_at: string | null
          resolved_at: string | null
          source: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          assigned_to?: string | null
          category?: string
          company_id: string
          created_at?: string
          created_by_email: string
          description: string
          first_response_at?: string | null
          first_response_due_at?: string | null
          id?: string
          internal_comments?: string | null
          last_message_at?: string
          priority?: string
          resolution_due_at?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          assigned_to?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by_email?: string
          description?: string
          first_response_at?: string | null
          first_response_due_at?: string | null
          id?: string
          internal_comments?: string | null
          last_message_at?: string
          priority?: string
          resolution_due_at?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_tickets_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_order_sequences: {
        Row: {
          last_sequence: number
          sequence_group: string
          shift_id: string
        }
        Insert: {
          last_sequence?: number
          sequence_group: string
          shift_id: string
        }
        Update: {
          last_sequence?: number
          sequence_group?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_order_sequences_shift_id_fkey"
            columns: ["shift_id"]
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_notifications: {
        Row: {
          company_id: string
          created_at: string
          error: string | null
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      super_admin_notification_state: {
        Row: {
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          key: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tenant_connected_accounts: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_connected_accounts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          allowed_tabs: Json | null
          auth_id: string | null
          auth_user_id: string | null
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          locale: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed_tabs?: Json | null
          auth_id?: string | null
          auth_user_id?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          role?: string
          updated_at?: string
        }
        Update: {
          allowed_tabs?: Json | null
          auth_id?: string | null
          auth_user_id?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _admin_analytics_period_summary: {
        Args: {
          p_branch_id: string
          p_channel?: string
          p_company_id: string
          p_end: string
          p_include_time_buckets?: boolean
          p_start: string
        }
        Returns: Json
      }
      _rls_user_belongs_to_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      admin_analytics_summary: {
        Args: {
          p_branch_id: string
          p_channel?: string
          p_company_id: string
          p_end: string
          p_prev_end: string
          p_prev_start: string
          p_start: string
        }
        Returns: Json
      }
      admin_analytics_top_products: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_end?: string
          p_limit?: number
          p_start?: string
        }
        Returns: Json
      }
      admin_create_category_with_overrides: {
        Args: {
          p_branch_id: string
          p_is_active?: boolean
          p_name: string
          p_order?: number
        }
        Returns: string
      }
      admin_delete_monthly_data: {
        Args: { p_branch_id?: string; p_end: string; p_start: string }
        Returns: Json
      }
      admin_delete_product_with_branch: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      admin_delete_shift_history: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      admin_purge_clients: {
        Args: never
        Returns: {
          deleted_clients: number
        }[]
      }
      admin_reorder_categories: {
        Args: { p_branch_id: string; p_category_ids: string[] }
        Returns: undefined
      }
      admin_reset_company_operations: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      admin_resync_order_inventory: {
        Args: { p_order_id: number }
        Returns: undefined
      }
      admin_set_category_order: {
        Args: {
          p_branch_id: string
          p_category_id: string
          p_new_order: number
        }
        Returns: undefined
      }
      admin_upsert_product_with_branch: {
        Args: {
          p_apply_to_all_branches?: boolean
          p_branch_id: string
          p_category_id: string
          p_description: string
          p_discount_price: number
          p_has_discount: boolean
          p_image_url: string
          p_is_active: boolean
          p_is_special: boolean
          p_name: string
          p_price: number
          p_product_id: string
        }
        Returns: string
      }
      apply_inventory_for_order_internal: {
        Args: {
          p_allow_negative?: boolean
          p_auto_pause?: boolean
          p_branch_id: string
          p_company_id: string
          p_delivery_settings?: Json
          p_items: Json
          p_order_id: number
        }
        Returns: undefined
      }
      assign_dorante_to_company: { Args: never; Returns: string }
      attach_order_payment_evidence_v2: {
        Args: {
          p_error?: string
          p_evidence_id: string
          p_storage_path: string
        }
        Returns: Json
      }
      attach_order_receipt_v3: {
        Args: {
          p_method_id: string
          p_order_id: number
          p_storage_path: string
        }
        Returns: Json
      }
      attach_public_order_evidence_v1: {
        Args: {
          p_client_request_id: string
          p_error?: string
          p_evidence_id: string
          p_order_id: number
          p_storage_path: string
        }
        Returns: Json
      }
      branch_inventory_enforce_on_sale: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      can_override_delivery_fee: {
        Args: { p_user_role: string }
        Returns: boolean
      }
      cash_add_movement: {
        Args: {
          p_amount: number
          p_description: string
          p_expense_kind?: string
          p_order_id?: number
          p_payment_method?: string
          p_shift_id: string
          p_type: string
        }
        Returns: Json
      }
      cash_open_shift: {
        Args: { p_branch_id: string; p_opening_balance: number }
        Returns: Json
      }
      compute_order_coupon_discount: {
        Args: {
          p_client_phone?: string
          p_company_id: string
          p_coupon_code: string
          p_exclude_order_id?: number
          p_subtotal: number
        }
        Returns: Json
      }
      compute_order_tax: {
        Args: {
          p_subtotal: number
          p_tax_included?: boolean
          p_tax_rate: number
        }
        Returns: number
      }
      count_pending_payment_evidence_v2: {
        Args: { p_shift_id: string }
        Returns: number
      }
      create_manual_order_atomic_v1: {
        Args: {
          p_branch_id: string
          p_client_id?: string
          p_client_name: string
          p_client_phone: string
          p_client_request_id: string
          p_client_rut: string
          p_company_id: string
          p_coupon_code: string
          p_currency: string
          p_delivery_address: Json
          p_delivery_fee: number
          p_delivery_fee_minor: number
          p_items: Json
          p_manual_order_mode?: string
          p_note: string
          p_order_type: string
          p_payment_breakdown: Json
          p_payment_method_specific: string
          p_payment_ref: string
          p_payment_timing?: string
          p_payment_type: string
          p_register_payment: boolean
          p_status: string
          p_total: number
          p_total_minor: number
        }
        Returns: Json
      }
      create_manual_order_v2: {
        Args: {
          p_branch_id: string
          p_client_request_id: string
          p_coupon_code: string
          p_customer: Json
          p_delivery: Json
          p_fulfillment: string
          p_items: Json
          p_mode: string
          p_note: string
          p_operator_reference: string
          p_payment_lines: Json
          p_payment_timing: string
          p_quote_hash: string
        }
        Returns: Json
      }
      create_menu_order_atomic_v1: {
        Args: {
          p_branch_id: string
          p_client_name: string
          p_client_phone: string
          p_client_request_id: string
          p_client_rut: string
          p_coupon_code?: string
          p_currency: string
          p_delivery_address?: Json
          p_delivery_fee_minor?: number
          p_items: Json
          p_note: string
          p_order_type: string
          p_payment_method_specific: string
          p_total_minor: number
        }
        Returns: Json
      }
      create_order_transaction: {
        Args: {
          p_branch_id: string
          p_client_id?: string
          p_client_name: string
          p_client_phone: string
          p_client_rut: string
          p_company_id: string
          p_coupon_code?: string
          p_delivery_address?: Json
          p_delivery_fee?: number
          p_items: Json
          p_note: string
          p_order_origin?: string
          p_order_type?: string
          p_payment_breakdown?: Json
          p_payment_method_specific?: string
          p_payment_ref: string
          p_payment_type: string
          p_status: string
          p_total: number
        }
        Returns: Json
      }
      create_role_definition: {
        Args: { p_description?: string; p_name: string }
        Returns: {
          description: string
          id: string
          is_system: boolean
          name: string
        }[]
      }
      current_user_company_id: { Args: never; Returns: string }
      current_user_profile: {
        Args: never
        Returns: {
          company_id: string
          role: string
          user_id: string
        }[]
      }
      delete_role_definition: {
        Args: { p_role_id: string }
        Returns: undefined
      }
      ensure_order_lines_v3: {
        Args: { p_order_id: number }
        Returns: undefined
      }
      format_cl_phone_display: { Args: { p_phone: string }; Returns: string }
      get_cart_branch_prices: {
        Args: { p_branch_id: string; p_product_ids: string[] }
        Returns: {
          discount_price: number
          has_discount: boolean
          price: number
          product_description: string
          product_id: string
          product_is_active: boolean
          product_name: string
        }[]
      }
      get_company_health: {
        Args: { p_company_id: string }
        Returns: {
          active_branches: number
          last_order_at: string
          total_orders: number
          total_revenue: number
        }[]
      }
      get_current_user: { Args: never; Returns: string }
      get_current_user_roles: { Args: never; Returns: string[] }
      get_public_branches: {
        Args: { p_company_slug: string }
        Returns: {
          account_email: string
          account_holder: string
          account_number: string
          account_rut: string
          account_type: string
          address: string
          bank_name: string
          company_id: string
          delivery_settings: Json
          id: string
          instagram_url: string
          map_url: string
          name: string
          origin_lat: number
          origin_lng: number
          phone: string
          schedule: string
          slug: string
          whatsapp_url: string
        }[]
      }
      get_public_menu: {
        Args: { p_branch_id: string; p_company_slug: string }
        Returns: {
          categories: Json
          product_branch: Json
          product_prices: Json
          products: Json
        }[]
      }
      get_user_company: { Args: never; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      increment_expected_balance: {
        Args: { amount: number; shift_id: string }
        Returns: undefined
      }
      increment_shift_balance: {
        Args: { amount_param: number; shift_id_param: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_cashier: { Args: never; Returns: boolean }
      is_ceo: { Args: never; Returns: boolean }
      is_saas_admin_mutator: { Args: never; Returns: boolean }
      is_saas_admin_reader: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_valid_uuid: { Args: { p_val: string }; Returns: boolean }
      lookup_cart_upsell_catalog_row: {
        Args: { p_delivery_settings: Json; p_item_id: string }
        Returns: Json
      }
      lookup_named_area_delivery_fee: {
        Args: { p_delivery_settings: Json; p_named_area_id: string }
        Returns: number
      }
      manual_order_actor: { Args: never; Returns: Json }
      manual_order_branch_allowed: {
        Args: { p_actor: Json; p_branch_id: string }
        Returns: boolean
      }
      manual_order_currency_digits: {
        Args: { p_currency: string; p_override?: number }
        Returns: number
      }
      manual_order_payment_method_id: {
        Args: { p_method: string }
        Returns: string
      }
      manual_order_quote_hash: { Args: { p_quote: Json }; Returns: string }
      manual_order_validate_document: {
        Args: { p_country: string; p_document: string }
        Returns: boolean
      }
      mark_order_payment_evidence_uploading_v2: {
        Args: { p_evidence_id: string }
        Returns: Json
      }
      normalize_cl_phone_digits: { Args: { p_phone: string }; Returns: string }
      normalize_payment_breakdown_for_total: {
        Args: { p_payment_breakdown: Json; p_total: number }
        Returns: Json
      }
      order_analytics_infer_method: {
        Args: { p_payment_method_specific: string; p_payment_type: string }
        Returns: string
      }
      order_analytics_payment_breakdown: {
        Args: {
          p_payment_breakdown: Json
          p_payment_method_specific: string
          p_payment_type: string
          p_total: number
        }
        Returns: Json
      }
      order_currency_fraction_digits_v1: {
        Args: { p_currency: string }
        Returns: number
      }
      order_item_unit_minor_v3: {
        Args: { p_currency: string; p_item: Json }
        Returns: number
      }
      order_line_identity_v3: { Args: { p_item: Json }; Returns: Json }
      order_line_status_v3: {
        Args: {
          p_current?: string
          p_ordered: number
          p_prepared: number
          p_preparing: number
          p_served: number
          p_voided: number
        }
        Returns: string
      }
      order_major_to_minor_v1: {
        Args: { p_amount: number; p_currency: string }
        Returns: number
      }
      order_sequence_group: {
        Args: {
          p_channel: string
          p_client_name: string
          p_delivery_address?: Json
          p_delivery_fee?: number
          p_handoff_code?: string
        }
        Returns: string
      }
      payment_method_key_v3: { Args: { p_method: string }; Returns: string }
      payment_method_policy_v3: {
        Args: {
          p_accounting_currency: string
          p_company_id: string
          p_method_id: string
        }
        Returns: Json
      }
      quote_manual_order_v2: {
        Args: {
          p_branch_id: string
          p_client_phone?: string
          p_coupon_code?: string
          p_delivery?: Json
          p_fulfillment: string
          p_items: Json
        }
        Returns: Json
      }
      rebuild_users_role_check_from_definitions: {
        Args: never
        Returns: undefined
      }
      recalculate_cash_shift_totals_v1: {
        Args: { p_shift_id: string }
        Returns: undefined
      }
      record_manual_order_metric_v1: {
        Args: {
          p_branch_id: string
          p_event_name: string
          p_fulfillment?: string
          p_mode?: string
          p_step?: number
        }
        Returns: undefined
      }
      refund_order_payment_v2: {
        Args: {
          p_amount_minor: number
          p_client_request_id: string
          p_order_id: string
          p_payment_line_id: string
          p_reason: string
        }
        Returns: Json
      }
      resolve_branch_tax_settings: {
        Args: { p_branch_id: string }
        Returns: {
          currency: string
          tax_included: boolean
          tax_rate: number
        }[]
      }
      resolve_delivery_fee_for_role: {
        Args: {
          p_branch_id: string
          p_delivery_address: Json
          p_manual_override?: boolean
          p_requested_fee: number
          p_subtotal: number
          p_user_role: string
        }
        Returns: number
      }
      resolve_delivery_fee_for_role_legacy_v1: {
        Args: {
          p_branch_id: string
          p_delivery_address: Json
          p_manual_override?: boolean
          p_requested_fee: number
          p_subtotal: number
          p_user_role: string
        }
        Returns: number
      }
      resolve_public_slug_by_custom_domain: {
        Args: { p_host: string }
        Returns: {
          public_slug: string
        }[]
      }
      saas_staff_session_email_norm: { Args: never; Returns: string }
      settle_and_transition_manual_order_v2: {
        Args: {
          p_client_request_id: string
          p_order_id: string
          p_payment_lines: Json
          p_status: string
        }
        Returns: Json
      }
      settle_and_transition_order_atomic_v1: {
        Args: {
          p_client_request_id: string
          p_order_id: number
          p_payment_breakdown: Json
          p_payment_method_specific: string
          p_payment_type: string
          p_target_status?: string
        }
        Returns: Json
      }
      settle_order_payment_v3: {
        Args: {
          p_client_request_id: string
          p_order_id: number
          p_payment_lines: Json
          p_source?: string
        }
        Returns: Json
      }
      settle_order_v2: {
        Args: {
          p_client_request_id: string
          p_order_id: string
          p_payment_lines: Json
        }
        Returns: Json
      }
      transition_order_line_v3: {
        Args: {
          p_client_request_id: string
          p_expected_version: number
          p_order_id: number
          p_order_line_id: string
          p_quantity: number
          p_target_status: string
        }
        Returns: Json
      }
      transition_order_v2: {
        Args: {
          p_expected_updated_at?: string
          p_order_id: string
          p_status: string
        }
        Returns: Json
      }
      update_manual_order_v2: {
        Args: {
          p_expected_updated_at: string
          p_order_id: string
          p_patch: Json
        }
        Returns: Json
      }
      update_order_transaction: {
        Args: {
          p_client_name: string
          p_client_phone: string
          p_client_rut: string
          p_coupon_code?: string
          p_delivery_address?: Json
          p_delivery_fee?: number
          p_items: Json
          p_note: string
          p_order_id: number
          p_order_type: string
          p_payment_breakdown?: Json
          p_payment_type: string
        }
        Returns: Json
      }
      update_order_v3: {
        Args: {
          p_client_request_id: string
          p_expected_updated_at: string
          p_order_id: number
          p_patch: Json
        }
        Returns: Json
      }
      update_role_definition: {
        Args: { p_description?: string; p_name: string; p_role_id: string }
        Returns: {
          description: string
          id: string
          is_system: boolean
          name: string
        }[]
      }
      upsert_client_delivery_address: {
        Args: {
          p_client_id: string
          p_company_id: string
          p_delivery_address: Json
          p_delivery_km?: number
        }
        Returns: undefined
      }
      validate_and_normalize_order_items: {
        Args: { p_branch_id: string; p_items: Json }
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
