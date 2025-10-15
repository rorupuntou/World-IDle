
import { NextResponse, type NextRequest } from 'next/server';
import type { ISuccessResult } from '@worldcoin/idkit';
import { supabase } from '@/lib/supabaseClient';
import { initialState, initialAutoclickers, initialUpgrades, initialAchievements, initialStats } from '@/app/data';

const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_3b83f308b9f7ef9a01e4042f1f48721d';
const ACTION_NAME = 'prestige-game';

interface VerifyResponse {
  success: boolean;
  code?: string;
  detail?: string;
  attribute?: string | null;
}

export async function POST(req: NextRequest) {
  const { proof, walletAddress } = (await req.json()) as { proof: ISuccessResult; walletAddress: string };

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  const verifyRes = await fetch(`https://developer.worldcoin.org/api/v2/verify/${APP_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `world-idle-app/1.0`,
    },
    body: JSON.stringify({
      ...proof,
      action: ACTION_NAME,
    }),
  });

  const verifyResult: VerifyResponse = await verifyRes.json();

  if (verifyRes.ok && verifyResult.success) {
    // Proof is valid, reset the game state
    try {
      // Construct the full initial game state object
      const newGameData = {
        ...initialState,
        stats: initialStats,
        autoclickers: initialAutoclickers,
        upgrades: initialUpgrades,
        achievements: initialAchievements,
        // TODO: Add logic to calculate and persist prestige tokens
      };

      const { error } = await supabase
        .from('game_state')
        .update({ game_data: newGameData })
        .eq('wallet_address', walletAddress);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, newGameData }, { status: 200 });
    } catch (dbError: unknown) {
      console.error('Supabase error during prestige reset:', dbError);
      return NextResponse.json({ code: 'db_error', detail: 'Failed to reset game state.' }, { status: 500 });
    }
  } else {
    // Proof is invalid or already used
    console.warn('World ID verification failed:', verifyResult);
    return NextResponse.json(verifyResult, { status: 400 });
  }
}
