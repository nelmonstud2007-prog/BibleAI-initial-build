/*
  # Create daily_devotionals table

  1. New Tables
    - `daily_devotionals`
      - `id` (uuid, primary key)
      - `date` (date, unique - one devotional per day)
      - `verse` (text - the Bible verse reference and text)
      - `verse_ref` (text - e.g. "John 3:16")
      - `reflection` (text - 2 paragraph reflection)
      - `prayer_prompt` (text - prayer prompt)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on daily_devotionals
    - All authenticated users can read (shared daily content)
    - Only service role can insert/update (edge function generates)
*/

CREATE TABLE IF NOT EXISTS daily_devotionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  verse text NOT NULL,
  verse_ref text NOT NULL,
  reflection text NOT NULL,
  prayer_prompt text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_devotionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read devotionals"
  ON daily_devotionals FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_daily_devotionals_date ON daily_devotionals(date);
