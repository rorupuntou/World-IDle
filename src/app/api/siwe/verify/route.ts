import { NextRequest, NextResponse } from "next/server";
import { hashMessage, recoverAddress } from "viem";

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
      const recovered = await recoverAddress({ hash: hashed, signature: sigHex as `0x${string}` });
      const recoveredLower = recovered?.toLowerCase?.();
      const extractedLower = extractedAddress?.toLowerCase?.();
      if (!recovered || !extractedAddress || recoveredLower !== extractedLower) {
        // eslint-disable-next-line no-console
        console.error("siwe/verify: signature recovery mismatch", { recovered, extractedAddress });
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
