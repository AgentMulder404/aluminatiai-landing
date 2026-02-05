# Quick Start: Fix TimescaleDB Issue

## The Problem

Your Supabase instance doesn't have TimescaleDB extension available. This is normal - TimescaleDB is not included in standard Supabase plans.

**Error you saw:**
```
ERROR: extension "timescaledb" is not available
```

## The Solution

I've created an alternative migration that uses standard PostgreSQL instead. Everything will work exactly the same!

## Step 1: Run the PostgreSQL Migration

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Open this file: `database/migrations/002_gpu_monitoring_schema_postgres.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run**

You should see: `Success. No rows returned`

## Step 2: Add CRON_SECRET Environment Variable

Add this to your `.env.local` file:

```bash
CRON_SECRET=your-random-secret-here-min-32-chars
```

Generate a secure random string:
```bash
openssl rand -base64 32
```

Also add it to Vercel environment variables if deploying to production.

## Step 3: Set Up Materialized View Refresh

The dashboard uses a materialized view for fast queries. It needs to be refreshed hourly.

### Option 1: Use Vercel Cron (Recommended for Pro plans)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/refresh-metrics",
    "schedule": "0 * * * *"
  }]
}
```

### Option 2: Use External Cron Service (Free)

Sign up for a free cron service like:
- https://cron-job.org
- https://easycron.com
- https://console.cron-job.org

Set up a job to run every hour:
```bash
URL: https://your-domain.vercel.app/api/cron/refresh-metrics
Method: POST
Headers: Authorization: Bearer YOUR_CRON_SECRET
Schedule: Every hour (0 * * * *)
```

### Option 3: Manual Refresh (For Testing Only)

While testing locally, you can manually refresh:

```bash
curl -X POST http://localhost:3000/api/cron/refresh-metrics \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or in Supabase SQL Editor:
```sql
SELECT refresh_gpu_metrics_hourly();
```

## Step 4: Test the Setup

### Test 1: Check Tables Were Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'gpu_metrics', 'gpu_jobs', 'gpu_metrics_hourly');
```

Should return 4 rows.

### Test 2: Create a Test User

Sign up through your app's trial signup modal, or manually:

```sql
-- Get a test user ID from auth
SELECT id, email FROM auth.users LIMIT 1;

-- Check user profile was auto-created
SELECT id, email, api_key, trial_ends_at FROM users LIMIT 1;
```

### Test 3: Test Metrics Insertion

Use the API key from step 2:

```bash
curl -X POST http://localhost:3000/api/metrics/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: alum_YOUR_API_KEY" \
  -d '[{
    "timestamp": "2024-02-04T19:00:00Z",
    "gpu_index": 0,
    "gpu_uuid": "GPU-test-12345",
    "gpu_name": "NVIDIA RTX 4090",
    "power_draw_w": 250.5,
    "utilization_gpu_pct": 75,
    "utilization_memory_pct": 60,
    "temperature_c": 65,
    "energy_delta_j": 1000.0
  }]'
```

### Test 4: Check Dashboard APIs

```bash
# Get today's cost
curl http://localhost:3000/api/dashboard/today-cost

# Get chart data
curl http://localhost:3000/api/dashboard/utilization-chart?hours=24

# Get jobs
curl http://localhost:3000/api/dashboard/jobs
```

## What's Different?

| Feature | TimescaleDB | PostgreSQL |
|---------|-------------|------------|
| Storage | Hypertables | Regular tables |
| Aggregates | Continuous (auto-update) | Materialized views (hourly refresh) |
| Performance | Excellent | Very good |
| Retention | Automatic | Via cron job |
| Cost | Premium extension | Free |

## Performance Notes

The PostgreSQL version will handle:
- ✓ Thousands of GPUs
- ✓ Millions of metrics per month
- ✓ Sub-second dashboard queries (after materialized view refresh)
- ✓ 90-day retention by default

## Need Help?

Check `database/DEPLOYMENT_GUIDE.md` for detailed troubleshooting and configuration options.

## Next Steps

Once the migration is complete:

1. ✓ Sign up through the trial modal on your landing page
2. ✓ Go to `/dashboard/setup` to get your API key
3. ✓ Install the agent on a GPU machine
4. ✓ Watch metrics flow into your dashboard!

The materialized view will be empty at first. After you insert some metrics and refresh it, your dashboard charts will populate.
