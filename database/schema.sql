-- Create early_access_requests table
CREATE TABLE IF NOT EXISTS early_access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(50) DEFAULT 'Landing Page',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access_requests(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_early_access_created_at ON early_access_requests(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE early_access_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public inserts" ON early_access_requests;
DROP POLICY IF EXISTS "Allow authenticated reads" ON early_access_requests;

-- Create policy to allow inserts from anyone (anon and authenticated)
CREATE POLICY "Allow public inserts" ON early_access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy to allow reads only for authenticated users (for admin dashboard later)
CREATE POLICY "Allow authenticated reads" ON early_access_requests
  FOR SELECT
  TO authenticated
  USING (true);
