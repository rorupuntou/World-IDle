
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('game_state')
    .select('game_data, permanent_boost_bonus')
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error("Supabase error:", error);
    return NextResponse.json({ success: false, error: "Database error." }, { status: 500 });
  }

  if (data) {
    // User found, return their game data and permanent boost
    const gameData = data.game_data || {};
    if (!gameData.gameState) {
      gameData.gameState = {};
    }
    gameData.gameState.permanentBoostBonus = data.permanent_boost_bonus || 0;

    return NextResponse.json({ success: true, gameData: gameData }, { status: 200 });
  } else {
    // No user found, this is a new player
    return NextResponse.json({ success: true, gameData: null }, { status: 200 });
  }
}
