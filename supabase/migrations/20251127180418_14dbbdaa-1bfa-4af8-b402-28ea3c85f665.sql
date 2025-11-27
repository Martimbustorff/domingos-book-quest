-- Create fuzzy book matching function using pg_trgm
CREATE OR REPLACE FUNCTION public.find_similar_book(p_title text, p_author text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_book_id uuid;
BEGIN
  -- Find book with high similarity on title (and optionally author)
  SELECT id INTO v_book_id
  FROM books
  WHERE 
    similarity(LOWER(title), LOWER(p_title)) >= 0.5
    AND (p_author IS NULL OR similarity(LOWER(COALESCE(author, '')), LOWER(p_author)) >= 0.4)
  ORDER BY similarity(LOWER(title), LOWER(p_title)) DESC
  LIMIT 1;
  
  RETURN v_book_id;
END;
$function$;

-- Create function to search books locally with fuzzy matching
CREATE OR REPLACE FUNCTION public.search_books_local(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  cover_url text,
  age_min integer,
  age_max integer,
  similarity_score real
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    b.id,
    b.title,
    b.author,
    b.cover_url,
    b.age_min,
    b.age_max,
    similarity(LOWER(b.title), LOWER(p_query)) as similarity_score
  FROM books b
  WHERE 
    b.age_max <= 12  -- Only children's books
    AND (
      similarity(LOWER(b.title), LOWER(p_query)) >= 0.3
      OR LOWER(b.title) LIKE '%' || LOWER(p_query) || '%'
      OR LOWER(b.author) LIKE '%' || LOWER(p_query) || '%'
    )
  ORDER BY similarity_score DESC, b.title ASC
  LIMIT p_limit;
$function$;

-- Clean up adult books (age_max > 12 or NULL age_max with no quiz activity)
DELETE FROM book_content WHERE book_id IN (
  SELECT id FROM books 
  WHERE age_max > 12 
  OR (age_max IS NULL AND NOT EXISTS (
    SELECT 1 FROM quiz_history WHERE book_id = books.id
  ))
);

DELETE FROM youtube_videos WHERE book_id IN (
  SELECT id FROM books WHERE age_max > 12
);

DELETE FROM quiz_templates WHERE book_id IN (
  SELECT id FROM books WHERE age_max > 12
);

DELETE FROM popular_books WHERE book_id IN (
  SELECT id FROM books WHERE age_max > 12
);

DELETE FROM events WHERE book_id IN (
  SELECT id FROM books WHERE age_max > 12
);

DELETE FROM user_quiz_questions WHERE book_id IN (
  SELECT id FROM books WHERE age_max > 12
);

DELETE FROM books 
WHERE age_max > 12 
OR (age_max IS NULL AND NOT EXISTS (
  SELECT 1 FROM quiz_history WHERE book_id = books.id
));

-- Remove obvious duplicates (same title, keep the one with most data)
WITH duplicates AS (
  SELECT 
    id,
    title,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(title)), LOWER(TRIM(COALESCE(author, '')))
      ORDER BY 
        CASE WHEN cover_url IS NOT NULL THEN 1 ELSE 0 END DESC,
        CASE WHEN age_min IS NOT NULL THEN 1 ELSE 0 END DESC,
        created_at ASC
    ) as rn
  FROM books
)
DELETE FROM books WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);