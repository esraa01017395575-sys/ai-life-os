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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          smart_cards: Json | null
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          smart_cards?: Json | null
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          smart_cards?: Json | null
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quotes: {
        Row: {
          created_at: string
          id: string
          quote_date: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_date?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_date?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          content: string | null
          created_at: string
          id: string
          source_id: string | null
          source_type: string
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          source_id?: string | null
          source_type: string
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          count: number
          created_at: string
          habit_id: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          best_streak: number
          category: string | null
          created_at: string
          emoji: string
          frequency: string
          id: string
          last_completed_on: string | null
          reminder_time: string | null
          reminders: number[]
          streak: number
          target_per_day: number
          title: string
          updated_at: string
          user_id: string
          xp_per_complete: number
        }
        Insert: {
          active?: boolean
          best_streak?: number
          category?: string | null
          created_at?: string
          emoji?: string
          frequency?: string
          id?: string
          last_completed_on?: string | null
          reminder_time?: string | null
          reminders?: number[]
          streak?: number
          target_per_day?: number
          title: string
          updated_at?: string
          user_id: string
          xp_per_complete?: number
        }
        Update: {
          active?: boolean
          best_streak?: number
          category?: string | null
          created_at?: string
          emoji?: string
          frequency?: string
          id?: string
          last_completed_on?: string | null
          reminder_time?: string | null
          reminders?: number[]
          streak?: number
          target_per_day?: number
          title?: string
          updated_at?: string
          user_id?: string
          xp_per_complete?: number
        }
        Relationships: []
      }
      long_term_plans: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          progress: number
          scope: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          progress?: number
          scope?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          progress?: number
          scope?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      note_sections: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          order_index: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string
          content: string | null
          created_at: string
          id: string
          section_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: string | null
          created_at?: string
          id?: string
          section_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string | null
          created_at?: string
          id?: string
          section_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "note_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          plan_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          plan_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          plan_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_milestones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "long_term_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          duration_min: number
          ended_at: string | null
          id: string
          kind: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          duration_min?: number
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          duration_min?: number
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          language: string
          level: number
          mode: string
          name: string | null
          theme: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          level?: number
          mode?: string
          name?: string | null
          theme?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          level?: number
          mode?: string
          name?: string | null
          theme?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string | null
          category: string | null
          created_at: string
          id: string
          text_ar: string
          text_en: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string
          id?: string
          text_ar: string
          text_en: string
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string
          id?: string
          text_ar?: string
          text_en?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          order_index: number
          status: string
          task_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          status?: string
          task_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          status?: string
          task_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_min: number
          attachments: Json
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_min: number | null
          id: string
          milestone_id: string | null
          notes: string | null
          order_index: number
          pomodoro_break: number | null
          pomodoro_count: number
          pomodoro_work: number | null
          priority: string
          references_list: Json
          scheduled_at: string | null
          skip_count: number
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          actual_min?: number
          attachments?: Json
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_min?: number | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          order_index?: number
          pomodoro_break?: number | null
          pomodoro_count?: number
          pomodoro_work?: number | null
          priority?: string
          references_list?: Json
          scheduled_at?: string | null
          skip_count?: number
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          actual_min?: number
          attachments?: Json
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_min?: number | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          order_index?: number
          pomodoro_break?: number | null
          pomodoro_count?: number
          pomodoro_work?: number | null
          priority?: string
          references_list?: Json
          scheduled_at?: string | null
          skip_count?: number
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "plan_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { p_user_id: string; p_xp: number }
        Returns: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          language: string
          level: number
          mode: string
          name: string | null
          theme: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_habit: {
        Args: { p_habit_id: string; p_user_id: string }
        Returns: {
          active: boolean
          best_streak: number
          category: string | null
          created_at: string
          emoji: string
          frequency: string
          id: string
          last_completed_on: string | null
          reminder_time: string | null
          reminders: number[]
          streak: number
          target_per_day: number
          title: string
          updated_at: string
          user_id: string
          xp_per_complete: number
        }
        SetofOptions: {
          from: "*"
          to: "habits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: {
          actual_min: number
          attachments: Json
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_min: number | null
          id: string
          milestone_id: string | null
          notes: string | null
          order_index: number
          pomodoro_break: number | null
          pomodoro_count: number
          pomodoro_work: number | null
          priority: string
          references_list: Json
          scheduled_at: string | null
          skip_count: number
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
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
