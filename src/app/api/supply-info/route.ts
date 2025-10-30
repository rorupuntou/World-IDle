import { NextResponse } from 'next/server';
import { createPublicClient, http, defineChain, formatUnits } from 'viem';
import { contractConfig } from '@/app/contracts/config';

// Define World Chain for Viem
const worldChain = defineChain({
  id: contractConfig.worldChainId,
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

const publicClient = createPublicClient({
  chain: worldChain,
  transport: http(),
});

// Simple in-memory cache
let cache = {
    data: null as { totalSupply: string; cap: string } | null,
    timestamp: 0,
};

const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET() {
    const now = Date.now();

    if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
        return NextResponse.json({ success: true, ...cache.data });
    }

    try {
        // Fetch data using two separate calls as multicall is not supported
        const totalSupplyPromise = publicClient.readContract({
            address: contractConfig.wIdleTokenAddress,
            abi: contractConfig.wIdleTokenAbi,
            functionName: 'totalSupply',
        });

        const capPromise = publicClient.readContract({
            address: contractConfig.wIdleTokenAddress,
            abi: contractConfig.wIdleTokenAbi,
            functionName: 'cap',
        });

        const [totalSupplyBigInt, capBigInt] = await Promise.all([totalSupplyPromise, capPromise]);

        if (totalSupplyBigInt === undefined || capBigInt === undefined) {
            throw new Error('Failed to fetch supply data from contract.');
        }

        const decimals = 18;
        const data = {
            totalSupply: formatUnits(totalSupplyBigInt, decimals),
            cap: formatUnits(capBigInt, decimals),
        };

        cache = {
            data,
            timestamp: now,
        };

        return NextResponse.json({ success: true, ...data });

    } catch (error) {
        console.error('[API /supply-info] Error fetching token supply:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ success: false, error: 'Internal Server Error', detail: message }, { status: 500 });
    }
}