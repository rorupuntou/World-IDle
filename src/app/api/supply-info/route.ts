import { NextResponse } from 'next/server';
import { createPublicClient, http, defineChain, formatUnits } from 'viem';
import { contractConfig } from '@/app/contracts/config';

// Define World Chain for Viem, reusing from other parts of the app
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

// Simple in-memory cache to prevent spamming the RPC
let cache = {
    data: null as { totalSupply: string; cap: string } | null,
    timestamp: 0,
};

const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET() {
    const now = Date.now();

    // 1. Check cache
    if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
        return NextResponse.json({ success: true, ...cache.data });
    }

    try {
        // 2. Fetch data from contract using multicall for efficiency
        const multicallResult = await publicClient.multicall({
            contracts: [
                {
                    address: contractConfig.wIdleTokenAddress,
                    abi: contractConfig.wIdleTokenAbi,
                    functionName: 'totalSupply',
                },
                {
                    address: contractConfig.wIdleTokenAddress,
                    abi: contractConfig.wIdleTokenAbi,
                    functionName: 'cap',
                },
            ],
        });

        const totalSupplyBigInt = multicallResult[0].result as bigint | undefined;
        const capBigInt = multicallResult[1].result as bigint | undefined;

        if (totalSupplyBigInt === undefined || capBigInt === undefined) {
            throw new Error('Failed to fetch supply data from contract.');
        }

        // The contract has 18 decimals
        const decimals = 18;
        const data = {
            totalSupply: formatUnits(totalSupplyBigInt, decimals),
            cap: formatUnits(capBigInt, decimals),
        };

        // 3. Update cache
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
