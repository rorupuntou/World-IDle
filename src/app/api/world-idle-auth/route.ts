import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { ISuccessResult } from '@worldcoin/idkit';

export type VerifyReply = {
  code: string;
  detail: string;
};

const WLD_API_BASE_URL = 'https://developer.worldcoin.org/api/v1';

// Common verification function
async function verifyUser(proof: ISuccessResult) {
  const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID!;
  const action = process.env.WLD_ACTION_ID!;

  const verifyRes = await fetch(`${WLD_API_BASE_URL}/v2/verify/${app_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nullifier_hash: proof.nullifier_hash,
      merkle_root: proof.merkle_root,
      proof: proof.proof,
      verification_level: proof.verification_level,
      action: action,
    }),
  });

  const wldResponse: VerifyReply = await verifyRes.json();
  return {
    success: verifyRes.status === 200,
    ...wldResponse,
  };
}


export async function POST(req: NextRequest) {
  const { proof } = await req.json();

  const verificationResult = await verifyUser(proof);

  if (verificationResult.success) {
    const nullifier_hash = proof.nullifier_hash;

    const { data, error } = await supabase
      .from('saves')
      .select('game_data')
      .eq('user_id', nullifier_hash)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error);
      return NextResponse.json({ detail: 'Error querying database' }, { status: 500 });
    }

    if (data) {
      return NextResponse.json({ nullifier_hash, ...data.game_data }, { status: 200 });
    } else {
      const initialGameState = {
        gameState: { tokens: 0, humanityGems: 0 },
        stats: { totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 },
        autoclickers: [],
        upgrades: [],
        achievements: [],
      }; 
      const { error: insertError } = await supabase
        .from('saves')
        .insert({ user_id: nullifier_hash, game_data: initialGameState });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return NextResponse.json({ detail: 'Error creating new user' }, { status: 500 });
      }
      return NextResponse.json({ nullifier_hash, ...initialGameState }, { status: 200 });
    }
  } else {
    return NextResponse.json({ code: verificationResult.code, detail: verificationResult.detail }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { proof, game_data } = await req.json();

  const verificationResult = await verifyUser(proof);

  if (verificationResult.success) {
    const nullifier_hash = proof.nullifier_hash;

    const { error } = await supabase
      .from('saves')
      .update({ game_data })
      .eq('user_id', nullifier_hash);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ detail: 'Failed to save progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Game saved' }, { status: 200 });
  } else {
    return NextResponse.json({ code: verificationResult.code, detail: verificationResult.detail }, { status: 400 });
  }
}
