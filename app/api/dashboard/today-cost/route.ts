// Dashboard API: Today's GPU Energy Cost
// Returns total energy consumption and cost for the current day

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';
import { createSupabaseCookieClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/today-cost
 * Calculate today's total GPU energy cost for authenticated user
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

    // Get user's electricity rate
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('electricity_rate_per_kwh')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User profile fetch error:', userError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    const ratePerKwh = userData?.electricity_rate_per_kwh || 0.12;

    // Get today's date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Query today's metrics with energy deltas
    const { data: metrics, error: metricsError } = await supabase
      .from('gpu_metrics')
      .select('energy_delta_j')
      .eq('user_id', userId)
      .gte('time', todayISO)
      .not('energy_delta_j', 'is', null);

    if (metricsError) {
      console.error('Metrics query error:', metricsError);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // Calculate total energy in Joules, then convert to kWh
    const totalEnergyJ = metrics?.reduce((sum, m) => sum + (m.energy_delta_j || 0), 0) || 0;
    const totalEnergyKwh = totalEnergyJ / 3_600_000; // Joules to kWh

    // Calculate cost
    const totalCostUsd = totalEnergyKwh * ratePerKwh;

    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      energy_kwh: parseFloat(totalEnergyKwh.toFixed(6)),
      cost_usd: parseFloat(totalCostUsd.toFixed(2)),
      rate_per_kwh: ratePerKwh,
      sample_count: metrics?.length || 0,
    });
  } catch (error) {
    console.error('Today cost API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
