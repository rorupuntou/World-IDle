
import type { NextApiRequest, NextApiResponse } from 'next';
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js';

// This is a simplified in-memory store for demonstration.
// In a real application, you would use a database.
const paymentReferences = new Set<string>();

// Mock function to verify transaction on-chain
// In a real app, you'd use something like Alchemy or Infura to check the transaction status and details.
async function verifyTransaction(payload: MiniAppPaymentSuccessPayload): Promise<boolean> {
  console.log('Verifying transaction on-chain (mock):', payload.transaction_id);
  // Basic validation for demonstration
  if (payload.transaction_id && payload.reference) {
    // Here you would:
    // 1. Fetch the transaction details using the transaction_id.
    // 2. Verify that the transaction was successful.
    // 3. Verify that the amount, recipient, and token match your expectations.
    // 4. Ensure this transaction_id has not been processed before.
    return true;
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { payload, rewardAmount } = req.body as { payload: MiniAppPaymentSuccessPayload, rewardAmount: number };

    if (!payload || !payload.reference || !rewardAmount) {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    // Idempotency check: Ensure the reference ID hasn't been used.
    // This reference should have been cleared from your DB after the initial `initiate-payment` call was fulfilled.
    // For this demo, we assume it's valid if we haven't seen it in this confirmation step.
    if (paymentReferences.has(payload.reference)) {
      // This might indicate a replay attack or a double-spend attempt.
      // Or it could be a legitimate retry after a network error.
      // Production systems need more robust idempotency handling.
      console.warn(`Reference ID ${payload.reference} has already been processed.`);
      // We can return success if the outcome was the same, to make retries safe.
      return res.status(200).json({ success: true, reward: rewardAmount });
    }

    // On-chain verification
    const isTxValid = await verifyTransaction(payload);

    if (isTxValid) {
      // Add reference to processed set to prevent reuse
      paymentReferences.add(payload.reference);

      // The client calculated the reward, the backend just confirms the payment was valid
      // and returns the same reward amount for the client to apply.
      res.status(200).json({ success: true, reward: rewardAmount });
    } else {
      res.status(400).json({ success: false, error: 'Transaction verification failed' });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
