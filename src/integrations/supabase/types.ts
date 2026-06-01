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
          created_at: string
          customer_name: string
          delivery_fee: number
          id: string
          mode: Database["public"]["Enums"]["order_mode"]
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
          created_at?: string
          customer_name: string
          delivery_fee?: number
          id?: string
          mode: Database["public"]["Enums"]["order_mode"]
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
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          id?: string
          mode?: Database["public"]["Enums"]["order_mode"]
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
      products: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          name: string
          prep_time: string | null
          price: number
          promo_price: number | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          prep_time?: string | null
          price: number
          promo_price?: number | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          prep_time?: string | null
          price?: number
          promo_price?: number | null
          sort_order?: number
          tenant_id?: string
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
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
      tenants: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          delivery_fee: number
          description: string | null
          hours: string | null
          id: string
          logo_letter: string | null
          logo_url: string | null
          min_order: number
          name: string
          open: boolean
          plan: string
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
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          hours?: string | null
          id?: string
          logo_letter?: string | null
          logo_url?: string | null
          min_order?: number
          name: string
          open?: boolean
          plan?: string
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
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          hours?: string | null
          id?: string
          logo_letter?: string | null
          logo_url?: string | null
          min_order?: number
          name?: string
          open?: boolean
          plan?: string
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
