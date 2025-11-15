-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.cleanup_old_request_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.request_logs
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;