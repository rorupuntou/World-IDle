"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Home,
  Shop as ShopIcon,
  Gift,
  Settings,
  Check,
  Xmark,
  SoundHigh,
  SoundOff,
} from "iconoir-react";
import { MiniKit, Tokens, VerificationLevel } from "@worldcoin/minikit-js";
import { parseUnits } from "viem";

import {
  Autoclicker,
  BuyAmount, FullGameState
} from "./types";
import { newsFeed } from "@/app/data";
import { contractConfig } from "@/app/contracts/config";
import HeaderStats from "./HeaderStats";
import UpgradesSection from "./UpgradesSection";
import AchievementsSection from "./AchievementsSection";
import WIdleSection from "./WIdleSection";
import AutoclickersSection from "./AutoclickersSection";
import ShopSection from "./ShopSection";
import ReferralsSection from "./ReferralsSection";
import OfflineGainsModal from "./OfflineGainsModal";

import { useLanguage } from "@/contexts/LanguageContext";
import ItemDetailsModal from "./ItemDetailsModal";
import LanguageSelector from "./LanguageSelector";
import TelegramButton from "./TelegramButton";
import { useGameSave } from "./useGameSave";

// Import new hooks
import { useAudio } from "@/hooks/useAudio";
import { useNotifications } from "@/hooks/useNotifications";
import { useGameCalculations } from "@/hooks/useGameCalculations";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useFloatingNumbers } from "@/hooks/useFloatingNumbers";
import { useItemDetails } from "@/hooks/useItemDetails";
import { useDevMode } from "@/hooks/useDevMode";
import { useOfflineGains } from "@/hooks/useOfflineGains";

const PRICE_INCREASE_RATE = 1.15;

