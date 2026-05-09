/*
  # Create Bible Highlights Table
*/

CREATE TABLE IF NOT EXISTS public.bible_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book text NOT NULL,
  chapter integer NOT NULL,
  verse_number integer NOT NULL,
  content text NOT NULL,
  color text NOT NULL DEFAULT 'gold',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bible_highlights' AND policyname = 'Users can view own highlights'
  ) THEN
    CREATE POLICY "Users can view own highlights"
      ON public.bible_highlights FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bible_highlights' AND policyname = 'Users can insert own highlights'
  ) THEN
    CREATE POLICY "Users can insert own highlights"
      ON public.bible_highlights FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bible_highlights' AND policyname = 'Users can delete own highlights'
  ) THEN
    CREATE POLICY "Users can delete own highlights"
      ON public.bible_highlights FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_bible_highlights_user_id ON public.bible_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_highlights_book_chapter ON public.bible_highlights(book, chapter);
