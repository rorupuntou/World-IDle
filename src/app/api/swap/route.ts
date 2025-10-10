import { NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits, defineChain, type Hex } from "viem";

// Define World Chain for viem
const worldChain = defineChain({
    id: 480, // Using the chain ID from the user's foundry.toml
    name: 'World Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, // World chain uses ETH for gas
    rpcUrls: {
        // Using the user's personal Alchemy RPC URL for reliability
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

// Minimal ABI for the QuoterV2 contract
const quoterAbi = [
    {
        "name": "quoteExactInputSingle",
        "type": "function",
        "stateMutability": "nonpayable",
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

// Token decimals lookup
const tokenDecimals: Record<string, number> = {
  '0x6671c7c52b5ee08174d432408086e1357ed07246': 18, // PrestigeToken
  '0x2cfc85d8e48f8eab294be644d9e25c3030863003': 18, // WLD
  '0x79a02482a880bce3f13e09da970dc34db4cd24d1': 6,  // USDC
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromToken, toToken, amount } = body;

    if (!fromToken || !toToken || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const fromDecimals = tokenDecimals[fromToken.toLowerCase()] ?? 18;
    const amountIn = parseUnits(amount, fromDecimals);

    // Call the Uniswap V3 Quoter contract to get the expected amount out
    // We default to the 0.3% fee tier, which is the most common.
    const amountOut = await publicClient.readContract({
        address: QUOTER_CONTRACT_ADDRESS,
        abi: quoterAbi,
        functionName: 'quoteExactInputSingle',
        args: [
            fromToken as Hex, // tokenIn
            toToken as Hex,   // tokenOut
            3000,             // fee (3000 = 0.3%)
            amountIn,         // amountIn
            0,                // sqrtPriceLimitX96 (0 for no limit)
        ]
    });

    // Return the quoted amount to the frontend
    return NextResponse.json({ 
      toAmount: amountOut.toString(),
      toTokenDecimals: tokenDecimals[toToken.toLowerCase()] ?? 18
    });

  } catch (error) {
    console.error('Swap API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}