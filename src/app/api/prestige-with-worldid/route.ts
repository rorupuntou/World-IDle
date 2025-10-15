
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import { supabase } from '@/lib/supabaseClient';
import { initialState, initialAutoclickers, initialUpgrades, initialAchievements, initialStats } from '@/app/data';

const APP_ID = (process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_3b83f308b9f7ef9a01e4042f1f48721d') as `app_${string}`;

interface IRequestPayload {
	payload: ISuccessResult
	action: string
	signal: string | undefined
    walletAddress: string;
}

export async function POST(req: NextRequest) {
  const { payload, action, signal, walletAddress } = (await req.json()) as IRequestPayload;

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  const verifyRes = (await verifyCloudProof(payload, APP_ID, action, signal)) as IVerifyResponse;

  if (verifyRes.success) {
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
    console.warn('World ID verification failed:', verifyRes);
    return NextResponse.json(verifyRes, { status: 400 });
  }
}
