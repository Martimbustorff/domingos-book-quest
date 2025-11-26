-- Update get_popular_books_dynamic to include books with quiz completions
-- This allows searched books with user engagement to appear in Popular section
CREATE OR REPLACE FUNCTION public.get_popular_books_dynamic()
 RETURNS TABLE(ranking bigint, book_id uuid, title text, author text, cover_url text, age_min integer, age_max integer, quiz_count bigint, unique_users bigint, avg_score numeric, last_quiz_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    (SELECT ROUND(AVG((qh.score::numeric / NULLIF(qh.total_questions, 0)) * 100), 1)
     FROM quiz_history qh 
     WHERE qh.book_id = b.id) AS avg_score,
    MAX(e.timestamp) FILTER (WHERE e.event_type = 'quiz_completed') AS last_quiz_at
  FROM books b
  LEFT JOIN events e ON e.book_id = b.id
  WHERE b.title IS NOT NULL
    AND (
      -- Include verified children's books with age ranges
      b.age_max <= 12 
      OR (b.open_library_id IS NULL AND b.age_max <= 14)
      -- Include ANY book that has quiz completions (user engagement = relevance)
      OR EXISTS (
        SELECT 1 FROM events e2 
        WHERE e2.book_id = b.id 
        AND e2.event_type = 'quiz_completed'
      )
    )
  GROUP BY b.id, b.title, b.author, b.cover_url, b.age_min, b.age_max, b.created_at
  ORDER BY 
    COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) DESC,
    CASE WHEN COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'quiz_completed'), 0) = 0 THEN b.created_at END DESC NULLS LAST,
    b.title ASC;
$function$;