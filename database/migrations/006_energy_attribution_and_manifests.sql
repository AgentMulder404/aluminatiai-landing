-- Migration 006: Energy Attribution & Energy Manifests
-- Adds multi-tenant mapping (team_id, model_tag, scheduler_source) to gpu_metrics
-- and gpu_jobs. Creates energy_manifests table for per-job energy audits.
-- Date: 2026-02-16

-- =============================================================================
-- 1. ADD ATTRIBUTION COLUMNS TO gpu_metrics
-- =============================================================================

ALTER TABLE gpu_metrics ADD COLUMN IF NOT EXISTS team_id VARCHAR(128);
ALTER TABLE gpu_metrics ADD COLUMN IF NOT EXISTS model_tag VARCHAR(128);
ALTER TABLE gpu_metrics ADD COLUMN IF NOT EXISTS scheduler_source VARCHAR(32);

-- Validate scheduler_source values when provided
ALTER TABLE gpu_metrics
  ADD CONSTRAINT check_scheduler_source_valid
  CHECK (scheduler_source IS NULL OR scheduler_source IN ('kubernetes', 'slurm', 'runai', 'manual'));

-- Indexes for attribution queries (partial — only on rows that have attribution)
CREATE INDEX IF NOT EXISTS idx_gpu_metrics_team
  ON gpu_metrics (user_id, team_id, time DESC)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gpu_metrics_model
  ON gpu_metrics (user_id, model_tag, time DESC)
  WHERE model_tag IS NOT NULL;

-- =============================================================================
-- 2. ADD ATTRIBUTION COLUMNS TO gpu_jobs
-- =============================================================================

ALTER TABLE gpu_jobs ADD COLUMN IF NOT EXISTS team_id VARCHAR(128);
ALTER TABLE gpu_jobs ADD COLUMN IF NOT EXISTS model_tag VARCHAR(128);
ALTER TABLE gpu_jobs ADD COLUMN IF NOT EXISTS scheduler_source VARCHAR(32);

ALTER TABLE gpu_jobs
  ADD CONSTRAINT check_jobs_scheduler_source_valid
  CHECK (scheduler_source IS NULL OR scheduler_source IN ('kubernetes', 'slurm', 'runai', 'manual'));

CREATE INDEX IF NOT EXISTS idx_gpu_jobs_team
  ON gpu_jobs (user_id, team_id, start_time DESC)
  WHERE team_id IS NOT NULL;

-- =============================================================================
-- 3. ENERGY MANIFESTS TABLE
-- =============================================================================
-- One row per completed job — the single source of truth for energy accountability.

CREATE TABLE IF NOT EXISTS energy_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES gpu_jobs(id) ON DELETE CASCADE,

  -- Attribution
  team_id VARCHAR(128) NOT NULL,
  model_tag VARCHAR(128) NOT NULL DEFAULT 'untagged',
  scheduler_source VARCHAR(32) NOT NULL,

  -- Temporal
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,

  -- Energy accountability
  total_energy_j NUMERIC(18, 4) NOT NULL,
  total_energy_kwh NUMERIC(12, 6) NOT NULL,
  peak_power_w NUMERIC(10, 2) NOT NULL,
  avg_power_w NUMERIC(10, 2) NOT NULL,

  -- Financial accountability
  electricity_rate NUMERIC(10, 4) NOT NULL,
  cost_usd NUMERIC(12, 4) NOT NULL,

  -- Carbon accountability
  grid_carbon_intensity_g_kwh NUMERIC(10, 2) NOT NULL,
  co2_kg NUMERIC(12, 6) NOT NULL,

  -- Hardware context
  gpu_arch VARCHAR(64) NOT NULL,
  gpu_count SMALLINT NOT NULL,
  gpu_uuids TEXT[] NOT NULL,

  -- Efficiency scoring (populated by hardware fingerprinting)
  hardware_match_score NUMERIC(5, 2),
  efficiency_percentile NUMERIC(5, 2),

  -- Provenance
  sample_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT check_manifest_energy_positive CHECK (total_energy_j >= 0),
  CONSTRAINT check_manifest_kwh_positive CHECK (total_energy_kwh >= 0),
  CONSTRAINT check_manifest_duration_positive CHECK (duration_seconds > 0),
  CONSTRAINT check_manifest_cost_positive CHECK (cost_usd >= 0),
  CONSTRAINT check_manifest_co2_positive CHECK (co2_kg >= 0),
  CONSTRAINT check_manifest_gpu_count_positive CHECK (gpu_count > 0),
  CONSTRAINT check_manifest_score_range CHECK (
    hardware_match_score IS NULL OR
    (hardware_match_score >= 0 AND hardware_match_score <= 100)
  ),
  CONSTRAINT check_manifest_percentile_range CHECK (
    efficiency_percentile IS NULL OR
    (efficiency_percentile >= 0 AND efficiency_percentile <= 100)
  ),
  CONSTRAINT check_manifest_scheduler_valid CHECK (
    scheduler_source IN ('kubernetes', 'slurm', 'runai', 'manual')
  ),
  CONSTRAINT check_manifest_time_order CHECK (end_time > start_time)
);

