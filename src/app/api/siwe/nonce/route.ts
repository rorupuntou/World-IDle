import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  // Use node's crypto.randomUUID on the server for a secure nonce
  let nonce: string;
  try {
    nonce = randomUUID();
  } catch {
    nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const res = NextResponse.json({ nonce });
  // set httpOnly cookie so the server can later validate it
  res.cookies.set("siwe_nonce", nonce, {
    httpOnly: true,
    path: "/",
    maxAge: 300, // 5 minutes
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
