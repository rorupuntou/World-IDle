import { IDKitWidget, ISuccessResult } from '@worldcoin/idkit';
import { GameState, StatsState, Autoclicker, Upgrade, Achievement } from './types';

// Define a type for the data structure we expect from the backend
export type LoadedGameData = {
  gameState: GameState;
  stats: StatsState;
  autoclickers: Autoclicker[];
  upgrades: Upgrade[];
  achievements: Achievement[];
  nullifier_hash: string;
}

interface WorldIDAuthProps {
  onSuccessfulVerify: (data: LoadedGameData, proof: ISuccessResult) => void;
}

export const WorldIDAuth = ({ onSuccessfulVerify }: WorldIDAuthProps) => {

  const handleProof = async (result: ISuccessResult) => {
    const res = await fetch("/api/world-idle-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ proof: result }),
    });

    if (!res.ok) {
      console.error("Verification failed:", await res.json());
      alert("Verification failed. Please try again.");
      return;
    }

    const data: LoadedGameData = await res.json();
    onSuccessfulVerify(data, result); // <-- Pass both data and proof
  };

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`}
      action={process.env.WLD_ACTION_ID!}
      onSuccess={() => {}} // onSuccess is now handled by handleProof, so we can leave this empty.
      handleVerify={handleProof}
    >
      {({ open }) => 
        <button onClick={open}>Sign in with World ID</button>
      }
    </IDKitWidget>
  );
};
