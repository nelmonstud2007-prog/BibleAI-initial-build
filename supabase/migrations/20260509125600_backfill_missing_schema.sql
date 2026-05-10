/*
  # Backfill missing BibleAI schema (idempotent)

  This migration is safe to run on environments that may have missed
  earlier migrations. It ensures required tables/columns/RLS/indexes exist.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- profiles
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_period text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS last_prayer_added_date date,
  ADD COLUMN IF NOT EXISTS last_journal_visit_date date,
  ADD COLUMN IF NOT EXISTS favorite_bible_verse text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_reminder_time time;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- =========================
-- prayer_journal_entries
-- =========================
CREATE TABLE IF NOT EXISTS public.prayer_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  status text NOT NULL DEFAULT 'praying',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.prayer_journal_entries
  DROP CONSTRAINT IF EXISTS prayer_journal_entries_category_check;
ALTER TABLE public.prayer_journal_entries
  ADD CONSTRAINT prayer_journal_entries_category_check
  CHECK (category IN ('Health', 'Family', 'Finance', 'Guidance', 'Gratitude', 'Other'));

ALTER TABLE public.prayer_journal_entries
  DROP CONSTRAINT IF EXISTS prayer_journal_entries_status_check;
ALTER TABLE public.prayer_journal_entries
  ADD CONSTRAINT prayer_journal_entries_status_check
  CHECK (status IN ('praying', 'answered'));

ALTER TABLE public.prayer_journal_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_journal_entries' AND policyname = 'Users can view own prayer entries'
  ) THEN
    CREATE POLICY "Users can view own prayer entries"
      ON public.prayer_journal_entries FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_journal_entries' AND policyname = 'Users can insert own prayer entries'
  ) THEN
    CREATE POLICY "Users can insert own prayer entries"
      ON public.prayer_journal_entries FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_journal_entries' AND policyname = 'Users can update own prayer entries'
  ) THEN
    CREATE POLICY "Users can update own prayer entries"
      ON public.prayer_journal_entries FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_journal_entries' AND policyname = 'Users can delete own prayer entries'
  ) THEN
    CREATE POLICY "Users can delete own prayer entries"
      ON public.prayer_journal_entries FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- chat_conversations
-- =========================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'Users can view own conversations'
  ) THEN
    CREATE POLICY "Users can view own conversations"
      ON public.chat_conversations FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'Users can insert own conversations'
  ) THEN
    CREATE POLICY "Users can insert own conversations"
      ON public.chat_conversations FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'Users can update own conversations'
  ) THEN
    CREATE POLICY "Users can update own conversations"
      ON public.chat_conversations FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'Users can delete own conversations'
  ) THEN
    CREATE POLICY "Users can delete own conversations"
      ON public.chat_conversations FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- chat_messages
-- =========================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Users can view own chat messages'
  ) THEN
    CREATE POLICY "Users can view own chat messages"
      ON public.chat_messages FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Users can insert own chat messages'
  ) THEN
    CREATE POLICY "Users can insert own chat messages"
      ON public.chat_messages FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Users can delete own chat messages'
  ) THEN
    CREATE POLICY "Users can delete own chat messages"
      ON public.chat_messages FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- chat_usage
-- =========================
CREATE TABLE IF NOT EXISTS public.chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_usage' AND policyname = 'Users can view own usage'
  ) THEN
    CREATE POLICY "Users can view own usage"
      ON public.chat_usage FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_usage' AND policyname = 'Users can insert own usage'
  ) THEN
    CREATE POLICY "Users can insert own usage"
      ON public.chat_usage FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_usage' AND policyname = 'Users can update own usage'
  ) THEN
    CREATE POLICY "Users can update own usage"
      ON public.chat_usage FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- prayer_streaks
-- =========================
CREATE TABLE IF NOT EXISTS public.prayer_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_streak_date UNIQUE (user_id, date)
);

ALTER TABLE public.prayer_streaks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_streaks' AND policyname = 'Users can view own streaks'
  ) THEN
    CREATE POLICY "Users can view own streaks"
      ON public.prayer_streaks FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_streaks' AND policyname = 'Users can insert own streaks'
  ) THEN
    CREATE POLICY "Users can insert own streaks"
      ON public.prayer_streaks FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_streaks' AND policyname = 'Users can update own streaks'
  ) THEN
    CREATE POLICY "Users can update own streaks"
      ON public.prayer_streaks FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prayer_streaks' AND policyname = 'Users can delete own streaks'
  ) THEN
    CREATE POLICY "Users can delete own streaks"
      ON public.prayer_streaks FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- daily_devotionals
-- =========================
CREATE TABLE IF NOT EXISTS public.daily_devotionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  verse text NOT NULL,
  verse_ref text NOT NULL,
  reflection text NOT NULL,
  prayer_prompt text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.daily_devotionals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_devotionals' AND policyname = 'Authenticated users can read devotionals'
  ) THEN
    CREATE POLICY "Authenticated users can read devotionals"
      ON public.daily_devotionals FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- =========================
-- indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_prayer_entries_user_id ON public.prayer_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_user_date ON public.chat_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_prayer_streaks_user_date ON public.prayer_streaks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_devotionals_date ON public.daily_devotionals(date);
