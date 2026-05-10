/*
  # Track prayer activity dates on profiles

  1. Changes
    - Add `last_prayer_added_date` to `profiles`
    - Add `last_journal_visit_date` to `profiles`

  2. Notes
    - Dates are maintained from app interactions and used for streak features.
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_prayer_added_date date;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_journal_visit_date date;
