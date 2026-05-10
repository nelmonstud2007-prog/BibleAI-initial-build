-- ============================================================
-- Migration: Comprehensive Upgrade
-- Adds: community_post_comments, user_achievements, shared_verses,
--        admin_analytics, ip_logs, rate_limit_requests
-- Alters: profiles (is_admin, pro_expires_at, banned_at, ban_reason,
--          reading_plan columns, avatar_url)
-- ============================================================

-- ── 1. Admin & Ban fields on profiles ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reading_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS reading_plan_day INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ip TEXT;

-- ── 2. Community Post Comments ───────────────────────────────
CREATE TABLE IF NOT EXISTS community_post_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 1000),
  author_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE community_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comments"
  ON community_post_comments FOR SELECT USING (TRUE);
CREATE POLICY "Users insert own comments"
  ON community_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments"
  ON community_post_comments FOR DELETE
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON community_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON community_post_comments(user_id);

-- ── 3. User Achievements ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL,
  earned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (TRUE);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);

-- ── 4. Shared Verses (custom share links) ───────────────────
CREATE TABLE IF NOT EXISTS shared_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verse_ref   TEXT NOT NULL,
  verse_text  TEXT NOT NULL,
  reflection  TEXT,
  theme       TEXT NOT NULL DEFAULT 'dark',
  font_style  TEXT NOT NULL DEFAULT 'serif',
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shared_verses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shared verses"
  ON shared_verses FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users create shared verses"
  ON shared_verses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users update own shared verses"
  ON shared_verses FOR UPDATE
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_shared_verses_user ON shared_verses(user_id);

-- ── 5. Admin Analytics Events ────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins read analytics"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
CREATE POLICY "Service role insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (TRUE);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);

-- ── 6. Rate Limit Requests (per-user per-endpoint) ───────────
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own rate limits"
  ON rate_limit_requests FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role insert rate limits"
  ON rate_limit_requests FOR INSERT
  WITH CHECK (TRUE);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint ON rate_limit_requests(user_id, endpoint, created_at DESC);

-- ── 7. Admin: view all profiles function ─────────────────────
CREATE OR REPLACE FUNCTION admin_get_users(admin_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  subscription_tier TEXT,
  is_admin BOOLEAN,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  pro_expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  last_ip TEXT,
  created_at TIMESTAMPTZ
) SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = admin_id AND profiles.is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT 
      p.id, p.email, p.full_name, p.subscription_tier,
      p.is_admin, p.banned_at, p.ban_reason, p.pro_expires_at,
      p.last_seen_at, p.last_ip, p.created_at
    FROM profiles p
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ── 8. Admin: ban user function ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_ban_user(admin_id UUID, target_user_id UUID, reason TEXT)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles SET banned_at = NOW(), ban_reason = reason WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ── 9. Admin: unban user function ────────────────────────────
CREATE OR REPLACE FUNCTION admin_unban_user(admin_id UUID, target_user_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles SET banned_at = NULL, ban_reason = NULL WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ── 10. Admin: promote to pro function ───────────────────────
CREATE OR REPLACE FUNCTION admin_set_pro(admin_id UUID, target_user_id UUID, expires_at TIMESTAMPTZ)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles 
  SET subscription_tier = 'pro_monthly', 
      pro_expires_at = expires_at,
      subscription_status = 'active'
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ── 11. Admin: revoke pro function ───────────────────────────
CREATE OR REPLACE FUNCTION admin_revoke_pro(admin_id UUID, target_user_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles 
  SET subscription_tier = 'free', 
      pro_expires_at = NULL,
      subscription_status = NULL
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ── 12. Admin: delete user function ──────────────────────────
CREATE OR REPLACE FUNCTION admin_delete_user(admin_id UUID, target_user_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ── 13. Admin: analytics summary function ────────────────────
CREATE OR REPLACE FUNCTION admin_get_analytics(admin_id UUID, days_back INTEGER DEFAULT 30)
RETURNS JSONB SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'pro_users', (SELECT COUNT(*) FROM profiles WHERE subscription_tier IN ('pro_monthly','pro_yearly')),
    'banned_users', (SELECT COUNT(*) FROM profiles WHERE banned_at IS NOT NULL),
    'dau', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at > NOW() - INTERVAL '1 day'),
    'wau', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at > NOW() - INTERVAL '7 days'),
    'mau', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at > NOW() - INTERVAL '30 days'),
    'total_prayers', (SELECT COUNT(*) FROM prayer_journal_entries),
    'total_community_posts', (SELECT COUNT(*) FROM community_posts),
    'total_chat_messages', (SELECT COUNT(*) FROM chat_messages),
    'popular_events', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT event_name, COUNT(*) as count
        FROM analytics_events
        WHERE created_at > NOW() - make_interval(days => days_back)
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'new_users_by_day', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM profiles
        WHERE created_at > NOW() - make_interval(days => days_back)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ── 14. Auto-award achievements function ─────────────────────
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
DECLARE
  prayer_count INTEGER;
  streak_count INTEGER;
  verse_count  INTEGER;
  post_count   INTEGER;
BEGIN
  -- Count prayers
  SELECT COUNT(*) INTO prayer_count FROM prayer_journal_entries WHERE user_id = p_user_id;
  -- Count streak
  SELECT COALESCE(MAX(streak_length), 0) INTO streak_count FROM (
    SELECT COUNT(*) as streak_length FROM prayer_streaks WHERE user_id = p_user_id
  ) t;
  -- Count verse reads (from analytics)
  SELECT COUNT(*) INTO verse_count FROM analytics_events 
  WHERE user_id = p_user_id AND event_name = 'verse_read';
  -- Count community posts
  SELECT COUNT(*) INTO post_count FROM community_posts WHERE user_id = p_user_id;

  -- First Prayer
  IF prayer_count >= 1 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'first_prayer')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  -- 7-Day Streak
  IF streak_count >= 7 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'streak_7')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  -- 30-Day Streak
  IF streak_count >= 30 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'streak_30')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  -- 100 Verses Read
  IF verse_count >= 100 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'verses_100')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  -- Community Contributor (5+ posts)
  IF post_count >= 5 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'community_contributor')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  -- First Community Post
  IF post_count >= 1 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'first_post')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── 15. Increment shared verse view count ────────────────────
CREATE OR REPLACE FUNCTION increment_share_view(share_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  UPDATE shared_verses SET view_count = view_count + 1 WHERE id = share_id;
END;
$$ LANGUAGE plpgsql;

-- ── 16. Comment count on community_posts ─────────────────────
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to keep comment_count in sync
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_comment_count ON community_post_comments;
CREATE TRIGGER tr_comment_count
  AFTER INSERT OR DELETE ON community_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();
