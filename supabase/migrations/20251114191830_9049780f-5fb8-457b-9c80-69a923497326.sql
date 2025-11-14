-- Create tables for user-generated content system

-- Store user-submitted book content
CREATE TABLE book_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID NOT NULL,
  description TEXT NOT NULL,
  subjects TEXT[],
  key_characters JSONB,
  plot_points JSONB,
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT description_length CHECK (char_length(description) >= 100)
);

-- Store user-submitted quiz questions
CREATE TABLE user_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  times_used INTEGER DEFAULT 0,
  correct_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT options_count CHECK (array_length(options, 1) = 4),
  CONSTRAINT correct_index_valid CHECK (correct_index >= 0 AND correct_index < 4),
  CONSTRAINT question_length CHECK (char_length(question_text) <= 200)
);

-- Track user contributions
CREATE TABLE user_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contribution_type TEXT NOT NULL,
  reference_id UUID,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow users to add books not in system
CREATE TABLE user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  age_min INTEGER,
  age_max INTEGER,
  added_by UUID NOT NULL,
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  merged_to_book_id UUID REFERENCES books(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add content quality tracking to quiz_templates
ALTER TABLE quiz_templates 
ADD COLUMN content_source TEXT,
ADD COLUMN content_quality_score INTEGER,
ADD COLUMN user_ratings JSONB;

-- RLS Policies for book_content
ALTER TABLE book_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit book content"
ON book_content FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Approved content is public"
ON book_content FOR SELECT
TO authenticated
USING (approved = true OR submitted_by = auth.uid());

CREATE POLICY "Admins can update content"
ON book_content FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_quiz_questions
ALTER TABLE user_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit quiz questions"
ON user_quiz_questions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Approved questions are public"
ON user_quiz_questions FOR SELECT
TO authenticated
USING (approved = true OR created_by = auth.uid());

CREATE POLICY "Admins can update questions"
ON user_quiz_questions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_contributions
ALTER TABLE user_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their contributions"
ON user_contributions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their contributions"
ON user_contributions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_books
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit books"
ON user_books FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Approved books are public"
ON user_books FOR SELECT
TO authenticated
USING (approved = true OR added_by = auth.uid());

CREATE POLICY "Admins can update books"
ON user_books FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on book_content
CREATE TRIGGER update_book_content_updated_at
BEFORE UPDATE ON book_content
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();