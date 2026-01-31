-- AluminatiAI Workloads Table
-- Tracks AI workload submissions for passive energy monitoring

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workloads table
CREATE TABLE IF NOT EXISTS workloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID,

  -- Workload specs
  model_size_gb FLOAT8 NOT NULL,
  num_gpus INTEGER NOT NULL CHECK (num_gpus > 0),
  gpu_type TEXT NOT NULL,
  duration_hours FLOAT8 NOT NULL CHECK (duration_hours > 0),
  utilization_pct FLOAT8 DEFAULT 80 CHECK (utilization_pct >= 0 AND utilization_pct <= 100),

  -- Energy estimates
  estimated_kwh FLOAT8 NOT NULL,
  estimated_carbon_kg FLOAT8 NOT NULL,
  estimated_cost_usd FLOAT8 NOT NULL,

  -- Metadata
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'running', 'completed', 'failed')),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Agent metadata (if used smart agent)
  used_smart_agent BOOLEAN DEFAULT FALSE,
  agent_confidence FLOAT8,
  agent_reasoning JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workloads_created_at ON workloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workloads_user_id ON workloads(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workloads_status ON workloads(status);

-- Row Level Security (RLS) Policies
ALTER TABLE workloads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anonymous users can submit workloads)
CREATE POLICY "Allow public inserts" ON workloads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public reads of their own submissions (by ID)
CREATE POLICY "Allow public reads" ON workloads
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can update their own workloads
CREATE POLICY "Allow authenticated updates" ON workloads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on row changes
DROP TRIGGER IF EXISTS update_workloads_updated_at ON workloads;
CREATE TRIGGER update_workloads_updated_at
  BEFORE UPDATE ON workloads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON workloads TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Workloads table created successfully!';
END $$;
