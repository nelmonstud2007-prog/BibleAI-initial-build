-- Consolidate prayer status into a single column
-- 1. Sync data from old is_answered column to new status column for legacy rows
UPDATE prayer_journal_entries 
SET status = CASE 
  WHEN is_answered = true THEN 'answered'::text 
  ELSE 'praying'::text 
END
WHERE status IS NULL OR status = 'praying';

-- 2. Add check constraint to status
ALTER TABLE prayer_journal_entries 
ALTER COLUMN status SET DEFAULT 'praying',
ADD CONSTRAINT prayer_status_check CHECK (status IN ('praying', 'answered'));

-- 3. Drop legacy is_answered column
ALTER TABLE prayer_journal_entries DROP COLUMN IF EXISTS is_answered;
