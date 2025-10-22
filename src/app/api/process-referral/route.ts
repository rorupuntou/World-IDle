import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Define the structure of the incoming request body
interface RequestBody {
  referrerCode: string;
  newUserId: string;
}

const REFERRAL_BOOST_AMOUNT = 0.02; // 2% boost per referral
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

  // Create a Supabase client with the service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // NOTE: The following operations should ideally be in a single atomic transaction.
    // However, without access to modify the `handle_referral` RPC function or create a new one,
    // we are implementing the logic here. This can lead to race conditions or partial updates.

    // 1. Check if the new user has already been referred
    const { data: existingReferral, error: existingReferralError } = await supabase
      .from('referrals')
      .select('referee_id')
      .eq('referee_id', newUserId)
      .single();

    if (existingReferral) {
      return NextResponse.json({ error: 'This user has already been referred.' }, { status: 409 });
    }

    if (existingReferralError && existingReferralError.code !== 'PGRST116') { // PGRST116: No rows found
      throw new Error(`Error checking for existing referral: ${existingReferralError.message}`);
    }

    // 2. Get the referrer's current game state
    const { data: referrerGameState, error: referrerGameStateError } = await supabase
      .from('game_state')
      .select('permanent_referral_boost')
      .eq('wallet_address', referrerCode)
      .single();

    if (referrerGameStateError) {
      throw new Error(`Could not find referrer: ${referrerGameStateError.message}`);
    }

    // 3. Increment the referrer's boost
    const newBoost = (referrerGameState.permanent_referral_boost || 0) + REFERRAL_BOOST_AMOUNT;
    const { error: updateBoostError } = await supabase
      .from('game_state')
      .update({ permanent_referral_boost: newBoost })
      .eq('wallet_address', referrerCode);

    if (updateBoostError) {
      throw new Error(`Failed to update referrer boost: ${updateBoostError.message}`);
    }

    // 4. Insert the referral record
    const { error: insertReferralError } = await supabase
      .from('referrals')
      .insert({ referrer_id: referrerCode, referee_id: newUserId });

    if (insertReferralError) {
        // If this fails, we should ideally roll back the boost update.
        // Since we can't do transactions here, we are in an inconsistent state.
        console.error('CRITICAL: Failed to insert referral record after updating boost!', insertReferralError);
        return NextResponse.json({ error: 'Failed to create referral record.' }, { status: 500 });
    }

    // 5. Grant welcome bonus to the new user (referee)
    const { data: refereeGameState, error: refereeGameStateError } = await supabase
      .from('game_state')
      .select('game_data')
      .eq('wallet_address', newUserId)
      .single();

    if (refereeGameStateError && refereeGameStateError.code !== 'PGRST116') {
        console.error('Could not get referee game state to grant bonus', refereeGameStateError);
        // The referral was successful, but the bonus could not be applied.
        // This is another inconsistent state.
    } else {
        const gameData = refereeGameState?.game_data || {};
        gameData.gameState = gameData.gameState || {};
        gameData.gameState.tokens = (gameData.gameState.tokens || 0) + WELCOME_BONUS_SPS;

        const { error: updateRefereeError } = await supabase
            .from('game_state')
            .upsert({ wallet_address: newUserId, game_data: gameData }, { onConflict: 'wallet_address' });

        if (updateRefereeError) {
            console.error('Failed to grant welcome bonus to referee', updateRefereeError);
        }
    }

    return NextResponse.json({ success: true, message: 'Referral processed successfully.' });

  } catch (error) {
    console.error('Unexpected error processing referral:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
