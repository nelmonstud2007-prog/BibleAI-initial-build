-- Add reading plan columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reading_plan_id text,
ADD COLUMN IF NOT EXISTS reading_plan_day int DEFAULT 0;
