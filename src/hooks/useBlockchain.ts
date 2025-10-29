import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { formatUnits, createPublicClient, http, defineChain } from "viem";
import { contractConfig } from "@/app/contracts/config";

const worldChain = defineChain({
  id: contractConfig.worldChainId,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/v2/kodVkLaxHvuF3CErQP3aK"] },
  },
  blockExplorers: {
    default: { name: "Worldscan", url: "https://worldscan.org" },
  },
});

const client = createPublicClient({
  chain: worldChain,
  transport: http(),
});

export const useBlockchain = (
  walletAddress: `0x${string}` | null,
  pendingPurchaseTx: { txId: string; itemId: number } | null,
  pendingWIdleTxId: string | undefined,
  pendingTimeWarpTx: { txId: string; reward: number; type: "widle" | "wld" } | null,
  pendingSwapTxId: string | undefined
) => {
  const [wIdleBalance, setWIdleBalance] = useState(0);

  const { data: wIdleTokenBalanceData, refetch: refetchWIdleBalance } =
    useReadContract({
      address: contractConfig.wIdleTokenAddress,
      abi: contractConfig.wIdleTokenAbi,
      functionName: "balanceOf",
      args: [walletAddress ?? `0x${'0'.repeat(40)}`],
      query: { enabled: !!walletAddress },
    });

  const { data: tokenDecimalsData } = useReadContract({
    address: contractConfig.wIdleTokenAddress, // Changed to wIdle token
    abi: contractConfig.wIdleTokenAbi, // Changed to wIdle token
    functionName: "decimals",
    query: { enabled: !!walletAddress },
  });

  const { isLoading: isConfirmingPurchase, isSuccess: isPurchaseSuccess } =
    useWaitForTransactionReceipt({
      client,
      appConfig: { app_id: 'app_3b83f308b9f7ef9a01e4042f1f48721d' },
      transactionId: pendingPurchaseTx?.txId ?? "",
    });

  const { isLoading: isConfirmingWIdle, isSuccess: isWIdleSuccess } =
    useWaitForTransactionReceipt({
      client,
      appConfig: { app_id: 'app_3b83f308b9f7ef9a01e4042f1f48721d' },
      transactionId: pendingWIdleTxId ?? "",
    });

  const { isSuccess: isTimeWarpSuccess } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: 'app_3b83f308b9f7ef9a01e4042f1f48721d' },
    transactionId: pendingTimeWarpTx?.txId ?? "",
  });

  const { isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: 'app_3b83f308b9f7ef9a01e4042f1f48721d' },
    transactionId: pendingSwapTxId ?? "",
  });

  useEffect(() => {
    const decimals =
      typeof tokenDecimalsData === "number" ? tokenDecimalsData : 18;
    if (typeof wIdleTokenBalanceData === "bigint") {
      const balance = parseFloat(
        formatUnits(wIdleTokenBalanceData, decimals)
      );
      setWIdleBalance(balance);
    }
  }, [wIdleTokenBalanceData, tokenDecimalsData]);

  const refetchBalances = () => {
    refetchWIdleBalance();
  }

  return {
    client,
    wIdleBalance,
    tokenDecimalsData,
    isConfirmingPurchase,
    isPurchaseSuccess,
    isConfirmingWIdle,
    isWIdleSuccess,
    isTimeWarpSuccess,
    isSwapSuccess,
    refetchBalances,
  };
};
