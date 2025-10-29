import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js';

// Define boost details on the backend to prevent manipulation
const boosts: Record<string, { price: number; bonus: number }> = {
    boost_10: { price: 0.15, bonus: 0.1 },
    boost_50: { price: 0.60, bonus: 0.5 },
    boost_100: { price: 1, bonus: 1.0 },
};

export async function POST(req: NextRequest) {
    const { payload, walletAddress, boostId } = await req.json() as { 
        payload: MiniAppPaymentSuccessPayload,
        walletAddress: string,
        boostId: string,
    };

    if (!payload || !walletAddress || !boostId || !boosts[boostId]) {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }

    const lowercasedAddress = walletAddress.toLowerCase();

    const verifyUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=app_fe80f47dce293e5f434ea9553098015d`;
    
    try {
        const verifyRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.WLD_DEV_PORTAL_API_KEY}`,
            },
        });

        if (!verifyRes.ok) {
            console.error('Failed to verify transaction with Worldcoin API:', await verifyRes.text());
            return NextResponse.json({ success: false, error: 'Transaction verification failed.' }, { status: 500 });
        }

        const transaction = await verifyRes.json();

        if (transaction.status === 'failed' || transaction.reference !== payload.reference) {
            return NextResponse.json({ success: false, error: 'Transaction invalid or failed.' }, { status: 400 });
        }

        const { data: existingData, error: fetchError } = await supabase
            .from('game_state')
            .select('game_data')
            .eq('wallet_address', lowercasedAddress)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        const gameData = existingData ? existingData.game_data : {};
        
        const purchasedBoost = boosts[boostId];
        const currentBonus = gameData.permanentBoostBonus || 0;
        const newBonus = currentBonus + purchasedBoost.bonus;

        gameData.permanentBoostBonus = newBonus;

        const { error: updateError } = await supabase
            .from('game_state')
            .upsert({
                wallet_address: lowercasedAddress,
                game_data: gameData,
            }, { onConflict: 'wallet_address' });

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, newBonus: newBonus });

    } catch (error) {
        console.error('Error confirming payment:', error);
        return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
    }
}