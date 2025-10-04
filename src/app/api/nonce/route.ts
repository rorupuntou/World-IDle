import { generateNonce } from 'siwe';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getSession();
  const nonce = generateNonce();
  session.nonce = nonce;
  await session.save();

  return NextResponse.json({ nonce });
}
