-- Fix age ranges for additional books with inappropriate age ranges
-- Twilight contains mature themes more appropriate for teenagers

UPDATE public.books
SET age_min = 12, age_max = 17
WHERE title ILIKE '%Twilight%';

-- Create a reference document for future age range reviews
COMMENT ON COLUMN public.books.age_min IS 'Minimum recommended age - verified for appropriateness. Harry Potter: 8-14, Twilight: 12-17';
COMMENT ON COLUMN public.books.age_max IS 'Maximum recommended age - verified for appropriateness';
