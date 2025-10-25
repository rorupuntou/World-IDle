import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
        return NextResponse.json({ success: false, error: 'walletAddress is required' }, { status: 400 });
    }

    try {
        const { data: existingData, error: fetchError } = await supabase
            .from('game_state')
            .select('game_data')
            .eq('wallet_address', walletAddress)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: row not found
            throw fetchError;
        }

        if (!existingData) {
            return NextResponse.json({ success: true, prestigeReward: 0 });
        }

        const gameData = existingData.game_data as { stats: { totalTokensEarned: number } };
        const totalTokensEarned = gameData.stats.totalTokensEarned || 0;

        const prestigeReward = Math.floor(Math.sqrt(totalTokensEarned / 4000)) * 1000;

        return NextResponse.json({ success: true, prestigeReward });

    } catch (error) {
        console.error('Error fetching prestige reward:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ success: false, error: 'Internal Server Error', detail: message }, { status: 500 });
    }
}
