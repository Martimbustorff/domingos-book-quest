-- Phase 1: Migrate ALL Database Functions to Use Events Table

-- 1.1 Update count_active_users_today to use events
CREATE OR REPLACE FUNCTION public.count_active_users_today()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM events
  WHERE DATE(timestamp) = CURRENT_DATE
    AND user_id IS NOT NULL
    AND event_type IN ('quiz_started', 'quiz_completed');
$$;

-- 1.2 Update get_average_quiz_score to use events
CREATE OR REPLACE FUNCTION public.get_average_quiz_score()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0)
  FROM events
  WHERE event_type = 'quiz_completed' AND score IS NOT NULL;
$$;

-- 1.3 Update get_book_utilization to use events
CREATE OR REPLACE FUNCTION public.get_book_utilization()
RETURNS TABLE(books_with_quizzes bigint, total_books bigint, percentage numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(DISTINCT e.book_id) AS books_with_quizzes,
    (SELECT COUNT(*) FROM books) AS total_books,
    ROUND((COUNT(DISTINCT e.book_id)::numeric / NULLIF((SELECT COUNT(*) FROM books), 0)) * 100, 1) AS percentage
  FROM events e
  WHERE e.event_type = 'quiz_completed';
$$;

-- 1.4 Create new function: get_total_quiz_activity
CREATE OR REPLACE FUNCTION public.get_total_quiz_activity()
RETURNS TABLE(
  total_quizzes bigint,
  visitor_quizzes bigint,
  authenticated_quizzes bigint,
  unique_quiz_takers bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'quiz_completed') AS total_quizzes,
    COUNT(*) FILTER (WHERE event_type = 'quiz_completed' AND user_id IS NULL) AS visitor_quizzes,
    COUNT(*) FILTER (WHERE event_type = 'quiz_completed' AND user_id IS NOT NULL) AS authenticated_quizzes,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_quiz_takers
  FROM events;
$$;

-- 1.5 Update get_weekly_active_users to use events
CREATE OR REPLACE FUNCTION public.get_weekly_active_users()
RETURNS TABLE(activity_date date, active_users bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    DATE(timestamp) AS activity_date,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS active_users
  FROM events
  WHERE timestamp >= CURRENT_DATE - INTERVAL '6 days'
    AND event_type IN ('quiz_started', 'quiz_completed')
  GROUP BY DATE(timestamp)
  ORDER BY activity_date;
$$;