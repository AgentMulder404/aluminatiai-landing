// Cron Job API: Refresh Materialized View
// Call this endpoint hourly to refresh gpu_metrics_hourly materialized view

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/refresh-metrics
 * Refreshes the gpu_metrics_hourly materialized view for dashboard performance
 *
 * Set up a cron job to call this endpoint every hour:
 * curl -X POST https://your-domain.com/api/cron/refresh-metrics \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.warn('CRON_SECRET not set in environment variables');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();

    console.log('Starting materialized view refresh...');
    const startTime = Date.now();

    // Call the PostgreSQL function to refresh the materialized view
    const { error } = await supabase.rpc('refresh_gpu_metrics_hourly');

    if (error) {
      console.error('Failed to refresh metrics:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`Materialized view refreshed successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Materialized view refreshed successfully',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing (still requires auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
