import { NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits, defineChain, type Hex } from "viem";

// Define World Chain for viem
const worldChain = defineChain({
    id: 480,
    name: 'World Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://worldchain-mainnet.g.alchemy.com/v2/kodVkLaxHvuF3CErQP3aK'] },
    },
    blockExplorers: {
        default: { name: 'Worldscan', url: 'https://worldscan.org' },
    },
});

const publicClient = createPublicClient({
    chain: worldChain,
    transport: http(),
});

const QUOTER_CONTRACT_ADDRESS = '0x10158D43e6cc414deE1Bd1eB0EfC6a5cBCfF244c'; // Uniswap V3 QuoterV2 on World Chain

const quoterAbi = [
    {
        "name": "quoteExactInputSingle",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            { "name": "tokenIn", "type": "address" },
            { "name": "tokenOut", "type": "address" },
            { "name": "fee", "type": "uint24" },
            { "name": "amountIn", "type": "uint256" },
            { "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "outputs": [
            { "name": "amountOut", "type": "uint256" }
        ]
    }
] as const;

const tokenDecimals: Record<string, number> = {
  '0x6671c7c52b5ee08174d432408086e1357ed07246': 18, // PrestigeToken
  '0x2cfc85d8e48f8eab294be644d9e25c3030863003': 18, // WLD
  '0x79a02482a880bce3f13e09da970dc34db4cd24d1': 6,  // USDC
};

const FEE_TIERS = [10000, 3000, 500]; // 1%, 0.3%, 0.05%

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromToken, toToken, amount } = body;

    if (!fromToken || !toToken || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const fromDecimals = tokenDecimals[fromToken.toLowerCase()] ?? 18;
    const amountIn = parseUnits(amount, fromDecimals);

    // Try all common fee tiers in parallel
    const quotePromises = FEE_TIERS.map(fee => 
        publicClient.readContract({
            address: QUOTER_CONTRACT_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactInputSingle',
            args: [ fromToken as Hex, toToken as Hex, fee, amountIn, BigInt(0) ]
        }).then(amountOut => ({ amountOut, fee, status: 'fulfilled' as const }))
          .catch(error => ({ error, fee, status: 'rejected' as const }))
    );

    const results = await Promise.all(quotePromises);

    const successfulQuotes = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result as { amountOut: bigint, fee: number });

    if (successfulQuotes.length === 0) {
        throw new Error("No liquidity pool found for this token pair.");
    }

    // Find the quote with the highest output amount
    const bestQuote = successfulQuotes.reduce((best, current) => 
        current.amountOut > best.amountOut ? current : best
    );

    // Return the best quote details to the frontend
    return NextResponse.json({ 
      toAmount: bestQuote.amountOut.toString(),
      fee: bestQuote.fee,
      toTokenDecimals: tokenDecimals[toToken.toLowerCase()] ?? 18
    });

  } catch (error) {
    console.error('Swap API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
