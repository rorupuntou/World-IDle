import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
        return NextResponse.json({ success: false, error: 'walletAddress is required' }, { status: 400 });
    }

    const lowercasedAddress = walletAddress.toLowerCase();

    try {
        const { data: existingData, error: fetchError } = await supabase
            .from('game_state')
            .select('game_data')
            .eq('wallet_address', lowercasedAddress)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: row not found
            throw fetchError;
        }

        if (!existingData) {
            return NextResponse.json({ success: true, reward: 0, wIdleReward: 0 });
        }

        // game_data might be stored as JSON or stringified JSON; handle both
    const row = existingData as Record<string, unknown> | null;
    let gameDataObj: unknown = row?.game_data;
        if (typeof gameDataObj === 'string') {
            try {
                gameDataObj = JSON.parse(gameDataObj) as unknown;
            } catch {
                gameDataObj = undefined;
            }
        }

        const totalTokensEarned = (() => {
            if (typeof gameDataObj !== 'object' || gameDataObj === null) return 0;
            const gd = gameDataObj as Record<string, unknown>;
            const stats = gd['stats'] as Record<string, unknown> | undefined;
            if (!stats) return 0;
            const val = stats['totalTokensEarned'];
            return typeof val === 'number' ? val : 0;
        })();

        const wIdleReward = Math.floor(300 * Math.log(0.0001 * totalTokensEarned + 1));

        // return both names for backward compatibility (reward and wIdleReward)
        return NextResponse.json({ success: true, reward: wIdleReward, wIdleReward });

    } catch (error) {
        console.error('Error fetching wIDle reward:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ success: false, error: 'Internal Server Error', detail: message }, { status: 500 });
    }
}
