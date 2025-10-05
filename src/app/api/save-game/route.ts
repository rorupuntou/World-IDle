
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { walletAddress, gameData } = await req.json();

  if (!walletAddress || !gameData) {
    return NextResponse.json({ error: "walletAddress and gameData are required." }, { status: 400 });
  }

  const { error } = await supabase
    .from('game_state')
    .upsert({ 
        wallet_address: walletAddress, 
        game_data: gameData 
    });

  if (error) {
    console.error("Supabase save error:", error);
    return NextResponse.json({ success: false, error: "Failed to save game data." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
