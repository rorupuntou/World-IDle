
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';
import { initialAchievements, initialAutoclickers, initialState, initialStats, initialUpgrades } from "@/app/data";
import { FullGameState } from "@/components/types";

export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required." }, { status: 400 });
  }

  try {
    // 1. Fetch the current permanent boost from the database
    const { data: user_data, error: fetchError } = await supabase
      .from('game_state')
      .select('permanent_boost_bonus')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Prestige fetch error:", fetchError);
      throw new Error("Could not fetch user data for prestige.");
    }

    const permanentBoostBonus = user_data?.permanent_boost_bonus || 0;

    // 2. Create a fresh game state, preserving the permanent boost
    const resetData: FullGameState = {
        gameState: {
            ...initialState,
            lastSaved: Date.now(),
            permanentBoostBonus: permanentBoostBonus,
        },
        stats: initialStats,
        autoclickers: initialAutoclickers,
        upgrades: initialUpgrades,
        achievements: initialAchievements,
    };

    // 3. Save the reset game state back to the database
    const { data: updateData, error: updateError } = await supabase
      .from('game_state')
      .update({ game_data: resetData, last_prestaged: new Date().toISOString() })
      .eq('wallet_address', walletAddress)
      .select('game_data') 
      .single();

    if (updateError) {
        console.error("Prestige update error:", updateError);
        // If the user doesn't exist, create them
        if (updateError.code === 'PGRST116') {
            const { data: createData, error: createError } = await supabase
                .from('game_state')
                .insert({ wallet_address: walletAddress, game_data: resetData, permanent_boost_bonus: permanentBoostBonus })
                .select('game_data')
                .single();
            
            if (createError) {
                console.error("Prestige create error:", createError);
                throw new Error("Could not create user during prestige.");
            }
            return NextResponse.json({ success: true, gameData: createData.game_data }, { status: 200 });
        }
      throw new Error("Could not update user data for prestige.");
    }

    // 4. Return the new game state to the client
    return NextResponse.json({ success: true, gameData: updateData.game_data }, { status: 200 });

  } catch (error: unknown) {
    console.error("Prestige process failed:", error);
    let errorMessage = "An unexpected error occurred during prestige.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
