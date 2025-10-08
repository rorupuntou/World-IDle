import { NextApiRequest, NextApiResponse } from 'next';

// A simple in-memory store for transaction IDs to prevent reuse.
// In a production environment, you would use a database for this.
const processedTxIds = new Set<string>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { txId, rewardAmount } = req.body as { txId: string; rewardAmount: number };

    if (!txId || rewardAmount == null) {
      return res.status(400).json({ success: false, error: 'Missing transaction ID or reward amount.' });
    }

    // Idempotency check: Ensure the transaction ID has not been processed before.
    if (processedTxIds.has(txId)) {
      return res.status(409).json({ success: false, error: 'Transaction already processed.' });
    }

    // For the purpose of this example, we are not verifying the transaction on-chain.
    // In a real-world scenario, you would use a library like Ethers.js or Viem
    // to fetch the transaction details from the blockchain and verify:
    // 1. The `to` address is your recipient address.
    // 2. The `value` or `token_amount` matches the expected price.
    // 3. The transaction is confirmed (has been included in a block).
    
    // Simulate verification
    console.log(`Verifying transaction ${txId} for a reward of ${rewardAmount}`);
    
    // Add the transaction ID to our store to prevent replay attacks.
    processedTxIds.add(txId);

    // If verification is successful, return success.
    res.status(200).json({ success: true, rewardAmount });

  } catch (error) {
    console.error('Time warp payment confirmation failed:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
