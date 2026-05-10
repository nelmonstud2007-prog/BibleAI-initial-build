-- ============================================================
-- Bible AI Platform Rebuild - Comprehensive Schema Migration
-- ============================================================

-- 1. Fix RLS on tables that were missing it
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for moderation_logs
DROP POLICY IF EXISTS "Admins can manage moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins can manage moderation logs" ON public.moderation_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- RLS policies for ai_chat_usage
DROP POLICY IF EXISTS "Users can view their own ai_chat_usage" ON public.ai_chat_usage;
CREATE POLICY "Users can view their own ai_chat_usage" ON public.ai_chat_usage
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own ai_chat_usage" ON public.ai_chat_usage;
CREATE POLICY "Users can update their own ai_chat_usage" ON public.ai_chat_usage
  FOR ALL USING (auth.uid() = user_id);

-- 2. Update profiles table with all required fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_changed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_change_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_profile BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_dms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';

-- 3. Update community_posts / forum_posts with all required fields
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Ensure like_count column exists
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 4. Update forum_comments with is_deleted
ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- 5. Create highlights table
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  verse_ref TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  colour TEXT NOT NULL DEFAULT 'yellow',
  selected_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own highlights" ON public.highlights;
CREATE POLICY "Users can manage their own highlights" ON public.highlights
  FOR ALL USING (auth.uid() = user_id);

-- 6. Add unique constraint on saved_verses / verse_bookmarks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verse_bookmarks_user_verse_unique'
  ) THEN
    ALTER TABLE public.verse_bookmarks ADD CONSTRAINT verse_bookmarks_user_verse_unique UNIQUE (user_id, verse_ref);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 7. Create flagged_content table
CREATE TABLE IF NOT EXISTS public.flagged_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT DEFAULT 'post',
  content_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view flagged content" ON public.flagged_content;
CREATE POLICY "Admins can view flagged content" ON public.flagged_content
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
DROP POLICY IF EXISTS "System can insert flagged content" ON public.flagged_content;
CREATE POLICY "System can insert flagged content" ON public.flagged_content
  FOR INSERT WITH CHECK (true);

-- 8. Create contact_submissions table (separate from contact_messages)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  ip_hash TEXT,
  status TEXT DEFAULT 'new'
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 9. Create reroll_usage table
CREATE TABLE IF NOT EXISTS public.reroll_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);
ALTER TABLE public.reroll_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own reroll usage" ON public.reroll_usage;
CREATE POLICY "Users can manage their own reroll usage" ON public.reroll_usage
  FOR ALL USING (auth.uid() = user_id);

-- 10. Create username_change_log table
CREATE TABLE IF NOT EXISTS public.username_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  old_username TEXT,
  new_username TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.username_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own username log" ON public.username_change_log;
CREATE POLICY "Users can view their own username log" ON public.username_change_log
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all username logs" ON public.username_change_log;
CREATE POLICY "Admins can view all username logs" ON public.username_change_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11. Create email_resend_log table
CREATE TABLE IF NOT EXISTS public.email_resend_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  resent_at TIMESTAMPTZ DEFAULT now(),
  count INTEGER DEFAULT 1
);
ALTER TABLE public.email_resend_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage email resend log" ON public.email_resend_log;
CREATE POLICY "System can manage email resend log" ON public.email_resend_log
  FOR ALL USING (auth.uid() = user_id);

-- 12. Add journal fields to prayer_journal_entries
ALTER TABLE public.prayer_journal_entries
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS linked_verse_ref TEXT,
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'journal';

-- Remove petition type (soft approach - just don't show it in UI)
-- Hard remove: UPDATE prayer_journal_entries SET entry_type = 'journal' WHERE entry_type = 'petition';

-- 13. DB Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON public.forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_like_count ON public.forum_posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_verse_bookmarks_user_id ON public.verse_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_is_pinned ON public.forum_posts(is_pinned) WHERE is_pinned = true;

-- 14. Function to ensure only one pinned post at a time
CREATE OR REPLACE FUNCTION public.ensure_single_pinned_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pinned = true THEN
    UPDATE public.forum_posts SET is_pinned = false WHERE is_pinned = true AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_single_pinned_post ON public.forum_posts;
CREATE TRIGGER trg_single_pinned_post
  BEFORE INSERT OR UPDATE OF is_pinned ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_pinned_post();

-- 15. Function to check reroll limit
CREATE OR REPLACE FUNCTION public.check_and_increment_reroll(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
  v_today DATE := CURRENT_DATE;
  v_count INTEGER := 0;
  v_limit INTEGER := 3;
BEGIN
  SELECT subscription_tier INTO v_tier FROM public.profiles WHERE id = p_user_id;
  
  IF v_tier = 'pro' THEN
    RETURN json_build_object('allowed', true, 'remaining', -1, 'is_pro', true);
  END IF;
  
  SELECT count INTO v_count FROM public.reroll_usage WHERE user_id = p_user_id AND date = v_today;
  
  IF v_count IS NULL THEN v_count := 0; END IF;
  
  IF v_count >= v_limit THEN
    RETURN json_build_object('allowed', false, 'remaining', 0, 'used', v_count, 'limit', v_limit);
  END IF;
  
  INSERT INTO public.reroll_usage (user_id, date, count)
  VALUES (p_user_id, v_today, 1)
  ON CONFLICT (user_id, date) DO UPDATE SET count = reroll_usage.count + 1;
  
  RETURN json_build_object('allowed', true, 'remaining', v_limit - v_count - 1, 'used', v_count + 1, 'limit', v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Function to get platform stats for home page
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON AS $$
DECLARE
  v_user_count INTEGER;
  v_verse_count INTEGER;
  v_forum_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  SELECT COUNT(*) INTO v_verse_count FROM public.verse_bookmarks;
  SELECT COUNT(*) INTO v_forum_count FROM public.forum_posts WHERE moderation_status = 'approved';
  
  RETURN json_build_object(
    'users', v_user_count,
    'verses_saved', v_verse_count,
    'forum_posts', v_forum_count,
    'app_version', '2.0.0',
    'last_updated', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Forum post like/unlike function
CREATE OR REPLACE FUNCTION public.toggle_forum_post_like(p_post_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.community_post_likes WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM public.community_post_likes WHERE post_id = p_post_id AND user_id = p_user_id;
    UPDATE public.forum_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = p_post_id;
    RETURN json_build_object('liked', false);
  ELSE
    INSERT INTO public.community_post_likes (post_id, user_id) VALUES (p_post_id, p_user_id) ON CONFLICT DO NOTHING;
    UPDATE public.forum_posts SET like_count = like_count + 1 WHERE id = p_post_id;
    RETURN json_build_object('liked', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Soft delete account function
CREATE OR REPLACE FUNCTION public.soft_delete_account(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET 
    is_suspended = true,
    show_profile = false,
    bio = NULL,
    avatar_url = NULL
  WHERE id = p_user_id;
  -- Schedule hard delete after 30 days via a separate cron job
  -- For now, mark with deletion timestamp
  UPDATE public.profiles SET username_changed_at = now() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_reroll(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_forum_post_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_account(UUID) TO authenticated;
