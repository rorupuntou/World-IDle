import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface RequestBody {
  referrerCode: string;
  newUserId: string;
}

const REFERRAL_BOOST_AMOUNT = 0.02;
const WELCOME_BONUS_SPS = 5;

export async function POST(request: Request) {
  const { referrerCode, newUserId }: RequestBody = await request.json();

  if (!referrerCode || !newUserId) {
    return NextResponse.json({ error: 'Missing referrerCode or newUserId' }, { status: 400 });
  }

  const lowercasedReferrerCode = referrerCode.toLowerCase();
  const lowercasedNewUserId = newUserId.toLowerCase();

  if (lowercasedReferrerCode === lowercasedNewUserId) {
    return NextResponse.json({ error: 'Referrer and new user cannot be the same' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    const { data: existingReferral, error: existingReferralError } = await supabase
      .from('referrals')
      .select('referee_id')
      .eq('referee_id', lowercasedNewUserId)
      .single();

    if (existingReferral) {
      return NextResponse.json({ error: 'This user has already been referred.' }, { status: 409 });
    }

    if (existingReferralError && existingReferralError.code !== 'PGRST116') {
      throw new Error(`Error checking for existing referral: ${existingReferralError.message}`);
    }

    const { data: referrerGameState, error: referrerGameStateError } = await supabase
      .from('game_state')
      .select('permanent_referral_boost')
      .eq('wallet_address', lowercasedReferrerCode)
      .single();

    if (referrerGameStateError) {
      throw new Error(`Could not find referrer: ${referrerGameStateError.message}`);
    }

    const newBoost = (referrerGameState.permanent_referral_boost || 0) + REFERRAL_BOOST_AMOUNT;
    const { error: updateBoostError } = await supabase
      .from('game_state')
      .update({ permanent_referral_boost: newBoost })
      .eq('wallet_address', lowercasedReferrerCode);

    if (updateBoostError) {
      throw new Error(`Failed to update referrer boost: ${updateBoostError.message}`);
    }

    const { error: insertReferralError } = await supabase
      .from('referrals')
      .insert({ referrer_id: lowercasedReferrerCode, referee_id: lowercasedNewUserId });

    if (insertReferralError) {
        console.error('Failed to insert referral record.', insertReferralError);
        if (insertReferralError.code === '23505') {
            return NextResponse.json({ error: 'This user has already been referred.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create referral record.' }, { status: 500 });
    }

    const { data: refereeGameState, error: refereeGameStateError } = await supabase
      .from('game_state')
      .select('game_data')
      .eq('wallet_address', lowercasedNewUserId)
      .single();

    if (refereeGameStateError && refereeGameStateError.code !== 'PGRST116') {
        console.error('Could not get referee game state to grant bonus', refereeGameStateError);
    } else {
        const gameData = refereeGameState?.game_data || {};
        gameData.gameState = gameData.gameState || {};
        gameData.gameState.tokens = (gameData.gameState.tokens || 0) + WELCOME_BONUS_SPS;

        const { error: updateRefereeError } = await supabase
            .from('game_state')
            .upsert({ wallet_address: lowercasedNewUserId, game_data: gameData }, { onConflict: 'wallet_address' });

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