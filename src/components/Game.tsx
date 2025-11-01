
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Home,
  Shop as ShopIcon,
  Gift,
  Check,
  Xmark,
  SoundHigh,
  SoundOff,
  Flash, TestTube, CheckCircle, XmarkCircle, QuestionMark, MagicWand, Globe, 
  Cpu, Send, Server, Cloud, ArrowRight, Clock, Group, Star, 
  Cube, Database
} from "iconoir-react";
import { Tokens, VerificationLevel } from "@worldcoin/minikit-js";
import safeMiniKit from "@/lib/safeMiniKit";
import { parseUnits } from "viem";
import clsx from "clsx";

import {
  Autoclicker,
  BuyAmount, FullGameState,
  Upgrade, Requirement, Effect, StatsState, Referral
} from "./types";
import { newsFeed } from "@/app/data";
import { contractConfig } from "@/app/contracts/config";
import HeaderStats from "./HeaderStats";
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
import { useGameAutoSave } from "@/hooks/useGameAutoSave";


import { useOfflineGains } from '@/hooks/useOfflineGains';
import useSWR from 'swr';
import SupplyStats from './SupplyStats';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PRICE_INCREASE_RATE = 1.15;

const iconMap: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = {
    CursorArrowRaysIcon: MagicWand,
    CpuChipIcon: Cpu,
    CircleStackIcon: Database,
    PaperAirplaneIcon: Send,
    ServerStackIcon: Server,
    GlobeAltIcon: Globe,
    CloudIcon: Cloud,
    ArrowsRightLeftIcon: ArrowRight,
    ClockIcon: Clock,
    UserGroupIcon: Group,
    SparklesIcon: Star,
    StopCircleIcon: XmarkCircle,
    CubeTransparentIcon: Cube,
};

const tierColorMap: { [key: string]: { border: string, text: string, bg: string, shadow: string } } = {
    common: { border: 'border-slate-700', text: 'text-slate-300', bg: 'bg-slate-900/50', shadow: 'shadow-transparent' },
    rare: { border: 'border-blue-600', text: 'text-blue-300', bg: 'bg-blue-950/50', shadow: 'shadow-blue-500/20' },
    epic: { border: 'border-purple-600', text: 'text-purple-300', bg: 'bg-purple-950/50', shadow: 'shadow-purple-500/25' },
    legendary: { border: 'border-yellow-500', text: 'text-yellow-300', bg: 'bg-yellow-950/50', shadow: 'shadow-yellow-400/30' },
};

const getUpgradeIcon = (upgrade: Upgrade, autoclickers: Autoclicker[]) => {
    if (!upgrade.effect || upgrade.effect.length === 0) return QuestionMark;
    const effect = upgrade.effect[0];
    if (effect.type === 'multiplyClick' || effect.type === 'addClick' || effect.type === 'addCpSToClick') {
        return MagicWand;
    }
    if (effect.type === 'multiplyGlobal') {
        return Globe;
    }
    if (effect.type === 'multiplyAutoclicker' || effect.type === 'addCpSToAutoclickerFromOthers' || effect.type === 'multiplyAutoclickerByOtherCount') {
        const autoclicker = autoclickers.find(a => a.id === effect.targetId);
        if (autoclicker && autoclicker.icon && iconMap[autoclicker.icon]) {
            return iconMap[autoclicker.icon];
        }
    }
    return QuestionMark;
};

function getRequirementText(req: Requirement | undefined, t: (key: string, replacements?: { [key: string]: string | number }) => string, autoclickers: Autoclicker[], formatNumber: (num: number) => string, stats: StatsState): {text: string, met: boolean}[] {
    const texts: {text: string, met: boolean}[] = [];
    if (!req) return texts;

    if (req.totalTokensEarned) {
        const met = stats.totalTokensEarned >= req.totalTokensEarned;
        texts.push({ text: t('item_details.req_total_tokens', { amount: formatNumber(req.totalTokensEarned) }), met });
    }
    if (req.totalClicks) {
        const met = stats.totalClicks >= req.totalClicks;
        texts.push({ text: t('item_details.req_total_clicks', { amount: formatNumber(req.totalClicks) }), met });
    }
    if (req.tps) {
        const met = stats.tokensPerSecond >= req.tps;
        texts.push({ text: t('item_details.req_tps', { amount: formatNumber(req.tps) }), met });
    }
    if (req.autoclickers) {
        const autoclickerReqs = Array.isArray(req.autoclickers) ? req.autoclickers : [req.autoclickers];
        autoclickerReqs.forEach(autoReq => {
            const auto = autoclickers.find(a => a.id === autoReq.id);
            if (auto) {
                const met = auto.purchased >= autoReq.amount;
                texts.push({ text: t('item_details.req_autoclicker_amount', { amount: autoReq.amount, name: t(auto.name) }), met });
            }
        });
    }
    if (req.eachAutoclickerAmount) {
        const met = autoclickers.every(a => a.purchased >= req.eachAutoclickerAmount!);
        texts.push({ text: t('item_details.req_each_autoclicker', { amount: req.eachAutoclickerAmount }), met });
    }
    if (req.verified) {
        const met = stats.isVerified || false; 
        texts.push({ text: t('item_details.req_verified'), met });
    }
    return texts;
};

