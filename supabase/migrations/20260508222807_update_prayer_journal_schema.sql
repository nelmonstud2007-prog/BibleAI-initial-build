/*
  # Update prayer journal entries for new categories and status

  1. Modified Tables
    - `prayer_journal_entries`
      - Change `category` column to use new values: Health, Family, Finance, Guidance, Gratitude, Other
      - Change `is_answered` boolean to `status` text column with values 'praying' / 'answered'
      - Add `streak_days` tracking via a separate `prayer_streaks` table

  2. New Tables
    - `prayer_streaks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, date)

  3. Security
    - Enable RLS on prayer_streaks
    - Users can only CRUD their own streak data
*/

-- Update category check constraint - drop old and add new
ALTER TABLE prayer_journal_entries DROP CONSTRAINT IF EXISTS prayer_journal_entries_category_check;
ALTER TABLE prayer_journal_entries ADD CONSTRAINT prayer_journal_entries_category_check
  CHECK (category IN ('Health', 'Family', 'Finance', 'Guidance', 'Gratitude', 'Other'));

-- Update default category value
ALTER TABLE prayer_journal_entries ALTER COLUMN category SET DEFAULT 'Other';

-- Add status column and migrate data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_journal_entries' AND column_name = 'status'
  ) THEN
    ALTER TABLE prayer_journal_entries ADD COLUMN status text NOT NULL DEFAULT 'praying';
    -- Migrate from is_answered
    UPDATE prayer_journal_entries SET status = 'answered' WHERE is_answered = true;
  END IF;
END $$;

-- Prayer streaks table
CREATE TABLE IF NOT EXISTS prayer_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_streak_date UNIQUE (user_id, date)
);

ALTER TABLE prayer_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON prayer_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON prayer_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own streaks"
  ON prayer_streaks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prayer_streaks_user_date ON prayer_streaks(user_id, date);
