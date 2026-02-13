-- Migration 005: Secure API Key Generation & Data Integrity Constraints
-- Fixes: insecure random() usage, missing value range checks
-- Date: 2026-02-06

-- =============================================================================
-- 1. ENABLE PGCRYPTO (for cryptographically secure random bytes)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 2. REPLACE INSECURE API KEY GENERATOR
-- =============================================================================
-- Old function used random() which is NOT cryptographically secure.
-- New function uses gen_random_bytes() from pgcrypto + uniqueness retry loop.

CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR(64) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  chars_len INTEGER := length(chars);
  result VARCHAR(64);
  raw_bytes BYTEA;
  i INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    result := 'alum_';
    -- Use cryptographically secure random bytes
    raw_bytes := gen_random_bytes(59);

    FOR i IN 0..58 LOOP
      result := result || substr(chars, (get_byte(raw_bytes, i) % chars_len) + 1, 1);
    END LOOP;

    -- Ensure uniqueness (extremely unlikely to collide, but belt-and-suspenders)
    IF NOT EXISTS (SELECT 1 FROM users WHERE api_key = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts > 5 THEN
      RAISE EXCEPTION 'Failed to generate unique API key after 5 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- =============================================================================
-- 3. ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- =============================================================================

-- Power draw must be within reasonable GPU range (0-1500W covers all enterprise GPUs)
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_power_draw_range
  CHECK (power_draw_w >= 0 AND power_draw_w <= 1500);

-- Power limit must be reasonable when provided
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_power_limit_range
  CHECK (power_limit_w IS NULL OR (power_limit_w >= 0 AND power_limit_w <= 1500));

-- Temperature must be within sane range (0-120C covers all operating conditions)
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_temperature_range
  CHECK (temperature_c IS NULL OR (temperature_c >= 0 AND temperature_c <= 120));

-- Fan speed percentage
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_fan_speed_range
  CHECK (fan_speed_pct IS NULL OR (fan_speed_pct >= 0 AND fan_speed_pct <= 100));

-- Memory used cannot be negative
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_memory_used_positive
  CHECK (memory_used_mb IS NULL OR memory_used_mb >= 0);

-- Memory total must be positive when provided
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_memory_total_positive
  CHECK (memory_total_mb IS NULL OR memory_total_mb > 0);

-- Energy delta must be non-negative when provided
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_energy_delta_positive
  CHECK (energy_delta_j IS NULL OR energy_delta_j >= 0);

-- GPU index must be non-negative
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_gpu_index_positive
  CHECK (gpu_index >= 0);

-- Timestamp must not be in the far future (5 minutes grace for clock drift)
-- Note: This uses a function-based check to stay current
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_timestamp_not_future
  CHECK (time <= NOW() + INTERVAL '5 minutes');

-- =============================================================================
-- 4. ADD INDEX FOR API KEY CREATED_AT (for rotation tracking)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_api_key_created
  ON users(api_key_created_at);

-- =============================================================================
-- 5. ADD API KEY ROTATION SUPPORT
-- =============================================================================

-- Function to rotate a user's API key
CREATE OR REPLACE FUNCTION rotate_api_key(target_user_id UUID)
RETURNS VARCHAR(64) AS $$
DECLARE
  new_key VARCHAR(64);
BEGIN
  new_key := generate_api_key();

  UPDATE users
  SET api_key = new_key,
      api_key_created_at = NOW(),
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. VERIFY EXISTING API KEYS ARE UNIQUE
-- =============================================================================
-- This is a safety check - the UNIQUE constraint on users.api_key already
-- enforces this, but we want to make sure no duplicates slipped in.
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT api_key) INTO dup_count FROM users;
  IF dup_count > 0 THEN
    RAISE WARNING 'Found % duplicate API keys! Manual intervention required.', dup_count;
  END IF;
END;
$$;