function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const Toast = ({
  message,
  type,
  onDone,
}: {
  message: string;
  type: "success" | "error";
  onDone: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);
  const isSuccess = type === "success";
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 text-stone-900 font-bold px-4 py-2 rounded-lg shadow-xl z-50 ${
        isSuccess ? "bg-lime-400/70" : "bg-red-500/70"
      }`}
    >
      {isSuccess ? (
        <Check className="w-6 h-6" />
      ) : (
        <Xmark className="w-6 h-6" />
      )}
      <span>{message}</span>
      <button
        onClick={onDone}
        className="p-1 -m-1 hover:bg-black/10 rounded-full"
      >
        <Xmark className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const NewsTicker = () => {
  const { t } = useLanguage();
  const [news, setNews] = useState(() => choose(newsFeed));
  useEffect(() => {
    const newsInterval = setInterval(() => {
      setNews(choose(newsFeed));
    }, 8000);
    return () => clearInterval(newsInterval);
  }, []);
  return (
    <div className="absolute top-0 left-0 right-0 h-8 bg-black/50 flex items-center z-40 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={news}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-sm text-slate-300 px-4 whitespace-nowrap w-full text-center"
          dangerouslySetInnerHTML={{
            __html: t(news).replace(
              /<q>(.*?)<\/q><sig>(.*?)<\/sig>/g,
              '"$1" &ndash; <i>$2</i>'
            ),
          }}
        />
      </AnimatePresence>
    </div>
  );
};

export default function Game() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("main");
  const [isClient, setIsClient] = useState(false);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(
    null
  );
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);
  const [pendingPurchaseTx, setPendingPurchaseTx] = useState<{
    txId: string;
    itemId: number;
  } | null>(null);
  const [pendingTimeWarpTx, setPendingTimeWarpTx] = useState<{
    txId: string;
    reward: number;
    type: "widle" | "wld";
  } | null>(null);
  const [pendingSwapTxId, setPendingSwapTxId] = useState<string | undefined>();
  const [pendingWIdleTxId, setPendingWIdleTxId] = useState<
    string | undefined
  >();
  const [serverState, setServerState] = useState<FullGameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeWarpCooldown, setTimeWarpCooldown] = useState("");
  const [wIdleServerReward, setWIdleServerReward] = useState(0);

  const handleFetchWIdleReward = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(
        `/api/get-widle-reward?walletAddress=${walletAddress}`
      );
      const data = await res.json();
      if (data.success) {
        setWIdleServerReward(data.reward);
      }
    } catch (error) {
      console.error("Failed to fetch wIDle reward:", error);
    }
  }, [walletAddress]);

  useEffect(() => {
    handleFetchWIdleReward();
    const interval = setInterval(handleFetchWIdleReward, 30000);
    return () => clearInterval(interval);
  }, [handleFetchWIdleReward]);

  
  const { isMuted, toggleMute, triggerInteraction } = useAudio(
    "/music/background-music.mp3"
  );
  const { notification, setNotification } = useNotifications();
  const { floatingNumbers, addFloatingNumber } = useFloatingNumbers();
  const { selectedItem, showItemDetails, closeItemDetails } = useItemDetails();
  const { devModeActive, handleDevMode } = useDevMode(setNotification, t);
  const {
    gameState,
    setGameState,
    stats,
    setStats,
    autoclickers,
    setAutoclickers,
    upgrades,
    setUpgrades,
    achievements,
    setAchievements,
    saveGame,
    resetGame,
    setFullState,
    isLoaded,
  } = useGameSave(serverState, walletAddress);
  
  const {
    wIdleBalance,
    tokenDecimalsData,
    isConfirmingPurchase,
    isPurchaseSuccess,
    isConfirmingWIdle,
    isWIdleSuccess,
    isTimeWarpSuccess,
    isSwapSuccess,
    refetchBalances,
  } = useBlockchain(
    walletAddress,
    pendingPurchaseTx,
    pendingWIdleTxId,
    pendingTimeWarpTx,
    pendingSwapTxId
    );
    
    const {
        wIdleBoost,
        totalCPS,
        clickValue,
        autoclickerCPSValues,
        checkRequirements,
        availableUpgradesCount,
        sortedUpgrades,
        timeWarpWIdleCost,
        timeWarpWldCost,
        canClaimWIdle,
    } = useGameCalculations(
        upgrades,
        autoclickers,
        wIdleBalance,
        gameState,
        stats
        );
        
  const { offlineGains, handleClaimOfflineGains: originalHandleClaim } = useOfflineGains(
    isLoaded,
    totalCPS,
    gameState.lastSaved,
    setGameState,
    setStats
  );

  const saveCurrentGame = useCallback(() => {
    if (!walletAddress) return;
    const currentState: FullGameState = { 
        gameState, 
        stats, 
        autoclickers, 
        upgrades, 
        achievements 
    };
    saveGame(currentState);
}, [walletAddress, gameState, stats, autoclickers, upgrades, achievements, saveGame]);

  const handleClaimOfflineGains = useCallback(() => {
      originalHandleClaim();
      saveCurrentGame();
  }, [originalHandleClaim, saveCurrentGame]);

  const formatNumber = useCallback((num: number) => {
    if (num < 1e3)
      return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
    if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
    if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
    return `${(num / 1e12).toFixed(2)}T`;
  }, []);

  const handleVerifyWithMiniKit = async () => {
    if (!walletAddress) return;
    if (!MiniKit.isInstalled()) {
      return setNotification({ message: t("wallet_prompt"), type: "error" });
    }
    try {
      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: "verify-humanity",
        signal: walletAddress,
        verification_level: VerificationLevel.Orb,
      });

      if (finalPayload.status === "error") {
        const errorPayload = finalPayload as {
          message?: string;
          debug_url?: string;
        };
        console.error(
          "DEBUG (MiniKit Error): " + JSON.stringify(errorPayload, null, 2)
        );
        return setNotification({
          message: errorPayload.message || "Verification failed in World App.",
          type: "error",
        });
      }

      const res = await fetch("/api/verify-worldid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: finalPayload,
          signal: walletAddress,
          action: "verify-humanity",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "An unexpected error occurred on the server.";
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson && typeof errorJson.detail === "string") {
            errorMessage = errorJson.detail;
          }
          console.error("Backend verification failed:", errorJson);
        } catch {
          console.error(
            "Backend verification failed with non-JSON response:",
            errorText
          );
        }
        return setNotification({ message: errorMessage, type: "error" });
      }

      const data: {
        success: boolean;
        gameData: FullGameState | null;
        detail?: unknown;
      } = await res.json();

      if (data.success) {
        setStats((prev) => ({ ...prev, isVerified: true }));
        setNotification({ message: "World ID Verified!", type: "success" });
        if (data.gameData) {
          setFullState(data.gameData);
        }
      } else {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : "Verification failed.";
        setNotification({ message, type: "error" });
      }
    } catch (error) {
      console.error(error);
      setNotification({
        message: "An unknown error occurred during verification.",
        type: "error",
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const loadGameFromBackend = useCallback(
    async (address: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/load-game?walletAddress=${address}`);
        if (!res.ok) throw new Error("Failed to load game data from server");
        const data = await res.json();
        if (data.success && data.gameData) {
          setServerState(data.gameData);
          setNotification({ message: t("game_loaded"), type: "success" });
        } else {
          setServerState(null);
          setNotification({ message: t("welcome_back"), type: "success" });
        }
      } catch (error) {
        console.error("Failed to load game:", error);
        setNotification({ message: t("load_error"), type: "error" });
      } finally {
        setIsLoading(false);
      }
    },
    [t, setNotification]
  );

  useEffect(() => {
    const handleWIdleClaim = async () => {
      if (!walletAddress) return;
      try {
        const res = await fetch("/api/claim-widle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to claim wIDle from server.");
        }
        setNotification({ message: t("widle_claim_success"), type: "success" });
        setFullState(data.gameData);
        refetchBalances();
      } catch (error) {
        console.error("wIDle claim failed:", error);
        setNotification({
          message: error instanceof Error ? error.message : String(error),
          type: "error",
        });
      } finally {
        setPendingWIdleTxId(undefined);
      }
    };
    if (isWIdleSuccess) {
      handleWIdleClaim();
    }
  }, [
    isWIdleSuccess,
    walletAddress,
    refetchBalances,
    t,
    setFullState,
    setNotification,
  ]);

  useEffect(() => {
    if (isTimeWarpSuccess && pendingTimeWarpTx) {
      setNotification({ message: t("time_warp_success"), type: "success" });
      if (pendingTimeWarpTx.type === "widle") {
        setGameState((prev) => ({
          ...prev,
          tokens: prev.tokens + pendingTimeWarpTx.reward,
          lastWIdleTimeWarp: Date.now(),
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          tokens: prev.tokens + pendingTimeWarpTx.reward,
        }));
      }
      setStats((prev) => ({
        ...prev,
        totalTokensEarned: prev.totalTokensEarned + pendingTimeWarpTx.reward,
      }));
      refetchBalances();
      setPendingTimeWarpTx(null);
      saveCurrentGame();
    }
  }, [
    isTimeWarpSuccess,
    pendingTimeWarpTx,
    refetchBalances,
    t,
    setGameState,
    setStats,
    setNotification,
    saveCurrentGame
  ]);

  useEffect(() => {
    if (isSwapSuccess) {
      setNotification({ message: t("swap_success"), type: "success" });
      refetchBalances();
      setPendingSwapTxId(undefined);
    }
  }, [isSwapSuccess, refetchBalances, t, setNotification]);

  useEffect(() => {
    const updateCooldown = () => {
      if (gameState.lastWIdleTimeWarp) {
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const timePassed = Date.now() - gameState.lastWIdleTimeWarp;
        const timeLeft = twentyFourHours - timePassed;
        if (timeLeft > 0) {
          const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
          const seconds = Math.floor((timeLeft / 1000) % 60);
          setTimeWarpCooldown(
            `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          );
        } else {
          setTimeWarpCooldown("");
          setGameState((prev) => ({
            ...prev,
            lastWIdleTimeWarp: undefined,
          }));
        }
      }
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [gameState.lastWIdleTimeWarp, setGameState]);

  // Capture referral code from URL on initial load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const referralCode = searchParams.get("code");
    if (referralCode) {
      localStorage.setItem("pending_referral_code", referralCode);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Process referral code once wallet is connected
  useEffect(() => {
    const processReferral = async () => {
      const referralCode = localStorage.getItem("pending_referral_code");
      if (!walletAddress || !referralCode) return;

      if (referralCode === walletAddress) {
        localStorage.removeItem("pending_referral_code");
        return; // Don't process self-referral
      }

      try {
        const response = await fetch("/api/process-referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referrerCode: referralCode,
            newUserId: walletAddress,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // If the referral has already been processed, remove the code from local storage
          if (data.error && data.error.includes("already been processed")) {
            localStorage.removeItem("pending_referral_code");
          }
          throw new Error(data.error || "Failed to process referral");
        }

        if (data.success) {
          setNotification({
            message: t("referral_success"),
            type: "success",
          });
          localStorage.removeItem("pending_referral_code");
          // Reload game data to reflect the referral bonus
          await loadGameFromBackend(walletAddress);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Don't bother user with errors about already processed or self-referrals
        if (
          message &&
          !message.includes("already been processed") &&
          !message.includes("cannot be the same")
        ) {
          console.error("Error processing referral:", error);
          setNotification({
            message: message || t("referral_error"),
            type: "error",
          });
        }
      }
    };

    processReferral();
  }, [walletAddress, loadGameFromBackend, setNotification, t]);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      const tokensToAdd = totalCPS / 10;
      setGameState((prev) => ({ ...prev, tokens: prev.tokens + tokensToAdd }));
      setStats((prev) => ({
        ...prev,
        totalTokensEarned: prev.totalTokensEarned + tokensToAdd,
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [totalCPS, isLoaded, setGameState, setStats]);

  

  useEffect(() => {
    if (!isLoaded) return;
    const unlockedAchievements = new Set(
      achievements.filter((a) => a.unlocked).map((a) => a.id)
    );
    const newAchievements = achievements.filter(
      (ach) => !ach.unlocked && checkRequirements(ach.req)
    );
    if (newAchievements.length > 0) {
      newAchievements.forEach((ach) => {
        setNotification({
          message: t("achievement_unlocked", { name: t(ach.name) }),
          type: "success",
        });
        unlockedAchievements.add(ach.id);
      });
      setAchievements((prev) =>
        prev.map((ach) =>
          unlockedAchievements.has(ach.id) ? { ...ach, unlocked: true } : ach
        )
      );
    }
  }, [
    stats,
    achievements,
    checkRequirements,
    t,
    isLoaded,
    setAchievements,
    setNotification,
  ]);

  const handleConnect = useCallback(async () => {
    triggerInteraction();
    if (!MiniKit.isInstalled()) {
      return setNotification({ message: t("wallet_prompt"), type: "error" });
    }
    try {
      const result = await MiniKit.commandsAsync.walletAuth({
        nonce: String(Math.random()),
      });
      if (result.finalPayload.status === "error") {
        throw new Error(t("auth_failed"));
      }
      const address = result.finalPayload.message.match(
        /0x[a-fA-F0-9]{40}/
      )?.[0] as `0x${string}` | undefined;
      if (address) {
        setWalletAddress(address);
        loadGameFromBackend(address);
      } else {
        throw new Error(t("no_address"));
      }
    } catch (error) {
      console.error("Error al conectar la billetera:", error);
      setNotification({
        message: t("connect_error", {
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        type: "error",
      });
    }
  }, [loadGameFromBackend, t, triggerInteraction, setNotification]);

  const onBoostPurchased = useCallback(
    (boostToAdd: number) => {
      setGameState((prev) => ({
        ...prev,
        permanentBoostBonus: (prev.permanentBoostBonus || 0) + boostToAdd,
      }));
      saveCurrentGame();
    },
    [setGameState, saveCurrentGame]
  );

  const handleTimeWarpPurchase = useCallback(
    async (type: "widle" | "wld") => {
      const reward = totalCPS * 86400;
      if (type === "widle") {
        if (gameState.lastWIdleTimeWarp) {
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (Date.now() - gameState.lastWIdleTimeWarp < twentyFourHours) {
            return setNotification({
              message: t("time_warp_cooldown"),
              type: "error",
            });
          }
        }
        if (wIdleBalance < timeWarpWIdleCost) {
          return setNotification({
            message: t("not_enough_widle_tokens"),
            type: "error",
          });
        }
        try {
          const decimals =
            typeof tokenDecimalsData === "number" ? tokenDecimalsData : 18;
          const amountToBurnInWei = parseUnits(
            timeWarpWIdleCost.toString(),
            decimals
          );

          const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
            transaction: [
              {
                address: contractConfig.wIdleTokenAddress,
                abi: contractConfig.wIdleTokenAbi,
                functionName: "transfer",
                args: [
                  "0x000000000000000000000000000000000000dEaD",
                  amountToBurnInWei.toString(),
                ],
                value: "0x0",
              },
            ],
          });

          if (finalPayload.status === "error") {
            throw new Error(
              (finalPayload as { message?: string }).message ||
                "Error sending transaction"
            );
          }

          if (finalPayload.transaction_id) {
            setPendingTimeWarpTx({
              txId: finalPayload.transaction_id,
              reward,
              type: "widle",
            });
            setNotification({ message: t("transaction_sent"), type: "success" });
          } else {
            throw new Error(t("transaction_error"));
          }
        } catch (error) {
          setNotification({
            message: t("purchase_failed", {
              error: error instanceof Error ? error.message : "Unknown error",
            }),
            type: "error",
          });
        }
      } else if (type === "wld") {
        try {
          const initRes = await fetch("/api/initiate-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress, boostId: "timewarp_24h" }),
          });
          if (!initRes.ok) throw new Error(t("payment_failed_init"));
          const { reference } = await initRes.json();

          const { finalPayload } = await MiniKit.commandsAsync.pay({
            reference,
            to: "0x536bB672A282df8c89DDA57E79423cC505750E52",
            tokens: [
              {
                symbol: Tokens.WLD,
                token_amount: parseUnits(
                  timeWarpWldCost.toString(),
                  18
                ).toString(),
              },
            ],
            description: t("time_warp_purchase_desc"),
          });

          if (
            finalPayload.status === "success" &&
            finalPayload.transaction_id
          ) {
            setNotification({
              message: t("payment_sent_verifying"),
              type: "success",
            });
            const res = await fetch("/api/confirm-timewarp-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                txId: finalPayload.transaction_id,
                rewardAmount: reward,
              }),
            });
            const data = await res.json();
            if (data.success) {
              setGameState((prev) => ({
                ...prev,
                tokens: prev.tokens + data.rewardAmount,
                wldTimeWarpsPurchased: (prev.wldTimeWarpsPurchased || 0) + 1,
              }));
              setStats((prev) => ({
                ...prev,
                totalTokensEarned: prev.totalTokensEarned + data.rewardAmount,
              }));
              setNotification({ message: t("time_warp_success"), type: "success" });
              saveCurrentGame();
            } else {
              throw new Error(data.error || t("confirmation_failed"));
            }
          } else {
            throw new Error(
              (finalPayload as { message?: string }).message ||
                t("payment_cancelled")
            );
          }
        } catch (error) {
          setNotification({
            message: t("purchase_failed", {
              error: error instanceof Error ? error.message : "Unknown error",
            }),
            type: "error",
          });
        }
      }
    },
    [
      totalCPS,
      wIdleBalance,
      tokenDecimalsData,
      t,
      walletAddress,
      timeWarpWIdleCost,
      timeWarpWldCost,
      gameState.lastWIdleTimeWarp,
      setGameState,
      setStats,
      setNotification,
      setPendingTimeWarpTx,
      saveCurrentGame,
    ]
  );

  const handleManualClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerInteraction();
      const value = clickValue;
      addFloatingNumber(`+${formatNumber(value)}`, e.clientX, e.clientY);
      setGameState((prev) => ({ ...prev, tokens: prev.tokens + value }));
      setStats((prev) => {
        const newTotalClicks = prev.totalClicks + 1;
        if (newTotalClicks % 100 === 0) {
          saveCurrentGame();
        }
        return {
          ...prev,
          totalTokensEarned: prev.totalTokensEarned + value,
          totalClicks: newTotalClicks,
        };
      });
    },
    [
      clickValue,
      formatNumber,
      triggerInteraction,
      setGameState,
      setStats,
      addFloatingNumber,
      saveCurrentGame,
    ]
  );

  const calculateBulkCost = useCallback(
    (item: Autoclicker, amount: BuyAmount) => {
      let totalCost = 0;
      for (let i = 0; i < amount; i++) {
        totalCost +=
          item.cost * Math.pow(PRICE_INCREASE_RATE, item.purchased + i);
      }
      return totalCost;
    },
    []
  );

  const calculateWIdleBulkCost = useCallback(
    (item: Autoclicker, amount: BuyAmount) => {
      if (!item.prestigeCost) return 0;
      let totalCost = 0;
      for (let i = 0; i < amount; i++) {
        const costForItem = Math.ceil(
          item.prestigeCost * Math.pow(PRICE_INCREASE_RATE, item.purchased + i)
        );
        totalCost += costForItem;
      }
      return totalCost;
    },
    []
  );

  const purchaseAutoclickerWithTokens = useCallback(
    (id: number) => {
      const autoclicker = autoclickers.find((a) => a.id === id);
      if (!autoclicker) return;
      const cost = calculateBulkCost(autoclicker, buyAmount);
      if (gameState.tokens >= cost) {
        setGameState((prev) => ({ ...prev, tokens: prev.tokens - cost }));
        setAutoclickers((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, purchased: a.purchased + buyAmount } : a
          )
        );
      }
    },
    [
      autoclickers,
      gameState.tokens,
      calculateBulkCost,
      buyAmount,
      setGameState,
      setAutoclickers,
    ]
  );

  useEffect(() => {
    if (isPurchaseSuccess && pendingPurchaseTx) {
      const item = autoclickers.find((a) => a.id === pendingPurchaseTx.itemId);
      if (item) {
        setNotification({
          message: t("purchase_success", { name: t(item.name) }),
          type: "success",
        });
        purchaseAutoclickerWithTokens(pendingPurchaseTx.itemId);
        refetchBalances();
        saveCurrentGame();
      }
      setPendingPurchaseTx(null);
    }
  }, [
    isPurchaseSuccess,
    pendingPurchaseTx,
    autoclickers,
    purchaseAutoclickerWithTokens,
    refetchBalances,
    t,
    saveCurrentGame,
    setNotification,
  ]);

  const handleWIdlePurchase = useCallback(
    async (item: Autoclicker, totalWIdleCost: number) => {
      if (!totalWIdleCost) return;
      try {
        const decimals =
          typeof tokenDecimalsData === "number" ? tokenDecimalsData : 18;
        const amountToBurnInWei =
          BigInt(totalWIdleCost) * BigInt(10 ** decimals);
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address: contractConfig.wIdleTokenAddress,
              abi: contractConfig.wIdleTokenAbi,
              functionName: "transfer",
              args: [
                "0x000000000000000000000000000000000000dEaD",
                amountToBurnInWei.toString(),
              ],
              value: "0x0",
            },
          ],
        });

        if (finalPayload.status === "error") {
          const errorPayload = finalPayload as {
            message?: string;
            debug_url?: string;
          };
          console.error("DEBUG: " + JSON.stringify(errorPayload, null, 2));
          throw new Error(
            errorPayload.message || "Error sending transaction with MiniKit."
          );
        }

        if (finalPayload.transaction_id) {
          setPendingPurchaseTx({
            txId: finalPayload.transaction_id,
            itemId: item.id,
          });
          setNotification({ message: t("transaction_sent"), type: "success" });
        } else {
          throw new Error(t("transaction_error"));
        }
      } catch (error) {
        setNotification({
          message: error instanceof Error ? error.message : String(error),
          type: "error",
        });
      }
    },
    [t, tokenDecimalsData, setNotification, setPendingPurchaseTx]
  );

  const purchaseAutoclicker = useCallback(
    (id: number) => {
      const autoclicker = autoclickers.find((a) => a.id === id);
      if (!autoclicker) return;
      const tokenCost = calculateBulkCost(autoclicker, buyAmount);
      if (gameState.tokens < tokenCost) return;
      if (autoclicker.prestigeCost && autoclicker.prestigeCost > 0) {
        const wIdleCost = calculateWIdleBulkCost(autoclicker, buyAmount);
        if (wIdleBalance >= wIdleCost) {
          handleWIdlePurchase(autoclicker, wIdleCost);
        } else {
          setNotification({
            message: t("not_enough_widle_tokens"),
            type: "error",
          });
        }
      } else {
        purchaseAutoclickerWithTokens(id);
      }
    },
    [
      autoclickers,
      gameState.tokens,
      calculateBulkCost,
      buyAmount,
      wIdleBalance,
      handleWIdlePurchase,
      purchaseAutoclickerWithTokens,
      t,
      calculateWIdleBulkCost,
      setNotification,
    ]
  );

  const purchaseUpgrade = useCallback(
    (id: number) => {
      const upgrade = upgrades.find((u) => u.id === id);
      if (!upgrade || upgrade.purchased || !checkRequirements(upgrade.req))
        return;
      if (gameState.tokens >= upgrade.cost) {
        setGameState((prev) => ({
          ...prev,
          tokens: prev.tokens - upgrade.cost,
        }));
        setUpgrades((prev) =>
          prev.map((u) => (u.id === id ? { ...u, purchased: true } : u))
        );
        saveCurrentGame();
      }
    },
    [
      upgrades,
      gameState.tokens,
      checkRequirements,
      saveCurrentGame,
      setGameState,
      setUpgrades,
    ]
  );

  const purchaseAllAffordableUpgrades = useCallback(() => {
    const affordableUpgrades = upgrades
      .filter((upg) => !upg.purchased && checkRequirements(upg.req))
      .sort((a, b) => a.cost - b.cost);
    let currentTokens = gameState.tokens;
    let totalCost = 0;
    const upgradesToPurchase = new Set<number>();
    for (const upg of affordableUpgrades) {
      if (currentTokens >= upg.cost) {
        currentTokens -= upg.cost;
        totalCost += upg.cost;
        upgradesToPurchase.add(upg.id);
      } else {
        break;
      }
    }
    if (upgradesToPurchase.size > 0) {
      setGameState((prev) => ({ ...prev, tokens: prev.tokens - totalCost }));
      setUpgrades((prev) =>
        prev.map((upg) =>
          upgradesToPurchase.has(upg.id) ? { ...upg, purchased: true } : upg
        )
      );
      setNotification({
        message: t("bulk_purchase_success", {
          count: upgradesToPurchase.size,
        }),
        type: "success",
      });
      saveCurrentGame();
    }
  }, [
    upgrades,
    gameState.tokens,
    checkRequirements,
    t,
    saveCurrentGame,
    setGameState,
    setUpgrades,
    setNotification,
  ]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {t("loading")}
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
        <LanguageSelector />
        <h1 className="text-4xl font-bold mb-4">{t("welcome_message")}</h1>
        <p className="mb-8 text-slate-400">{t("connect_wallet_prompt")}</p>
        <button
          onClick={handleConnect}
          className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg mb-4"
        >
          {t("connect_wallet")}
        </button>
      </div>
    );
  }

  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {t("loading")}
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-2 left-2 z-50 flex items-center gap-2">
        <LanguageSelector />
        <button
          onClick={toggleMute}
          className="p-2 bg-slate-800/50 rounded-full text-white hover:bg-slate-700/70 transition-colors"
        >
          {isMuted ? <SoundOff /> : <SoundHigh />}
        </button>
      </div>
      <TelegramButton />
      <NewsTicker />
      <AnimatePresence>
        {offlineGains > 0 && (
          <OfflineGainsModal
            amount={offlineGains}
            onConfirm={handleClaimOfflineGains}
            formatNumber={formatNumber}
          />
        )}
        {floatingNumbers.map((num) => (
          <motion.div
            key={num.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -100, scale: 1.5 }}
            transition={{ duration: 2 }}
            className="pointer-events-none absolute font-bold text-lime-300 text-2xl"
            style={{ left: num.x, top: num.y, zIndex: 9999 }}
            aria-hidden="true"
          >
            {num.value}
          </motion.div>
        ))}
        {notification && (
          <Toast
            message={notification.message}
            type={notification.type}
            onDone={() => setNotification(null)}
          />
        )}
        {selectedItem && (
          <ItemDetailsModal
            item={selectedItem}
            autoclickers={autoclickers}
            onClose={closeItemDetails}
            isPurchasable={
              selectedItem.itemType === "upgrade" &&
              checkRequirements(selectedItem.req) &&
              selectedItem.cost !== undefined &&
              gameState.tokens >= selectedItem.cost
            }
            onPurchase={(id) => {
              if (selectedItem.itemType === "upgrade") {
                purchaseUpgrade(id);
                closeItemDetails();
              }
            }}
          />
        )}
      </AnimatePresence>
      <div className="w-full max-w-md mx-auto p-6 pt-12 flex flex-col gap-8 pb-28">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-slate-200 to-slate-400 text-transparent bg-clip-text">
            {t("app_title")}
          </h1>
        </div>
        <HeaderStats
          tokens={gameState.tokens}
          tokensPerSecond={totalCPS}
          humanityGems={gameState.humanityGems}
          totalClicks={stats.totalClicks}
          permanentBoostBonus={gameState.permanentBoostBonus || 0}
          permanent_referral_boost={gameState.permanent_referral_boost || 0}
        />

        <div className="flex flex-col gap-6">
          {activeTab === "main" && (
            <div className="flex flex-col gap-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleManualClick}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-6 rounded-xl text-2xl shadow-lg shadow-cyan-500/30 border border-cyan-400 transition-colors"
              >
                {t("click")} (+{formatNumber(clickValue)})
              </motion.button>
              <AutoclickersSection
                autoclickers={autoclickers}
                buyAmount={buyAmount}
                setBuyAmount={setBuyAmount}
                gameState={gameState}
                checkRequirements={checkRequirements}
                showRequirements={showItemDetails}
                calculateBulkCost={calculateBulkCost}
                calculateWIdleBulkCost={calculateWIdleBulkCost}
                purchaseAutoclicker={purchaseAutoclicker}
                formatNumber={formatNumber}
                autoclickerCPSValues={autoclickerCPSValues}
                devModeActive={devModeActive}
                isConfirmingPurchase={isConfirmingPurchase}
                pendingPurchaseTx={pendingPurchaseTx}
                wIdleBalance={wIdleBalance}
              />
              <WIdleSection
                wIdleBoost={wIdleBoost}
                wIdleBalance={wIdleBalance}
                isLoading={isLoading || isConfirmingWIdle}
                setIsLoading={setIsLoading}
                walletAddress={walletAddress}
                setPendingWIdleTxId={setPendingWIdleTxId}
                resetGame={resetGame}
                wIdleReward={wIdleServerReward}
                canClaimWIdle={canClaimWIdle}
                handleFetchWIdleReward={handleFetchWIdleReward}
              />
              {!stats.isVerified && (
                <div className="mt-4">
                  <button
                    onClick={handleVerifyWithMiniKit}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
                  >
                    Verify with World ID
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === "upgrades" && (
            <UpgradesSection
              upgrades={sortedUpgrades}
              autoclickers={autoclickers}
              gameState={gameState}
              stats={stats}
              checkRequirements={checkRequirements}
              purchaseUpgrade={purchaseUpgrade}
              purchaseAllAffordableUpgrades={purchaseAllAffordableUpgrades}
              formatNumber={formatNumber}
            />
          )}
          {activeTab === "shop" && (
            <div className="flex flex-col gap-6">
              <ShopSection
                walletAddress={walletAddress}
                onBoostPurchased={onBoostPurchased}
                setNotification={setNotification}
                totalCPS={totalCPS}
                wIdleBalance={wIdleBalance}
                handleTimeWarpPurchase={handleTimeWarpPurchase}
                formatNumber={formatNumber}
                timeWarpWIdleCost={timeWarpWIdleCost}
                timeWarpWldCost={timeWarpWldCost}
                timeWarpCooldown={timeWarpCooldown}
              />
              <AchievementsSection
                achievements={achievements}
                showRequirements={showItemDetails}
              />
            </div>
          )}
          {activeTab === "referrals" && (
            <ReferralsSection
              walletAddress={walletAddress}
              gameState={gameState}
            />
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-lg border-t border-slate-700 flex justify-between items-center px-8 pb-safe-bottom">
          <button
            onClick={() => setActiveTab("upgrades")}
            className={`relative flex flex-col items-center gap-1 ${activeTab === "upgrades" ? "text-cyan-400" : "text-slate-400"} transition-colors`}
          >
            <Rocket className="w-7 h-7" />
            <span className="text-xs font-medium">{t("upgrades_tab")}</span>
            {availableUpgradesCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {availableUpgradesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("main")}
            className={`flex flex-col items-center gap-1 ${activeTab === "main" ? "text-cyan-400" : "text-slate-400"} transition-colors`}
          >
            <Home className="w-7 h-7" />
            <span className="text-xs font-medium">{t("main_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex flex-col items-center gap-1 ${activeTab === "referrals" ? "text-cyan-400" : "text-slate-400"} transition-colors`}
          >
            <Gift className="w-7 h-7" />
            <span className="text-xs font-medium">{t("referrals_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex flex-col items-center gap-1 ${activeTab === "shop" ? "text-cyan-400" : "text-slate-400"} transition-colors`}
          >
            <ShopIcon className="w-7 h-7" />
            <span className="text-xs font-medium">{t("shop_tab")}</span>
          </button>
        </div>
      </div>
      <button
        onClick={handleDevMode}
        className="fixed bottom-2 right-2 p-2 text-transparent hover:text-yellow-400"
      >
        <Settings className="w-5 h-5" />
      </button>
    </>
  );
}