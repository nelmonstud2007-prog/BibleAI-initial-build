/*
  # Add daily reminder preferences to profiles

  1. Changes
    - Add `daily_reminder_enabled` boolean to `profiles`
    - Add `daily_reminder_time` time to `profiles`
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_reminder_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_reminder_time time;
