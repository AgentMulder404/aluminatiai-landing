// API Authentication Middleware
// Validates API keys for agent authentication

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from './supabase-client';

export interface ApiAuthResult {
  userId: string | null;
  error: string | null;
}

/**
 * Validate API key from request headers
 * Checks format, existence in database, and trial expiration
 */
export async function validateApiKey(request: NextRequest): Promise<ApiAuthResult> {
  // Extract API key from headers
  const apiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return { userId: null, error: 'Missing API key. Include X-API-Key header.' };
  }

  // Validate format (must start with 'alum_')
  if (!apiKey.startsWith('alum_')) {
    return { userId: null, error: 'Invalid API key format. API keys must start with "alum_".' };
  }

  try {
    const supabase = createSupabaseServerClient();

    // Query users table for matching API key
    const { data: user, error } = await supabase
      .from('users')
      .select('id, trial_ends_at')
      .eq('api_key', apiKey)
      .single();

    if (error || !user) {
      return { userId: null, error: 'Invalid API key. Check your dashboard for the correct key.' };
    }

    // Check if trial has expired
    const trialEndsAt = new Date(user.trial_ends_at);
    const now = new Date();

    if (trialEndsAt < now) {
      const daysExpired = Math.floor((now.getTime() - trialEndsAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        userId: null,
        error: `Trial expired ${daysExpired} day(s) ago. Please upgrade your account.`
      };
    }

    // Success - return user ID
    return { userId: user.id, error: null };

  } catch (error) {
    console.error('API key validation error:', error);
    return {
      userId: null,
      error: 'Internal server error during authentication. Please try again.'
    };
  }
}

/**
 * Validate session-based authentication (for dashboard API endpoints)
 */
export async function validateSession(request: NextRequest): Promise<ApiAuthResult> {
  try {
    const supabase = createSupabaseServerClient();

    // Get session from cookies
    const authHeader = request.headers.get('cookie');
    if (!authHeader) {
      return { userId: null, error: 'No authentication session found' };
    }

    // Verify session
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { userId: null, error: 'Invalid or expired session. Please log in again.' };
    }

    return { userId: user.id, error: null };

  } catch (error) {
    console.error('Session validation error:', error);
    return {
      userId: null,
      error: 'Internal server error during authentication. Please try again.'
    };
  }
}
