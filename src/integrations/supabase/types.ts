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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          name: string
          points_reward: number
        }
        Insert: {
          category: string
          created_at?: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id?: string
          name: string
          points_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          name?: string
          points_reward?: number
        }
        Relationships: []
      }
      book_content: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          book_id: string
          created_at: string | null
          description: string
          id: string
          key_characters: Json | null
          plot_points: Json | null
          subjects: string[] | null
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          book_id: string
          created_at?: string | null
          description: string
          id?: string
          key_characters?: Json | null
          plot_points?: Json | null
          subjects?: string[] | null
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          book_id?: string
          created_at?: string | null
          description?: string
          id?: string
          key_characters?: Json | null
          plot_points?: Json | null
          subjects?: string[] | null
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_content_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          age_max: number | null
          age_min: number | null
          author: string | null
          cover_url: string | null
          created_at: string
          id: string
          language: string | null
          open_library_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          author?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          language?: string | null
          open_library_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          author?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          language?: string | null
          open_library_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          age_band: string | null
          book_id: string | null
          event_type: string
          id: string
          score: number | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          age_band?: string | null
          book_id?: string | null
          event_type: string
          id?: string
          score?: number | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          age_band?: string | null
          book_id?: string | null
          event_type?: string
          id?: string
          score?: number | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_relationships: {
        Row: {
          approved_at: string | null
          created_at: string | null
          guardian_id: string
          id: string
          invitation_code: string | null
          relationship_type: string
          status: string
          student_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          guardian_id: string
          id?: string
          invitation_code?: string | null
          relationship_type: string
          status?: string
          student_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          guardian_id?: string
          id?: string
          invitation_code?: string | null
          relationship_type?: string
          status?: string
          student_id?: string
        }
        Relationships: []
      }
      popular_books: {
        Row: {
          book_id: string
          created_at: string
          id: string
          ranking: number
          region: string | null
          typical_grade: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          ranking: number
          region?: string | null
          typical_grade?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          ranking?: number
          region?: string | null
          typical_grade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popular_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_history: {
        Row: {
          book_id: string
          completed_at: string
          difficulty: string
          id: string
          points_earned: number
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string
          difficulty: string
          id?: string
          points_earned: number
          score: number
          total_questions: number
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string
          difficulty?: string
          id?: string
          points_earned?: number
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_history_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_templates: {
        Row: {
          age_band: string
          book_id: string
          content_quality_score: number | null
          content_source: string | null
          created_at: string
          difficulty: string
          id: string
          num_questions: number
          questions_json: Json
          source: string | null
          user_ratings: Json | null
        }
        Insert: {
          age_band: string
          book_id: string
          content_quality_score?: number | null
          content_source?: string | null
          created_at?: string
          difficulty: string
          id?: string
          num_questions: number
          questions_json: Json
          source?: string | null
          user_ratings?: Json | null
        }
        Update: {
          age_band?: string
          book_id?: string
          content_quality_score?: number | null
          content_source?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          num_questions?: number
          questions_json?: Json
          source?: string | null
          user_ratings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_templates_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      request_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          added_by: string
          age_max: number | null
          age_min: number | null
          approved: boolean | null
          approved_by: string | null
          author: string | null
          cover_url: string | null
          created_at: string | null
          id: string
          merged_to_book_id: string | null
          title: string
        }
        Insert: {
          added_by: string
          age_max?: number | null
          age_min?: number | null
          approved?: boolean | null
          approved_by?: string | null
          author?: string | null
          cover_url?: string | null
          created_at?: string | null
          id?: string
          merged_to_book_id?: string | null
          title: string
        }
        Update: {
          added_by?: string
          age_max?: number | null
          age_min?: number | null
          approved?: boolean | null
          approved_by?: string | null
          author?: string | null
          cover_url?: string | null
          created_at?: string | null
          id?: string
          merged_to_book_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_merged_to_book_id_fkey"
            columns: ["merged_to_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contributions: {
        Row: {
          contribution_type: string
          created_at: string | null
          id: string
          reference_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          contribution_type: string
          created_at?: string | null
          id?: string
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          contribution_type?: string
          created_at?: string | null
          id?: string
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_quiz_questions: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          book_id: string
          correct_index: number
          correct_rate: number | null
          created_at: string | null
          created_by: string
          difficulty: string
          id: string
          options: string[]
          question_text: string
          times_used: number | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          book_id: string
          correct_index: number
          correct_rate?: number | null
          created_at?: string | null
          created_by: string
          difficulty: string
          id?: string
          options: string[]
          question_text: string
          times_used?: number | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          book_id?: string
          correct_index?: number
          correct_rate?: number | null
          created_at?: string | null
          created_by?: string
          difficulty?: string
          id?: string
          options?: string[]
          question_text?: string
          times_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_questions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          books_read: number
          created_at: string
          current_streak: number
          id: string
          last_quiz_date: string | null
          longest_streak: number
          quizzes_completed: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          books_read?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_quiz_date?: string | null
          longest_streak?: number
          quizzes_completed?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          books_read?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_quiz_date?: string | null
          longest_streak?: number
          quizzes_completed?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_videos: {
        Row: {
          book_id: string
          channel_title: string | null
          created_at: string
          id: string
          is_made_for_kids: boolean | null
          last_checked_at: string
          safe_search_level: string | null
          thumbnail_url: string | null
          title: string | null
          youtube_video_id: string
        }
        Insert: {
          book_id: string
          channel_title?: string | null
          created_at?: string
          id?: string
          is_made_for_kids?: boolean | null
          last_checked_at?: string
          safe_search_level?: string | null
          thumbnail_url?: string | null
          title?: string | null
          youtube_video_id: string
        }
        Update: {
          book_id?: string
          channel_title?: string | null
          created_at?: string
          id?: string
          is_made_for_kids?: boolean | null
          last_checked_at?: string
          safe_search_level?: string | null
          thumbnail_url?: string | null
          title?: string | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_videos_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      parent_dashboard_summary: {
        Row: {
          books_read: number | null
          current_streak: number | null
          display_name: string | null
          guardian_id: string | null
          last_quiz_date: string | null
          longest_streak: number | null
          quizzes_completed: number | null
          student_id: string | null
          total_points: number | null
        }
        Relationships: []
      }
      popular_books_dynamic: {
        Row: {
          age_max: number | null
          age_min: number | null
          author: string | null
          avg_score: number | null
          book_id: string | null
          cover_url: string | null
          last_quiz_at: string | null
          quiz_count: number | null
          ranking: number | null
          title: string | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_request_logs: { Args: never; Returns: undefined }
      count_active_users_today: { Args: never; Returns: number }
      get_average_quiz_score: { Args: never; Returns: number }
      get_book_utilization: {
        Args: never
        Returns: {
          books_with_quizzes: number
          percentage: number
          total_books: number
        }[]
      }
      get_popular_books_dynamic: {
        Args: never
        Returns: {
          age_max: number
          age_min: number
          author: string
          avg_score: number
          book_id: string
          cover_url: string
          last_quiz_at: string
          quiz_count: number
          ranking: number
          title: string
          unique_users: number
        }[]
      }
      get_user_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avg_score: number
          display_name: string
          last_active: string
          quizzes_completed: number
          total_points: number
          user_id: string
        }[]
      }
      get_weekly_active_users: {
        Args: never
        Returns: {
          active_users: number
          activity_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_book_popularity: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      is_guardian_of: { Args: { _student_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "student" | "parent" | "teacher" | "admin"
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
      app_role: ["student", "parent", "teacher", "admin"],
    },
  },
} as const
