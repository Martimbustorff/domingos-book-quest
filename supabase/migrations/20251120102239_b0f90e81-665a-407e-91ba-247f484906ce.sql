-- Drop the view that depends on the function
DROP VIEW IF EXISTS public.popular_books_dynamic CASCADE;

-- Drop and recreate the function to use events table for accurate visitor + user metrics
DROP FUNCTION IF EXISTS public.get_popular_books_dynamic() CASCADE;

CREATE OR REPLACE FUNCTION public.get_popular_books_dynamic()
RETURNS TABLE(
  ranking bigint,
  book_id uuid,
  title text,
  author text,
  cover_url text,
  age_min integer,
  age_max integer,
  quiz_count bigint,
  unique_users bigint,
  avg_score numeric,
  last_quiz_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ROW_NUMBER() OVER (
      ORDER BY 
        COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) DESC,
        CASE WHEN COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) = 0 THEN b.created_at END DESC NULLS LAST,
        b.title ASC
    ) AS ranking,
    b.id AS book_id,
    b.title,
    b.author,
    b.cover_url,
    b.age_min,
    b.age_max,
    COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) AS quiz_count,
    COUNT(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'quiz_completed' AND e.user_id IS NOT NULL) + 
    COUNT(DISTINCT e.id) FILTER (WHERE e.event_type = 'quiz_completed' AND e.user_id IS NULL) AS unique_users,
    ROUND(AVG(e.score) FILTER (WHERE e.event_type = 'quiz_completed' AND e.score IS NOT NULL)::numeric, 1) AS avg_score,
    MAX(e.timestamp) FILTER (WHERE e.event_type = 'quiz_completed') AS last_quiz_at
  FROM books b
  LEFT JOIN events e ON e.book_id = b.id
  WHERE b.title IS NOT NULL
    AND (b.age_max <= 12 OR (b.open_library_id IS NULL AND b.age_max <= 14))
  GROUP BY b.id, b.title, b.author, b.cover_url, b.age_min, b.age_max, b.created_at
  ORDER BY 
    COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) DESC,
    CASE WHEN COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) = 0 THEN b.created_at END DESC NULLS LAST,
    b.title ASC;
$$;

-- Recreate the view
CREATE VIEW public.popular_books_dynamic AS
SELECT * FROM public.get_popular_books_dynamic();