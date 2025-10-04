import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MiniAppWalletAuthSuccessPayload,
  verifySiweMessage,
} from "@worldcoin/minikit-js";

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
}

export const POST = async (req: NextRequest) => {
  const { payload } = (await req.json()) as IRequestPayload;
  const cookieStore = await cookies();
  const nonce = cookieStore.get("siwe-nonce")?.value;

  if (!nonce) {
    return NextResponse.json(
      { status: "error", isValid: false, message: "Invalid nonce." },
      { status: 400 }
    );
  }

  try {
    // The nonce is passed to the verify function to check against the one in the message
    const validMessage = await verifySiweMessage(payload, nonce);

    const response = NextResponse.json({
      status: "success",
      isValid: validMessage.isValid,
      address: payload.address,
    });

    // Clear the nonce after successful verification by setting an expired cookie
    response.cookies.set("siwe-nonce", "", { maxAge: 0 });

    return response;
  } catch (error: unknown) {
    // Handle errors in validation or processing
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { status: "error", isValid: false, message },
      { status: 500 }
    );
  }
};