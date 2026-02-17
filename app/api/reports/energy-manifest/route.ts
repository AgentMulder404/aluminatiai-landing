// Reports API: Energy Manifests
// Returns per-job energy audits, team rollups, and model comparisons.
// Each manifest is the unit of accountability: kWh, USD, CO2, match score.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';
import { createSupabaseCookieClient } from '@/lib/supabase-server';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Parse a period string like "7d", "30d", "90d" into a Date.
 * Returns the start date (now - period).
 */
function parsePeriodStart(period: string): Date {
  const match = period.match(/^(\d+)d$/);
  if (!match) {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30d
  }
  const days = Math.min(parseInt(match[1]), 365); // cap at 1 year
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Format duration in seconds to human-readable string.
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * GET /api/reports/energy-manifest
 *
 * Query params:
 *   job_id  - Get manifest for a single job (UUID)
 *   team_id - Team-level rollup (requires period)
 *   model_tag - Filter by model (works with team_id or standalone)
 *   period  - Time period: "7d", "30d", "90d" (default: "30d")
 *   limit   - Max results (default: 50, max: 200)
 *   offset  - Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseCookieClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const rateLimitResult = rateLimit(`reports:manifest:${userId}`, 60, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 60 requests per minute.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 60) }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    const teamId = searchParams.get('team_id');
    const modelTag = searchParams.get('model_tag');
    const period = searchParams.get('period') || '30d';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const supabase = createSupabaseServerClient();

    // ── Mode 1: Single job manifest ───────────────────────────
    if (jobId) {
      const { data: manifest, error: manifestError } = await supabase
        .from('energy_manifests')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .single();

      if (manifestError || !manifest) {
        return NextResponse.json(
          { error: 'Manifest not found for this job.' },
          { status: 404 }
        );
      }

      // Get the job details
      const { data: job } = await supabase
        .from('gpu_jobs')
        .select('job_name, job_command, gpu_indices')
        .eq('id', jobId)
        .single();

      // CO2 equivalence (average car: 0.251 kg CO2/km)
      const co2Km = manifest.co2_kg / 0.251;

      return NextResponse.json({
        manifest_version: '1.0',
        generated_at: new Date().toISOString(),

        job: {
          id: manifest.job_id,
          name: job?.job_name || null,
          command: job?.job_command || null,
          team_id: manifest.team_id,
          model_tag: manifest.model_tag,
          scheduler: manifest.scheduler_source,
        },

        time: {
          start: manifest.start_time,
          end: manifest.end_time,
          duration_seconds: manifest.duration_seconds,
          duration_human: formatDuration(manifest.duration_seconds),
        },

        energy: {
          total_joules: parseFloat(manifest.total_energy_j),
          total_kwh: parseFloat(manifest.total_energy_kwh),
          peak_power_w: parseFloat(manifest.peak_power_w),
          avg_power_w: parseFloat(manifest.avg_power_w),
        },

        cost: {
          electricity_rate_per_kwh: parseFloat(manifest.electricity_rate),
          total_usd: parseFloat(manifest.cost_usd),
          cost_per_gpu_hour: manifest.gpu_count > 0 && manifest.duration_seconds > 0
            ? parseFloat(
                (parseFloat(manifest.cost_usd) / manifest.gpu_count / (manifest.duration_seconds / 3600)).toFixed(4)
              )
            : 0,
        },

        carbon: {
          carbon_intensity_g_per_kwh: parseFloat(manifest.grid_carbon_intensity_g_kwh),
          total_co2_kg: parseFloat(manifest.co2_kg),
          equivalent_km_driven: Math.round(co2Km * 10) / 10,
        },

        hardware: {
          gpu_arch: manifest.gpu_arch,
          gpu_count: manifest.gpu_count,
          gpu_uuids: manifest.gpu_uuids,
        },

        efficiency: {
          hardware_match_score: manifest.hardware_match_score
            ? parseFloat(manifest.hardware_match_score)
            : null,
          efficiency_percentile: manifest.efficiency_percentile
            ? parseFloat(manifest.efficiency_percentile)
            : null,
        },

        provenance: {
          sample_count: manifest.sample_count,
          manifest_id: manifest.id,
          created_at: manifest.created_at,
        },
      });
    }

    // ── Mode 2: Team rollup ───────────────────────────────────
    const periodStart = parsePeriodStart(period);

    if (teamId) {
      // Per-model breakdown within team
      let query = supabase
        .from('energy_manifests')
        .select('*')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .gte('start_time', periodStart.toISOString())
        .order('start_time', { ascending: false });

      if (modelTag) {
        query = query.eq('model_tag', modelTag);
      }

      const { data: manifests, error: queryError } = await query;

      if (queryError) {
        console.error('Team rollup query error:', queryError);
        return NextResponse.json(
          { error: 'Failed to fetch team manifests.' },
          { status: 500 }
        );
      }

      const items = manifests || [];

      // Aggregate by model_tag
      const byModel: Record<string, {
        job_count: number;
        total_kwh: number;
        total_cost: number;
        total_co2: number;
        total_duration_s: number;
        avg_match_scores: number[];
      }> = {};

      for (const m of items) {
        const tag = m.model_tag;
        if (!byModel[tag]) {
          byModel[tag] = {
            job_count: 0, total_kwh: 0, total_cost: 0,
            total_co2: 0, total_duration_s: 0, avg_match_scores: [],
          };
        }
        byModel[tag].job_count += 1;
        byModel[tag].total_kwh += parseFloat(m.total_energy_kwh);
        byModel[tag].total_cost += parseFloat(m.cost_usd);
        byModel[tag].total_co2 += parseFloat(m.co2_kg);
        byModel[tag].total_duration_s += m.duration_seconds;
        if (m.hardware_match_score != null) {
          byModel[tag].avg_match_scores.push(parseFloat(m.hardware_match_score));
        }
      }

      const modelBreakdown = Object.entries(byModel)
        .map(([tag, stats]) => ({
          model_tag: tag,
          job_count: stats.job_count,
          total_kwh: Math.round(stats.total_kwh * 1000) / 1000,
          total_cost_usd: Math.round(stats.total_cost * 100) / 100,
          total_co2_kg: Math.round(stats.total_co2 * 1000) / 1000,
          total_duration_human: formatDuration(stats.total_duration_s),
          avg_hardware_match_score: stats.avg_match_scores.length > 0
            ? Math.round(
                (stats.avg_match_scores.reduce((a, b) => a + b, 0) / stats.avg_match_scores.length) * 10
              ) / 10
            : null,
        }))
        .sort((a, b) => b.total_kwh - a.total_kwh);

      // Team totals
      const totalKwh = items.reduce((s, m) => s + parseFloat(m.total_energy_kwh), 0);
      const totalCost = items.reduce((s, m) => s + parseFloat(m.cost_usd), 0);
      const totalCo2 = items.reduce((s, m) => s + parseFloat(m.co2_kg), 0);

      return NextResponse.json({
        team_id: teamId,
        period,
        period_start: periodStart.toISOString(),

        totals: {
          job_count: items.length,
          total_kwh: Math.round(totalKwh * 1000) / 1000,
          total_cost_usd: Math.round(totalCost * 100) / 100,
          total_co2_kg: Math.round(totalCo2 * 1000) / 1000,
        },

        by_model: modelBreakdown,
      });
    }

    // ── Mode 3: All manifests (paginated) ─────────────────────
    let query = supabase
      .from('energy_manifests')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('start_time', periodStart.toISOString())
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (modelTag) {
      query = query.eq('model_tag', modelTag);
    }

    const { data: manifests, count, error: queryError } = await query;

    if (queryError) {
      console.error('Manifests query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch manifests.' },
        { status: 500 }
      );
    }

    const items = manifests || [];
    const total = count || 0;

    // Summary stats
    const totalKwh = items.reduce((s, m) => s + parseFloat(m.total_energy_kwh), 0);
    const totalCost = items.reduce((s, m) => s + parseFloat(m.cost_usd), 0);
    const totalCo2 = items.reduce((s, m) => s + parseFloat(m.co2_kg), 0);

    // Distinct teams and models
    const teams = [...new Set(items.map(m => m.team_id))];
    const models = [...new Set(items.map(m => m.model_tag))];

    return NextResponse.json({
      manifests: items.map(m => ({
        id: m.id,
        job_id: m.job_id,
        team_id: m.team_id,
        model_tag: m.model_tag,
        scheduler_source: m.scheduler_source,
        start_time: m.start_time,
        end_time: m.end_time,
        duration_seconds: m.duration_seconds,
        duration_human: formatDuration(m.duration_seconds),
        total_kwh: parseFloat(m.total_energy_kwh),
        cost_usd: parseFloat(m.cost_usd),
        co2_kg: parseFloat(m.co2_kg),
        gpu_arch: m.gpu_arch,
        gpu_count: m.gpu_count,
        hardware_match_score: m.hardware_match_score
          ? parseFloat(m.hardware_match_score)
          : null,
      })),

      summary: {
        total_kwh: Math.round(totalKwh * 1000) / 1000,
        total_cost_usd: Math.round(totalCost * 100) / 100,
        total_co2_kg: Math.round(totalCo2 * 1000) / 1000,
        teams,
        models,
      },

      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },

      period,
      period_start: periodStart.toISOString(),
    });

  } catch (error) {
    console.error('Energy manifest report error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
