-- Add RLS policies for admin book management
CREATE POLICY "Admins can delete books" 
ON public.books
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update books" 
ON public.books
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert books" 
ON public.books
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create helper function to safely delete books and related data
CREATE OR REPLACE FUNCTION delete_book_and_related(book_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete related records first
  DELETE FROM quiz_templates WHERE book_id = book_id_param;
  DELETE FROM events WHERE book_id = book_id_param;
  DELETE FROM popular_books WHERE book_id = book_id_param;
  DELETE FROM youtube_videos WHERE book_id = book_id_param;
  DELETE FROM book_content WHERE book_id = book_id_param;
  DELETE FROM user_quiz_questions WHERE book_id = book_id_param;
  UPDATE user_books SET merged_to_book_id = NULL WHERE merged_to_book_id = book_id_param;
  
  -- Finally delete the book
  DELETE FROM books WHERE id = book_id_param;
END;
$$;