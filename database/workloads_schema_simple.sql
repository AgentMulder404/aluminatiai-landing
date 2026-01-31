-- AluminatiAI Workloads Table (Simplified)
-- Run this in Supabase SQL Editor

-- Create workloads table
CREATE TABLE IF NOT EXISTS workloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID,
  model_size_gb FLOAT8 NOT NULL,
  num_gpus INTEGER NOT NULL,
  gpu_type TEXT NOT NULL,
  duration_hours FLOAT8 NOT NULL,
  utilization_pct FLOAT8 DEFAULT 80,
  estimated_kwh FLOAT8 NOT NULL,
  estimated_carbon_kg FLOAT8 NOT NULL,
  estimated_cost_usd FLOAT8 NOT NULL,
  status TEXT DEFAULT 'submitted',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  used_smart_agent BOOLEAN DEFAULT FALSE,
  agent_confidence FLOAT8,
  agent_reasoning JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workloads_created_at ON workloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workloads_status ON workloads(status);

-- Enable RLS
ALTER TABLE workloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public inserts" ON workloads;
DROP POLICY IF EXISTS "Allow public reads" ON workloads;
DROP POLICY IF EXISTS "Allow authenticated updates" ON workloads;

-- Allow anyone to insert
CREATE POLICY "Allow public inserts" ON workloads
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read
CREATE POLICY "Allow public reads" ON workloads
  FOR SELECT
  USING (true);

-- Allow anyone to update (for demo purposes)
CREATE POLICY "Allow public updates" ON workloads
  FOR UPDATE
  USING (true);
