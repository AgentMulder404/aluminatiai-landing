-- GPU Monitoring Free Trial - Database Migration
-- Creates tables for user profiles, GPU metrics time-series, and job tracking
-- Uses TimescaleDB for efficient time-series storage

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- =============================================================================
-- USERS TABLE - Extends auth.users with trial and API key management
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  company VARCHAR(255),

  -- API Key for agent authentication
  api_key VARCHAR(64) UNIQUE NOT NULL,
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Trial management
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- User preferences
  electricity_rate_per_kwh NUMERIC(10, 4) DEFAULT 0.12,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- =============================================================================
-- GPU METRICS TABLE - Time-series data for GPU monitoring
-- =============================================================================

CREATE TABLE IF NOT EXISTS gpu_metrics (
  time TIMESTAMPTZ NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- GPU identification
  gpu_index INTEGER NOT NULL,
  gpu_uuid VARCHAR(64) NOT NULL,
  gpu_name VARCHAR(255),

  -- Power metrics
  power_draw_w NUMERIC(10, 2) NOT NULL,
  power_limit_w NUMERIC(10, 2),
  energy_delta_j NUMERIC(15, 4),

  -- Utilization
  utilization_gpu_pct SMALLINT DEFAULT 0 CHECK (utilization_gpu_pct >= 0 AND utilization_gpu_pct <= 100),
  utilization_memory_pct SMALLINT DEFAULT 0 CHECK (utilization_memory_pct >= 0 AND utilization_memory_pct <= 100),

  -- Thermal
  temperature_c SMALLINT DEFAULT 0,
  fan_speed_pct SMALLINT DEFAULT 0,

  -- Memory
  memory_used_mb NUMERIC(12, 2) DEFAULT 0,
  memory_total_mb NUMERIC(12, 2) DEFAULT 0,

  -- Optional clocks
  sm_clock_mhz INTEGER,
  memory_clock_mhz INTEGER,

  -- Job attribution (optional for MVP)
  job_id UUID,

  PRIMARY KEY (user_id, time, gpu_index)
);

-- Convert to TimescaleDB hypertable with 1-day chunks
SELECT create_hypertable('gpu_metrics', 'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_user_time ON gpu_metrics (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_gpu_uuid ON gpu_metrics (user_id, gpu_uuid, time DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_job_id ON gpu_metrics (job_id) WHERE job_id IS NOT NULL;

-- Enable compression for older data (70-90% space savings)
ALTER TABLE gpu_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id, gpu_index'
);

-- Add compression policy: compress chunks older than 7 days
SELECT add_compression_policy('gpu_metrics', INTERVAL '7 days', if_not_exists => TRUE);

-- Add retention policy: drop chunks older than 90 days
SELECT add_retention_policy('gpu_metrics', INTERVAL '90 days', if_not_exists => TRUE);

-- =============================================================================
-- GPU METRICS HOURLY - Continuous aggregate for fast dashboard queries
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS gpu_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  user_id,
  gpu_index,
  gpu_uuid,
  AVG(power_draw_w) as avg_power_w,
  MAX(power_draw_w) as max_power_w,
  MIN(power_draw_w) as min_power_w,
  SUM(energy_delta_j) as total_energy_j,
  AVG(utilization_gpu_pct) as avg_util_pct,
  MAX(utilization_gpu_pct) as max_util_pct,
  AVG(utilization_memory_pct) as avg_mem_util_pct,
  AVG(temperature_c) as avg_temp_c,
  MAX(temperature_c) as max_temp_c,
  COUNT(*) as sample_count
FROM gpu_metrics
GROUP BY bucket, user_id, gpu_index, gpu_uuid;

-- Refresh policy for continuous aggregate (refresh every hour)
SELECT add_continuous_aggregate_policy('gpu_metrics_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- =============================================================================
-- GPU JOBS TABLE - Track job sessions (optional for MVP)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gpu_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Job metadata
  job_name VARCHAR(255),
  job_command TEXT,
  gpu_indices INTEGER[],

  -- Time tracking
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,

  -- Computed metrics (updated periodically)
  total_energy_kwh NUMERIC(12, 6),
  total_cost_usd NUMERIC(12, 4),
  avg_utilization_pct NUMERIC(5, 2),
  duration_seconds INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for job queries
CREATE INDEX IF NOT EXISTS idx_gpu_jobs_user_time ON gpu_jobs (user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_jobs_active ON gpu_jobs (user_id, end_time) WHERE end_time IS NULL;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_jobs ENABLE ROW LEVEL SECURITY;

-- Users: users can view and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- GPU metrics: users can insert and read their own metrics
CREATE POLICY "Users can insert own metrics" ON gpu_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own metrics" ON gpu_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- GPU jobs: users can manage their own jobs
CREATE POLICY "Users can manage own jobs" ON gpu_jobs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to generate secure API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR(64) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result VARCHAR(64) := 'alum_';
  i INTEGER;
BEGIN
  FOR i IN 1..59 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to create user profile after auth.users insert
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, api_key)
  VALUES (
    NEW.id,
    NEW.email,
    generate_api_key()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for gpu_jobs table
CREATE TRIGGER update_gpu_jobs_updated_at
  BEFORE UPDATE ON gpu_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON gpu_metrics_hourly TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT, INSERT ON gpu_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON gpu_jobs TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE users IS 'User profiles with API keys and trial management';
COMMENT ON TABLE gpu_metrics IS 'TimescaleDB hypertable storing GPU metrics time-series data';
COMMENT ON TABLE gpu_metrics_hourly IS 'Continuous aggregate providing hourly GPU metrics summaries';
COMMENT ON TABLE gpu_jobs IS 'Tracks GPU job sessions with computed energy and cost metrics';

COMMENT ON COLUMN users.api_key IS 'Unique API key for agent authentication (format: alum_*)';
COMMENT ON COLUMN users.trial_ends_at IS 'Trial expiration timestamp (14 days from signup)';
COMMENT ON COLUMN users.electricity_rate_per_kwh IS 'User-specific electricity rate in USD per kWh';

COMMENT ON COLUMN gpu_metrics.energy_delta_j IS 'Energy consumed since last sample in Joules';
COMMENT ON COLUMN gpu_metrics.utilization_gpu_pct IS 'GPU compute utilization percentage (0-100)';
COMMENT ON COLUMN gpu_metrics.utilization_memory_pct IS 'GPU memory utilization percentage (0-100)';
