import { IDKitWidget, ISuccessResult } from '@worldcoin/idkit';
import type { VerifyReply } from '@/app/api/world-idle-auth/route';

interface WorldIDAuthProps {
  onSuccessfulVerify: (data: any, proof: ISuccessResult) => void;
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

    const data: VerifyReply = await res.json();
    onSuccessfulVerify(data, result); // <-- Pass both data and proof
  };

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WLD_APP_ID!}
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
