/*
  # Fix Missing RLS Policies for Service Role Access

  1. Security Changes
    - Add INSERT and UPDATE policies on `subscriptions` table for service_role
      (required by stripe-webhook edge function to create/update subscription records)
    - Add INSERT and UPDATE policies on `daily_devotionals` table for service_role
      (required by daily-devotional edge function to generate and save devotionals)
    - Add DELETE policy on `chat_conversations` for authenticated users
      (required so users can delete their own conversations)

  2. Important Notes
    - The service_role key bypasses RLS by default in Supabase, but explicit
      policies are best practice for clarity and future-proofing
    - These policies only allow the backend (service_role) to write; regular
      users still only have SELECT access where appropriate
*/

-- =========================
-- subscriptions: service role write policies
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Service role can insert subscriptions'
  ) THEN
    CREATE POLICY "Service role can insert subscriptions"
      ON public.subscriptions FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Service role can update subscriptions'
  ) THEN
    CREATE POLICY "Service role can update subscriptions"
      ON public.subscriptions FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =========================
-- daily_devotionals: service role write policies
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_devotionals' AND policyname = 'Service role can insert devotionals'
  ) THEN
    CREATE POLICY "Service role can insert devotionals"
      ON public.daily_devotionals FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_devotionals' AND policyname = 'Service role can update devotionals'
  ) THEN
    CREATE POLICY "Service role can update devotionals"
      ON public.daily_devotionals FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =========================
-- chat_conversations: allow users to delete their own conversations
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'Users can delete own conversations'
  ) THEN
    CREATE POLICY "Users can delete own conversations"
      ON public.chat_conversations FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;