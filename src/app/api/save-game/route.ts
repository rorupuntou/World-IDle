import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

// Create a separate Supabase client for server-side operations
// This uses the service_role key to bypass RLS.
const supabaseAdmin = createClient(
  process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, gameData } = await req.json();

    if (!walletAddress || !gameData) {
      return NextResponse.json({ success: false, error: 'Missing walletAddress or gameData' }, { status: 400 });
    }

    const savedAt = new Date().toISOString();

    // Ensure the server's authoritative timestamp is what's saved.
    const serverSideGameData = {
      ...gameData,
      gameState: {
        ...gameData.gameState,
        lastSaved: savedAt,
      },
    };

    const { error } = await supabaseAdmin.rpc('upsert_game_state', {
      p_wallet_address: walletAddress, // Client is expected to have lowercased this
      p_game_data: serverSideGameData,
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json({ success: false, error: `Supabase error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, savedAt });

  } catch (error) {
    console.error('Error in save-game API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}