-- Create request_logs table for rate limiting
CREATE TABLE IF NOT EXISTS public.request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on request_logs
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting logs (allow edge functions to insert)
CREATE POLICY "Allow service role to insert request logs"
ON public.request_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for rate limiting queries (IP + endpoint + time window)
CREATE INDEX idx_request_logs_rate_limit 
ON public.request_logs (ip_address, endpoint, created_at DESC);

-- Create cleanup function to delete old logs (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_request_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.request_logs
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Performance indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id 
ON public.quiz_history (user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_history_completed_at 
ON public.quiz_history (completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_history_book_id 
ON public.quiz_history (book_id);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id 
ON public.user_stats (user_id);

CREATE INDEX IF NOT EXISTS idx_user_stats_total_points 
ON public.user_stats (total_points DESC);

-- Install pg_trgm extension for fuzzy text search (if not already installed)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on books.title for faster search
CREATE INDEX IF NOT EXISTS idx_books_title_trgm 
ON public.books USING gin (title gin_trgm_ops);

-- Create index on books.author for filtering
CREATE INDEX IF NOT EXISTS idx_books_author 
ON public.books (author);