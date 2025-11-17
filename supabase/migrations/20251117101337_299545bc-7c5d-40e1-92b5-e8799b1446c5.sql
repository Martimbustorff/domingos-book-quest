-- Create function to accurately count active users today (distinct users)
CREATE OR REPLACE FUNCTION public.count_active_users_today()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM quiz_history
  WHERE DATE(completed_at) = CURRENT_DATE;
$$;

-- Create function to get average quiz score
CREATE OR REPLACE FUNCTION public.get_average_quiz_score()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0)
  FROM quiz_history;
$$;

-- Create function to get book utilization stats
CREATE OR REPLACE FUNCTION public.get_book_utilization()
RETURNS TABLE(books_with_quizzes bigint, total_books bigint, percentage numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(DISTINCT qh.book_id) AS books_with_quizzes,
    (SELECT COUNT(*) FROM books) AS total_books,
    ROUND((COUNT(DISTINCT qh.book_id)::numeric / NULLIF((SELECT COUNT(*) FROM books), 0)) * 100, 1) AS percentage
  FROM quiz_history qh;
$$;

-- Create function to get weekly active users (last 7 days)
CREATE OR REPLACE FUNCTION public.get_weekly_active_users()
RETURNS TABLE(activity_date date, active_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    DATE(completed_at) AS activity_date,
    COUNT(DISTINCT user_id) AS active_users
  FROM quiz_history
  WHERE completed_at >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY DATE(completed_at)
  ORDER BY activity_date;
$$;

-- Create function to get user leaderboard
CREATE OR REPLACE FUNCTION public.get_user_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  total_points integer,
  quizzes_completed integer,
  avg_score numeric,
  last_active timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    us.user_id,
    p.display_name,
    us.total_points,
    us.quizzes_completed,
    ROUND(AVG(qh.score)::numeric, 1) AS avg_score,
    MAX(qh.completed_at) AS last_active
  FROM user_stats us
  LEFT JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN quiz_history qh ON qh.user_id = us.user_id
  GROUP BY us.user_id, p.display_name, us.total_points, us.quizzes_completed
  ORDER BY us.total_points DESC
  LIMIT limit_count;
$$;