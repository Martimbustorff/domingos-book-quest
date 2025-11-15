export interface Book {
  id: string;
  title: string;
  author?: string;
  cover_url?: string;
  age_min?: number;
  age_max?: number;
  language?: string;
  open_library_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PopularBook {
  book_id: string;
  title: string;
  author?: string;
  cover_url?: string;
  age_min?: number;
  age_max?: number;
  ranking: number;
  quiz_count: number;
  unique_users: number;
  avg_score: number | null;
  last_quiz_at?: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  quizzes_completed: number;
  books_read: number;
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChildData {
  id: string;
  display_name: string;
  user_id: string;
  total_points: number;
  quizzes_completed: number;
  current_streak: number;
  last_quiz_date: string | null;
  relationship_type: string;
}

export interface QuizResult {
  user_id: string;
  book_id: string;
  score: number;
  total_questions: number;
  difficulty: string;
  points_earned: number;
  completed_at: string;
}
