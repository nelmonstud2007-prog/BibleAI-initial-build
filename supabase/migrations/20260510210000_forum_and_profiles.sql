-- Add new columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMPTZ;

-- Create Community Forum table (replacing/extending community_posts)
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  verse_ref TEXT,
  category TEXT DEFAULT 'general', -- 'general', 'question', 'testimony', 'prayer'
  is_pinned BOOLEAN DEFAULT false,
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on forum_posts
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Forum posts policies
CREATE POLICY "Anyone can view approved forum posts" ON forum_posts
  FOR SELECT USING (moderation_status = 'approved' OR is_pinned = true);

CREATE POLICY "Users can create forum posts" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forum posts" ON forum_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all forum posts" ON forum_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Forum comments (already exists as community_post_comments, but let's ensure it's linked to forum_posts)
-- If community_post_comments exists, we might need to migrate it or just use it.
-- Let's create a new one for the forum structure if needed, or just rename.

-- Add moderation log
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT, -- 'approve', 'reject', 'pin', 'unpin'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to handle pinning (only one pinned post at a time)
CREATE OR REPLACE FUNCTION pin_forum_post(target_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_posts SET is_pinned = false WHERE is_pinned = true;
  UPDATE forum_posts SET is_pinned = true WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'read', 'replied'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add rate limiting table for AI chat
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  daily_count INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT now()
);
