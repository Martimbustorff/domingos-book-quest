-- Update get_popular_books_dynamic function to show all books
-- Books with quizzes ranked by activity, new books without quizzes shown below
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
AS $function$
  SELECT 
    ROW_NUMBER() OVER (
      ORDER BY 
        COALESCE(COUNT(qh.id), 0) DESC,
        CASE WHEN COALESCE(COUNT(qh.id), 0) = 0 THEN b.created_at END DESC NULLS LAST,
        b.title ASC
    ) AS ranking,
    b.id AS book_id,
    b.title,
    b.author,
    b.cover_url,
    b.age_min,
    b.age_max,
    COALESCE(COUNT(qh.id), 0) AS quiz_count,
    COUNT(DISTINCT qh.user_id) AS unique_users,
    ROUND(AVG(qh.score)::numeric, 1) AS avg_score,
    MAX(qh.completed_at) AS last_quiz_at
  FROM books b
  LEFT JOIN quiz_history qh ON qh.book_id = b.id
  WHERE b.title IS NOT NULL
  GROUP BY b.id, b.title, b.author, b.cover_url, b.age_min, b.age_max, b.created_at
  ORDER BY 
    COALESCE(COUNT(qh.id), 0) DESC,
    CASE WHEN COALESCE(COUNT(qh.id), 0) = 0 THEN b.created_at END DESC NULLS LAST,
    b.title ASC
  LIMIT 50;
$function$;