-- ============================================================
-- Migration: New Features
-- Adds: bookmark_collections, verse_bookmarks, community_posts,
--        community_post_likes, push_subscriptions
-- Alters: profiles (onboarding quiz fields)
-- ============================================================

-- ── 1. Bookmark Collections ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmark_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '0',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookmark_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmark collections"
  ON bookmark_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmark_collections_user
  ON bookmark_collections(user_id);

-- ── 2. Verse Bookmarks ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS verse_bookmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id   UUID REFERENCES bookmark_collections(id) ON DELETE SET NULL,
  verse_ref       TEXT NOT NULL,
  verse_text      TEXT NOT NULL,
  book_name       TEXT NOT NULL,
  chapter         INTEGER NOT NULL,
  verse_number    INTEGER NOT NULL,
  translation     TEXT NOT NULL DEFAULT 'KJV',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE verse_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own verse bookmarks"
  ON verse_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_verse_bookmarks_user
  ON verse_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_verse_bookmarks_collection
  ON verse_bookmarks(collection_id);

-- ── 3. Community Posts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_ref     TEXT NOT NULL,
  verse_text    TEXT NOT NULL,
  reflection    TEXT,
  is_anonymous  BOOLEAN NOT NULL DEFAULT FALSE,
  author_name   TEXT,
  like_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read community posts
CREATE POLICY "Public read community posts"
  ON community_posts FOR SELECT
  USING (TRUE);

-- Authenticated users can insert their own posts
CREATE POLICY "Users insert own community posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update like_count (for optimistic updates) and their own posts
CREATE POLICY "Users update community posts"
  ON community_posts FOR UPDATE
  USING (TRUE);

-- Users can delete their own posts
CREATE POLICY "Users delete own community posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON community_posts(created_at DESC);

-- ── 4. Community Post Likes ──────────────────────────────────
CREATE TABLE IF NOT EXISTS community_post_likes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id   UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own likes"
  ON community_post_likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_post
  ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user
  ON community_post_likes(user_id);

-- ── 5. Push Subscriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 6. Profiles: Onboarding Quiz Fields ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS spiritual_goal            TEXT,
  ADD COLUMN IF NOT EXISTS faith_level               TEXT,
  ADD COLUMN IF NOT EXISTS preferred_time            TEXT;
