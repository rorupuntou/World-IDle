
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';
import { FullGameState } from "@/components/types";
import { initialAchievements, initialAutoclickers, initialState, initialStats, initialUpgrades } from "@/app/data";

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
    // User found
    const permanentBoostBonus = data.permanent_boost_bonus || 0;
    let gameData = data.game_data as FullGameState | null;

    if (gameData) {
        // User has existing game data, inject the boost
        if (!gameData.gameState) {
            gameData.gameState = { ...initialState };
        }
        gameData.gameState.permanentBoostBonus = permanentBoostBonus;
    } else {
        // User exists but has no game data (e.g., post-prestige, or error), create a fresh state
        gameData = {
            gameState: { ...initialState, permanentBoostBonus },
            stats: initialStats,
            autoclickers: initialAutoclickers,
            upgrades: initialUpgrades,
            achievements: initialAchievements,
        };
    }
    return NextResponse.json({ success: true, gameData: gameData }, { status: 200 });

  } else {
    // No user found, this is a new player
    return NextResponse.json({ success: true, gameData: null }, { status: 200 });
  }
}
