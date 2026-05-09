/*
  # Add chat conversations and usage tracking

  1. New Tables
    - `chat_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text, auto-generated from first message)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `chat_usage`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `message_count` (integer, default 0)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `chat_messages` - add `conversation_id` column referencing chat_conversations

  3. Security
    - Enable RLS on new tables
    - Users can only CRUD their own conversations and usage data
    - Unique constraint on (user_id, date) in chat_usage to prevent duplicate daily records
*/

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON chat_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add conversation_id to chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Chat usage tracking table
CREATE TABLE IF NOT EXISTS chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON chat_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON chat_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON chat_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add subscription_tier column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_user_date ON chat_usage(user_id, date);
