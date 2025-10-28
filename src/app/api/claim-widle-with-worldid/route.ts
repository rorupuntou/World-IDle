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

const APP_ID = 'app_fe80f47dce293e5f434ea9553098015d' as `app_${string}`;

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

        // Prefer calling an atomic DB function `increment_next_widle_nonce` via RPC.
        // If the RPC call or function is not available, fall back to timestamp-based nonce.
        let nonceBigInt: bigint;
        try {
            // Try to call the PL/pgSQL function we created earlier for atomic increment.
            // This returns a bigint (the new nonce) when the DB function exists.
            const { data: rpcData, error: rpcError } = await supabase.rpc('increment_next_widle_nonce', { p_wallet: walletAddress as string });

            if (!rpcError && rpcData != null) {
                // rpcData may be a scalar, an object, or an array depending on supabase/pg config.
                // Normalize the possible shapes to extract the numeric value.
                let val: unknown = rpcData;
                if (Array.isArray(rpcData) && rpcData.length > 0) val = rpcData[0];

                // If the function returns a named column, try to read it. Otherwise coerce the scalar.
                if (typeof val === 'object' && val !== null) {
                    // e.g. { increment_next_widle_nonce: '2' }
                    const anyVal = val as Record<string, unknown>;
                    const keys = Object.keys(anyVal);
                    if (keys.length > 0) {
                        nonceBigInt = BigInt(String(anyVal[keys[0]]));
                    } else {
                        nonceBigInt = BigInt(String(val));
                    }
                } else {
                    nonceBigInt = BigInt(String(val));
                }

                // Log success
                // eslint-disable-next-line no-console
                console.info('claim-widle: obtained nonce via rpc increment_next_widle_nonce ->', nonceBigInt.toString());
            } else {
                // RPC failed or function doesn't exist: fallback to seconds timestamp
                // eslint-disable-next-line no-console
                console.warn('claim-widle: rpc increment_next_widle_nonce not available or failed:', rpcError || 'no data');
                nonceBigInt = BigInt(Math.floor(Date.now() / 1000));
            }
        } catch (rpcErr) {
            // Unexpected RPC error; fallback to timestamp
            // eslint-disable-next-line no-console
            console.warn('claim-widle: error calling rpc increment_next_widle_nonce:', rpcErr);
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