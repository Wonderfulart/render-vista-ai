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
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          stripe_payment_intent_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          stripe_payment_intent_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          stripe_payment_intent_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_queue: {
        Row: {
          created_at: string
          id: string
          priority: number
          project_id: string
          scene_id: string
          status: string
          updated_at: string
          user_id: string
          webhook_sent_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          project_id: string
          scene_id: string
          status?: string
          updated_at?: string
          user_id: string
          webhook_sent_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          project_id?: string
          scene_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          webhook_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_queue_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "video_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          high_contrast_mode: boolean
          id: string
          reduced_motion: boolean
          subscription_tier: string
          text_size_percent: number
          total_videos_created: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          high_contrast_mode?: boolean
          id?: string
          reduced_motion?: boolean
          subscription_tier?: string
          text_size_percent?: number
          total_videos_created?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          high_contrast_mode?: boolean
          id?: string
          reduced_motion?: boolean
          subscription_tier?: string
          text_size_percent?: number
          total_videos_created?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shot_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          movements: Json
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          movements?: Json
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          movements?: Json
          name?: string
        }
        Relationships: []
      }
      video_projects: {
        Row: {
          audio_duration_seconds: number | null
          created_at: string
          description: string | null
          final_video_url: string | null
          id: string
          master_audio_url: string | null
          master_character_url: string | null
          scenes_completed: number
          shot_template_id: string | null
          status: string
          title: string
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          created_at?: string
          description?: string | null
          final_video_url?: string | null
          id?: string
          master_audio_url?: string | null
          master_character_url?: string | null
          scenes_completed?: number
          shot_template_id?: string | null
          status?: string
          title?: string
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          created_at?: string
          description?: string | null
          final_video_url?: string | null
          id?: string
          master_audio_url?: string | null
          master_character_url?: string | null
          scenes_completed?: number
          shot_template_id?: string | null
          status?: string
          title?: string
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shot_template"
            columns: ["shot_template_id"]
            isOneToOne: false
            referencedRelation: "shot_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scenes: {
        Row: {
          ai_suggestions: Json | null
          audio_clip_url: string | null
          camera_movement: string
          camera_tier: string
          created_at: string
          error_message: string | null
          generation_cost: number
          id: string
          processing_completed_at: string | null
          processing_started_at: string | null
          project_id: string
          retry_count: number
          scene_index: number
          script_text: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          ai_suggestions?: Json | null
          audio_clip_url?: string | null
          camera_movement?: string
          camera_tier?: string
          created_at?: string
          error_message?: string | null
          generation_cost?: number
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id: string
          retry_count?: number
          scene_index: number
          script_text?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          ai_suggestions?: Json | null
          audio_clip_url?: string | null
          camera_movement?: string
          camera_tier?: string
          created_at?: string
          error_message?: string | null
          generation_cost?: number
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id?: string
          retry_count?: number
          scene_index?: number
          script_text?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clone_project: { Args: { source_project_id: string }; Returns: string }
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