-- Indexes for manifest queries
CREATE INDEX IF NOT EXISTS idx_manifests_user_time
  ON energy_manifests (user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_manifests_team
  ON energy_manifests (user_id, team_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_manifests_model
  ON energy_manifests (user_id, model_tag, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_manifests_job
  ON energy_manifests (job_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE energy_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own manifests"
  ON energy_manifests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manifests"
  ON energy_manifests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 5. GRANTS
-- =============================================================================

GRANT SELECT, INSERT ON energy_manifests TO authenticated;

-- =============================================================================
-- 6. FUNCTION: Generate energy manifest for a completed job
-- =============================================================================
-- Called when a job's end_time is set. Aggregates gpu_metrics into a manifest.

CREATE OR REPLACE FUNCTION generate_energy_manifest(
  p_job_id UUID,
  p_grid_carbon_intensity NUMERIC DEFAULT 394.0  -- US average gCO2/kWh
)
RETURNS UUID AS $$
DECLARE
  v_job RECORD;
  v_user RECORD;
  v_agg RECORD;
  v_total_kwh NUMERIC;
  v_cost_usd NUMERIC;
  v_co2_kg NUMERIC;
  v_manifest_id UUID;
BEGIN
  -- Fetch job details
  SELECT * INTO v_job FROM gpu_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;
  IF v_job.end_time IS NULL THEN
    RAISE EXCEPTION 'Job % has not ended yet', p_job_id;
  END IF;

  -- Fetch user electricity rate
  SELECT electricity_rate_per_kwh INTO v_user
    FROM users WHERE id = v_job.user_id;

  -- Aggregate raw metrics for this job
  SELECT
    COALESCE(SUM(energy_delta_j), 0)         AS total_energy_j,
    COALESCE(MAX(power_draw_w), 0)           AS peak_power_w,
    COALESCE(AVG(power_draw_w), 0)           AS avg_power_w,
    COUNT(*)                                  AS sample_count,
    ARRAY_AGG(DISTINCT gpu_uuid)              AS gpu_uuids,
    MAX(gpu_name)                             AS gpu_arch
  INTO v_agg
  FROM gpu_metrics
  WHERE user_id = v_job.user_id
    AND job_id = p_job_id
    AND time BETWEEN v_job.start_time AND v_job.end_time;

  -- Calculate derived metrics
  v_total_kwh := v_agg.total_energy_j / 3600000.0;
  v_cost_usd := v_total_kwh * v_user.electricity_rate_per_kwh;
  v_co2_kg := v_total_kwh * p_grid_carbon_intensity / 1000.0;

  -- Insert manifest
  INSERT INTO energy_manifests (
    user_id, job_id,
    team_id, model_tag, scheduler_source,
    start_time, end_time, duration_seconds,
    total_energy_j, total_energy_kwh, peak_power_w, avg_power_w,
    electricity_rate, cost_usd,
    grid_carbon_intensity_g_kwh, co2_kg,
    gpu_arch, gpu_count, gpu_uuids,
    sample_count
  ) VALUES (
    v_job.user_id, p_job_id,
    COALESCE(v_job.team_id, 'default'),
    COALESCE(v_job.model_tag, 'untagged'),
    COALESCE(v_job.scheduler_source, 'manual'),
    v_job.start_time, v_job.end_time,
    EXTRACT(EPOCH FROM (v_job.end_time - v_job.start_time))::INTEGER,
    v_agg.total_energy_j, v_total_kwh, v_agg.peak_power_w, v_agg.avg_power_w,
    v_user.electricity_rate_per_kwh, v_cost_usd,
    p_grid_carbon_intensity, v_co2_kg,
    COALESCE(v_agg.gpu_arch, 'unknown'),
    COALESCE(array_length(v_agg.gpu_uuids, 1), 0),
    COALESCE(v_agg.gpu_uuids, ARRAY[]::TEXT[]),
    v_agg.sample_count
  )
  RETURNING id INTO v_manifest_id;

  -- Update gpu_jobs with computed energy/cost
  UPDATE gpu_jobs SET
    total_energy_kwh = v_total_kwh,
    total_cost_usd = v_cost_usd,
    avg_utilization_pct = (
      SELECT AVG(utilization_gpu_pct)
      FROM gpu_metrics
      WHERE user_id = v_job.user_id
        AND job_id = p_job_id
        AND time BETWEEN v_job.start_time AND v_job.end_time
    ),
    duration_seconds = EXTRACT(EPOCH FROM (v_job.end_time - v_job.start_time))::INTEGER
  WHERE id = p_job_id;

  RETURN v_manifest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. COMMENTS
-- =============================================================================

COMMENT ON TABLE energy_manifests IS 'Per-job energy audit — the unit of accountability for energy attribution';
COMMENT ON COLUMN energy_manifests.total_energy_j IS 'Total energy consumed in Joules (sum of energy_delta_j from gpu_metrics)';
COMMENT ON COLUMN energy_manifests.total_energy_kwh IS 'Total energy in kWh (total_energy_j / 3,600,000)';
COMMENT ON COLUMN energy_manifests.cost_usd IS 'Electricity cost in USD (total_energy_kwh * electricity_rate)';
COMMENT ON COLUMN energy_manifests.co2_kg IS 'Carbon emissions in kg CO2 (total_energy_kwh * grid_intensity / 1000)';
COMMENT ON COLUMN energy_manifests.hardware_match_score IS '0-100 score: how well-suited this GPU arch is for this workload';
COMMENT ON COLUMN energy_manifests.efficiency_percentile IS 'This job efficiency vs fleet average (0-100)';
COMMENT ON COLUMN gpu_metrics.team_id IS 'Team attribution from scheduler (K8s namespace/label, Slurm account, etc.)';
COMMENT ON COLUMN gpu_metrics.model_tag IS 'ML model identifier (e.g., llama-3-70b, bert-large)';
COMMENT ON COLUMN gpu_metrics.scheduler_source IS 'Which scheduler provided the attribution (kubernetes, slurm, runai, manual)';
