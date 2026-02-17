-- Migration 007: GPU Architectures & Efficiency Curves
-- Reference tables for hardware-software fingerprinting and efficiency scoring.
-- Date: 2026-02-16

-- =============================================================================
-- 1. GPU ARCHITECTURES - Reference table (seeded, not user-generated)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gpu_architectures (
  id SERIAL PRIMARY KEY,
  arch_name VARCHAR(64) NOT NULL UNIQUE,
  arch_family VARCHAR(32) NOT NULL,
  tdp_w NUMERIC(10, 2) NOT NULL,
  fp16_tflops NUMERIC(10, 2) NOT NULL,
  fp32_tflops NUMERIC(10, 2) NOT NULL,
  bf16_tflops NUMERIC(10, 2) NOT NULL,
  memory_gb NUMERIC(10, 2) NOT NULL,
  memory_bw_gbps NUMERIC(10, 2) NOT NULL,
  has_transformer_engine BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_arch_tdp_positive CHECK (tdp_w > 0),
  CONSTRAINT check_arch_fp16_positive CHECK (fp16_tflops > 0),
  CONSTRAINT check_arch_memory_positive CHECK (memory_gb > 0),
  CONSTRAINT check_arch_bw_positive CHECK (memory_bw_gbps > 0)
);

-- Seed GPU architecture data
INSERT INTO gpu_architectures
  (arch_name, arch_family, tdp_w, fp16_tflops, fp32_tflops, bf16_tflops, memory_gb, memory_bw_gbps, has_transformer_engine)
VALUES
  ('A100-SXM4-80GB',  'Ampere',        400,  312,  19.5,  312,  80, 2039, FALSE),
  ('A100-SXM4-40GB',  'Ampere',        400,  312,  19.5,  312,  40, 1555, FALSE),
  ('A100-PCIe-80GB',  'Ampere',        300,  312,  19.5,  312,  80, 2039, FALSE),
  ('A100-PCIe-40GB',  'Ampere',        250,  312,  19.5,  312,  40, 1555, FALSE),
  ('H100-SXM5-80GB',  'Hopper',        700,  989,  67.0,  989,  80, 3350, TRUE),
  ('H100-PCIe-80GB',  'Hopper',        350,  756,  51.0,  756,  80, 2039, TRUE),
  ('H200-SXM-141GB',  'Hopper',        700, 989,   67.0,  989, 141, 4800, TRUE),
  ('L40S',            'Ada Lovelace',  350,  362,  91.6,  362,  48,  864, FALSE),
  ('L40',             'Ada Lovelace',  300,  181,  90.5,  181,  48,  864, FALSE),
  ('A10G',            'Ampere',        150,   70,  31.2,   70,  24,  600, FALSE),
  ('T4',              'Turing',         70,   65,   8.1,    0,  16,  300, FALSE),
  ('V100-SXM2-32GB',  'Volta',        300,  125,  15.7,    0,  32,  900, FALSE),
  ('V100-SXM2-16GB',  'Volta',        300,  125,  15.7,    0,  16,  900, FALSE)
ON CONFLICT (arch_name) DO NOTHING;

-- =============================================================================
-- 2. GPU EFFICIENCY CURVES - Observed data points from fleet metrics
-- =============================================================================

