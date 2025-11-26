-- Phase 2: Add enrichment status tracking to books table
ALTER TABLE public.books 
ADD COLUMN enrichment_status text DEFAULT 'pending',
ADD COLUMN enriched_at timestamp with time zone;

-- Phase 5: Create quiz_question_responses table for detailed tracking
CREATE TABLE public.quiz_question_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_history_id uuid NOT NULL REFERENCES public.quiz_history(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  question_text text NOT NULL,
  selected_answer_index integer NOT NULL,
  correct_answer_index integer NOT NULL,
  is_correct boolean NOT NULL,
  time_spent_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quiz_question_responses
ALTER TABLE public.quiz_question_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own question responses
CREATE POLICY "Users can insert their own question responses"
ON public.quiz_question_responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_history
    WHERE id = quiz_history_id AND user_id = auth.uid()
  )
);

-- Users and guardians can view question responses
CREATE POLICY "Users and guardians can view question responses"
ON public.quiz_question_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_history
    WHERE id = quiz_history_id 
    AND (user_id = auth.uid() OR is_guardian_of(user_id))
  )
);

-- Admins can view all question responses
CREATE POLICY "Admins can view all question responses"
ON public.quiz_question_responses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better query performance
CREATE INDEX idx_quiz_question_responses_quiz_history_id ON public.quiz_question_responses(quiz_history_id);