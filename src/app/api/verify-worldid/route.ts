
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabaseClient';

const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_staging_1234';
const ACTION_ID = process.env.NEXT_PUBLIC_WLD_ACTION_ID || 'wid_staging_1234';

export async function POST(req: NextRequest) {
  const { proof, signal } = await req.json();

  if (!proof || !signal) {
    return NextResponse.json({ error: "Proof and signal are required." }, { status: 400 });
  }

  const verifyRes = await fetch(
    `https://developer.worldcoin.org/api/v1/verify/${APP_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        proof: proof.proof,
        signal: signal,
        action: ACTION_ID, 
      }),
    }
  );

  const wldResponse = await verifyRes.json();

  if (verifyRes.status === 200 && wldResponse.success) {
    // World ID proof is valid. Now, check for user data in Supabase.
    const { data, error } = await supabase
      .from('game_state')
      .select('game_data')
      .eq('wallet_address', signal)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Supabase error:", error);
      return NextResponse.json({ success: false, error: "Database error." }, { status: 500 });
    }

    if (data) {
      // User found, return their game data
      return NextResponse.json({ success: true, gameData: data.game_data }, { status: 200 });
    } else {
      // No user found, this is a new player
      return NextResponse.json({ success: true, gameData: null }, { status: 200 });
    }
  } else {
    // World ID proof is invalid
    console.error("World ID verification failed:", wldResponse);
    return NextResponse.json({ success: false, error: "World ID verification failed." }, { status: 400 });
  }
}
