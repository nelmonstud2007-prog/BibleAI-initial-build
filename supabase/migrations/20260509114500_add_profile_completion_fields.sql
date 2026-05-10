/*
  # Add profile completion fields

  1. Changes
    - Add `favorite_bible_verse` to `profiles`
    - Add `profile_completed` to `profiles`
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS favorite_bible_verse text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;
