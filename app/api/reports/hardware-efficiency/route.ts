// Reports API: Hardware Efficiency
// Returns GPU efficiency curves, hardware match scores, and recommendations
// for the authenticated user's fleet.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';
import { createSupabaseCookieClient } from '@/lib/supabase-server';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GPU architecture specs for theoretical calculations (mirrors migration 007)
const GPU_SPECS: Record<string, {
  family: string;
  tdp_w: number;
  fp16_tflops: number;
  memory_bw_gbps: number;
  has_transformer_engine: boolean;
}> = {
  'A100-SXM4-80GB':  { family: 'Ampere',        tdp_w: 400, fp16_tflops: 312,  memory_bw_gbps: 2039, has_transformer_engine: false },
  'A100-SXM4-40GB':  { family: 'Ampere',        tdp_w: 400, fp16_tflops: 312,  memory_bw_gbps: 1555, has_transformer_engine: false },
  'A100-PCIe-80GB':  { family: 'Ampere',        tdp_w: 300, fp16_tflops: 312,  memory_bw_gbps: 2039, has_transformer_engine: false },
  'A100-PCIe-40GB':  { family: 'Ampere',        tdp_w: 250, fp16_tflops: 312,  memory_bw_gbps: 1555, has_transformer_engine: false },
  'H100-SXM5-80GB':  { family: 'Hopper',        tdp_w: 700, fp16_tflops: 989,  memory_bw_gbps: 3350, has_transformer_engine: true },
  'H100-PCIe-80GB':  { family: 'Hopper',        tdp_w: 350, fp16_tflops: 756,  memory_bw_gbps: 2039, has_transformer_engine: true },
  'H200-SXM-141GB':  { family: 'Hopper',        tdp_w: 700, fp16_tflops: 989,  memory_bw_gbps: 4800, has_transformer_engine: true },
  'L40S':            { family: 'Ada Lovelace',  tdp_w: 350, fp16_tflops: 362,  memory_bw_gbps: 864,  has_transformer_engine: false },
  'L40':             { family: 'Ada Lovelace',  tdp_w: 300, fp16_tflops: 181,  memory_bw_gbps: 864,  has_transformer_engine: false },
  'A10G':            { family: 'Ampere',        tdp_w: 150, fp16_tflops: 70,   memory_bw_gbps: 600,  has_transformer_engine: false },
  'T4':              { family: 'Turing',        tdp_w: 70,  fp16_tflops: 65,   memory_bw_gbps: 300,  has_transformer_engine: false },
  'V100-SXM2-32GB':  { family: 'Volta',        tdp_w: 300, fp16_tflops: 125,  memory_bw_gbps: 900,  has_transformer_engine: false },
  'V100-SXM2-16GB':  { family: 'Volta',        tdp_w: 300, fp16_tflops: 125,  memory_bw_gbps: 900,  has_transformer_engine: false },
};

/**
 * Resolve a gpu_name from NVML to a known architecture key.
 */
function resolveArch(gpuName: string): string | null {
  if (GPU_SPECS[gpuName]) return gpuName;

  const cleaned = gpuName.replace('NVIDIA ', '').replace('Tesla ', '');
  if (GPU_SPECS[cleaned]) return cleaned;

  for (const archName of Object.keys(GPU_SPECS)) {
    if (cleaned.includes(archName) || archName.includes(cleaned)) {
      return archName;
    }
  }

  for (const archName of Object.keys(GPU_SPECS)) {
    const base = archName.split('-')[0];
    if (gpuName.includes(base)) return archName;
  }

  return null;
}

/**
 * Compute theoretical efficiency curve for a GPU architecture.
 * Returns J/TFLOP at each 5% utilization bucket.
 */
function computeTheoreticalCurve(archName: string) {
  const spec = GPU_SPECS[archName];
  if (!spec) return [];

  const curve: Array<{
    utilization_pct: number;
    power_w: number;
    effective_tflops: number;
    joules_per_tflop: number;
  }> = [];

  const idlePower = spec.tdp_w * 0.3;

  for (let util = 5; util <= 100; util += 5) {
    const utilFrac = util / 100;
    const power = idlePower + (spec.tdp_w - idlePower) * utilFrac;
    const tflops = spec.fp16_tflops * utilFrac;

    if (tflops <= 0) continue;

    curve.push({
      utilization_pct: util,
      power_w: Math.round(power * 10) / 10,
      effective_tflops: Math.round(tflops * 10) / 10,
      joules_per_tflop: Math.round((power / tflops) * 10000) / 10000,
    });
  }

  return curve;
}

