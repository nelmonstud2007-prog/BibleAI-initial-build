-- ─── Advanced Security & Audit Infrastructure ─────────────────────────────

-- 1. Create Sanctuary Audit Logs for security monitoring
CREATE TABLE IF NOT EXISTS sanctuary_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on audit logs (Only service role can write/read generally, or users can see their own)
ALTER TABLE sanctuary_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
    ON sanctuary_audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Advanced Prayer Entry Validation Trigger
-- Prevents oversized entries or potential script injection patterns
CREATE OR REPLACE FUNCTION validate_prayer_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Limit length to 10,000 characters for safety
    IF length(NEW.content) > 10000 THEN
        RAISE EXCEPTION 'Prayer content is too long for the sanctuary (Max 10,000 characters).';
    END IF;

    -- Basic check for script tags or common injection patterns
    IF NEW.content ~* '<script' OR NEW.content ~* 'javascript:' THEN
        RAISE EXCEPTION 'Malformed content detected. Please keep your prayers clean and focused.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_validate_prayer_entry ON prayer_journal_entries;
CREATE TRIGGER tr_validate_prayer_entry
    BEFORE INSERT OR UPDATE ON prayer_journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_prayer_entry();

-- 4. Advanced Rate Limiting Helper (Internal)
-- This could be expanded into a full rate limiting table if needed
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    hits INTEGER DEFAULT 1,
    last_hit TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- 5. Auto-cleanup of expired rate limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
