import { NextResponse } from 'next/server';
import { parseUnits, Hex } from "viem";

// A simple lookup for token decimals. In a real app, this might come from a database or a token list.
const tokenDecimals: Record<string, number> = {
  '0x6671c7c52b5ee08174d432408086e1357ed07246': 18, // PrestigeToken
  '0x2cfc85d8e48f8eab294be644d9e25c3030863003': 18, // WLD
  '0x79a02482a880bce3f13e09da970dc34db4cd24d1': 6,  // USDC
};

// Define types for the Alchemy RPC responses for better type safety
interface AlchemyRpcResponse<T> {
    jsonrpc: string;
    id: number;
    result?: T;
    error?: {
        code: number;
        message: string;
    };
}

interface AccountResponse {
    accountAddress: Hex;
    id: string;
}

interface QuoteCall {
    to: Hex;
    data: Hex;
    value: Hex;
}

interface QuoteResponse {
    calls: QuoteCall[];
    quote: {
        minimumToAmount: string; // This is a hex string number
        fromAmount: string;
    };
}

async function alchemyRpcFetch<T>(apiKey: string, body: Record<string, unknown>): Promise<AlchemyRpcResponse<T>> {
    const res = await fetch(`https://worldchain-mainnet.g.alchemy.com/v2/${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );
    return res.json();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      throw new Error("ALCHEMY_API_KEY is not set in environment variables.");
    }

    const body = await request.json();
    const { walletAddress, fromToken, toToken, amount } = body;

    if (!walletAddress || !fromToken || !toToken || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Get the Smart Wallet address associated with the user's EOA
    const accountResponse = await alchemyRpcFetch<AccountResponse>(apiKey, {
        jsonrpc: '2.0',
        id: 1,
        method: 'wallet_requestAccount',
        params: [{ signerAddress: walletAddress }]
    });

    if (accountResponse.error || !accountResponse.result) throw new Error(accountResponse.error?.message || "Failed to get smart account");
    const smartAccountAddress = accountResponse.result.accountAddress;

    // 2. Get the correct decimals for the input token
    const fromDecimals = tokenDecimals[fromToken.toLowerCase()];
    if (fromDecimals === undefined) {
      throw new Error(`Decimals not found for token: ${fromToken}`);
    }

    // 3. Convert the human-readable amount to a hex string of the smallest unit
    const fromAmountInSmallestUnit = parseUnits(amount, fromDecimals);
    const fromAmountHex = `0x${fromAmountInSmallestUnit.toString(16)}` as Hex;

    // 4. Request the quote, asking for raw transaction calls
    const quoteResponse = await alchemyRpcFetch<QuoteResponse>(apiKey, {
        jsonrpc: '2.0',
        id: 1,
        method: 'wallet_requestQuote_v0',
        params: [{
            from: smartAccountAddress,
            fromToken: fromToken as Hex,
            toToken: toToken as Hex,
            fromAmount: fromAmountHex,
            returnRawCalls: true,
        }]
    });

    if (quoteResponse.error || !quoteResponse.result) throw new Error(quoteResponse.error?.message || "Failed to get quote");
    
    const quote = quoteResponse.result;

    // 5. Map the calls from {to, data, value} to {address, data, value} for MiniKit compatibility
    if (!quote.calls || !Array.isArray(quote.calls)) {
        throw new Error("Invalid quote response: 'calls' array not found.");
    }
    const mappedCalls = quote.calls.map((call) => ({
        address: call.to, // Map 'to' to 'address'
        data: call.data,
        value: call.value,
    }));

    // 6. Return the mapped calls and quote details to the frontend
    return NextResponse.json({ 
      calls: mappedCalls,
      toAmount: quote.quote.minimumToAmount,
      toTokenDecimals: tokenDecimals[toToken.toLowerCase()] ?? 18
    });

  } catch (error) {
    console.error('Swap API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}