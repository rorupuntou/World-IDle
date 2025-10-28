import { NextRequest, NextResponse } from "next/server";
import { hashMessage, recoverAddress, createPublicClient, http, defineChain, getContract } from "viem";

type SiwePayload =
  | { message?: string; signature?: string; siweMessage?: string; siweSignature?: string; signedMessage?: string }
  | Record<string, unknown>;

function extractPayload(body: unknown): SiwePayload | null {
  if (!body) return null;
  // Try several common shapes
  const b = body as Record<string, unknown>;
  if (b.payload) return b.payload as SiwePayload;
  if (b.finalPayload) return b.finalPayload as SiwePayload;
  return b as SiwePayload;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Diagnostic: log the top-level body keys and a small preview to help debug mismatch between message/signature
    // eslint-disable-next-line no-console
    console.error("siwe/verify: received body keys", Object.keys(body || {}));
    // if body has finalPayload or payload, log their keys and a short preview
    if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      if (b.finalPayload) {
        try {
          const fp = b.finalPayload as Record<string, unknown>;
          // eslint-disable-next-line no-console
          console.error("siwe/verify: finalPayload keys", Object.keys(fp));
          if (typeof fp.message === "string") {
            // eslint-disable-next-line no-console
            console.error("siwe/verify: finalPayload.message preview", (fp.message as string).slice(0, 200));
          }
          if (typeof fp.signature === "string") {
            // eslint-disable-next-line no-console
            console.error("siwe/verify: finalPayload.signature length", (fp.signature as string).length);
          }
        } catch (err) {
          // ignore preview logging errors
          // eslint-disable-next-line no-console
          console.warn("siwe/verify: error previewing finalPayload", err);
        }
      }
      if (b.payload) {
        try {
          const p = b.payload as Record<string, unknown>;
          // eslint-disable-next-line no-console
          console.error("siwe/verify: payload keys", Object.keys(p));
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("siwe/verify: error previewing payload", err);
        }
      }
    }
    const payload = extractPayload(body);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Missing payload" }, { status: 400 });
    }

    const p = payload as Record<string, unknown>;
    const message =
      typeof p["message"] === "string"
        ? (p["message"] as string)
        : typeof p["siweMessage"] === "string"
        ? (p["siweMessage"] as string)
        : typeof p["signedMessage"] === "string"
        ? (p["signedMessage"] as string)
        : undefined;
    const signature =
      typeof p["signature"] === "string"
        ? (p["signature"] as string)
        : typeof p["siweSignature"] === "string"
        ? (p["siweSignature"] as string)
        : typeof p["signedMessageSignature"] === "string"
        ? (p["signedMessageSignature"] as string)
        : typeof p["signedMessageSig"] === "string"
        ? (p["signedMessageSig"] as string)
        : undefined;

    if (!message || !signature) {
      // Log minimal diagnostic info
      // eslint-disable-next-line no-console
      console.error("siwe/verify: missing message or signature", { hasMessage: !!message, hasSignature: !!signature, receivedKeys: Object.keys(body || {}) });
      return NextResponse.json({ success: false, error: "Missing message or signature" }, { status: 400 });
    }

    const cookie = req.cookies.get("siwe_nonce");
    const cookieNonce = cookie?.value;
    if (!cookieNonce) {
      return NextResponse.json({ success: false, error: "Missing nonce cookie" }, { status: 400 });
    }

    // Extract nonce and address from SIWE message using regex as a lightweight parser
    // Expect message to contain a line like: "Nonce: <nonce>" and the address somewhere in the message
    const nonceMatch = (message as string).match(/Nonce:\s*([A-Za-z0-9-_:.]+)/i);
    const extractedNonce = nonceMatch?.[1];
    const addressMatch = (message as string).match(/0x[a-fA-F0-9]{40}/);
    const extractedAddress = addressMatch?.[0];

    if (!extractedNonce || extractedNonce !== cookieNonce) {
      // eslint-disable-next-line no-console
      console.error("siwe/verify: nonce mismatch", { extractedNonce, cookieNonce, url: req.url });
      return NextResponse.json({ success: false, error: "Nonce mismatch" }, { status: 400 });
    }

    // Recover address from signature and compare to address extracted from message
    try {
      const hashed = hashMessage(message);
      const sigHex = (signature as string).startsWith("0x") ? (signature as string) : `0x${signature}`;

      // Try recovering with original signature first
      let recovered = await recoverAddress({ hash: hashed, signature: sigHex as `0x${string}` });

      // If mismatch, try normalizing v value: some hosts return v as 0/1 instead of 27/28
      const recoveredLower = recovered?.toLowerCase?.();
      const extractedLower = extractedAddress?.toLowerCase?.();
      if (!recovered || !extractedAddress || recoveredLower !== extractedLower) {
        // Attempt to normalize v if signature is 65 bytes and last byte is 0x00 or 0x01
        try {
          const raw = sigHex.startsWith("0x") ? sigHex.slice(2) : sigHex;
          if (raw.length === 130) {
            const vHex = raw.slice(128, 130);
            const v = parseInt(vHex, 16);
            if (v === 0 || v === 1) {
              const newV = (v + 27).toString(16).padStart(2, "0");
              const normalized = `0x${raw.slice(0, 128)}${newV}`;
              // eslint-disable-next-line no-console
              console.error("siwe/verify: attempting normalized signature v (0/1 -> 27/28)", { original: sigHex, normalized });
              const recovered2 = await recoverAddress({ hash: hashed, signature: normalized as `0x${string}` });
              const recovered2Lower = recovered2?.toLowerCase?.();
              if (recovered2 && recovered2Lower === extractedLower) {
                recovered = recovered2;
              }
            }
          }
        } catch (normErr) {
          // eslint-disable-next-line no-console
          console.warn("siwe/verify: normalization attempt failed", normErr);
        }
      }

      const finalRecoveredLower = recovered?.toLowerCase?.();
      const finalExtractedLower = extractedAddress?.toLowerCase?.();
      if (!recovered || !extractedAddress || finalRecoveredLower !== finalExtractedLower) {
        // eslint-disable-next-line no-console
        console.error("siwe/verify: signature recovery mismatch", { recovered, extractedAddress });

        // If an RPC URL is provided, attempt EIP-1271 (contract wallet) verification using the RPC
        const rpcUrl = process.env.SIWE_RPC_URL || process.env.NEXT_PUBLIC_SIWE_RPC_URL || process.env.WORLD_CHAIN_RPC_URL;
        if (rpcUrl && extractedAddress) {
          try {
            // Define a minimal world chain for the public client
            const worldChain = defineChain({
              id: 480,
              name: "World Chain",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: { default: { http: [rpcUrl] } },
              blockExplorers: { default: { name: "Worldscan", url: "https://worldscan.org" } },
            });

            const publicClient = createPublicClient({ chain: worldChain, transport: http(rpcUrl) });

            // EIP-1271 ABI (isValidSignature(bytes32,bytes) => bytes4)
            const EIP1271_ABI = [
              {
                inputs: [
                  { internalType: "bytes32", name: "_hash", type: "bytes32" },
                  { internalType: "bytes", name: "_signature", type: "bytes" },
                ],
                name: "isValidSignature",
                outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
                stateMutability: "view",
                type: "function",
              },
            ];

            const contract = getContract({ address: extractedAddress as `0x${string}`, abi: EIP1271_ABI, client: publicClient });
            // Call isValidSignature(hash, signature)
            // The hash must be the EIP-191 prefixed hash, which `viem.hashMessage` already produces.
            // We reuse the `hashed` variable calculated earlier for the `recoverAddress` attempt.
            // eslint-disable-next-line no-console
            console.error("siwe/verify: attempting EIP-1271 verification via RPC", { rpcUrl, address: extractedAddress });
            const res = await contract.read.isValidSignature([hashed, sigHex as `0x${string}`]);
            // EIP-1271 magic value
            const EIP1271_MAGIC = "0x1626ba7e";
            if (res === EIP1271_MAGIC) {
              // Verified via contract wallet
              const resp = NextResponse.json({ success: true, address: extractedAddress });
              resp.cookies.set("siwe_nonce", "", { maxAge: 0, path: "/" });
              resp.cookies.set("siwe_session", extractedAddress, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 });
              return resp;
            }
          } catch (rpcErr) {
            // eslint-disable-next-line no-console
            console.warn("siwe/verify: EIP-1271 RPC verification attempt failed", rpcErr);
          }
        }

        return NextResponse.json({ success: false, error: "Signature verification failed" }, { status: 401 });
      }

      // Verified: clear nonce cookie and set a short-lived httpOnly session cookie
      const res = NextResponse.json({ success: true, address: extractedAddress });
      // Clear nonce cookie
      res.cookies.set("siwe_nonce", "", { maxAge: 0, path: "/" });
      // Set a simple httpOnly session cookie for the authenticated address (adjust to your session strategy)
      res.cookies.set("siwe_session", extractedAddress, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 });
      return res;
    } catch (err) {
      // signature verification error
      // eslint-disable-next-line no-console
  console.error("siwe/verify: error during signature verification", { err, bodyKeys: Object.keys(body || {}), cookieHeader: req.headers.get("cookie") });
      return NextResponse.json({ success: false, error: "Signature verification error" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
