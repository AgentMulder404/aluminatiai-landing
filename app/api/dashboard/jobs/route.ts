// Dashboard API: GPU Jobs List
// Returns list of GPU jobs with energy consumption and cost metrics

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';
import { createSupabaseCookieClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/jobs
 * Fetch GPU jobs for authenticated user with pagination
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch jobs from database
    const { data: jobs, error: jobsError, count } = await supabase
      .from('gpu_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (jobsError) {
      console.error('Jobs query error:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Format jobs for response
    const formattedJobs = (jobs || []).map((job) => ({
      id: job.id,
      job_name: job.job_name || 'Unnamed Job',
      job_command: job.job_command,
      gpu_indices: job.gpu_indices || [],
      start_time: job.start_time,
      end_time: job.end_time,
      duration_seconds: job.duration_seconds,
      total_energy_kwh: job.total_energy_kwh,
      total_cost_usd: job.total_cost_usd,
      avg_utilization_pct: job.avg_utilization_pct,
      is_active: !job.end_time,
      created_at: job.created_at,
    }));

    return NextResponse.json({
      jobs: formattedJobs,
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