function getEffectDescription(effects: Effect[], t: (key: string, replacements?: { [key: string]: string | number }) => string, autoclickers: Autoclicker[]): string[] {
    return effects.map(e => {
        switch (e.type) {
            case 'multiplyClick': return t('item_details.eff_multiply_click', { value: e.value });
            case 'addClick': return t('item_details.eff_add_click', { value: e.value });
            case 'multiplyGlobal': return t('item_details.eff_multiply_global', { value: e.value });
            case 'multiplyAutoclicker': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return t('item_details.eff_multiply_autoclicker', { name: auto ? t(auto.name) : `ID ${e.targetId}`, value: e.value });
            }
            case 'addCpSToClick': return t('item_details.eff_add_cps_to_click', { percent: e.percent * 100 });
            case 'addCpSToAutoclickerFromOthers': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return t('item_details.eff_add_cps_from_others', { name: auto ? t(auto.name) : `ID ${e.targetId}` });
            }
            case 'multiplyAutoclickerByOtherCount': {
                const target = autoclickers.find(a => a.id === e.targetId);
                const source = autoclickers.find(a => a.id === e.sourceId);
                return t('item_details.eff_multiply_by_other', { target: target ? t(target.name) : `ID ${e.targetId}`, source: source ? t(source.name) : `ID ${e.sourceId}` });
            }
            case 'addTps': return t('item_details.eff_add_tps', { value: e.value });
            default: return t('item_details.eff_unknown');
        }
    });
}

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
  const { data: supplyInfo, error: supplyError } = useSWR<{
    success: boolean;
    totalSupply: string;
    cap: string;
  }>('/api/supply-info', fetcher, { refreshInterval: 30000 });

  useEffect(() => {
    if (supplyError) {
      console.error("Failed to fetch supply info:", supplyError);
    }
  }, [supplyError]);



  const handleFetchWIdleReward = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/get-widle-reward?walletAddress=${walletAddress}`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data && data.success) {
        const reward = typeof data.reward === 'number' ? data.reward : (typeof data.wIdleReward === 'number' ? data.wIdleReward : 0);
        setWIdleServerReward(reward);
      }
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('get-widle-reward request aborted due to timeout');
      } else {
        console.error("Failed to fetch wIDle reward:", error);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    handleFetchWIdleReward();
    const interval = setInterval(handleFetchWIdleReward, 5000);
    return () => clearInterval(interval);
  }, [handleFetchWIdleReward]);

  
  const { isMuted, toggleMute, triggerInteraction } = useAudio(
    "/music/background-music.mp3"
  );
  const { notification, setNotification } = useNotifications();
  const { floatingNumbers, addFloatingNumber } = useFloatingNumbers();
  const { selectedItem, showItemDetails, closeItemDetails } = useItemDetails();

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
    setFullState,
    isLoaded,
  } = useGameSave(serverState);

  interface RawReferral {
    referee_id: string;
    created_at: string;
  }

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!walletAddress) {
        setIsLoadingReferrals(false);
        return;
      }
      try {
        setIsLoadingReferrals(true);
        const response = await fetch(`/api/get-referrals?walletAddress=${walletAddress}`);
        const data = await response.json();
        if (data.success) {
          const formattedReferrals = data.referrals.map((r: RawReferral, index: number) => ({
            id: index,
            wallet_address: r.referee_id,
            created_at: r.created_at,
          }));
          setReferrals(formattedReferrals);
        } else {
          console.error("Failed to fetch referrals:", data.error);
        }
      } catch (error) {
        console.error("Error fetching referrals:", error);
      } finally {
        setIsLoadingReferrals(false);
      }
    };

    fetchReferrals();
  }, [walletAddress]);

  useEffect(() => {
    const boost = referrals.length * 0.01; // 1% boost per referral
    setGameState(prev => {
      if (prev.permanent_referral_boost === boost) {
        return prev;
      }
      return { ...prev, permanent_referral_boost: boost };
    });
  }, [referrals, setGameState]);

  const getGameState = useCallback((): FullGameState => ({
    gameState,
    stats,
    autoclickers,
    upgrades,
    achievements,
  }), [gameState, stats, autoclickers, upgrades, achievements]);

  const { forceSave } = useGameAutoSave(
    isLoaded,
    walletAddress,
    getGameState,
    saveGame
  );

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



  const updateLastClaimTime = useCallback(async () => {
    if (!walletAddress) return;
    const now = new Date().toISOString();
    setGameState(prev => ({ ...prev, lastWidleClaimAt: now }));
    forceSave();
  }, [walletAddress, setGameState, forceSave]);

  const handleClaimOfflineGains = useCallback(() => {
      originalHandleClaim();
      forceSave();
  }, [originalHandleClaim, forceSave]);

  useEffect(() => {
    // When isVerified becomes true, save the game state to persist it.
    if (stats.isVerified) {
      forceSave();
    }
  }, [stats.isVerified, forceSave]);

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
    if (!safeMiniKit.isAvailable()) {
      return setNotification({ message: t("wallet_prompt"), type: "error" });
    }
    try {
      const verifyResp = await safeMiniKit.safeCall("verify", {
        action: "verify-humanity",
        signal: walletAddress,
        verification_level: VerificationLevel.Orb,
      });

      if (!verifyResp.ok) {
        console.error("MiniKit verify failed:", verifyResp);
        return setNotification({ message: t("verification_failed"), type: "error" });
      }

      const finalPayload = verifyResp.finalPayload;

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
        updateLastClaimTime();
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
    updateLastClaimTime,
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
      forceSave();
    }
  }, [
    isTimeWarpSuccess,
    pendingTimeWarpTx,
    refetchBalances,
    t,
    setGameState,
    setStats,
    setNotification,
    forceSave
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const referralCode = searchParams.get("code");
    if (referralCode) {
      localStorage.setItem("pending_referral_code", referralCode);
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    const processReferral = async () => {
      const referralCode = localStorage.getItem("pending_referral_code");
      if (!walletAddress || !referralCode) return;

      if (referralCode === walletAddress) {
        localStorage.removeItem("pending_referral_code");
        return; 
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
          await loadGameFromBackend(walletAddress);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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
    if (!safeMiniKit.isAvailable()) {
      return setNotification({ message: t("wallet_prompt"), type: "error" });
    }
    try {
      const nonceRes = await fetch("/api/siwe/nonce", { credentials: "same-origin" });
      if (!nonceRes.ok) throw new Error("Failed to get nonce from server");
      const { nonce } = await nonceRes.json();

      const result = await safeMiniKit.safeCall("walletAuth", {
        nonce: String(nonce),
      });
      if (!result.ok || !result.finalPayload) {
        throw new Error(t("auth_failed"));
      }



      const verifyRes = await fetch("/api/siwe/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: result.finalPayload }),
      });

      const verifyText = await verifyRes.text();


      if (!verifyRes.ok) {
        let parsedErr: unknown = undefined;
        try {
          parsedErr = JSON.parse(verifyText);
        } catch {
          parsedErr = verifyText;
        }
        const fallbackAddress = extractAddressFromFinalPayload(result.finalPayload);
        if (fallbackAddress) {
          setNotification({ message: t("connect_fallback_used"), type: "error" });
          setWalletAddress(fallbackAddress as `0x${string}`);
          loadGameFromBackend(fallbackAddress as `0x${string}`);

          return;
        }
        const parsedObj = typeof parsedErr === "object" && parsedErr !== null ? (parsedErr as Record<string, unknown>) : undefined;
        throw new Error(
          (typeof parsedErr === "string" ? parsedErr : (parsedObj?.error as string) || (parsedObj?.detail as string)) || t("auth_failed")
        );
      }

      const verifyJson = JSON.parse(verifyText);
      if (verifyJson.success && verifyJson.address) {
        const address = verifyJson.address as `0x${string}`;
        setWalletAddress(address);
        loadGameFromBackend(address);
      } else {
        const fallbackAddress = extractAddressFromFinalPayload(result.finalPayload);
        if (fallbackAddress) {
          setNotification({ message: t("connect_fallback_used"), type: "error" });
          setWalletAddress(fallbackAddress as `0x${string}`);
          loadGameFromBackend(fallbackAddress as `0x${string}`);

          return;
        }
        throw new Error(verifyJson.error || t("auth_failed"));
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

  function extractAddressFromFinalPayload(payload: unknown): string | undefined {
    try {
      const p = (payload ?? null) as Record<string, unknown> | null;
      if (!p) return undefined;

      if (typeof p["address"] === "string") {
        const v = p["address"] as string;
        if (/0x[a-fA-F0-9]{40}/.test(v)) return v;
      }
      if (typeof p["wallet"] === "string") {
        const v = p["wallet"] as string;
        if (/0x[a-fA-F0-9]{40}/.test(v)) return v;
      }
      if (typeof p["account"] === "string") {
        const v = p["account"] as string;
        if (/0x[a-fA-F0-9]{40}/.test(v)) return v;
      }

      const user = p["user"] as Record<string, unknown> | undefined;
      if (user) {
        if (typeof user["address"] === "string") {
          const v = user["address"] as string;
          if (/0x[a-fA-F0-9]{40}/.test(v)) return v;
        }
        if (typeof user["wallet"] === "string") {
          const v = user["wallet"] as string;
          if (/0x[a-fA-F0-9]{40}/.test(v)) return v;
        }
      }

      const message = (typeof p["message"] === "string" && (p["message"] as string)) ||
        (typeof p["siweMessage"] === "string" && (p["siweMessage"] as string)) ||
        (typeof p["signedMessage"] === "string" && (p["signedMessage"] as string));
      if (typeof message === "string") {
        const m = message.match(/0x[a-fA-F0-9]{40}/);
        if (m) return m[0];
      }

      const s = JSON.stringify(p);
      const m = s.match(/0x[a-fA-F0-9]{40}/);
      if (m) return m[0];
    } catch {
      // ignore
    }
    return undefined;
  }

  const onBoostPurchased = useCallback(
    (boostToAdd: number) => {
      setGameState((prev) => ({
        ...prev,
        permanentBoostBonus: (prev.permanentBoostBonus || 0) + boostToAdd,
      }));
      forceSave();
    },
    [setGameState, forceSave]
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

          const sendResp = await safeMiniKit.safeCall("sendTransaction", {
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
          if (!sendResp.ok || !sendResp.finalPayload) {
            throw new Error("Error sending transaction: no response from MiniKit");
          }

          const finalPayload = sendResp.finalPayload as { status?: string; message?: string; transaction_id?: string };

          if (finalPayload.status === "error") {
            throw new Error(finalPayload.message || "Error sending transaction");
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

          const payResp = await safeMiniKit.safeCall("pay", {
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
          if (!payResp.ok || !payResp.finalPayload) {
            throw new Error(t("payment_cancelled"));
          }

          const finalPayload = payResp.finalPayload as { status?: string; transaction_id?: string; message?: string };

          if (finalPayload.status === "success" && finalPayload.transaction_id) {
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
              forceSave();
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
      forceSave,
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
        forceSave();
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
    forceSave,
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
        const sendResp = await safeMiniKit.safeCall("sendTransaction", {
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
        if (!sendResp.ok || !sendResp.finalPayload) {
          throw new Error("Error sending transaction: no response from MiniKit");
        }

        const finalPayload = sendResp.finalPayload as { status?: string; message?: string; debug_url?: string; transaction_id?: string };

        if (finalPayload.status === "error") {

          throw new Error(finalPayload.message || "Error sending transaction with MiniKit.");
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
        forceSave();
      }
    },
    [
      upgrades,
      gameState.tokens,
      checkRequirements,
      forceSave,
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
      forceSave();
    }
  }, [
    upgrades,
    gameState.tokens,
    checkRequirements,
    t,
    forceSave,
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
        <div className="flex items-center justify-between mb-4">
          <LanguageSelector />

        </div>
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

        {supplyInfo && supplyInfo.success && (
          <div className="my-4">
            <SupplyStats
              totalSupply={supplyInfo.totalSupply}
              cap={supplyInfo.cap}
            />
          </div>
        )}

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
                wIdleReward={wIdleServerReward}
                handleFetchWIdleReward={handleFetchWIdleReward}
                lastWidleClaimAt={gameState.lastWidleClaimAt}
                onClaimSuccess={updateLastClaimTime}
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
          {activeTab === "upgrades" && (() => {
            const availableUpgrades = sortedUpgrades.filter(upg => !upg.purchased && checkRequirements(upg.req) && gameState.tokens >= upg.cost);
            return (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-xl font-semibold flex items-center gap-2"><Flash className="w-6 h-6 text-cyan-400"/>{t('upgrades')}</h3>
                    <button 
                        onClick={purchaseAllAffordableUpgrades}
                        disabled={availableUpgrades.length === 0}
                        className="bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {t('buy_all_affordable')} ({availableUpgrades.length})
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                {sortedUpgrades.map((upg) => {
                  if (upg.purchased) return null;

                  const requirementsMet = checkRequirements(upg.req);
                  const isAffordable = gameState.tokens >= upg.cost && gameState.humanityGems >= (upg.humanityGemsCost || 0);
                  const isPurchasable = requirementsMet && isAffordable;
                  const IconComponent = getUpgradeIcon(upg, autoclickers);
                  const tierClasses = upg.tier ? tierColorMap[upg.tier] : tierColorMap.common;
                  const translatedName = upg.dynamicName ? t(upg.dynamicName.key, upg.dynamicName.replacements) : t(upg.name);
                  const translatedDesc = t(upg.desc);
                  const requirementTexts = getRequirementText(upg.req, t, autoclickers, formatNumber, stats);
                  const effectTexts = getEffectDescription(upg.effect, t, autoclickers);

                  return (
                    <motion.div 
                      key={upg.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className={clsx(
                        'w-full flex flex-col gap-3 p-3 rounded-xl border transition-all duration-300',
                        tierClasses.border,
                        tierClasses.bg,
                        {
                          'opacity-50 grayscale': !requirementsMet,
                          'opacity-75': requirementsMet && !isAffordable,
                          'opacity-100': isPurchasable,
                          [tierClasses.shadow]: isPurchasable,
                          'shadow-lg': isPurchasable,
                        }
                      )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={clsx(
                                'flex-shrink-0 p-2 mt-1 rounded-full bg-black/30',
                                isPurchasable ? tierClasses.text : 'text-slate-600'
                            )}>
                                <IconComponent className="w-7 h-7"/>
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className={clsx("font-bold", tierClasses.text)}>{translatedName}</p>
                                <p className="text-xs text-slate-400 italic">{translatedDesc}</p>
                                {effectTexts.map((eff, index) => (
                                    <p key={index} className="text-sm text-lime-400/90">+ {eff}</p>
                                ))}
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                <div className="font-mono text-right">
                                    {upg.cost > 0 && <p className="text-base font-bold text-yellow-400">{formatNumber(upg.cost)}</p>}
                                    {upg.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1 text-cyan-300"><TestTube className="w-4 h-4"/>{upg.humanityGemsCost}</p>}
                                </div>
                                <button 
                                    onClick={() => purchaseUpgrade(upg.id)}
                                    disabled={!isPurchasable}
                                    className={clsx(
                                        "text-stone-900 font-bold py-1 px-4 rounded-md text-sm transition-all",
                                        {
                                            'bg-yellow-500 hover:bg-yellow-400 shadow-md hover:shadow-lg': isPurchasable,
                                            'bg-slate-600 opacity-50 cursor-not-allowed': !isPurchasable
                                        }
                                    )}
                                >
                                    {t('buy')}
                                </button>
                            </div>
                        </div>
                        {!requirementsMet && requirementTexts.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs">
                                <p className="font-bold text-red-400/90 mb-1">{t('requirements')}:</p>
                                <ul className="list-none pl-1 space-y-1">
                                    {requirementTexts.map((req, i) => (
                                        <li key={i} className={clsx("flex items-center gap-2", {
                                            'text-slate-400': req.met,
                                            'text-red-400': !req.met
                                        })}>
                                            {req.met ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XmarkCircle className="w-4 h-4 text-red-500" />}
                                            <span>{req.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                  )
                })}
                </div>
            </div>
            );
          })()}
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
              referrals={referrals}
              isLoading={isLoadingReferrals}
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

    </>
  );
}
