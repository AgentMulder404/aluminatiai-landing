# GPU Monitoring Database Deployment Guide

## Issue: TimescaleDB Not Available

Your Supabase instance doesn't have the TimescaleDB extension available. This is normal for most Supabase plans. I've created an alternative migration that uses standard PostgreSQL instead.

## Migration File to Use

Use this file: `002_gpu_monitoring_schema_postgres.sql`

This migration creates the same functionality using:
- Standard PostgreSQL tables
- Materialized views instead of TimescaleDB continuous aggregates
- Optimized indexes for time-series queries

## Deployment Steps

### 1. Run the Migration

In your Supabase SQL Editor:

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy the contents of `002_gpu_monitoring_schema_postgres.sql`
3. Paste and click "Run"

### 2. Set Up Materialized View Refresh

The `gpu_metrics_hourly` materialized view needs to be refreshed periodically for optimal dashboard performance.

**Option A: Supabase Edge Function (Recommended)**

Create a Supabase Edge Function that refreshes the view:

```typescript
// supabase/functions/refresh-metrics/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('refresh_gpu_metrics_hourly')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Then set up a cron job to call it every hour:
```bash
# Using GitHub Actions or similar
0 * * * * curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/refresh-metrics \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Option B: External Cron Service**

Use a service like cron-job.org or Railway to call a Next.js API route every hour:

```typescript
// app/api/cron/refresh-metrics/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('refresh_gpu_metrics_hourly');

  if (error) {
    console.error('Failed to refresh metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Option C: Manual Refresh (For Testing)**

While testing, you can manually refresh in the Supabase SQL Editor:
```sql
SELECT refresh_gpu_metrics_hourly();
```

### 3. Set Up Data Retention (Optional)

To automatically delete metrics older than 90 days, set up a daily cron:

```typescript
// In your Edge Function or API route
const { error } = await supabase.rpc('cleanup_old_metrics');
```

## Key Differences from TimescaleDB Version

| Feature | TimescaleDB | PostgreSQL Alternative |
|---------|-------------|------------------------|
| **Time-series storage** | Hypertables with automatic partitioning | Regular table with time-based indexes |
| **Aggregation** | Continuous aggregates (auto-update) | Materialized views (manual refresh) |
| **Compression** | Automatic compression of old chunks | Not available (use pg_dump compression) |
| **Retention** | Automatic via retention policies | Manual via cron job calling cleanup function |
| **Query performance** | Optimized for time-series | Good with proper indexes |

## Performance Considerations

The PostgreSQL version will perform well for:
- Up to 1M metrics per user
- Queries spanning up to 90 days
- Hourly aggregations via materialized view

For larger scale:
- Consider setting up table partitioning manually
- Increase materialized view refresh frequency during high load
- Use connection pooling (Supavisor is enabled by default)

## Testing the Deployment

After running the migration:

1. **Test user creation:**
   ```sql
   SELECT * FROM users LIMIT 1;
   ```

2. **Test metrics insertion:**
   ```sql
   INSERT INTO gpu_metrics (time, user_id, gpu_index, gpu_uuid, power_draw_w, utilization_gpu_pct, energy_delta_j)
   VALUES (NOW(), 'YOUR_USER_ID', 0, 'GPU-test-123', 250.5, 75, 1000.0);
   ```

3. **Test materialized view:**
   ```sql
   SELECT refresh_gpu_metrics_hourly();
   SELECT * FROM gpu_metrics_hourly LIMIT 5;
   ```

4. **Test API endpoints:**
   - Sign up: POST `/api/auth/signup`
   - Check profile: GET `/api/user/profile`
   - Insert metrics: POST `/api/metrics/ingest`
   - View dashboard: GET `/api/dashboard/today-cost`

## Troubleshooting

**Error: "relation 'gpu_metrics_hourly' does not exist"**
- Run the migration SQL file completely
- The materialized view is created after the gpu_metrics table

**Error: "permission denied for function refresh_gpu_metrics_hourly"**
- Make sure you're using the service role key in API endpoints
- Check the GRANT statements in the migration

**Slow dashboard queries:**
- Refresh the materialized view: `SELECT refresh_gpu_metrics_hourly();`
- Add more indexes if needed
- Consider reducing retention period

**Metrics not appearing:**
- Check agent API key is correct
- Verify metrics are being inserted: `SELECT COUNT(*) FROM gpu_metrics;`
- Check RLS policies are not blocking: Use service role key in API

## Upgrading to TimescaleDB Later

If you upgrade your Supabase plan and get access to TimescaleDB:

1. Enable the extension: `CREATE EXTENSION timescaledb;`
2. Run the original migration: `002_gpu_monitoring_schema.sql`
3. Migrate data from old tables to new hypertables
4. Update API endpoints to use TimescaleDB features

## Support

If you encounter issues:
1. Check Supabase logs: Project Dashboard → Logs
2. Check API route logs: Vercel Dashboard → Functions → Logs
3. Verify environment variables are set correctly
4. Test SQL queries directly in Supabase SQL Editor
