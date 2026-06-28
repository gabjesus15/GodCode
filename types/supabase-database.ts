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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
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
          type: string
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
        Relationships: []
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
      backup_product_prices: {
        Row: {
          company_id: string | null
          created_at: string | null
          discount_price: number | null
          has_discount: boolean | null
          id: string | null
          is_active: boolean | null
          price: number | null
          product_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          discount_price?: number | null
          has_discount?: boolean | null
          id?: string | null
          is_active?: boolean | null
          price?: number | null
          product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          discount_price?: number | null
          has_discount?: boolean | null
          id?: string | null
          is_active?: boolean | null
          price?: number | null
          product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_special: boolean | null
          name: string | null
          price: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_special?: boolean | null
          name?: string | null
          price?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_special?: boolean | null
          name?: string | null
          price?: number | null
        }
        Relationships: []
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
            isOneToOne: false
            referencedRelation: "branches"
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
          /** ADMIN-HOOK: JSON rules for delivery; use parseDeliverySettings in app */
          delivery_settings: Json | null
          efectivo: string | null
          id: string
          instagram: string | null
          instagram_url: string | null
          is_active: boolean | null
          map_url: string | null
          mercadopago: string | null
          name: string
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
          whatsapp_url: string | null
          zelle: string | null
          order_intake_paused: boolean | null
          order_intake_pause_message: string | null
          order_intake_paused_at: string | null
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
          map_url?: string | null
          mercadopago?: string | null
          name: string
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
          whatsapp_url?: string | null
          zelle?: string | null
          order_intake_paused?: boolean | null
          order_intake_pause_message?: string | null
          order_intake_paused_at?: string | null
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
          map_url?: string | null
          mercadopago?: string | null
          name?: string
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
          whatsapp_url?: string | null
          zelle?: string | null
          order_intake_paused?: boolean | null
          order_intake_pause_message?: string | null
          order_intake_paused_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_fk"
            columns: ["company_id"]
            isOneToOne: false
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
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          order_id: number | null
          payment_method: string | null
          shift_id: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: number | null
          payment_method?: string | null
          shift_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: number | null
          payment_method?: string | null
          shift_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
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
            foreignKeyName: "cash_reconciliations_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_shift_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_shifts: {
        Row: {
          actual_balance: number | null
          branch_id: string | null
          cash_difference: number | null
          closed_at: string | null
          closed_by: string | null
          closed_by_admin_id: string | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          expected_balance: number | null
          expected_cash: number | null
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
          branch_id?: string | null
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_admin_id?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_balance?: number | null
          expected_cash?: number | null
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
          branch_id?: string | null
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_admin_id?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_balance?: number | null
          expected_cash?: number | null
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
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "categories_company_fk"
            columns: ["company_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_branch_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_branch_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string | null
          created_at: string | null
          first_order_at: string | null
          id: string
          is_frequent: boolean | null
          last_order_at: string | null
          name: string | null
          phone: string
          rut: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          first_order_at?: string | null
          id?: string
          is_frequent?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone: string
          rut?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          first_order_at?: string | null
          id?: string
          is_frequent?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone?: string
          rut?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
          /** Integraciones por empresa (Uber OAuth cifrado, etc.). */
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
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            isOneToOne: false
            referencedRelation: "onboarding_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
          sort_order: number
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "hero_banners_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_banners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
            foreignKeyName: "inventory_branch_branch_fk"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_branch_item_fk"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          company_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          min_stock: number | null
          name: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          min_stock?: number | null
          name: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          min_stock?: number | null
          name?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_application_addons_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
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
          ip_address: unknown
          legal_name: string | null
          logo_url: string | null
          message: string | null
          notes: string | null
          payment_reference: string | null
          payment_reference_url: string | null
          payment_months: number | null
          payment_amount: number | null
          payment_status: string | null
          payment_methods: string[] | null
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
          ip_address?: unknown
          legal_name?: string | null
          logo_url?: string | null
          message?: string | null
          notes?: string | null
          payment_reference?: string | null
          payment_reference_url?: string | null
          payment_months?: number | null
          payment_amount?: number | null
          payment_status?: string | null
          payment_methods?: string[] | null
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
          ip_address?: unknown
          legal_name?: string | null
          logo_url?: string | null
          message?: string | null
          notes?: string | null
          payment_reference?: string | null
          payment_reference_url?: string | null
          payment_months?: number | null
          payment_amount?: number | null
          payment_status?: string | null
          payment_methods?: string[] | null
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
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_applications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
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
            foreignKeyName: "order_items_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_method_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_shift_fkey"
            columns: ["shift_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          channel: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_rut: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          discount_total: number | null
          handoff_code: string | null
          id: number
          items: Json | null
          note: string | null
          order_number: number | null
          order_type: string | null
          paid_status: string | null
          payment_method_specific: string | null
          payment_ref: string | null
          payment_type: string | null
          scheduled_for: string | null
          status: string | null
          subtotal: number | null
          table_number: string | null
          tax_total: number | null
          tip_amount: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_rut?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount_total?: number | null
          handoff_code?: string | null
          id?: number
          items?: Json | null
          note?: string | null
          order_number?: number | null
          order_type?: string | null
          paid_status?: string | null
          payment_method_specific?: string | null
          payment_ref?: string | null
          payment_type?: string | null
          scheduled_for?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_total?: number | null
          tip_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_rut?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount_total?: number | null
          handoff_code?: string | null
          id?: number
          items?: Json | null
          note?: string | null
          order_number?: number | null
          order_type?: string | null
          paid_status?: string | null
          payment_method_specific?: string | null
          payment_ref?: string | null
          payment_type?: string | null
          scheduled_for?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_total?: number | null
          tip_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          method_name: string
          requires_receipt: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          method_name: string
          requires_receipt?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          method_name?: string
          requires_receipt?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_history: {
        Row: {
          amount_paid: number
          company_id: string
          id: string
          months_paid: number
          payment_date: string | null
          payment_method: string | null
          payment_method_slug: string | null
          payment_reference: string | null
          plan_id: string
          reference_file_url: string | null
          status: string | null
        }
        Insert: {
          amount_paid: number
          company_id: string
          id?: string
          months_paid?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_method_slug?: string | null
          payment_reference?: string | null
          plan_id: string
          reference_file_url?: string | null
          status?: string | null
        }
        Update: {
          amount_paid?: number
          company_id?: string
          id?: string
          months_paid?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_method_slug?: string | null
          payment_reference?: string | null
          plan_id?: string
          reference_file_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
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
            isOneToOne: false
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
          max_branches: number
          max_users: number
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          max_branches?: number
          max_users?: number
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          max_branches?: number
          max_users?: number
          name?: string
          price?: number
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
          is_active?: boolean
          is_special?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_branch_branch_fk"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_branch_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_branch_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_branch_product_fk"
            columns: ["product_id"]
            isOneToOne: false
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
          price: number
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
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_fk"
            columns: ["company_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "saas_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_broadcast_reads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
            isOneToOne: false
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
          role: string
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
            foreignKeyName: "fk_users_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
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
      admin_reorder_categories:
        | {
            Args: { p_branch_id: string; p_category_ids: string[] }
            Returns: undefined
          }
        | { Args: { p_category_ids: string[] }; Returns: undefined }
      admin_set_category_order:
        | {
            Args: {
              p_branch_id: string
              p_category_id: string
              p_new_order: number
            }
            Returns: undefined
          }
        | {
            Args: { p_category_id: string; p_new_order: number }
            Returns: undefined
          }
      admin_upsert_product_with_branch: {
        Args: {
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
      assign_dorante_to_company: { Args: never; Returns: string }
      cash_add_movement: {
        Args: {
          p_amount: number
          p_description: string
          p_order_id?: number
          p_payment_method: string
          p_shift_id: string
          p_type: string
        }
        Returns: Json
      }
      cash_open_shift: {
        Args: { p_branch_id: string; p_opening_balance: number }
        Returns: Json
      }
      create_order_transaction: {
        Args: {
          p_branch_id: string
          p_client_name: string
          p_client_phone: string
          p_client_rut: string
          p_company_id: string
          p_coupon_code?: string | null
          p_delivery_address?: Json
          p_delivery_fee?: number
          p_items: Json
          p_note: string
          p_order_origin?: string | null
          p_order_type?: string
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
          delivery_settings: Json | null
          id: string
          instagram_url: string
          map_url: string
          name: string
          origin_lat: number | null
          origin_lng: number | null
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
      is_super_admin: { Args: never; Returns: boolean }
      rebuild_users_role_check_from_definitions: {
        Args: never
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
