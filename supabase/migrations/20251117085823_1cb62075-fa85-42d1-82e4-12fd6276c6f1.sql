-- Fix age ranges for Harry Potter books (should be 8-14, not 5-10)
-- These books contain complex themes more appropriate for older children

UPDATE public.books
SET age_min = 8, age_max = 14
WHERE title ILIKE '%Harry Potter%';

-- Add a comment to track this correction
COMMENT ON TABLE public.books IS 'Age ranges verified for content appropriateness - Harry Potter corrected to 8-14 on 2025';
