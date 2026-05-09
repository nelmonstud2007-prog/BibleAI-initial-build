-- Add translation column to bible_verses
ALTER TABLE bible_verses ADD COLUMN IF NOT EXISTS translation text NOT NULL DEFAULT 'KJV';

-- Create an index for faster lookups with translation
CREATE INDEX IF NOT EXISTS idx_bible_verses_translation_book_chapter 
ON bible_verses (translation, book_name, chapter);
