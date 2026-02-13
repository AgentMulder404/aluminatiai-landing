// User Profile API Endpoint
// Returns user profile information including API key and trial status

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';
import { createSupabaseCookieClient } from '@/lib/supabase-server';
import { generateApiKey } from '@/lib/api-auth';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * Fetch authenticated user's profile
 */
export async function GET(request: NextRequest) {
  try {
    // Cookie-aware client for auth (reads session from request cookies)
    const supabaseAuth = await createSupabaseCookieClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const userId = user.id;

    // Service-role client for DB operations (bypasses RLS)
    const supabase = createSupabaseServerClient();

    // Fetch user profile from database
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Fallback: create profile row if it doesn't exist
    if (profileError && profileError.code === 'PGRST116') {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          api_key: generateApiKey(),
          api_key_created_at: now.toISOString(),
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnds.toISOString(),
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Profile creation error:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      profile = newProfile;
    } else if (profileError) {
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

    // Service-role client for DB operations
    const supabase = createSupabaseServerClient();

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

/**
 * POST /api/user/profile
 * Rotate API key - generates a new key and invalidates the old one
 */
export async function POST(request: NextRequest) {
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

    // Rate limiting: 5 key rotations per hour per user
    const rateLimitResult = rateLimit(`api-key-rotate:${userId}`, 5, 3600000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 5 key rotations per hour.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 5) }
      );
    }

    // Parse body to check for action
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'rotate_api_key') {
      return NextResponse.json(
        { error: 'Invalid action. Use { "action": "rotate_api_key" }' },
        { status: 400 }
      );
    }

    // Generate new API key (using crypto.getRandomValues - secure)
    const newApiKey = generateApiKey();

    // Service-role client for DB operations
    const supabase = createSupabaseServerClient();

    const { data: profile, error: updateError } = await supabase
      .from('users')
      .update({
        api_key: newApiKey,
        api_key_created_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, api_key, api_key_created_at')
      .single();

    if (updateError) {
      console.error('API key rotation error:', updateError);
      return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'API key rotated successfully. Update your agent configuration with the new key.',
      api_key: profile.api_key,
      api_key_created_at: profile.api_key_created_at,
    });
  } catch (error) {
    console.error('API key rotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
