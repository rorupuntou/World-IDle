import { IDKitWidget, ISuccessResult } from '@worldcoin/idkit';
import { FullGameState } from './types';

// Define the expected shape of the data from the /api/verify-worldid endpoint
interface VerifyResponse {
  success: boolean;
  gameData: FullGameState | null;
}

interface WorldIDAuthProps {
  signal: string; // The user's wallet address
  onSuccessfulVerify: (data: VerifyResponse) => void;
}

export const WorldIDAuth = ({ signal, onSuccessfulVerify }: WorldIDAuthProps) => {

  const handleProof = async (result: ISuccessResult) => {
    const res = await fetch("/api/verify-worldid", { // Use the new endpoint
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Send the proof and the signal (wallet address)
      body: JSON.stringify({ proof: result, signal: signal }), 
    });

    if (!res.ok) {
      console.error("Verification failed:", await res.json());
      alert("Verification failed. Please try again.");
      return;
    }

    const data: VerifyResponse = await res.json();
    onSuccessfulVerify(data); // Pass the backend response to the parent
  };

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`}
      action={process.env.NEXT_PUBLIC_WLD_ACTION_ID!}
      signal={signal} // Pass the user's wallet address as the signal
      onSuccess={() => { /* onSuccess is not needed as handleVerify covers it */ }}
      handleVerify={handleProof}
    >
      {({ open }) => 
        <button 
            onClick={open}
            className="w-full bg-blue-500/80 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
            Verify with World ID
        </button>
      }
    </IDKitWidget>
  );
};