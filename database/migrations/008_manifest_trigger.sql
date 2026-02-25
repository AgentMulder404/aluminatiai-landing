-- Migration 008: Auto-generate Energy Manifests on Job Completion
-- Adds AFTER UPDATE trigger on gpu_jobs that calls generate_energy_manifest()
-- when end_time transitions NULL → NOT NULL.
-- Also adds backfill_missing_manifests() for the cron safety-net.
-- Date: 2026-02-24

-- =============================================================================
-- 1. TRIGGER FUNCTION
-- =============================================================================
-- Fires after any UPDATE on gpu_jobs.
-- Only acts when end_time was NULL and is now set.
-- Wrapped in EXCEPTION so a manifest failure never rolls back the job update.

CREATE OR REPLACE FUNCTION trigger_manifest_on_job_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
    -- Idempotent: skip if a manifest already exists for this job
    IF NOT EXISTS (SELECT 1 FROM energy_manifests WHERE job_id = NEW.id) THEN
      PERFORM generate_energy_manifest(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but never abort the job UPDATE transaction
    RAISE WARNING 'generate_energy_manifest failed for job %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS on_job_complete_generate_manifest ON gpu_jobs;

CREATE TRIGGER on_job_complete_generate_manifest
  AFTER UPDATE ON gpu_jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_manifest_on_job_complete();

-- =============================================================================
-- 3. BACKFILL FUNCTION — called by cron safety-net
-- =============================================================================
-- Finds completed jobs with no manifest and generates them in one pass.
-- Returns one row per job processed with status 'created' or 'error: ...'.
-- Capped at 100 jobs per invocation to avoid long-running transactions.

CREATE OR REPLACE FUNCTION backfill_missing_manifests()
RETURNS TABLE(job_id UUID, manifest_id UUID, status TEXT) AS $$
DECLARE
  v_job    RECORD;
  v_mid    UUID;
BEGIN
  FOR v_job IN
    SELECT j.id
    FROM gpu_jobs j
    WHERE j.end_time IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM energy_manifests m WHERE m.job_id = j.id
      )
    ORDER BY j.end_time DESC
    LIMIT 100
  LOOP
    BEGIN
      v_mid := generate_energy_manifest(v_job.id);
      RETURN QUERY SELECT v_job.id, v_mid, 'created'::TEXT;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT v_job.id, NULL::UUID, ('error: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION backfill_missing_manifests() TO service_role;

-- =============================================================================
-- 5. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION trigger_manifest_on_job_complete IS
  'Fires on gpu_jobs UPDATE. Calls generate_energy_manifest() when end_time is first set.';

COMMENT ON FUNCTION backfill_missing_manifests IS
  'Backfills energy manifests for any completed job missing one. Called by cron.';
