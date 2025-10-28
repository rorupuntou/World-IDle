import { NextRequest, NextResponse } from 'next/server';
import { verifyCloudProof, ISuccessResult } from '@worldcoin/minikit-js';
import { supabase } from '@/lib/supabaseClient';

interface IRequestPayload {
    proof: ISuccessResult;
    signal: string;
    action: string;
}

export async function POST(req: NextRequest) {
    const { proof, signal, action } = (await req.json()) as IRequestPayload;

    const app_id = 'app_fe80f47dce293e5f434ea9553098015d' as `app_${string}`;

    try {
        const verifyRes = await verifyCloudProof(proof, app_id, action, signal);

        if (verifyRes.success) {
            // If verification is successful, also fetch the user's game data.
            const { data: existingData, error: fetchError } = await supabase
                .from('game_state')
                .select('game_data')
                .eq('wallet_address', signal) // signal is the wallet address
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: row not found
                console.error("Error fetching game state after verification:", fetchError);
                // Still return success for verification, but with null gameData
                return NextResponse.json({ success: true, gameData: null }, { status: 200 });
            }

            return NextResponse.json({ success: true, gameData: existingData?.game_data || null }, { status: 200 });
        } else {
            console.error("Verification failed:", verifyRes);
            const detail = (verifyRes as { detail?: string }).detail || 'Verification failed.';
            return NextResponse.json({ success: false, detail }, { status: 400 });
        }
    } catch (error) {
        console.error("Error verifying proof:", error);
        const detail = (error instanceof Error) ? error.message : 'An unknown error occurred during proof verification.';
        return NextResponse.json({ success: false, detail }, { status: 500 });
    }
}