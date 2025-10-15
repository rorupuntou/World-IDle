'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Home, Shop as ShopIcon, Bookmark, Settings, Check, Xmark } from 'iconoir-react';
import { MiniKit, Tokens } from '@worldcoin/minikit-js';
import { useReadContract } from "wagmi";
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { formatUnits, createPublicClient, http, defineChain, parseUnits } from "viem";

import { Autoclicker, Upgrade, Achievement, BuyAmount, GameState, StatsState, Requirement, FullGameState, Effect } from "./types";
import { 
    initialState, initialAutoclickers, initialUpgrades, initialAchievements, newsFeed, initialStats
} from "@/app/data";
import { contractConfig } from "@/app/contracts/config";
import HeaderStats from "./HeaderStats";
import UpgradesSection from "./UpgradesSection";
import AchievementsSection from "./AchievementsSection";
import PrestigeSection from "./PrestigeSection";
import AutoclickersSection from "./AutoclickersSection";
import ShopSection from "./ShopSection";

import { useLanguage } from "@/contexts/LanguageContext";
import ItemDetailsModal from "./ItemDetailsModal";
import LanguageSelector from "./LanguageSelector";

const PRICE_INCREASE_RATE = 1.15;

const worldChain = defineChain({
    id: contractConfig.worldChainId,
    name: 'World Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
    },
    blockExplorers: {
        default: { name: 'Worldscan', url: 'https://worldscan.org' },
    },
});

const client = createPublicClient({
    chain: worldChain,
    transport: http(),
});

