-- GPU Monitoring Free Trial - Database Migration (PostgreSQL version)
-- Creates tables for user profiles, GPU metrics time-series, and job tracking
-- Uses standard PostgreSQL with optimized indexes for time-series queries

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
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

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
  id BIGSERIAL PRIMARY KEY,
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

  -- Memory
  memory_used_mb BIGINT,
  memory_total_mb BIGINT,

  -- Thermal
  temperature_c SMALLINT,
  fan_speed_pct SMALLINT,

  -- Clock speeds
  clock_graphics_mhz INTEGER,
  clock_sm_mhz INTEGER,
  clock_memory_mhz INTEGER,

  -- Job context (optional, for attribution)
  job_id UUID,
  job_name VARCHAR(255),
  process_name VARCHAR(255),
  process_pid INTEGER,
  username VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes optimized for time-series queries
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_user_time ON gpu_metrics(user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_time ON gpu_metrics(time DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_job_id ON gpu_metrics(job_id) WHERE job_id IS NOT NULL;

-- Partition table by time for better performance (optional, for large datasets)
-- This creates monthly partitions automatically
-- Note: Partitioning can be added later if needed

-- =============================================================================
-- GPU METRICS HOURLY MATERIALIZED VIEW
-- =============================================================================
-- Replaces TimescaleDB continuous aggregates with materialized view
-- Refresh this periodically for dashboard performance

CREATE MATERIALIZED VIEW IF NOT EXISTS gpu_metrics_hourly AS
SELECT
  user_id,
  date_trunc('hour', time) AS bucket,
  gpu_index,
  gpu_uuid,
  AVG(power_draw_w) AS avg_power_w,
  MAX(power_draw_w) AS max_power_w,
  AVG(utilization_gpu_pct) AS avg_utilization_pct,
  AVG(temperature_c) AS avg_temperature_c,
  SUM(energy_delta_j) AS total_energy_j,
  COUNT(*) AS sample_count
FROM gpu_metrics
GROUP BY user_id, date_trunc('hour', time), gpu_index, gpu_uuid;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_hourly_user_time ON gpu_metrics_hourly(user_id, bucket DESC);

-- =============================================================================
-- GPU JOBS TABLE - Track jobs and their energy consumption
-- =============================================================================

CREATE TABLE IF NOT EXISTS gpu_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Job identification
  job_name VARCHAR(255) NOT NULL,
  job_id_external VARCHAR(255),

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Aggregated metrics
  total_energy_kwh NUMERIC(15, 6),
  total_cost_usd NUMERIC(10, 2),
  avg_power_w NUMERIC(10, 2),
  avg_utilization_pct NUMERIC(5, 2),

  -- GPU info
  gpu_indices INTEGER[],
  num_gpus INTEGER DEFAULT 1,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for job queries
CREATE INDEX IF NOT EXISTS idx_gpu_jobs_user_start ON gpu_jobs(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_jobs_active ON gpu_jobs(user_id, is_active) WHERE is_active = TRUE;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to generate API keys with alum_ prefix
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

-- Function to refresh hourly materialized view
CREATE OR REPLACE FUNCTION refresh_gpu_metrics_hourly()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY gpu_metrics_hourly;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to auto-create user profile when auth.users row is inserted
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, api_key)
  VALUES (
    NEW.id,
    NEW.email,
    generate_api_key()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gpu_jobs_updated_at ON gpu_jobs;
CREATE TRIGGER update_gpu_jobs_updated_at
  BEFORE UPDATE ON gpu_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own metrics
CREATE POLICY gpu_metrics_select_own ON gpu_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY gpu_metrics_insert_own ON gpu_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only see their own jobs
CREATE POLICY gpu_jobs_select_own ON gpu_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY gpu_jobs_insert_own ON gpu_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY gpu_jobs_update_own ON gpu_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- DATA RETENTION
-- =============================================================================

-- Function to clean up old metrics (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM gpu_metrics
  WHERE time < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run daily via pg_cron or external scheduler
-- Example: SELECT cron.schedule('cleanup-old-metrics', '0 2 * * *', 'SELECT cleanup_old_metrics()');

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON gpu_metrics TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON gpu_jobs TO authenticated;

-- Grant permissions for service role (used by API endpoints)
GRANT ALL ON users TO service_role;
GRANT ALL ON gpu_metrics TO service_role;
GRANT ALL ON gpu_jobs TO service_role;
GRANT SELECT ON gpu_metrics_hourly TO service_role;

-- =============================================================================
-- INITIAL DATA / TESTING
-- =============================================================================

-- Note: Materialized view needs to be refreshed periodically
-- Set up a cron job or call refresh_gpu_metrics_hourly() regularly
-- For now, it will be empty until metrics are inserted

COMMENT ON TABLE users IS 'User profiles with API keys and trial management';
COMMENT ON TABLE gpu_metrics IS 'Time-series GPU metrics data from monitoring agents';
COMMENT ON TABLE gpu_jobs IS 'GPU job tracking with aggregated energy and cost metrics';
COMMENT ON MATERIALIZED VIEW gpu_metrics_hourly IS 'Hourly aggregated metrics for fast dashboard queries';
