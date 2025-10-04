import { generateNonce } from 'siwe';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getSession();
  session.nonce = generateNonce();
  await session.save();
  return NextResponse.json({ nonce: session.nonce });
}
