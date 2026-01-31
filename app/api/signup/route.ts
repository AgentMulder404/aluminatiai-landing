import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Create a Supabase client with service role key for server-side operations
  // This bypasses RLS which is fine since we're validating on the server
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Log to console (will appear in Vercel logs)
    console.log('New signup:', email, new Date().toISOString());

    // Save to Supabase database
    console.log('Attempting to save to Supabase...');
    const { data, error } = await supabase
      .from('early_access_requests')
      .insert([
        {
          email,
          source: 'Landing Page',
        }
      ])
      .select();

    if (error) {
      // Check if it's a unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Email already registered for early access'
        });
      }

      console.error('Database error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        {
          error: 'Failed to save email',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.log('Successfully saved to database:', data);

    return NextResponse.json({
      success: true,
      message: 'Email submitted successfully'
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process signup' },
      { status: 500 }
    );
  }
}
