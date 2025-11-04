import { useState, useEffect } from "react";

export const useDevMode = (initialWalletAddress: `0x${string}` | null) => {
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(
    initialWalletAddress
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !initialWalletAddress) {
      setWalletAddress("0xa5bd869d909f92984475a0c5bf0ecb0be3bb921c");
    } else {
      setWalletAddress(initialWalletAddress);
    }
  }, [initialWalletAddress]);

  return walletAddress;
};
