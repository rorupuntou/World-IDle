
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

    // TODO: Here we should fetch the reference from our DB that we created in /initiate-payment
    // and verify it matches `payload.reference`. This is a critical security step.

    // For now, we proceed with the verification against Worldcoin's API
    const verifyUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${process.env.NEXT_PUBLIC_WLD_APP_ID}`;
    
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

        // Optimistically confirm if not failed. For production, you might want to poll until `mined`.
        if (transaction.status === 'failed' || transaction.reference !== payload.reference) {
            return NextResponse.json({ success: false, error: 'Transaction invalid or failed.' }, { status: 400 });
        }

        // Transaction is valid, now update the user's game data
        const { data: existingData, error: fetchError } = await supabase
            .from('game_state')
            .select('game_data')
            .eq('wallet_address', walletAddress)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        const gameData = existingData ? existingData.game_data : {};
        
        // Calculate new multiplier
        const purchasedBoost = boosts[boostId];
        // This logic assumes we store the full multiplier, not the bonus. Let's adjust to the bonus logic.
        const currentBonus = gameData.permanentBoostBonus || 0;
        const newBonus = currentBonus + purchasedBoost.bonus;

        gameData.permanentBoostBonus = newBonus;

        const { error: updateError } = await supabase
            .from('game_state')
            .upsert({
                wallet_address: walletAddress,
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