/**
 * GET /api/reports/hardware-efficiency
 *
 * Query params:
 *   arch      - Filter to a specific GPU architecture (optional)
 *   model_tag - Get match score for a specific model (optional)
 *   compare   - "true" to compare all architectures at a given utilization
 *   util      - Utilization % for comparison (default: 80)
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

    const rateLimitResult = rateLimit(`reports:hw-efficiency:${userId}`, 60, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 60 requests per minute.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 60) }
      );
    }

    const { searchParams } = new URL(request.url);
    const archFilter = searchParams.get('arch');
    const modelTag = searchParams.get('model_tag');
    const compare = searchParams.get('compare') === 'true';
    const utilPct = Math.min(100, Math.max(5, parseInt(searchParams.get('util') || '80')));

    const supabase = createSupabaseServerClient();

    // ── Mode 1: Architecture comparison ───────────────────────
    if (compare) {
      const utilFrac = utilPct / 100;
      const comparison = Object.entries(GPU_SPECS).map(([name, spec]) => {
        const idlePower = spec.tdp_w * 0.3;
        const power = idlePower + (spec.tdp_w - idlePower) * utilFrac;
        const tflops = spec.fp16_tflops * utilFrac;
        const jpt = tflops > 0 ? power / tflops : Infinity;

        return {
          arch_name: name,
          family: spec.family,
          tdp_w: spec.tdp_w,
          power_at_util_w: Math.round(power * 10) / 10,
          effective_tflops: Math.round(tflops * 10) / 10,
          joules_per_tflop: Math.round(jpt * 10000) / 10000,
          has_transformer_engine: spec.has_transformer_engine,
        };
      });

      comparison.sort((a, b) => a.joules_per_tflop - b.joules_per_tflop);

      const bestJpt = comparison[0]?.joules_per_tflop || 1;
      const ranked = comparison.map((c, i) => ({
        ...c,
        rank: i + 1,
        relative_efficiency: Math.round((bestJpt / c.joules_per_tflop) * 1000) / 10,
      }));

      return NextResponse.json({
        comparison: ranked,
        utilization_pct: utilPct,
        gpu_count: ranked.length,
      });
    }

    // ── Mode 2: Single architecture efficiency curve ──────────
    if (archFilter) {
      const resolved = resolveArch(archFilter);
      if (!resolved || !GPU_SPECS[resolved]) {
        return NextResponse.json(
          { error: `Unknown GPU architecture: ${archFilter}` },
          { status: 400 }
        );
      }

      // Try to get observed data from DB first
      const { data: observed } = await supabase
        .from('gpu_efficiency_curves')
        .select('*')
        .eq('arch_name', resolved)
        .order('utilization_bucket', { ascending: true });

      // Always compute theoretical as baseline
      const theoretical = computeTheoreticalCurve(resolved);

      const spec = GPU_SPECS[resolved];

      return NextResponse.json({
        arch_name: resolved,
        family: spec.family,
        specs: {
          tdp_w: spec.tdp_w,
          fp16_tflops: spec.fp16_tflops,
          memory_bw_gbps: spec.memory_bw_gbps,
          has_transformer_engine: spec.has_transformer_engine,
        },
        theoretical_curve: theoretical,
        observed_curve: observed || [],
        has_observed_data: (observed?.length || 0) > 0,
      });
    }

    // ── Mode 3: Hardware match scores for a model ─────────────
    if (modelTag) {
      // Get cached match scores from DB
      const { data: scores } = await supabase
        .from('hardware_match_scores')
        .select('*')
        .eq('model_tag', modelTag)
        .order('match_score', { ascending: false });

      // Get the model profile
      const { data: profile } = await supabase
        .from('model_profiles')
        .select('*')
        .eq('model_tag', modelTag)
        .single();

      // Get user's fleet — which GPUs they actually have
      const { data: fleet } = await supabase
        .from('gpu_metrics')
        .select('gpu_name')
        .eq('user_id', userId)
        .not('gpu_name', 'is', null)
        .limit(1000);

      const userArchs = new Set<string>();
      for (const row of fleet || []) {
        const arch = resolveArch(row.gpu_name);
        if (arch) userArchs.add(arch);
      }

      // Flag which scores are for GPUs the user actually has
      const enrichedScores = (scores || []).map((s: Record<string, unknown>) => ({
        ...s,
        in_user_fleet: userArchs.has(s.gpu_arch as string),
      }));

      return NextResponse.json({
        model_tag: modelTag,
        profile: profile || null,
        scores: enrichedScores,
        user_fleet_archs: Array.from(userArchs),
        has_cached_scores: (scores?.length || 0) > 0,
      });
    }

    // ── Mode 4: Default — user's fleet overview ───────────────
    // Show efficiency summary for each GPU arch in the user's fleet

    const { data: fleetMetrics } = await supabase
      .from('gpu_metrics')
      .select('gpu_name, utilization_gpu_pct, power_draw_w')
      .eq('user_id', userId)
      .not('gpu_name', 'is', null)
      .order('time', { ascending: false })
      .limit(5000);

    // Aggregate by architecture
    const archStats: Record<string, {
      samples: number;
      totalUtil: number;
      totalPower: number;
    }> = {};

    for (const m of fleetMetrics || []) {
      const arch = resolveArch(m.gpu_name);
      if (!arch) continue;

      if (!archStats[arch]) {
        archStats[arch] = { samples: 0, totalUtil: 0, totalPower: 0 };
      }
      archStats[arch].samples += 1;
      archStats[arch].totalUtil += m.utilization_gpu_pct;
      archStats[arch].totalPower += m.power_draw_w;
    }

    const fleetOverview = Object.entries(archStats).map(([arch, stats]) => {
      const avgUtil = stats.totalUtil / stats.samples;
      const avgPower = stats.totalPower / stats.samples;
      const spec = GPU_SPECS[arch];
      const tflops = spec ? spec.fp16_tflops * (avgUtil / 100) : 0;
      const jpt = tflops > 0 ? avgPower / tflops : 0;

      return {
        arch_name: arch,
        family: spec?.family || 'unknown',
        sample_count: stats.samples,
        avg_utilization_pct: Math.round(avgUtil * 10) / 10,
        avg_power_w: Math.round(avgPower * 10) / 10,
        estimated_tflops: Math.round(tflops * 10) / 10,
        joules_per_tflop: Math.round(jpt * 10000) / 10000,
      };
    });

    fleetOverview.sort((a, b) => a.joules_per_tflop - b.joules_per_tflop);

    return NextResponse.json({
      fleet: fleetOverview,
      gpu_architectures_count: fleetOverview.length,
      total_samples: fleetMetrics?.length || 0,
    });

  } catch (error) {
    console.error('Hardware efficiency report error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
