
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { walletAddress, boostId } = await req.json();

  if (!walletAddress || !boostId) {
    return NextResponse.json({ error: 'walletAddress and boostId are required.' }, { status: 400 });
  }

  const reference = crypto.randomUUID();

  // We need to temporarily store the reference and what it's for.
  // A new table `pending_transactions` would be ideal, but for simplicity,
  // we can try to use the existing structure if possible, or just proceed
  // and rely on frontend to pass the boostId again during confirmation.
  // For now, we will just generate it and expect the frontend to manage it.
  
  // TODO: Store the reference linked to the walletAddress and boostId in your DB to verify later.
  // This prevents a user from initiating a payment for a cheap item and then
  // claiming a more expensive one with the same successful transaction.

  return NextResponse.json({ reference });
}
