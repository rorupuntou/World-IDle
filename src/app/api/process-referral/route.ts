import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Define the structure of the incoming request body
interface RequestBody {
  referrerCode: string;
  newUserId: string;
}

// The amount of welcome bonus for the new user
const WELCOME_BONUS_SPS = 5; // Grants 5 SPS as a welcome bonus

export async function POST(request: Request) {
  const { referrerCode, newUserId }: RequestBody = await request.json();

  // Basic validation
  if (!referrerCode || !newUserId) {
    return NextResponse.json({ error: 'Missing referrerCode or newUserId' }, { status: 400 });
  }

  if (referrerCode === newUserId) {
    return NextResponse.json({ error: 'Referrer and new user cannot be the same' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Call the PostgreSQL function to handle the logic atomically
  const { error } = await supabase.rpc('handle_referral', {
    referrer_id_in: referrerCode,
    referee_id_in: newUserId,
    sps_bonus_in: WELCOME_BONUS_SPS,
  });

  if (error) {
    console.error('Error processing referral:', error);
    // Provide a more specific error message if possible based on the error
    if (error.message.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json({ error: 'This referral has already been processed.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An error occurred while processing the referral.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Referral processed successfully.' });
}
