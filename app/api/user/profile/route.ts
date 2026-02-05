// User Profile API Endpoint
// Returns user profile information including API key and trial status

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * Fetch authenticated user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get authenticated user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Calculate trial days remaining
    const trialEndsAt = new Date(profile.trial_ends_at);
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
    );
    const isTrialActive = trialEndsAt > now;

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        api_key: profile.api_key,
        api_key_created_at: profile.api_key_created_at,
        trial_started_at: profile.trial_started_at,
        trial_ends_at: profile.trial_ends_at,
        trial_days_remaining: daysRemaining,
        is_trial_active: isTrialActive,
        electricity_rate_per_kwh: profile.electricity_rate_per_kwh,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get authenticated user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Allow updating specific fields only
    if (body.full_name !== undefined) updates.full_name = body.full_name;
    if (body.company !== undefined) updates.company = body.company;
    if (body.electricity_rate_per_kwh !== undefined) {
      const rate = parseFloat(body.electricity_rate_per_kwh);
      if (rate < 0 || rate > 1) {
        return NextResponse.json(
          { error: 'Invalid electricity rate. Must be between 0 and 1.' },
          { status: 400 }
        );
      }
      updates.electricity_rate_per_kwh = rate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        electricity_rate_per_kwh: profile.electricity_rate_per_kwh,
        updated_at: profile.updated_at,
      },
    });
  } catch (error) {
    console.error('Profile update API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