function choose<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const Toast = ({ message, type, onDone }: { message: string, type: 'success' | 'error', onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, 4000);
        return () => clearTimeout(timer);
    }, [onDone]);
    const isSuccess = type === 'success';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 text-stone-900 font-bold px-4 py-2 rounded-lg shadow-xl z-50 ${isSuccess ? 'bg-lime-400/90' : 'bg-red-500/90'}`}>
            {isSuccess ? <Check className="w-6 h-6" /> : <Xmark className="w-6 h-6" />}
            <span>{message}</span>
            <button onClick={onDone} className="p-1 -m-1 hover:bg-black/10 rounded-full"><Xmark className="w-4 h-4" /></button>
        </motion.div>
    );
};

const NewsTicker = () => {
    const { t } = useLanguage();
    const [news, setNews] = useState(() => choose(newsFeed));
    useEffect(() => {
        const newsInterval = setInterval(() => { setNews(choose(newsFeed)); }, 8000);
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
                    dangerouslySetInnerHTML={{ __html: t(news).replace(/<q>(.*?)<\/q><sig>(.*?)<\/sig>/g, '"$1" &ndash; <i>$2</i>') }}
                />
            </AnimatePresence>
        </div>
    );
};

export default function Game() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('main');
    const [isClient, setIsClient] = useState(false);
    const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);
    const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
    const [pendingPurchaseTx, setPendingPurchaseTx] = useState<{ txId: string; itemId: number } | null>(null);
    const [pendingTimeWarpTx, setPendingTimeWarpTx] = useState<{ txId: string; reward: number; type: 'prestige' | 'wld' } | null>(null);
    const [pendingSwapTxId, setPendingSwapTxId] = useState<string | undefined>();
    const [pendingPrestigeTxId, setPendingPrestigeTxId] = useState<string | undefined>(); // New state
    const [selectedItem, setSelectedItem] = useState<({ name: string, desc?: string, req?: Requirement, effect?: Effect[], id?: number, cost?: number } & { itemType?: 'upgrade' | 'achievement' | 'autoclicker' }) | null>(null);
    const [devModeActive, setDevModeActive] = useState(false);
    const [gameJustLoaded, setGameJustLoaded] = useState(false);
    const [timeWarpCooldown, setTimeWarpCooldown] = useState<string>("");

    // --- Game State ---
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>({ totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0, isVerified: false });
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
    const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
    const [prestigeBalance, setPrestigeBalance] = useState(0);

    const showItemDetails = (item: { name: string, desc?: string, req?: Requirement, effect?: Effect[], id?: number, cost?: number }, itemType: 'upgrade' | 'achievement' | 'autoclicker') => {
        setSelectedItem({ ...item, itemType });
    };

    const closeItemDetails = () => { setSelectedItem(null); };

    const formatNumber = useCallback((num: number) => {
        if (num < 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
        if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
        if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
        return `${(num / 1e12).toFixed(2)}T`;
    }, []);
    
    // --- Blockchain Hooks ---
    const { data: prestigeTokenBalanceData, refetch: refetchPrestigeBalance } = useReadContract({
        address: contractConfig.prestigeTokenAddress,
        abi: contractConfig.prestigeTokenAbi,
        functionName: 'balanceOf',
        args: [walletAddress!],
        query: { enabled: !!walletAddress },
    });

    const { data: tokenDecimalsData } = useReadContract({
        address: contractConfig.prestigeTokenAddress,
        abi: contractConfig.prestigeTokenAbi,
        functionName: 'decimals',
        query: { enabled: !!walletAddress },
    });

    const { isLoading: isConfirmingPurchase, isSuccess: isPurchaseSuccess } = useWaitForTransactionReceipt({
        client,
        appConfig: { app_id: process.env.NEXT_PUBLIC_WLD_APP_ID! },
        transactionId: pendingPurchaseTx?.txId ?? '',
    });

    // New hook for prestige transaction
    const { isLoading: isConfirmingPrestige, isSuccess: isPrestigeSuccess } = useWaitForTransactionReceipt({
        client,
        appConfig: { app_id: process.env.NEXT_PUBLIC_WLD_APP_ID! },
        transactionId: pendingPrestigeTxId ?? '',
    });

    const { isSuccess: isTimeWarpSuccess } = useWaitForTransactionReceipt({
        client,
        appConfig: { app_id: process.env.NEXT_PUBLIC_WLD_APP_ID! },
        transactionId: pendingTimeWarpTx?.txId ?? '',
    });

    const { isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
        client,
        appConfig: { app_id: process.env.NEXT_PUBLIC_WLD_APP_ID! },
        transactionId: pendingSwapTxId ?? '',
    });

    // --- Memoized Calculations ---
    const prestigeBoost = useMemo(() => 15 * Math.log10(prestigeBalance + 1), [prestigeBalance]);

    const timeWarpPrestigeCost = useMemo(() => {
        const baseCost = 25;
        const balanceFactor = Math.floor(prestigeBalance / 100);
        return baseCost + balanceFactor;
    }, [prestigeBalance]);

    const timeWarpWldCost = useMemo(() => {
        const baseCost = 0.1;
        const purchasedCount = gameState.wldTimeWarpsPurchased || 0;
        return baseCost * Math.pow(1.25, purchasedCount);
    }, [gameState.wldTimeWarpsPurchased]);

    const { totalCPS, clickValue, autoclickerCPSValues } = useMemo(() => {
        const purchasedUpgrades = upgrades.filter(u => u.purchased);
        let clickMultiplier = 1;
        let clickAddition = 0;
        let globalMultiplier = 1;
        let cpsToClickPercent = 0;

        const autoclickerMultipliers = new Map<number, number>();
        autoclickers.forEach(a => autoclickerMultipliers.set(a.id, 1));

        const autoclickerAdditions = new Map<number, number>();
        autoclickers.forEach(a => autoclickerAdditions.set(a.id, 0));

        purchasedUpgrades.forEach(upg => {
            upg.effect.forEach(eff => {
                switch (eff.type) {
                    case 'multiplyClick':
                        clickMultiplier *= eff.value;
                        break;
                    case 'addClick':
                        clickAddition += eff.value;
                        break;
                    case 'multiplyGlobal':
                        globalMultiplier *= eff.value;
                        break;
                    case 'multiplyAutoclicker':
                        autoclickerMultipliers.set(eff.targetId, (autoclickerMultipliers.get(eff.targetId) || 1) * eff.value);
                        break;
                    case 'addCpSToClick':
                        cpsToClickPercent += eff.percent;
                        break;
                    case 'multiplyAutoclickerByOtherCount': {
                        const sourceAutoclicker = autoclickers.find(a => a.id === eff.sourceId);
                        const sourceCount = sourceAutoclicker ? sourceAutoclicker.purchased : 0;
                        const multiplier = 1 + sourceCount * eff.value;
                        autoclickerMultipliers.set(eff.targetId, (autoclickerMultipliers.get(eff.targetId) || 1) * multiplier);
                        break;
                    }
                    case 'addCpSToAutoclickerFromOthers': {
                        const otherAutoclickersCount = autoclickers.reduce((sum, a) => a.id === eff.targetId ? sum : sum + a.purchased, 0);
                        autoclickerAdditions.set(eff.targetId, (autoclickerAdditions.get(eff.targetId) || 0) + otherAutoclickersCount * eff.value);
                        break;
                    }
                }
            });
        });

        const finalGlobalMultiplier = globalMultiplier * (1 + prestigeBoost / 100) * (1 + (gameState.permanentBoostBonus || 0));

        const autoclickerCPSValues = new Map<number, number>();
        let totalAutoclickerCPS = 0;

        autoclickers.forEach(auto => {
            const baseCPS = auto.purchased * auto.tps;
            const multipliedCPS = baseCPS * (autoclickerMultipliers.get(auto.id) || 1);
            const addedCPS = (autoclickerAdditions.get(auto.id) || 0);
            const finalIndividualCPS = (multipliedCPS + addedCPS) * finalGlobalMultiplier;
            autoclickerCPSValues.set(auto.id, finalIndividualCPS);
            totalAutoclickerCPS += finalIndividualCPS;
        });

        const baseClickValue = (initialState.tokensPerClick * clickMultiplier) + clickAddition;
        const finalClickValue = baseClickValue + (totalAutoclickerCPS * cpsToClickPercent);

        return { totalCPS: totalAutoclickerCPS, clickValue: finalClickValue, autoclickerCPSValues };
    }, [upgrades, autoclickers, prestigeBoost, gameState.permanentBoostBonus]);

    const handleVerifyWithMiniKit = async () => {
        if (!walletAddress) return;
        if (!MiniKit.isInstalled()) {
            return setNotification({ message: t("wallet_prompt"), type: 'error' });
        }
        try {
            const { finalPayload } = await MiniKit.commandsAsync.verify({
                action: 'world-idle-login', // Action ID from Developer Portal
                signal: walletAddress,
            });

            if (finalPayload.status === 'error') {
                const errorPayload = finalPayload as { message?: string, debug_url?: string };
                console.error('DEBUG (MiniKit Error): ' + JSON.stringify(errorPayload, null, 2));
                return setNotification({ message: errorPayload.message || "Verification failed in World App.", type: 'error' });
            }

            // The payload from MiniKit.verify is already what we need for the backend
            const res = await fetch("/api/verify-worldid", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    proof: finalPayload, 
                    signal: walletAddress, 
                    action: 'world-idle-login' 
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = "An unexpected error occurred on the server.";
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson && typeof errorJson.detail === 'string') {
                        errorMessage = errorJson.detail;
                    }
                    console.error("Backend verification failed:", errorJson);
                } catch {
                    console.error("Backend verification failed with non-JSON response:", errorText);
                }
                return setNotification({ message: errorMessage, type: 'error' });
            }

            const data: { success: boolean; gameData: FullGameState | null; detail?: unknown } = await res.json();
            
            if (data.success) {
                setStats(prev => ({ ...prev, isVerified: true }));
                setNotification({ message: "World ID Verified!", type: 'success' });
                if (data.gameData) {
                    const { gameState, stats, autoclickers, upgrades, achievements } = data.gameData;
                    if (gameState) setGameState(gameState);
                    if (stats) setStats(stats);
                    if (autoclickers) setAutoclickers(autoclickers);
                    if (upgrades) setUpgrades(upgrades);
                    if (achievements) setAchievements(achievements);
                }
            } else {
                const message = typeof data.detail === 'string' ? data.detail : "Verification failed.";
                setNotification({ message, type: 'error' });
            }

        } catch (error) {
            console.error(error);
            setNotification({ message: "An unknown error occurred during verification.", type: 'error' });
        }
    };

    const checkRequirements = useCallback((req: Requirement | undefined): boolean => {
        if (!req) return true;
        if (req.totalTokensEarned !== undefined && stats.totalTokensEarned < req.totalTokensEarned) return false;
        if (req.totalClicks !== undefined && stats.totalClicks < req.totalClicks) return false;
        if (req.tps !== undefined && totalCPS < req.tps) return false;
        if (req.verified !== undefined && req.verified && !stats.isVerified) return false;
        if (req.autoclickers !== undefined) {
            const autoclickerReqs = Array.isArray(req.autoclickers) ? req.autoclickers : [req.autoclickers];
            for (const autoReq of autoclickerReqs) {
                const auto = autoclickers.find(a => a.id === autoReq.id);
                if (!auto || auto.purchased < autoReq.amount) return false;
            }
        }
        if (req.eachAutoclickerAmount !== undefined) {
            for (const auto of autoclickers) {
                if (auto.purchased < req.eachAutoclickerAmount) {
                    return false;
                }
            }
        }
        return true;
    }, [stats, totalCPS, autoclickers]);

    const availableUpgradesCount = useMemo(() => {
        return upgrades.filter(u => !u.purchased && checkRequirements(u.req) && gameState.tokens >= u.cost).length;
    }, [upgrades, gameState.tokens, checkRequirements]);

    const sortedUpgrades = useMemo(() => {
        return [...upgrades].sort((a, b) => {
            const aAvailable = checkRequirements(a.req) && gameState.tokens >= a.cost;
            const bAvailable = checkRequirements(b.req) && gameState.tokens >= b.cost;
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;
            return a.cost - b.cost;
        });
    }, [upgrades, gameState.tokens, checkRequirements]);

    const prestigeReward = useMemo(() => {
        if (stats.totalTokensEarned <= 0) return 0;
        return Math.floor(Math.sqrt(stats.totalTokensEarned / 4000)) * 1000;
    }, [stats.totalTokensEarned]);

    const canPrestige = useMemo(() => {
        return prestigeReward >= 1;
    }, [prestigeReward]);

    // --- Wallet & Data Sync Effects ---
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);

    useEffect(() => {
        const decimals = typeof tokenDecimalsData === 'number' ? tokenDecimalsData : 18;
        if (typeof prestigeTokenBalanceData === 'bigint') {
            const balance = parseFloat(formatUnits(prestigeTokenBalanceData, decimals));
            setPrestigeBalance(balance);
        }
    }, [prestigeTokenBalanceData, tokenDecimalsData]);
    
    const loadGameFromBackend = useCallback(async (address: string) => {
        try {
            const res = await fetch(`/api/load-game?walletAddress=${address}`);
            if (!res.ok) throw new Error("Failed to load game data");
            const data = await res.json();
            if (data.success && data.gameData) {
                const { gameState, stats, autoclickers, upgrades, achievements } = data.gameData;
                if (gameState) setGameState(gameState);
                if (stats) setStats(stats);
                if (autoclickers) setAutoclickers(autoclickers);
                if (upgrades) setUpgrades(upgrades);
                if (achievements) setAchievements(achievements);
                setNotification({ message: t("game_loaded"), type: 'success' });
                setGameJustLoaded(true); // Trigger offline progress calculation
            } else {
                setNotification({ message: t("welcome_back"), type: 'success' });
            }
        } catch (error) {
            console.error("Failed to load game:", error);
            setNotification({ message: t("load_error"), type: 'error' });
        }
    }, [t]);

    const [isLoading, setIsLoading] = useState(false);

    const saveResetState = useCallback(async () => {
        if (!walletAddress) return;
        const resetData: FullGameState = {
            gameState: { ...initialState, lastSaved: Date.now() },
            stats: initialStats,
            autoclickers: initialAutoclickers,
            upgrades: initialUpgrades,
            achievements: initialAchievements,
        };
        try {
            await fetch("/api/save-game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, gameData: resetData }),
            });
            setNotification({ message: t("game_saved"), type: 'success' });
        } catch (error) {
            console.error("Failed to save reset game state:", error);
            setNotification({ message: t("save_error"), type: 'error' });
        }
    }, [walletAddress, t]);

    // Effect for successful prestige
    useEffect(() => {
        if (isPrestigeSuccess) {
            setNotification({ message: t("prestige_success"), type: 'success' });
            
            // Reset game state
            setGameState(initialState);
            setStats(initialStats);
            setAutoclickers(initialAutoclickers);
            setUpgrades(initialUpgrades);
            setAchievements(initialAchievements);

            // Refetch balances and save the new state
            refetchPrestigeBalance();
            saveResetState();

            setPendingPrestigeTxId(undefined); // Clear the pending transaction ID
        }
    }, [isPrestigeSuccess, refetchPrestigeBalance, saveResetState, t]);

    useEffect(() => {
        if (isTimeWarpSuccess && pendingTimeWarpTx) {
            setNotification({ message: t("time_warp_success"), type: 'success' });
            if (pendingTimeWarpTx.type === 'prestige') {
                setGameState(prev => ({ 
                    ...prev, 
                    tokens: prev.tokens + pendingTimeWarpTx.reward,
                    lastPrestigeTimeWarp: Date.now(),
                }));
            } else {
                setGameState(prev => ({ ...prev, tokens: prev.tokens + pendingTimeWarpTx.reward }));
            }
            setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + pendingTimeWarpTx.reward }));
            refetchPrestigeBalance(); // Refetch balance if prestige tokens were used
            setPendingTimeWarpTx(null);
        }
    }, [isTimeWarpSuccess, pendingTimeWarpTx, refetchPrestigeBalance, t, setGameState]);

    useEffect(() => {
        if (isSwapSuccess) {
            setNotification({ message: t("swap_success"), type: 'success' });
            // TODO: We may need to refetch other token balances here in the future
            refetchPrestigeBalance();
            setPendingSwapTxId(undefined);
        }
    }, [isSwapSuccess, refetchPrestigeBalance, t]);

    // Cooldown timer effect
    useEffect(() => {
        const updateCooldown = () => {
            if (gameState.lastPrestigeTimeWarp) {
                const twentyFourHours = 24 * 60 * 60 * 1000;
                const timePassed = Date.now() - gameState.lastPrestigeTimeWarp;
                const timeLeft = twentyFourHours - timePassed;

                if (timeLeft > 0) {
                    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
                    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
                    const seconds = Math.floor((timeLeft / 1000) % 60);
                    setTimeWarpCooldown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setTimeWarpCooldown("");
                    setGameState(prev => ({ ...prev, lastPrestigeTimeWarp: undefined }));
                }
            }
        };

        updateCooldown(); // Initial check
        const interval = setInterval(updateCooldown, 1000); // Update every second
        return () => clearInterval(interval);
    }, [gameState.lastPrestigeTimeWarp, setGameState]);

    const saveGameToBackend = useCallback(async (manual = false) => {
        if (!walletAddress) return;
        if (manual) setNotification({ message: t("saving"), type: 'success' });
        const fullGameState: FullGameState = { gameState, stats, autoclickers, upgrades, achievements };
        fullGameState.gameState.lastSaved = Date.now();
        try {
            const res = await fetch("/api/save-game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, gameData: fullGameState }),
            });
            if (!res.ok) throw new Error("Failed to save game data");
            if (manual) setNotification({ message: t("game_saved"), type: 'success' });
        } catch (error) {
            console.error("Failed to save game:", error);
            if (manual) setNotification({ message: t("save_error"), type: 'error' });
        }
    }, [walletAddress, gameState, stats, autoclickers, upgrades, achievements, t]);

    // --- Game Loop Effects ---
    useEffect(() => {
        if (gameJustLoaded) {
            const lastSaved = gameState.lastSaved || Date.now();
            const elapsedSeconds = (Date.now() - lastSaved) / 1000;

            // Only calculate if offline for more than 60 seconds
            if (elapsedSeconds > 60) {
                const maxOfflineSeconds = 86400; // 24 hours
                const secondsToReward = Math.min(elapsedSeconds, maxOfflineSeconds);
                const offlineGains = secondsToReward * totalCPS;

                if (offlineGains > 1) { // Only show if gains are significant
                    setGameState(prev => ({ ...prev, tokens: prev.tokens + offlineGains }));
                    setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + offlineGains }));
                    setNotification({ message: t("offline_gains", { amount: formatNumber(offlineGains) }), type: 'success' });
                }
            }
            setGameJustLoaded(false); // Reset the flag
        }
    }, [gameJustLoaded, totalCPS, gameState.lastSaved, t, formatNumber]);

    useEffect(() => {
        const interval = setInterval(() => {
            const tokensToAdd = totalCPS / 10;
            setGameState(prev => ({ ...prev, tokens: prev.tokens + tokensToAdd }));
            setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + tokensToAdd }));
        }, 100);
        return () => clearInterval(interval);
    }, [totalCPS]);

    useEffect(() => {
        if (!walletAddress) return;
        const saveInterval = setInterval(() => saveGameToBackend(false), 15000); // Save every 15 seconds
        return () => clearInterval(saveInterval);
    }, [saveGameToBackend, walletAddress]);

    useEffect(() => {
        const unlockedAchievements = new Set(achievements.filter(a => a.unlocked).map(a => a.id));
        const newAchievements = achievements.filter(ach => !ach.unlocked && checkRequirements(ach.req));
        if (newAchievements.length > 0) {
            newAchievements.forEach(ach => {
                setNotification({ message: t("achievement_unlocked", { name: t(ach.name) }), type: 'success' });
                unlockedAchievements.add(ach.id);
            });
            setAchievements(prev => prev.map(ach => unlockedAchievements.has(ach.id) ? { ...ach, unlocked: true } : ach));
        }
    }, [stats, achievements, checkRequirements, t]);

    // --- User Action Handlers ---
    const handleConnect = useCallback(async () => {
        if (!MiniKit.isInstalled()) {
            return setNotification({ message: t("wallet_prompt"), type: 'error' });
        }
        try {
            const result = await MiniKit.commandsAsync.walletAuth({ nonce: String(Math.random()) });
            if (result.finalPayload.status === 'error') {
                throw new Error(t("auth_failed"));
            }
            const address = result.finalPayload.message.match(/0x[a-fA-F0-9]{40}/)?.[0] as `0x${string}` | undefined;
            if (address) {
                setWalletAddress(address);
                loadGameFromBackend(address);
            } else {
                throw new Error(t("no_address"));
            }
        } catch (error) {
            console.error("Error al conectar la billetera:", error);
            setNotification({ message: t("connect_error", { error: error instanceof Error ? error.message : 'Unknown error' }), type: 'error' });
        }
    }, [loadGameFromBackend, t]);

    // ✅ CAMBIO 2: Lógica de MiniKit actualizada a la API moderna.
    const handleTimeWarpPurchase = useCallback(async (type: 'prestige' | 'wld') => {
        const reward = totalCPS * 86400;
        if (type === 'prestige') {
            if (gameState.lastPrestigeTimeWarp) {
                const twentyFourHours = 24 * 60 * 60 * 1000;
                if (Date.now() - gameState.lastPrestigeTimeWarp < twentyFourHours) {
                    return setNotification({ message: t("time_warp_cooldown"), type: 'error' });
                }
            }
            if (prestigeBalance < timeWarpPrestigeCost) {
                return setNotification({ message: t("not_enough_prestige_tokens"), type: 'error' });
            }
            try {
                const decimals = typeof tokenDecimalsData === 'number' ? tokenDecimalsData : 18;
                const amountToBurnInWei = parseUnits(timeWarpPrestigeCost.toString(), decimals);
                
                const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
                    transaction: [{
                        address: contractConfig.prestigeTokenAddress,
                        abi: contractConfig.prestigeTokenAbi,
                        functionName: 'transfer',
                        args: ['0x000000000000000000000000000000000000dEaD', amountToBurnInWei.toString()],
                        value: '0x0',
                    }],
                });

                if (finalPayload.status === 'error') {
                    // La API moderna devuelve un objeto de error simple
                    throw new Error((finalPayload as { message?: string }).message || 'Error sending transaction');
                }

                if (finalPayload.transaction_id) {
                    setPendingTimeWarpTx({ txId: finalPayload.transaction_id, reward, type: 'prestige' });
                    setNotification({ message: t("transaction_sent"), type: 'success' });
                } else {
                    throw new Error(t('transaction_error'));
                }
            } catch (error) {
                setNotification({ message: t("purchase_failed", { error: error instanceof Error ? error.message : 'Unknown error' }), type: 'error' });
            }
        } else if (type === 'wld') {
            try {
                const initRes = await fetch('/api/initiate-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress, boostId: 'timewarp_24h' }),
                });
                if (!initRes.ok) throw new Error(t("payment_failed_init"));
                const { reference } = await initRes.json();

                // ✅ CAMBIO 3: La construcción del payload de `pay` es más simple.
                // No se necesita `PayCommandInput` ni `Tokens`. Se usan strings directamente.
                const { finalPayload } = await MiniKit.commandsAsync.pay({
                    reference,
                    to: '0x536bB672A282df8c89DDA57E79423cC505750E52', // Dirección de recepción
                    tokens: [{ 
                        symbol: Tokens.WLD, 
                        token_amount: parseUnits(timeWarpWldCost.toString(), 18).toString() 
                    }],
                    description: t('time_warp_purchase_desc'),
                });

                if (finalPayload.status === 'success' && finalPayload.transaction_id) {
                    setNotification({ message: t("payment_sent_verifying"), type: 'success' });
                    // ... el resto de la lógica de confirmación está bien
                    const res = await fetch('/api/confirm-timewarp-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ txId: finalPayload.transaction_id, rewardAmount: reward }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setGameState(prev => ({ ...prev, tokens: prev.tokens + data.rewardAmount, wldTimeWarpsPurchased: (prev.wldTimeWarpsPurchased || 0) + 1 }));
                        setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + data.rewardAmount }));
                        setNotification({ message: t("time_warp_success"), type: 'success' });
                    } else {
                        throw new Error(data.error || t("confirmation_failed"));
                    }
                } else {
                    // El error se maneja de forma más genérica.
                    throw new Error((finalPayload as { message?: string }).message || t("payment_cancelled"));
                }
            } catch (error) {
                setNotification({ message: t("purchase_failed", { error: error instanceof Error ? error.message : 'Unknown error' }), type: 'error' });
            }
        }
    }, [totalCPS, prestigeBalance, tokenDecimalsData, t, walletAddress, timeWarpPrestigeCost, timeWarpWldCost, gameState.lastPrestigeTimeWarp]);

    const handleManualClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const value = clickValue;
        setFloatingNumbers(current => [...current, { id: Date.now(), value: `+${formatNumber(value)}`, x: e.clientX, y: e.clientY }]);
        setTimeout(() => { setFloatingNumbers(current => current.filter(n => n.id !== e.timeStamp)); }, 2000);
        setGameState(prev => ({ ...prev, tokens: prev.tokens + value }));
        setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + value, totalClicks: prev.totalClicks + 1 }));
    }, [clickValue, formatNumber]);

    const calculateBulkCost = useCallback((item: Autoclicker, amount: BuyAmount) => {
        let totalCost = 0;
        for (let i = 0; i < amount; i++) {
            totalCost += item.cost * Math.pow(PRICE_INCREASE_RATE, item.purchased + i);
        }
        return totalCost;
    }, []);

    const calculatePrestigeBulkCost = useCallback((item: Autoclicker, amount: BuyAmount) => {
        if (!item.prestigeCost) return 0;
        let totalCost = 0;
        for (let i = 0; i < amount; i++) {
            // The cost for each subsequent item increases exponentially and is rounded up.
            const costForItem = Math.ceil(item.prestigeCost * Math.pow(PRICE_INCREASE_RATE, item.purchased + i));
            totalCost += costForItem;
        }
        return totalCost;
    }, []);

    const purchaseAutoclickerWithTokens = useCallback((id: number) => {
        const autoclicker = autoclickers.find(a => a.id === id);
        if (!autoclicker) return;
        const cost = calculateBulkCost(autoclicker, buyAmount);
        if (gameState.tokens >= cost) {
            setGameState(prev => ({ ...prev, tokens: prev.tokens - cost }));
            setAutoclickers(prev => prev.map(a => a.id === id ? { ...a, purchased: a.purchased + buyAmount } : a));
        }
    }, [autoclickers, gameState.tokens, calculateBulkCost, buyAmount]);

    useEffect(() => {
        if (isPurchaseSuccess && pendingPurchaseTx) {
            const item = autoclickers.find(a => a.id === pendingPurchaseTx.itemId);
            if (item) {
                setNotification({ message: t("purchase_success", { name: t(item.name) }), type: 'success' });
                purchaseAutoclickerWithTokens(pendingPurchaseTx.itemId);
                refetchPrestigeBalance();
            }
            setPendingPurchaseTx(null);
        }
    }, [isPurchaseSuccess, pendingPurchaseTx, autoclickers, purchaseAutoclickerWithTokens, refetchPrestigeBalance, t]);

    const handlePrestigePurchase = useCallback(async (item: Autoclicker, totalPrestigeCost: number) => {
        if (!totalPrestigeCost) return;

        try {
            const decimals = typeof tokenDecimalsData === 'number' ? tokenDecimalsData : 18;
            const amountToBurnInWei = BigInt(totalPrestigeCost) * BigInt(10 ** decimals);
            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: contractConfig.prestigeTokenAddress,
                        abi: contractConfig.prestigeTokenAbi,
                        functionName: 'transfer',
                        args: ['0x000000000000000000000000000000000000dEaD', amountToBurnInWei.toString()],
                        value: '0x0',
                    },
                ],
            });

            if (finalPayload.status === 'error') {
                const errorPayload = finalPayload as { message?: string, debug_url?: string };
                console.error('DEBUG: ' + JSON.stringify(errorPayload, null, 2));
                throw new Error(errorPayload.message || 'Error sending transaction with MiniKit.');
            }

            if (finalPayload.transaction_id) {
                setPendingPurchaseTx({ txId: finalPayload.transaction_id, itemId: item.id });
                setNotification({ message: t("transaction_sent"), type: 'success' });
            } else {
                throw new Error(t('transaction_error'));
            }
        } catch (error) {
            setNotification({ message: error instanceof Error ? error.message : String(error), type: 'error' });
        }
    }, [t, tokenDecimalsData]);

    const purchaseAutoclicker = useCallback((id: number) => {
        const autoclicker = autoclickers.find(a => a.id === id);
        if (!autoclicker) return;

        const tokenCost = calculateBulkCost(autoclicker, buyAmount);
        if (gameState.tokens < tokenCost) return;

        if (autoclicker.prestigeCost && autoclicker.prestigeCost > 0) {
            const prestigeCost = calculatePrestigeBulkCost(autoclicker, buyAmount);
            if (prestigeBalance >= prestigeCost) {
                handlePrestigePurchase(autoclicker, prestigeCost);
            } else {
                setNotification({ message: t("not_enough_prestige_tokens"), type: 'error' });
            }
        } else {
            purchaseAutoclickerWithTokens(id);
        }
    }, [autoclickers, gameState.tokens, calculateBulkCost, buyAmount, prestigeBalance, handlePrestigePurchase, purchaseAutoclickerWithTokens, t, calculatePrestigeBulkCost]);

    const purchaseUpgrade = useCallback((id: number) => {
        const upgrade = upgrades.find(u => u.id === id);
        if (!upgrade || upgrade.purchased || !checkRequirements(upgrade.req)) return;
        if (gameState.tokens >= upgrade.cost) {
            setGameState(prev => ({ ...prev, tokens: prev.tokens - upgrade.cost }));
            setUpgrades(prev => prev.map(u => u.id === id ? { ...u, purchased: true } : u));
            saveGameToBackend(false);
        }
    }, [upgrades, gameState.tokens, checkRequirements, saveGameToBackend]);

    const purchaseAllAffordableUpgrades = useCallback(() => {
        const affordableUpgrades = upgrades
            .filter(upg => !upg.purchased && checkRequirements(upg.req))
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
                break; // Stop if we can't afford the next cheapest one
            }
        }

        if (upgradesToPurchase.size > 0) {
            setGameState(prev => ({ ...prev, tokens: prev.tokens - totalCost }));
            setUpgrades(prev => prev.map(upg => upgradesToPurchase.has(upg.id) ? { ...upg, purchased: true } : upg));
            setNotification({ message: t('bulk_purchase_success', { count: upgradesToPurchase.size }), type: 'success' });
            saveGameToBackend(false);
        }
    }, [upgrades, gameState.tokens, checkRequirements, t, saveGameToBackend]);

    const handleDevMode = () => {
        const code = prompt(t("dev_mode_prompt"));
        if (code === "1312") {
            setDevModeActive(true);
            setNotification({ message: t("dev_mode_activated"), type: 'success' });
        }
    };

    // --- Render Logic ---
    if (!isClient) {
        return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>;
    }

    if (!walletAddress) {
        return (
            <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
                <LanguageSelector />
                <h1 className="text-4xl font-bold mb-4">{t('welcome_message')}</h1>
                <p className="mb-8 text-slate-400">{t('connect_wallet_prompt')}</p>
                <button
                    onClick={handleConnect}
                    className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg mb-4"
                >
                    {t('connect_wallet')}
                </button>
            </div>
        );
    }

    return (
        <>
            <LanguageSelector />
            <NewsTicker />
            <AnimatePresence>
                {floatingNumbers.map(num => (
                    <motion.div key={num.id} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -100, scale: 1.5 }} transition={{ duration: 2 }} className="pointer-events-none absolute font-bold text-lime-300 text-2xl" style={{ left: num.x, top: num.y, zIndex: 9999 }} aria-hidden="true">
                        {num.value}
                    </motion.div>
                ))}
                {notification && <Toast message={notification.message} type={notification.type} onDone={() => setNotification(null)} />}
                {selectedItem && (
                    <ItemDetailsModal 
                        item={selectedItem} 
                        autoclickers={autoclickers} 
                        onClose={closeItemDetails} 
                        isPurchasable={selectedItem.itemType === 'upgrade' && checkRequirements(selectedItem.req) && selectedItem.cost !== undefined && gameState.tokens >= selectedItem.cost}
                        onPurchase={(id) => {
                            if (selectedItem.itemType === 'upgrade') {
                                purchaseUpgrade(id);
                                closeItemDetails();
                            }
                        }}
                    />
                )}
            </AnimatePresence>
            <div className="w-full max-w-md mx-auto p-6 pt-12 flex flex-col gap-8 pb-28"> 
                <div className="text-center">
                    <h1 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-slate-200 to-slate-400 text-transparent bg-clip-text">{t('app_title')}</h1>
                </div>
                <HeaderStats
                    tokens={gameState.tokens}
                    tokensPerSecond={totalCPS}
                    humanityGems={gameState.humanityGems}
                    totalClicks={stats.totalClicks}
                    permanentBoostBonus={gameState.permanentBoostBonus || 0}
                    formatNumber={formatNumber}
                />

                <div className="flex flex-col gap-6">
                    {activeTab === 'main' && (
                        <div className="flex flex-col gap-6">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={handleManualClick} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-6 rounded-xl text-2xl shadow-lg shadow-cyan-500/30 border border-cyan-400 transition-colors">
                                {t('click')} (+{formatNumber(clickValue)})
                            </motion.button>
                            <AutoclickersSection
                                autoclickers={autoclickers}
                                buyAmount={buyAmount}
                                setBuyAmount={setBuyAmount}
                                gameState={gameState}
                                checkRequirements={checkRequirements}
                                showRequirements={showItemDetails}
                                calculateBulkCost={calculateBulkCost}
                                calculatePrestigeBulkCost={calculatePrestigeBulkCost}
                                purchaseAutoclicker={purchaseAutoclicker}
                                formatNumber={formatNumber}
                                autoclickerCPSValues={autoclickerCPSValues}
                                devModeActive={devModeActive}
                                isConfirmingPurchase={isConfirmingPurchase}
                                pendingPurchaseTx={pendingPurchaseTx}
                                prestigeBalance={prestigeBalance}
                            />
                            <PrestigeSection
                                prestigeBoost={prestigeBoost}
                                prestigeBalance={prestigeBalance}
                                prestigeReward={prestigeReward}
                                totalTokensEarned={stats.totalTokensEarned}
                                isPrestigeReady={canPrestige}
                                isLoading={isLoading || isConfirmingPrestige} // Show loading while confirming
                                setIsLoading={setIsLoading}
                                walletAddress={walletAddress}
                                setPendingPrestigeTxId={setPendingPrestigeTxId} // Pass setter
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
                    {activeTab === 'upgrades' && (
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
                    {activeTab === 'shop' && (
                        <div className="flex flex-col gap-6">
                            <ShopSection 
                                walletAddress={walletAddress} 
                                setGameState={setGameState} 
                                setNotification={setNotification} 
                                totalCPS={totalCPS}
                                prestigeBalance={prestigeBalance}
                                handleTimeWarpPurchase={handleTimeWarpPurchase}
                                formatNumber={formatNumber}
                                timeWarpPrestigeCost={timeWarpPrestigeCost}
                                timeWarpWldCost={timeWarpWldCost}
                                timeWarpCooldown={timeWarpCooldown}
                            />
                            <AchievementsSection
                                achievements={achievements}
                                showRequirements={showItemDetails}
                            />
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-lg border-t border-slate-700 flex justify-between items-center px-8 pb-safe-bottom">
                    <button onClick={() => setActiveTab('upgrades')} className={`relative flex flex-col items-center gap-1 ${activeTab === 'upgrades' ? 'text-cyan-400' : 'text-slate-400'} transition-colors`}>
                        <Rocket className="w-7 h-7" />
                        <span className="text-xs font-medium">{t('upgrades_tab')}</span>
                        {availableUpgradesCount > 0 && (
                            <span className="absolute top-0 right-0 -mt-1 -mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                {availableUpgradesCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('main')} className={`flex flex-col items-center gap-1 ${activeTab === 'main' ? 'text-cyan-400' : 'text-slate-400'} transition-colors`}>
                        <Home className="w-7 h-7" />
                        <span className="text-xs font-medium">{t('main_tab')}</span>
                    </button>
                    <button onClick={() => setActiveTab('shop')} className={`flex flex-col items-center gap-1 ${activeTab === 'shop' ? 'text-cyan-400' : 'text-slate-400'} transition-colors`}>
                        <ShopIcon className="w-7 h-7" />
                        <span className="text-xs font-medium">{t('shop_tab')}</span>
                    </button>
                </div>
                 <div className="mt-4">
                    <button 
                        onClick={() => saveGameToBackend(true)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700/80 text-slate-300 font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        <Bookmark className="w-5 h-5" />
                        {t('save_game')}
                    </button>
                </div>
            </div>
            <button onClick={handleDevMode} className="fixed bottom-2 right-2 p-2 text-transparent hover:text-yellow-400">
                <Settings className="w-5 h-5" />
            </button>
        </>
    );
}