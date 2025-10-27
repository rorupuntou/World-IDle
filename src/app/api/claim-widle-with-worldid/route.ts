import { NextResponse, type NextRequest } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import { supabase } from '@/lib/supabaseClient';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, keccak256, encodePacked, parseEther, toBytes, defineChain } from 'viem';

// Define World Chain for Viem
const worldChain = defineChain({
  id: 480,
  name: 'World Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://worldchain-mainnet.g.alchemy.com/public'],
    },
  },
  blockExplorers: {
    default: { name: 'World Chain Explorer', url: 'https://explorer.worldcoin.org' },
  },
});

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
        chain: worldChain, // Use World Chain for signing
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

        const wIdleReward = Math.floor(Math.sqrt(totalTokensEarned / 4000)) * 1000;

        if (wIdleReward < 1) {
            return NextResponse.json({ success: false, error: 'Not eligible for wIDle claim.' }, { status: 400 });
        }

        // Use seconds-based nonce to avoid millisecond/second mismatch with on-chain comparisons
        const amountInWei = parseEther(wIdleReward.toString());

        // Prefer a persistent server-managed nonce stored in the game_state table under `next_widle_nonce`.
        // If the column is absent, fall back to seconds-based timestamp.
        let nonceBigInt: bigint;
        try {
            // Try to read next_widle_nonce if present
            const nextNonce = (existingData as Record<string, unknown>)['next_widle_nonce'];
            if (typeof nextNonce === 'number' || typeof nextNonce === 'bigint' || typeof nextNonce === 'string') {
                const current = BigInt(String(nextNonce));
                nonceBigInt = current;

                // Attempt to increment it in DB for next time (best-effort; not fully atomic without SQL function)
                try {
                    const { data: updated, error: updateErr } = await supabase
                        .from('game_state')
                        .update({ next_widle_nonce: (Number(current) + 1) })
                        .eq('wallet_address', walletAddress)
                        .select('next_widle_nonce')
                        .single();
                    if (updateErr) {
                        console.warn('Could not increment next_widle_nonce atomically:', updateErr.message || updateErr);
                    } else {
                        // eslint-disable-next-line no-console
                        console.info('Incremented next_widle_nonce for', walletAddress, '->', updated?.next_widle_nonce);
                    }
                } catch (uErr) {
                    // eslint-disable-next-line no-console
                    console.warn('Error updating next_widle_nonce:', uErr);
                }
            } else {
                // fallback to timestamp (seconds)
                nonceBigInt = BigInt(Math.floor(Date.now() / 1000));
            }
        } catch {
            nonceBigInt = BigInt(Math.floor(Date.now() / 1000));
        }

        // Build the message exactly as the contract does: keccak256(abi.encodePacked(msg.sender, amount, nonce))
        const messageHash = keccak256(encodePacked(
            ['address', 'uint256', 'uint256'],
            [walletAddress as `0x${string}`, amountInWei, nonceBigInt]
        ));

        // The contract prefixes the message with the Ethereum Signed Message prefix and then keccak256s again.
        const ethPrefixed = keccak256(encodePacked(['string', 'bytes32'], ["\x19Ethereum Signed Message:\n32", messageHash]));

        // Log hashes to help debug mismatches (hex)
        // eslint-disable-next-line no-console
        console.info('claim-widle: messageHash', messageHash);
        // eslint-disable-next-line no-console
        console.info('claim-widle: ethPrefixed', ethPrefixed);

        const signature = await client.signMessage({
            // sign the 32-byte prefixed hash as raw bytes (avoid double-prefixing)
            message: { raw: toBytes(ethPrefixed) },
        });

        return NextResponse.json({ success: true, amount: amountInWei.toString(), nonce: nonceBigInt.toString(), signature });

    } catch (error) {
        console.error('Error during wIDle claim process:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ success: false, error: 'Internal Server Error', detail: message }, { status: 500 });
    }
}