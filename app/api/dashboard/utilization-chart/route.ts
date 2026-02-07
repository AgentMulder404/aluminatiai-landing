// Dashboard API: Utilization vs Power Chart Data
// Returns time-series data for GPU utilization and power consumption

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';
import { createSupabaseCookieClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/utilization-chart
 * Fetch GPU utilization and power data for chart visualization
 */
export async function GET(request: NextRequest) {
  try {
    // Cookie-aware client for auth
    const supabaseAuth = await createSupabaseCookieClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const userId = user.id;

    // Service-role client for DB queries
    const supabase = createSupabaseServerClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const hours = Math.min(parseInt(searchParams.get('hours') || '24'), 168); // Max 7 days
    const gpuUuid = searchParams.get('gpu_uuid');

    // Calculate time window
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 3600000);

    // Query hourly materialized view for efficient access
    let query = supabase
      .from('gpu_metrics_hourly')
      .select('bucket, gpu_uuid, gpu_index, avg_power_w, avg_utilization_pct, sample_count')
      .eq('user_id', userId)
      .gte('bucket', startTime.toISOString())
      .order('bucket', { ascending: true });

    // Filter by specific GPU if requested
    if (gpuUuid) {
      query = query.eq('gpu_uuid', gpuUuid);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error('Chart data query error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }

    // Format data for chart
    const chartData = (data || []).map((point) => ({
      time: point.bucket,
      gpu_uuid: point.gpu_uuid,
      gpu_index: point.gpu_index,
      power_w: parseFloat((point.avg_power_w || 0).toFixed(2)),
      utilization_pct: parseFloat((point.avg_utilization_pct || 0).toFixed(1)),
      sample_count: point.sample_count,
    }));

    // Group by GPU for multi-GPU systems
    const groupedByGpu: Record<string, any[]> = {};
    for (const point of chartData) {
      if (!groupedByGpu[point.gpu_uuid]) {
        groupedByGpu[point.gpu_uuid] = [];
      }
      groupedByGpu[point.gpu_uuid].push(point);
    }

    // Calculate summary statistics
    const summary = {
      avg_power_w: chartData.length > 0
        ? parseFloat((chartData.reduce((sum, p) => sum + p.power_w, 0) / chartData.length).toFixed(2))
        : 0,
      avg_utilization_pct: chartData.length > 0
        ? parseFloat((chartData.reduce((sum, p) => sum + p.utilization_pct, 0) / chartData.length).toFixed(1))
        : 0,
      total_samples: chartData.reduce((sum, p) => sum + (p.sample_count || 0), 0),
      gpu_count: Object.keys(groupedByGpu).length,
    };

    return NextResponse.json({
      data: chartData,
      grouped_by_gpu: groupedByGpu,
      summary,
      time_window: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        hours,
      },
      gpu_filter: gpuUuid || null,
    });
  } catch (error) {
    console.error('Chart data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
