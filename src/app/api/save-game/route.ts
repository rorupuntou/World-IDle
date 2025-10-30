import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { walletAddress, gameData, lastWidleClaimAt } = await req.json();

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required." }, { status: 400 });
  }

  if (!gameData && !lastWidleClaimAt) {
    return NextResponse.json({ error: "Either gameData or lastWidleClaimAt must be provided." }, { status: 400 });
  }

  const lowercasedAddress = walletAddress.toLowerCase();

  const dataToUpsert: {
    wallet_address: string;
    game_data?: unknown;
    last_widle_claim_at?: string;
  } = {
    wallet_address: lowercasedAddress,
  };

  if (gameData) {
    dataToUpsert.game_data = gameData;
  }

  // If lastWidleClaimAt is provided, update it.
  // The value should be a valid ISO 8601 string, which new Date().toISOString() provides.
  if (lastWidleClaimAt) {
    dataToUpsert.last_widle_claim_at = lastWidleClaimAt;
  }

  const { error } = await supabase
    .from('game_state')
    .upsert(dataToUpsert, { onConflict: 'wallet_address' });

  if (error) {
    console.error("Supabase save error:", error);
    return NextResponse.json({ success: false, error: "Failed to save game data." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
