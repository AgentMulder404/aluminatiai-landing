// Metrics Ingestion API Endpoint
// Receives GPU metrics from monitoring agents

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { createSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MetricPayload {
  timestamp: string;
  gpu_index: number;
  gpu_uuid: string;
  gpu_name: string;
  power_draw_w: number;
  power_limit_w?: number;
  energy_delta_j?: number;
  utilization_gpu_pct: number;
  utilization_memory_pct: number;
  temperature_c: number;
  fan_speed_pct?: number;
  memory_used_mb: number;
  memory_total_mb?: number;
  sm_clock_mhz?: number;
  memory_clock_mhz?: number;
  job_id?: string;
  // Energy attribution fields (v2)
  team_id?: string;
  model_tag?: string;
  scheduler_source?: 'kubernetes' | 'slurm' | 'runai' | 'manual';
}

const VALID_SCHEDULER_SOURCES = ['kubernetes', 'slurm', 'runai', 'manual'] as const;

/**
 * POST /api/metrics/ingest
 * Ingest GPU metrics from monitoring agent
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const { userId, error: authError } = await validateApiKey(request);

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = rateLimit(`metrics:${userId}`, 100, 60000);

    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime).toISOString();
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Max 100 requests per minute.',
          reset_at: resetDate,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, 100),
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const metrics: MetricPayload[] = Array.isArray(body) ? body : [body];

    // Validate payload
    if (metrics.length === 0) {
      return NextResponse.json(
        { error: 'No metrics provided. Send an array of metric objects.' },
        { status: 400 }
      );
    }

    if (metrics.length > 1000) {
      return NextResponse.json(
        { error: 'Too many metrics in single request. Max 1000 per request.' },
        { status: 400 }
      );
    }

    // Validate required fields in each metric
    for (let i = 0; i < metrics.length; i++) {
      const m = metrics[i];
      const missing: string[] = [];

      if (!m.timestamp) missing.push('timestamp');
      if (m.gpu_index === undefined) missing.push('gpu_index');
      if (!m.gpu_uuid) missing.push('gpu_uuid');
      if (!m.power_draw_w && m.power_draw_w !== 0) missing.push('power_draw_w');
      if (m.utilization_gpu_pct === undefined) missing.push('utilization_gpu_pct');
      if (m.utilization_memory_pct === undefined) missing.push('utilization_memory_pct');
      if (m.temperature_c === undefined) missing.push('temperature_c');
      if (m.memory_used_mb === undefined) missing.push('memory_used_mb');

      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `Metric at index ${i} missing required fields: ${missing.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Validate value ranges
      if (m.utilization_gpu_pct < 0 || m.utilization_gpu_pct > 100) {
        return NextResponse.json(
          { error: `Invalid utilization_gpu_pct at index ${i}: must be 0-100` },
          { status: 400 }
        );
      }

      if (m.utilization_memory_pct < 0 || m.utilization_memory_pct > 100) {
        return NextResponse.json(
          { error: `Invalid utilization_memory_pct at index ${i}: must be 0-100` },
          { status: 400 }
        );
      }

      // Power draw range (0-1500W covers all enterprise GPUs including A100/H100)
      if (m.power_draw_w < 0 || m.power_draw_w > 1500) {
        return NextResponse.json(
          { error: `Invalid power_draw_w at index ${i}: must be 0-1500` },
          { status: 400 }
        );
      }

      // Temperature range (0-120°C covers all operating conditions)
      if (m.temperature_c < 0 || m.temperature_c > 120) {
        return NextResponse.json(
          { error: `Invalid temperature_c at index ${i}: must be 0-120` },
          { status: 400 }
        );
      }

      // Memory used must be non-negative
      if (m.memory_used_mb < 0) {
        return NextResponse.json(
          { error: `Invalid memory_used_mb at index ${i}: must be >= 0` },
          { status: 400 }
        );
      }

      // GPU index must be non-negative
      if (m.gpu_index < 0) {
        return NextResponse.json(
          { error: `Invalid gpu_index at index ${i}: must be >= 0` },
          { status: 400 }
        );
      }

      // Timestamp sanity: not more than 5 minutes in the future
      const metricTime = new Date(m.timestamp);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (isNaN(metricTime.getTime())) {
        return NextResponse.json(
          { error: `Invalid timestamp at index ${i}: must be a valid ISO 8601 date` },
          { status: 400 }
        );
      }
      if (metricTime > fiveMinutesFromNow) {
        return NextResponse.json(
          { error: `Timestamp at index ${i} is too far in the future` },
          { status: 400 }
        );
      }

      // Energy delta must be non-negative when provided
      if (m.energy_delta_j !== undefined && m.energy_delta_j !== null && m.energy_delta_j < 0) {
        return NextResponse.json(
          { error: `Invalid energy_delta_j at index ${i}: must be >= 0` },
          { status: 400 }
        );
      }

      // Validate scheduler_source when provided
      if (m.scheduler_source && !VALID_SCHEDULER_SOURCES.includes(m.scheduler_source as any)) {
        return NextResponse.json(
          { error: `Invalid scheduler_source at index ${i}: must be one of ${VALID_SCHEDULER_SOURCES.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate string length for attribution fields
      if (m.team_id && m.team_id.length > 128) {
        return NextResponse.json(
          { error: `team_id at index ${i} exceeds max length of 128 characters` },
          { status: 400 }
        );
      }
      if (m.model_tag && m.model_tag.length > 128) {
        return NextResponse.json(
          { error: `model_tag at index ${i} exceeds max length of 128 characters` },
          { status: 400 }
        );
      }
    }

    // Transform metrics for database insertion
    const supabase = createSupabaseServerClient();

    const records = metrics.map((m) => ({
      time: m.timestamp,
      user_id: userId,
      gpu_index: m.gpu_index,
      gpu_uuid: m.gpu_uuid,
      gpu_name: m.gpu_name || null,
      power_draw_w: m.power_draw_w,
      power_limit_w: m.power_limit_w || null,
      energy_delta_j: m.energy_delta_j || null,
      utilization_gpu_pct: m.utilization_gpu_pct,
      utilization_memory_pct: m.utilization_memory_pct,
      temperature_c: m.temperature_c,
      fan_speed_pct: m.fan_speed_pct || 0,
      memory_used_mb: m.memory_used_mb,
      memory_total_mb: m.memory_total_mb || null,
      sm_clock_mhz: m.sm_clock_mhz || null,
      memory_clock_mhz: m.memory_clock_mhz || null,
      job_id: m.job_id || null,
      // Attribution fields (v2)
      team_id: m.team_id || null,
      model_tag: m.model_tag || null,
      scheduler_source: m.scheduler_source || null,
    }));

    // Insert metrics into TimescaleDB
    const { error: insertError } = await supabase
      .from('gpu_metrics')
      .insert(records);

    if (insertError) {
      console.error('Metrics insert error:', insertError);

      // Check for specific error types
      if (insertError.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid user ID. User profile not found.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to insert metrics',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        inserted: metrics.length,
        message: `Successfully ingested ${metrics.length} metric${metrics.length > 1 ? 's' : ''}`,
      },
      {
        status: 200,
        headers: getRateLimitHeaders(rateLimitResult, 100),
      }
    );
  } catch (error) {
    console.error('Metrics ingestion error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/metrics/ingest
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'GPU Metrics Ingestion API',
    methods: ['POST'],
    documentation: 'https://aluminatiai-landing.vercel.app/docs/api',
  });
}
