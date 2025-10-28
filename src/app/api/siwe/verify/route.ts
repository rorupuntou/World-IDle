import { NextRequest, NextResponse } from "next/server";
import {
  verifySiweMessage,
  MiniAppWalletAuthSuccessPayload,
} from "@worldcoin/minikit-js";

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
}

export async function POST(req: NextRequest) {
  try {
    // The body will be the payload from the MiniKit, we can extract it directly
    const { payload } = (await req.json()) as IRequestPayload;

    const cookieNonce = req.cookies.get("siwe_nonce")?.value;
    if (!cookieNonce) {
      return NextResponse.json(
        { success: false, error: "Missing nonce cookie" },
        { status: 400 }
      );
    }

    // Verify the SIWE message using the official helper from the MiniKit SDK
    const { isValid, siweMessageData } = await verifySiweMessage(payload, cookieNonce);
    const address = siweMessageData?.address;

    if (!isValid || !address) {
      return NextResponse.json(
        { success: false, error: "Signature verification failed" },
        { status: 401 }
      );
    }

    // If verification is successful, return the address
    const res = NextResponse.json({ success: true, address });

    // Clear the nonce cookie and set a session cookie for the user
    res.cookies.set("siwe_nonce", "", { maxAge: 0, path: "/" });
    res.cookies.set("siwe_session", address, {
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
    });
    return NextResponse.json(
      { success: false, error: "Internal server error", detail: errorMessage },
      { status: 500 }
    );
  }
}
