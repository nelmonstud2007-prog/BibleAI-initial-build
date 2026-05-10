-- Schema updates for BibleAI

-- 1. Update profiles table with new fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMPTZ;

-- 2. Create Community Forum table (replacing community_posts)
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  verse_ref TEXT,
  category TEXT DEFAULT 'general', -- 'recent', 'popular', 'question', 'testimony', 'prayer'
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

CREATE POLICY "Users can delete their own forum posts" ON forum_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all forum posts" ON forum_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 3. Forum comments
CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forum comments" ON forum_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create forum comments" ON forum_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forum comments" ON forum_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forum comments" ON forum_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all forum comments" ON forum_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Moderation logs
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

-- 5. Contact messages
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

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert contact messages" ON contact_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact messages" ON contact_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 6. Rate limiting for AI chat (if not exists)
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  daily_count INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT now()
);

-- 7. Fix Bible Chat error by ensuring chat_usage table is correct
-- Make sure message_count exists in chat_usage
ALTER TABLE chat_usage ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- 8. Add audio generation usage tracking
CREATE TABLE IF NOT EXISTS audio_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  generation_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE audio_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own audio usage" ON audio_usage
  FOR SELECT USING (auth.uid() = user_id);

-- 9. Update daily_devotionals with voice_url if needed
ALTER TABLE daily_devotionals ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- 10. Update shared_verses with voice_url if needed
ALTER TABLE shared_verses ADD COLUMN IF NOT EXISTS voice_url TEXT;
