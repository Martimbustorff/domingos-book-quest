-- Create dynamic popular books view based on quiz completions
CREATE OR REPLACE VIEW popular_books_dynamic 
WITH (security_invoker = true)
AS
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