CREATE TABLE IF NOT EXISTS gpu_efficiency_curves (
  id SERIAL PRIMARY KEY,
  arch_name VARCHAR(64) NOT NULL REFERENCES gpu_architectures(arch_name),
  utilization_bucket SMALLINT NOT NULL,

  -- Aggregated from real metrics
  avg_power_w NUMERIC(10, 2) NOT NULL,
  avg_tflops_achieved NUMERIC(10, 4),
  joules_per_tflop NUMERIC(10, 4) NOT NULL,
  sample_count INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (arch_name, utilization_bucket),
  CONSTRAINT check_util_bucket_range CHECK (utilization_bucket BETWEEN 0 AND 100),
  CONSTRAINT check_curve_power_positive CHECK (avg_power_w >= 0),
  CONSTRAINT check_curve_jpt_positive CHECK (joules_per_tflop >= 0),
  CONSTRAINT check_curve_samples_positive CHECK (sample_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_efficiency_curves_arch
  ON gpu_efficiency_curves (arch_name, utilization_bucket);

-- =============================================================================
-- 3. MODEL PROFILES - Known ML model characteristics for match scoring
-- =============================================================================

CREATE TABLE IF NOT EXISTS model_profiles (
  id SERIAL PRIMARY KEY,
  model_tag VARCHAR(128) NOT NULL UNIQUE,
  model_family VARCHAR(64),
  math_intensity NUMERIC(10, 2) NOT NULL,
  dominant_precision VARCHAR(8) NOT NULL DEFAULT 'fp16',
  is_memory_bound BOOLEAN NOT NULL DEFAULT FALSE,
  typical_util_min SMALLINT NOT NULL DEFAULT 40,
  typical_util_max SMALLINT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_model_math_intensity_positive CHECK (math_intensity > 0),
  CONSTRAINT check_model_precision_valid CHECK (
    dominant_precision IN ('fp16', 'bf16', 'fp32', 'fp8', 'int8')
  ),
  CONSTRAINT check_model_util_range CHECK (
    typical_util_min >= 0 AND typical_util_max <= 100
    AND typical_util_min < typical_util_max
  )
);

-- Seed known model profiles
INSERT INTO model_profiles
  (model_tag, model_family, math_intensity, dominant_precision, is_memory_bound, typical_util_min, typical_util_max)
VALUES
  ('bert-base',       'BERT',           10,   'fp16',  TRUE,  35, 65),
  ('bert-large',      'BERT',           12,   'fp16',  TRUE,  40, 70),
  ('llama-3-8b',      'Llama',          95,   'bf16',  FALSE, 60, 85),
  ('llama-3-70b',     'Llama',         185,   'bf16',  FALSE, 75, 95),
  ('llama-3-405b',    'Llama',         220,   'bf16',  FALSE, 80, 95),
  ('mistral-7b',      'Mistral',        90,   'bf16',  FALSE, 55, 80),
  ('mixtral-8x7b',    'Mistral',       110,   'bf16',  FALSE, 60, 85),
  ('gpt-neox-20b',    'GPT-NeoX',      130,   'fp16',  FALSE, 65, 90),
  ('sdxl',            'Diffusion',      48,   'fp16',  TRUE,  50, 80),
  ('sd-3',            'Diffusion',      55,   'fp16',  FALSE, 50, 80),
  ('whisper-large',   'Whisper',        28,   'fp16',  TRUE,  35, 65),
  ('whisper-medium',  'Whisper',        22,   'fp16',  TRUE,  30, 60),
  ('vit-large',       'ViT',            35,   'fp16',  TRUE,  40, 70),
  ('t5-xxl',          'T5',            100,   'bf16',  FALSE, 55, 85),
  ('falcon-40b',      'Falcon',        140,   'bf16',  FALSE, 65, 90),
  ('deepseek-v3',     'DeepSeek',      200,   'bf16',  FALSE, 75, 95)
ON CONFLICT (model_tag) DO NOTHING;

-- =============================================================================
-- 4. HARDWARE MATCH SCORES - Cached per model+arch combinations
-- =============================================================================

CREATE TABLE IF NOT EXISTS hardware_match_scores (
  id SERIAL PRIMARY KEY,
  model_tag VARCHAR(128) NOT NULL REFERENCES model_profiles(model_tag),
  gpu_arch VARCHAR(64) NOT NULL REFERENCES gpu_architectures(arch_name),
  match_score NUMERIC(5, 2) NOT NULL,
  joules_per_tflop NUMERIC(10, 4) NOT NULL,
  best_arch VARCHAR(64) REFERENCES gpu_architectures(arch_name),
  recommendation TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (model_tag, gpu_arch),
  CONSTRAINT check_hms_score_range CHECK (match_score >= 0 AND match_score <= 100),
  CONSTRAINT check_hms_jpt_positive CHECK (joules_per_tflop >= 0)
);

CREATE INDEX IF NOT EXISTS idx_hms_model
  ON hardware_match_scores (model_tag);

CREATE INDEX IF NOT EXISTS idx_hms_arch
  ON hardware_match_scores (gpu_arch);

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================
-- gpu_architectures, model_profiles, hardware_match_scores are reference data.
-- All authenticated users can read them. Only service role can write.

ALTER TABLE gpu_architectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_efficiency_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read GPU architectures"
  ON gpu_architectures FOR SELECT
  USING (TRUE);

CREATE POLICY "All users can read efficiency curves"
  ON gpu_efficiency_curves FOR SELECT
  USING (TRUE);

CREATE POLICY "All users can read model profiles"
  ON model_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "All users can read hardware match scores"
  ON hardware_match_scores FOR SELECT
  USING (TRUE);

-- =============================================================================
-- 6. GRANTS
-- =============================================================================

GRANT SELECT ON gpu_architectures TO authenticated;
GRANT SELECT ON gpu_efficiency_curves TO authenticated;
GRANT SELECT ON model_profiles TO authenticated;
GRANT SELECT ON hardware_match_scores TO authenticated;

-- =============================================================================
-- 7. COMMENTS
-- =============================================================================

COMMENT ON TABLE gpu_architectures IS 'Reference table of GPU hardware specs for efficiency calculations';
COMMENT ON TABLE gpu_efficiency_curves IS 'Observed Joules/TFLOP at each utilization level per GPU arch';
COMMENT ON TABLE model_profiles IS 'Known ML model characteristics for hardware match scoring';
COMMENT ON TABLE hardware_match_scores IS 'Cached hardware-model efficiency scores';
COMMENT ON COLUMN gpu_architectures.tdp_w IS 'Thermal Design Power in Watts';
COMMENT ON COLUMN gpu_architectures.fp16_tflops IS 'Peak FP16 performance in TFLOPS';
COMMENT ON COLUMN gpu_architectures.memory_bw_gbps IS 'Peak memory bandwidth in GB/s';
COMMENT ON COLUMN gpu_efficiency_curves.joules_per_tflop IS 'Energy efficiency: lower is better';
COMMENT ON COLUMN model_profiles.math_intensity IS 'Arithmetic intensity in FLOP/byte — drives compute vs memory boundedness';
COMMENT ON COLUMN hardware_match_scores.match_score IS '0-100: 100 = optimal hardware for this workload, lower = energy wasted';
