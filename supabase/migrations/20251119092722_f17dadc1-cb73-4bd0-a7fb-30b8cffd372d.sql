-- Add database functions for visitor analytics

-- Function to get overall visitor statistics
CREATE OR REPLACE FUNCTION public.get_visitor_stats()
RETURNS TABLE(
  total_visitor_events bigint,
  visitor_quiz_starts bigint,
  visitor_quiz_completions bigint,
  visitor_completion_rate numeric,
  total_authenticated_events bigint,
  authenticated_quiz_starts bigint,
  authenticated_quiz_completions bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Visitor (anonymous) metrics
    COUNT(*) FILTER (WHERE user_id IS NULL) AS total_visitor_events,
    COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_started') AS visitor_quiz_starts,
    COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_completed') AS visitor_quiz_completions,
    CASE 
      WHEN COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_started') > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_completed')::numeric / 
                  COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_started')) * 100, 1)
      ELSE 0
    END AS visitor_completion_rate,
    
    -- Authenticated metrics
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS total_authenticated_events,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL AND event_type = 'quiz_started') AS authenticated_quiz_starts,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL AND event_type = 'quiz_completed') AS authenticated_quiz_completions
  FROM events;
$$;

-- Function to get daily visitor activity breakdown
CREATE OR REPLACE FUNCTION public.get_daily_visitor_activity(days_back integer DEFAULT 30)
RETURNS TABLE(
  activity_date date,
  visitor_events bigint,
  authenticated_events bigint,
  visitor_quiz_starts bigint,
  visitor_quiz_completions bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    DATE(timestamp) AS activity_date,
    COUNT(*) FILTER (WHERE user_id IS NULL) AS visitor_events,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS authenticated_events,
    COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_started') AS visitor_quiz_starts,
    COUNT(*) FILTER (WHERE user_id IS NULL AND event_type = 'quiz_completed') AS visitor_quiz_completions
  FROM events
  WHERE timestamp >= CURRENT_DATE - (days_back || ' days')::interval
  GROUP BY DATE(timestamp)
  ORDER BY activity_date DESC;
$$;

-- Function to get popular books among visitors
CREATE OR REPLACE FUNCTION public.get_visitor_popular_books(limit_count integer DEFAULT 10)
RETURNS TABLE(
  book_id uuid,
  title text,
  author text,
  cover_url text,
  visitor_quiz_starts bigint,
  visitor_quiz_completions bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    b.id AS book_id,
    b.title,
    b.author,
    b.cover_url,
    COUNT(*) FILTER (WHERE e.event_type = 'quiz_started') AS visitor_quiz_starts,
    COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed') AS visitor_quiz_completions
  FROM books b
  INNER JOIN events e ON e.book_id = b.id
  WHERE e.user_id IS NULL
  GROUP BY b.id, b.title, b.author, b.cover_url
  ORDER BY visitor_quiz_starts DESC
  LIMIT limit_count;
$$;