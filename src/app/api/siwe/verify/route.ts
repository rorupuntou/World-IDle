import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { createPublicClient, http, defineChain } from "viem";

// This function can be expanded to validate domain, etc.
async function verify(message: string, signature: string, nonce: string) {
  const siweMessage = new SiweMessage(message);

  // The worldChain definition can be shared, but for a self-contained example, we define it here.
  const worldChain = defineChain({
    id: 480,
    name: "World Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: [
          process.env.WORLD_CHAIN_RPC_URL ||
            "https://worldchain-mainnet.g.alchemy.com/public",
        ],
      },
    },
  });

  const provider = createPublicClient({
    chain: worldChain,
    transport: http(),
  });

  // The `verify` method will automatically handle EIP-1271 by using the `provider` option
  // It will throw an error if verification fails for any reason.
  const { data: verifiedData } = await siweMessage.verify(
    { signature, nonce },
    {
      provider,
      suppressExceptions: false, // Explicitly throw on error
    }
  );

  return verifiedData;
}

// A simplified payload extractor that handles different shapes from MiniKit
function extractSiwe(body: unknown): { message?: string; signature?: string } {
    if (typeof body !== 'object' || body === null) {
        return {};
    }
    const bodyAsRecord = body as Record<string, unknown>;
    const payload = bodyAsRecord?.payload ?? bodyAsRecord?.finalPayload ?? body;

    if (typeof payload !== 'object' || payload === null) {
        return {};
    }
    const payloadAsRecord = payload as Record<string, unknown>;
    const message = payloadAsRecord?.message ?? payloadAsRecord?.siweMessage;
    const signature = payloadAsRecord?.signature ?? payloadAsRecord?.siweSignature;

    return { 
        message: typeof message === 'string' ? message : undefined,
        signature: typeof signature === 'string' ? signature : undefined
    };
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, signature } = extractSiwe(body);

    if (!message || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing message or signature" },
        { status: 400 }
      );
    }

    const cookieNonce = req.cookies.get("siwe_nonce")?.value;
    if (!cookieNonce) {
      return NextResponse.json(
        { success: false, error: "Missing nonce cookie" },
        { status: 400 }
      );
    }

    const verifiedData = await verify(message, signature, cookieNonce);

    // If `verify` did not throw, we are successful.
    const res = NextResponse.json({ success: true, address: verifiedData.address });

    // Clear nonce cookie and set session cookie
    res.cookies.set("siwe_nonce", "", { maxAge: 0, path: "/" });
    res.cookies.set("siwe_session", verifiedData.address, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("siwe/verify: verification failed", {
      error: errorMessage,
      cause: e,
    });
    return NextResponse.json(
      { success: false, error: "Signature verification failed", detail: errorMessage },
      { status: 401 }
    );
  }
}