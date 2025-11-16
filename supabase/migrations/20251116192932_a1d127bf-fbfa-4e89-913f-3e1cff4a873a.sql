-- Fix popular books to show ALL users' quiz activity
-- Drop the view and replace with a security definer function

DROP VIEW IF EXISTS popular_books_dynamic;

-- Create a security definer function that returns popular books data
CREATE OR REPLACE FUNCTION get_popular_books_dynamic()
RETURNS TABLE (
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY COUNT(qh.id) DESC, b.title ASC) AS ranking,
    b.id AS book_id,
    b.title,
    b.author,
    b.cover_url,
    b.age_min,
    b.age_max,
    COUNT(qh.id) AS quiz_count,
    COUNT(DISTINCT qh.user_id) AS unique_users,
    ROUND(AVG(qh.score)::numeric, 1) AS avg_score,
    MAX(qh.completed_at) AS last_quiz_at
  FROM books b
  INNER JOIN quiz_history qh ON qh.book_id = b.id
  GROUP BY b.id, b.title, b.author, b.cover_url, b.age_min, b.age_max
  ORDER BY quiz_count DESC, b.title ASC
  LIMIT 20;
$$;

-- Recreate the view that calls the function
CREATE VIEW popular_books_dynamic AS
SELECT * FROM get_popular_books_dynamic();

-- Grant permissions
GRANT SELECT ON popular_books_dynamic TO authenticated;
GRANT SELECT ON popular_books_dynamic TO anon;
GRANT EXECUTE ON FUNCTION get_popular_books_dynamic() TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_books_dynamic() TO anon;