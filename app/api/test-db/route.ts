import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');

    // Test connection by querying the table
    const { data, error } = await supabase
      .from('early_access_requests')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return NextResponse.json({
        status: 'error',
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      tableExists: true
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
