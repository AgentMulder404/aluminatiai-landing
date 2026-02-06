-- Fix: Update refresh function to not use CONCURRENTLY
-- This allows refresh to work without requiring a unique index

CREATE OR REPLACE FUNCTION refresh_gpu_metrics_hourly()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW gpu_metrics_hourly;
END;
$$ LANGUAGE plpgsql;

-- Note: This will briefly lock the materialized view during refresh (usually <1 second)
-- For production with high traffic, you can add a unique index and use CONCURRENTLY:
--
-- CREATE UNIQUE INDEX idx_gpu_metrics_hourly_unique
-- ON gpu_metrics_hourly(user_id, bucket, gpu_uuid, gpu_index);
--
-- Then update the function to use:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY gpu_metrics_hourly;
