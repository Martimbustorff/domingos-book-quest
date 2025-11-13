-- Allow users to insert into popular_books
CREATE POLICY "Anyone can add books to popular list"
ON public.popular_books
FOR INSERT
WITH CHECK (true);

-- Create function to upsert popular books (update ranking if exists, insert if not)
CREATE OR REPLACE FUNCTION public.increment_book_popularity(p_book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if book already exists in popular_books
  IF EXISTS (SELECT 1 FROM public.popular_books WHERE book_id = p_book_id) THEN
    -- Book exists, increment its ranking (lower number = more popular)
    UPDATE public.popular_books
    SET ranking = GREATEST(1, ranking - 1),
        created_at = now()
    WHERE book_id = p_book_id;
  ELSE
    -- Book doesn't exist, insert with a default ranking
    INSERT INTO public.popular_books (book_id, ranking, region)
    VALUES (p_book_id, 100, 'International');
  END IF;
END;
$$;