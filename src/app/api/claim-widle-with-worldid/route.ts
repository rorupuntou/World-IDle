import { NextResponse, type NextRequest } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import { supabase } from '@/lib/supabaseClient';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, keccak256, encodePacked, parseEther, defineChain } from 'viem';

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
      http: ['https://worldchain-mainnet.g.alchemy.com/v2/kodVkLaxHvuF3CErQP3aK'],
    },
  },
  blockExplorers: {
    default: { name: 'World Chain Explorer', url: 'https://worldscan.org' },
  },
});

const APP_ID = 'app_3b83f308b9f7ef9a01e4042f1f48721d' as `app_${string}`;

interface IRequestPayload {
    payload: ISuccessResult;
    action: string;
    signal: string;
}

async function getNonceForWallet(wallet: string, retries = 2): Promise<bigint> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data: newNonce, error: rpcError } = await supabase
      .rpc('increment_next_widle_nonce', { p_wallet: wallet });
    if (rpcError) {
      // If row not found or other db error, let retry handle it
      if (attempt < retries) {
        // small backoff
        await new Promise(res => setTimeout(res, 100 * (attempt + 1)));
        continue;
      }
      throw new Error(`Failed to get nonce from RPC: ${rpcError.message}`);
    }
    if (newNonce == null) {
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, 100 * (attempt + 1)));
        continue;
      }
      throw new Error('RPC returned null nonce.');
    }
    try {
      if (typeof newNonce === 'string') {
        return BigInt(newNonce);
      }
      if (typeof newNonce === 'number') {
        if (!Number.isSafeInteger(newNonce)) {
          throw new Error('Received unsafe integer nonce from DB');
        }
        return BigInt(newNonce);
      }
      // Fallback to string coercion
      return BigInt(String(newNonce));
    } catch (e) {
      throw new Error(`Failed to parse nonce from RPC: ${(e as Error).message}`);
    }
  }
  throw new Error('Exceeded retries while obtaining nonce');
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
    const lowercasedAddress = walletAddress.toLowerCase();

    const verifyRes = (await verifyCloudProof(payload, APP_ID, action, lowercasedAddress)) as IVerifyResponse;

    if (!verifyRes.success) {
        console.warn('World ID verification failed:', verifyRes);
        return NextResponse.json(verifyRes, { status: 400 });
    }

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
            return NextResponse.json({ success: false, error: 'Game state not found for user.' }, { status: 404 });
        }

        const gameData = existingData.game_data as { stats: { totalTokensEarned: number } };
        const totalTokensEarned = gameData.stats.totalTokensEarned || 0;

        const wIdleReward = Math.floor(300 * Math.log(0.0001 * totalTokensEarned + 1));

        if (wIdleReward < 1) {
            return NextResponse.json({ success: false, error: 'Not eligible for wIDle claim.' }, { status: 400 });
        }

        // Use seconds-based nonce to avoid millisecond/second mismatch with on-chain comparisons
        const amountInWei = parseEther(wIdleReward.toString());

        let nonceBigInt: bigint;
        try {
            const nonce = await getNonceForWallet(lowercasedAddress);
            nonceBigInt = nonce;
            console.info('claim-widle: obtained nonce via rpc increment_next_widle_nonce ->', nonceBigInt.toString());
        } catch (err) {
            console.warn(`claim-widle: error calling rpc increment_next_widle_nonce: ${(err as Error).message}. Aborting claim.`);
            return NextResponse.json({ success: false, error: 'Could not obtain nonce. Please retry.' }, { status: 503 });
        }

        // Build the message exactly as the contract does: keccak256(abi.encodePacked(msg.sender, amount, nonce))
        const messageHash = keccak256(encodePacked(
            ['address', 'uint256', 'uint256'],
            [lowercasedAddress as `0x${string}`, amountInWei, nonceBigInt]
        ));

        // Log the hash to help debug mismatches. This is the hash that will be prefixed and hashed again by the wallet before signing.
        // eslint-disable-next-line no-console
        console.info('claim-widle: messageHash to be signed', messageHash);

        // According to EIP-191, the wallet will sign keccak256("\x19Ethereum Signed Message:\n32" + messageHash).
        // viem's signMessage handles this automatically when given a raw message hash.
        const signature = await client.signMessage({
            message: { raw: messageHash },
        });

        return NextResponse.json({ success: true, amount: amountInWei.toString(), nonce: nonceBigInt.toString(), signature });

    } catch (error) {
        console.error('Error during wIDle claim process:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ success: false, error: 'Internal Server Error', detail: message }, { status: 500 });
    }
}