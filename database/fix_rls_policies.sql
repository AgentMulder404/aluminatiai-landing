-- Fix RLS Policies for early_access_requests table
-- Run this if you're getting "row violates row-level security policy" errors

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public inserts" ON early_access_requests;
DROP POLICY IF EXISTS "Allow authenticated reads" ON early_access_requests;

-- Recreate policy to explicitly allow inserts from anon users
CREATE POLICY "Allow public inserts" ON early_access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Recreate policy to allow reads only for authenticated users
CREATE POLICY "Allow authenticated reads" ON early_access_requests
  FOR SELECT
  TO authenticated
  USING (true);
