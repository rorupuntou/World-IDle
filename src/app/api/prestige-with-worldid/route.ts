import { NextResponse, type NextRequest } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import { supabase } from '@/lib/supabaseClient';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, keccak256, encodePacked, parseEther, toBytes } from 'viem';
import { mainnet } from 'viem/chains';

const APP_ID = (process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_fe80f47dce293e5f434ea9553098015d') as `app_${string}`;

interface IRequestPayload {
    payload: ISuccessResult;
    action: string;
    signal: string;
}

export async function POST(req: NextRequest) {
    const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

    if (!privateKey) {
        return NextResponse.json({ success: false, error: 'PRIVATE_KEY environment variable not set' }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
        account,
        chain: mainnet,
        transport: http(),
    });

    const { payload, action, signal: walletAddress } = (await req.json()) as IRequestPayload;

    const verifyRes = (await verifyCloudProof(payload, APP_ID, action, walletAddress)) as IVerifyResponse;

    if (!verifyRes.success) {
        console.warn('World ID verification failed:', verifyRes);
        return NextResponse.json(verifyRes, { status: 400 });
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
            return NextResponse.json({ success: false, error: 'Game state not found for user.' }, { status: 404 });
        }

        const gameData = existingData.game_data as { stats: { totalTokensEarned: number } };
        const totalTokensEarned = gameData.stats.totalTokensEarned || 0;

        const prestigeReward = Math.floor(Math.sqrt(totalTokensEarned / 4000)) * 1000;

        if (prestigeReward < 1) {
            return NextResponse.json({ success: false, error: 'Not eligible for prestige.' }, { status: 400 });
        }

        const amountInWei = parseEther(prestigeReward.toString());
        const nonce = BigInt(Date.now());

        const messageHash = keccak256(encodePacked(
            ['address', 'uint256', 'uint256'],
            [walletAddress as `0x${string}`, amountInWei, nonce]
        ));
        
        const signature = await client.signMessage({
            message: { raw: toBytes(messageHash) },
        });

        return NextResponse.json({ success: true, amount: amountInWei.toString(), nonce: nonce.toString(), signature });

    } catch (error) {
        console.error('Error during prestige process:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ success: false, error: 'Internal Server Error', detail: message }, { status: 500 });
    }
}
