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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          module: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          module: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      cms_about: {
        Row: {
          content: string | null
          id: string
          section: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          section: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      cms_blogs: {
        Row: {
          blog_type: string
          content: string | null
          created_at: string
          file_attachments: string[] | null
          id: string
          images: string[] | null
          publish_date: string | null
          status: string
          title: string
          updated_at: string
          video_urls: string[] | null
        }
        Insert: {
          blog_type?: string
          content?: string | null
          created_at?: string
          file_attachments?: string[] | null
          id?: string
          images?: string[] | null
          publish_date?: string | null
          status?: string
          title: string
          updated_at?: string
          video_urls?: string[] | null
        }
        Update: {
          blog_type?: string
          content?: string | null
          created_at?: string
          file_attachments?: string[] | null
          id?: string
          images?: string[] | null
          publish_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          video_urls?: string[] | null
        }
        Relationships: []
      }
      cms_contact: {
        Row: {
          address: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          phone: string | null
          twitter: string | null
          updated_at: string
          youtube: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          phone?: string | null
          twitter?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          phone?: string | null
          twitter?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Relationships: []
      }
      cms_partners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          farm_code: string
          farm_type: Database["public"]["Enums"]["farm_type"]
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          other_species: string | null
          postal_code: string | null
          province: string
          status: Database["public"]["Enums"]["farm_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          farm_code: string
          farm_type?: Database["public"]["Enums"]["farm_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          other_species?: string | null
          postal_code?: string | null
          province: string
          status?: Database["public"]["Enums"]["farm_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          farm_code?: string
          farm_type?: Database["public"]["Enums"]["farm_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          other_species?: string | null
          postal_code?: string | null
          province?: string
          status?: Database["public"]["Enums"]["farm_status"]
          updated_at?: string
        }
        Relationships: []
      }
      price_aggregation: {
        Row: {
          avg_broiler_price: number | null
          avg_egg_price: number | null
          calculated_at: string
          farm_count: number | null
          id: string
          price_date: string
          province: string | null
          region: string
        }
        Insert: {
          avg_broiler_price?: number | null
          avg_egg_price?: number | null
          calculated_at?: string
          farm_count?: number | null
          id?: string
          price_date?: string
          province?: string | null
          region: string
        }
        Update: {
          avg_broiler_price?: number | null
          avg_egg_price?: number | null
          calculated_at?: string
          farm_count?: number | null
          id?: string
          price_date?: string
          province?: string | null
          region?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          house_address: string | null
          id: string
          phone: string | null
          province: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          work_address: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          house_address?: string | null
          id: string
          phone?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          work_address?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          house_address?: string | null
          id?: string
          phone?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          work_address?: string | null
        }
        Relationships: []
      }
      supply_records: {
        Row: {
          broiler_death: number | null
          broiler_input: number | null
          broiler_population: number | null
          broiler_price_per_kg: number | null
          broiler_sold: number | null
          created_at: string
          farm_id: string
          id: string
          layer_death: number | null
          layer_egg_price_per_kg: number | null
          layer_egg_production: number | null
          layer_input: number | null
          layer_population: number | null
          record_date: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          broiler_death?: number | null
          broiler_input?: number | null
          broiler_population?: number | null
          broiler_price_per_kg?: number | null
          broiler_sold?: number | null
          created_at?: string
          farm_id: string
          id?: string
          layer_death?: number | null
          layer_egg_price_per_kg?: number | null
          layer_egg_production?: number | null
          layer_input?: number | null
          layer_population?: number | null
          record_date?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          broiler_death?: number | null
          broiler_input?: number | null
          broiler_population?: number | null
          broiler_price_per_kg?: number | null
          broiler_sold?: number | null
          created_at?: string
          farm_id?: string
          id?: string
          layer_death?: number | null
          layer_egg_price_per_kg?: number | null
          layer_egg_production?: number | null
          layer_input?: number | null
          layer_population?: number | null
          record_date?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "dpp" | "dpw" | "peternak"
      audit_action: "create" | "edit" | "delete"
      farm_status: "active" | "renovation" | "inactive"
      farm_type:
        | "broiler"
        | "layer"
        | "mixed"
        | "other_cut"
        | "other_egg"
        | "other_mixed"
      user_status: "pending" | "approved" | "rejected"
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
      app_role: ["dpp", "dpw", "peternak"],
      audit_action: ["create", "edit", "delete"],
      farm_status: ["active", "renovation", "inactive"],
      farm_type: [
        "broiler",
        "layer",
        "mixed",
        "other_cut",
        "other_egg",
        "other_mixed",
      ],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
