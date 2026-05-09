/*
  # Fix subscription_tier values and add stripe_subscription_id
  
  Changes:
  1. Add `stripe_subscription_id` column to profiles (was missing — only lived in subscriptions table).
  2. Change subscription_tier default and migrate legacy "pro" → "pro_monthly".
  3. Add check constraint so only valid tiers can be stored.
  4. Add index on stripe_subscription_id for webhook lookups.
*/

-- 1. Add stripe_subscription_id to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;

-- 2. Migrate legacy "pro" → "pro_monthly" (old webhook wrote "pro")
UPDATE profiles
SET subscription_tier = 'pro_monthly'
WHERE subscription_tier = 'pro';

-- 3. Add check constraint (allow "pro" briefly for safety then remove)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_subscription_tier_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_subscription_tier_check
      CHECK (subscription_tier IN ('free', 'pro_monthly', 'pro_yearly'));
  END IF;
END $$;

-- 4. Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription
  ON profiles(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 5. Also sync stripe_subscription_id from existing subscriptions rows
UPDATE profiles p
SET stripe_subscription_id = s.stripe_subscription_id
FROM subscriptions s
WHERE s.user_id = p.id
  AND p.stripe_subscription_id IS NULL
  AND s.status = 'active';
