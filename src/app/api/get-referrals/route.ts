
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing walletAddress parameter' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('referee_id, created_at')
      .eq('referrer_id', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching referrals: ${error.message}`);
    }

    return NextResponse.json({ success: true, referrals: data });
  } catch (error) {
    console.error('Unexpected error fetching referrals:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
