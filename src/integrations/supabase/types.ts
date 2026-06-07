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
  public: {
    Tables: {
      addon_group_targets: {
        Row: {
          category_id: string | null
          created_at: string
          group_id: string
          id: string
          product_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          product_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          product_id?: string | null
        }
        Relationships: []
      }
      addon_groups: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          max_select: number
          min_select: number
          name: string
          required: boolean
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          max_select?: number
          min_select?: number
          name: string
          required?: boolean
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          max_select?: number
          min_select?: number
          name?: string
          required?: boolean
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      addon_options: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cep_ranges: {
        Row: {
          cep_end: string
          cep_start: string
          city: string
          created_at: string
          id: string
          neighborhood: string | null
          uf: string
        }
        Insert: {
          cep_end: string
          cep_start: string
          city: string
          created_at?: string
          id?: string
          neighborhood?: string | null
          uf: string
        }
        Update: {
          cep_end?: string
          cep_start?: string
          city?: string
          created_at?: string
          id?: string
          neighborhood?: string | null
          uf?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          id: string
          max_uses: number | null
          min_order_total: number
          tenant_id: string
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          id?: string
          max_uses?: number | null
          min_order_total?: number
          tenant_id: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_order_total?: number
          tenant_id?: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          cep_end: string | null
          cep_start: string | null
          city: string | null
          created_at: string
          estimated_minutes: number | null
          fee: number
          id: string
          min_order_total: number
          neighborhood: string
          tenant_id: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cep_end?: string | null
          cep_start?: string | null
          city?: string | null
          created_at?: string
          estimated_minutes?: number | null
          fee?: number
          id?: string
          min_order_total?: number
          neighborhood: string
          tenant_id: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cep_end?: string | null
          cep_start?: string | null
          city?: string | null
          created_at?: string
          estimated_minutes?: number | null
          fee?: number
          id?: string
          min_order_total?: number
          neighborhood?: string
          tenant_id?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          addons: Json
          created_at: string
          id: string
          name_snapshot: string
          note: string | null
          order_id: string
          product_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          addons?: Json
          created_at?: string
          id?: string
          name_snapshot: string
          note?: string | null
          order_id: string
          product_id?: string | null
          qty?: number
          unit_price: number
        }
        Update: {
          addons?: Json
          created_at?: string
          id?: string
          name_snapshot?: string
          note?: string | null
          order_id?: string
          product_id?: string | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          order_id: string
          previous_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          order_id: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          order_id?: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address: Json | null
          cancel_reason: string | null
          cancelled_at: string | null
          change_for: number | null
          completed_at: string | null
          coupon_code: string | null
          created_at: string
          customer_name: string
          delivery_fee: number
          delivery_fee_source: string | null
          delivery_neighborhood_snapshot: string | null
          discount_amount: number
          id: string
          mode: Database["public"]["Enums"]["order_mode"]
          mp_payment_id: string | null
          mp_status: string | null
          mp_status_detail: string | null
          note: string | null
          number: number
          payment_label: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_time: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_label: string | null
          tenant_id: string
          total: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          accepted_at?: string | null
          address?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          change_for?: number | null
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          delivery_fee?: number
          delivery_fee_source?: string | null
          delivery_neighborhood_snapshot?: string | null
          discount_amount?: number
          id?: string
          mode: Database["public"]["Enums"]["order_mode"]
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_status_detail?: string | null
          note?: string | null
          number: number
          payment_label?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_label?: string | null
          tenant_id: string
          total?: number
          updated_at?: string
          whatsapp: string
        }
        Update: {
          accepted_at?: string | null
          address?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          change_for?: number | null
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          delivery_fee_source?: string | null
          delivery_neighborhood_snapshot?: string | null
          discount_amount?: number
          id?: string
          mode?: Database["public"]["Enums"]["order_mode"]
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_status_detail?: string | null
          note?: string | null
          number?: number
          payment_label?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_label?: string | null
          tenant_id?: string
          total?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payment_method: string
          provider: string
          provider_payment_id: string | null
          raw_response: Json | null
          status: string
          status_detail: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          provider?: string
          provider_payment_id?: string | null
          raw_response?: Json | null
          status?: string
          status_detail?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          provider?: string
          provider_payment_id?: string | null
          raw_response?: Json | null
          status?: string
          status_detail?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_settings: {
        Row: {
          auto_connect: boolean
          connection_type: string
          created_at: string
          cut_type: string
          escpos_profile: string
          feed_lines: number
          font_size: string
          id: string
          paper_width: string
          printer_model: string
          printer_name: string
          separator_char: string
          show_address: boolean
          show_document: boolean
          show_instagram: boolean
          show_pix: boolean
          show_store_name: boolean
          show_thank_message: boolean
          show_whatsapp: boolean
          tenant_id: string
          thank_message: string
          updated_at: string
          use_bold_titles: boolean
          use_double_total: boolean
        }
        Insert: {
          auto_connect?: boolean
          connection_type?: string
          created_at?: string
          cut_type?: string
          escpos_profile?: string
          feed_lines?: number
          font_size?: string
          id?: string
          paper_width?: string
          printer_model?: string
          printer_name?: string
          separator_char?: string
          show_address?: boolean
          show_document?: boolean
          show_instagram?: boolean
          show_pix?: boolean
          show_store_name?: boolean
          show_thank_message?: boolean
          show_whatsapp?: boolean
          tenant_id: string
          thank_message?: string
          updated_at?: string
          use_bold_titles?: boolean
          use_double_total?: boolean
        }
        Update: {
          auto_connect?: boolean
          connection_type?: string
          created_at?: string
          cut_type?: string
          escpos_profile?: string
          feed_lines?: number
          font_size?: string
          id?: string
          paper_width?: string
          printer_model?: string
          printer_name?: string
          separator_char?: string
          show_address?: boolean
          show_document?: boolean
          show_instagram?: boolean
          show_pix?: boolean
          show_store_name?: boolean
          show_thank_message?: boolean
          show_whatsapp?: boolean
          tenant_id?: string
          thank_message?: string
          updated_at?: string
          use_bold_titles?: boolean
          use_double_total?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "printer_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addons: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_flavors: {
        Row: {
          available: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          price_delta: number
          product_id: string
          sort_order: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_delta?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_delta?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_sizes: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          allow_observations: boolean
          available: boolean
          category_id: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          max_flavors: number | null
          name: string
          prep_time: string | null
          price: number
          promo_price: number | null
          sort_order: number
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          allow_observations?: boolean
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          max_flavors?: number | null
          name: string
          prep_time?: string | null
          price: number
          promo_price?: number | null
          sort_order?: number
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          allow_observations?: boolean
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          max_flavors?: number | null
          name?: string
          prep_time?: string | null
          price?: number
          promo_price?: number | null
          sort_order?: number
          tenant_id?: string
          type?: string
          updated_at?: string
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
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          must_change_password: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          must_change_password?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_settings: {
        Row: {
          card_on_delivery_enabled: boolean
          cash_enabled: boolean
          created_at: string
          credit_card_enabled: boolean
          debit_card_enabled: boolean
          id: string
          mp_access_token_encrypted: string | null
          mp_account_kind: string | null
          mp_connected: boolean
          mp_last_validated_at: string | null
          mp_live_mode: boolean
          mp_public_key: string | null
          mp_user_id: string | null
          pix_enabled: boolean
          pix_manual_enabled: boolean
          pix_manual_key: string | null
          pix_manual_key_type: string | null
          pix_manual_receiver: string | null
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          card_on_delivery_enabled?: boolean
          cash_enabled?: boolean
          created_at?: string
          credit_card_enabled?: boolean
          debit_card_enabled?: boolean
          id?: string
          mp_access_token_encrypted?: string | null
          mp_account_kind?: string | null
          mp_connected?: boolean
          mp_last_validated_at?: string | null
          mp_live_mode?: boolean
          mp_public_key?: string | null
          mp_user_id?: string | null
          pix_enabled?: boolean
          pix_manual_enabled?: boolean
          pix_manual_key?: string | null
          pix_manual_key_type?: string | null
          pix_manual_receiver?: string | null
          provider?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          card_on_delivery_enabled?: boolean
          cash_enabled?: boolean
          created_at?: string
          credit_card_enabled?: boolean
          debit_card_enabled?: boolean
          id?: string
          mp_access_token_encrypted?: string | null
          mp_account_kind?: string | null
          mp_connected?: boolean
          mp_last_validated_at?: string | null
          mp_live_mode?: boolean
          mp_public_key?: string | null
          mp_user_id?: string | null
          pix_enabled?: boolean
          pix_manual_enabled?: boolean
          pix_manual_key?: string | null
          pix_manual_key_type?: string | null
          pix_manual_receiver?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_printers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          paper_width: string
          printer_name: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          paper_width?: string
          printer_name?: string
          role?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          paper_width?: string
          printer_name?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_printers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accepts_delivery: boolean
          accepts_dinein: boolean
          accepts_takeout: boolean
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          delivery_fee: number
          delivery_mode: string
          description: string | null
          hours: string | null
          hours_schedule: Json
          id: string
          logo_letter: string | null
          logo_url: string | null
          min_order: number
          name: string
          open: boolean
          open_mode: string
          plan: string
          pos_paper_width: string
          prep_time: string | null
          slug: string
          social: Json
          state: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          theme_from: string | null
          theme_to: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          accepts_delivery?: boolean
          accepts_dinein?: boolean
          accepts_takeout?: boolean
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_mode?: string
          description?: string | null
          hours?: string | null
          hours_schedule?: Json
          id?: string
          logo_letter?: string | null
          logo_url?: string | null
          min_order?: number
          name: string
          open?: boolean
          open_mode?: string
          plan?: string
          pos_paper_width?: string
          prep_time?: string | null
          slug: string
          social?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          theme_from?: string | null
          theme_to?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          accepts_delivery?: boolean
          accepts_dinein?: boolean
          accepts_takeout?: boolean
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_mode?: string
          description?: string | null
          hours?: string | null
          hours_schedule?: Json
          id?: string
          logo_letter?: string | null
          logo_url?: string | null
          min_order?: number
          name?: string
          open?: boolean
          open_mode?: string
          plan?: string
          pos_paper_width?: string
          prep_time?: string | null
          slug?: string
          social?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          theme_from?: string | null
          theme_to?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "staff" | "platform_admin"
      coupon_discount_type: "fixed" | "percent"
      order_mode: "entrega" | "retirada" | "consumo_local"
      order_status:
        | "novo"
        | "aceito"
        | "preparo"
        | "saiu_entrega"
        | "pronto_retirada"
        | "servido"
        | "finalizado"
        | "cancelado"
      payment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "refunded"
        | "manual"
      tenant_status: "ativa" | "teste" | "suspensa"
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
    Enums: {
      app_role: ["owner", "admin", "staff", "platform_admin"],
      coupon_discount_type: ["fixed", "percent"],
      order_mode: ["entrega", "retirada", "consumo_local"],
      order_status: [
        "novo",
        "aceito",
        "preparo",
        "saiu_entrega",
        "pronto_retirada",
        "servido",
        "finalizado",
        "cancelado",
      ],
      payment_status: ["pending", "approved", "rejected", "refunded", "manual"],
      tenant_status: ["ativa", "teste", "suspensa"],
    },
  },
} as const
