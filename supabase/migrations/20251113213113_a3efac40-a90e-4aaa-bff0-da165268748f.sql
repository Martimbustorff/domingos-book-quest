-- Create books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  open_library_id TEXT,
  title TEXT NOT NULL,
  author TEXT,
  language TEXT DEFAULT 'en',
  age_min INTEGER DEFAULT 5,
  age_max INTEGER DEFAULT 10,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create popular_books table
CREATE TABLE public.popular_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  region TEXT DEFAULT 'International',
  typical_grade TEXT,
  ranking INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_templates table
CREATE TABLE public.quiz_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  age_band TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  num_questions INTEGER NOT NULL,
  questions_json JSONB NOT NULL,
  source TEXT DEFAULT 'ai_generated',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create youtube_videos table
CREATE TABLE public.youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT,
  channel_title TEXT,
  is_made_for_kids BOOLEAN DEFAULT false,
  safe_search_level TEXT DEFAULT 'strict',
  thumbnail_url TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table for anonymised analytics
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  age_band TEXT,
  score INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_books_title ON public.books(title);
CREATE INDEX idx_popular_books_ranking ON public.popular_books(ranking);
CREATE INDEX idx_quiz_templates_book_age ON public.quiz_templates(book_id, age_band, num_questions);
CREATE INDEX idx_youtube_videos_book ON public.youtube_videos(book_id);
CREATE INDEX idx_events_type_timestamp ON public.events(event_type, timestamp);

-- Enable RLS (Row Level Security)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS policies: All tables are publicly readable (no login required)
CREATE POLICY "Books are publicly readable"
  ON public.books FOR SELECT
  USING (true);

CREATE POLICY "Popular books are publicly readable"
  ON public.popular_books FOR SELECT
  USING (true);

CREATE POLICY "Quiz templates are publicly readable"
  ON public.quiz_templates FOR SELECT
  USING (true);

CREATE POLICY "YouTube videos are publicly readable"
  ON public.youtube_videos FOR SELECT
  USING (true);

CREATE POLICY "Events can be inserted by anyone"
  ON public.events FOR INSERT
  WITH CHECK (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();