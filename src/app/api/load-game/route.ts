
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');
  console.log(`[LOAD-GAME] Received request for wallet: ${walletAddress}`);

  if (!walletAddress) {
    console.error('[LOAD-GAME] Error: walletAddress is required.');
    return NextResponse.json({ error: "walletAddress is required." }, { status: 400 });
  }

  const lowercasedAddress = walletAddress.toLowerCase();

  const { data, error } = await supabase
    .from('game_state')
    .select('game_data, permanent_referral_boost')
    .eq('wallet_address', lowercasedAddress)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error(`[LOAD-GAME] Supabase error for wallet ${walletAddress}:`, error);
    return NextResponse.json({ success: false, error: "Database error." }, { status: 500 });
  }

  console.log(`[LOAD-GAME] Data fetched from Supabase for ${walletAddress}:`, JSON.stringify(data, null, 2));

  if (data) {
    // The game_data from DB is the FullGameState. We inject the boost value into it.
    const gameData = data.game_data || {};
    if (!gameData.gameState) {
      // Ensure gameState exists for new or empty profiles
      gameData.gameState = {};
    }
    gameData.gameState.permanent_referral_boost = data.permanent_referral_boost || 0;

    console.log(`[LOAD-GAME] Preparing to send gameData for ${walletAddress}:`, JSON.stringify(gameData, null, 2));
    return NextResponse.json({ success: true, gameData: gameData }, { status: 200 });
  } else {
    console.log(`[LOAD-GAME] No data found for ${walletAddress}. Sending null gameData.`);
    return NextResponse.json({ success: true, gameData: null }, { status: 200 });
  }
}
