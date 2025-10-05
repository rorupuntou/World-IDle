"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckBadgeIcon, XMarkIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { MiniKit } from "@worldcoin/minikit-js";

import { Autoclicker, Upgrade, Achievement, BuyAmount, GameState, StatsState, Requirement, FullGameState } from "./types";
import { 
    initialState, initialAutoclickers, initialUpgrades, initialAchievements, newsFeed 
} from "@/app/data";
import HeaderStats from "./HeaderStats";
import UpgradesSection from "./UpgradesSection";
import AchievementsSection from "./AchievementsSection";
import PrestigeSection from "./PrestigeSection";
import AutoclickersSection from "./AutoclickersSection";

const PRICE_INCREASE_RATE = 1.15;

function choose<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const Toast = ({ message, onDone }: { message: string, onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, 4000);
        return () => clearTimeout(timer);
    }, [onDone]);
    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-lime-400/90 text-stone-900 font-bold px-4 py-2 rounded-lg shadow-xl z-50">
            <CheckBadgeIcon className="w-6 h-6" />
            <span>{message}</span>
            <button onClick={onDone} className="p-1 -m-1 hover:bg-black/10 rounded-full"><XMarkIcon className="w-4 h-4" /></button>
        </motion.div>
    );
};

const NewsTicker = () => {
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
                    dangerouslySetInnerHTML={{ __html: news.replace(/<q>(.*?)<\/q><sig>(.*?)<\/sig>/g, '"$1" &ndash; <i>$2</i>') }}
                />
            </AnimatePresence>
        </div>
    );
};

export default function Game() {
    const [isClient, setIsClient] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>({ totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 });
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
    const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
    const [prestigeBalance] = useState(0);
    
    const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const saveGameToBackend = useCallback(async (manual = false) => {
        if (!walletAddress) return;
        if (manual) setToast("Guardando...");
        const fullGameState: FullGameState = { gameState, stats, autoclickers, upgrades, achievements };
        try {
            const res = await fetch("/api/save-game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, gameData: fullGameState }),
            });
            if (!res.ok) throw new Error("Failed to save game data");
            if (manual) setToast("¡Partida guardada!");
        } catch (error) {
            console.error("Failed to save game:", error);
            if (manual) setToast("Error al guardar la partida.");
        }
    }, [walletAddress, gameState, stats, autoclickers, upgrades, achievements]);

    const loadGameFromBackend = useCallback(async (address: string) => {
        try {
            const res = await fetch(`/api/load-game?walletAddress=${address}`);
            if (!res.ok) throw new Error("Failed to load game data");
            const data = await res.json();
            if (data.success && data.gameData) {
                const gameData = data.gameData;
                if (gameData.gameState) setGameState(gameData.gameState);
                if (gameData.stats) setStats(gameData.stats);
                if (gameData.autoclickers) setAutoclickers(gameData.autoclickers);
                if (gameData.upgrades) setUpgrades(gameData.upgrades);
                if (gameData.achievements) setAchievements(gameData.achievements);
                setToast("Partida cargada exitosamente!");
            } else {
                setToast("¡Bienvenido! Tu aventura comienza ahora.");
            }
        } catch (error) {
            console.error("Failed to load game:", error);
            setToast("No se pudo cargar la partida.");
        }
    }, []);

    const handleConnectWallet = useCallback(async () => {
        if (!MiniKit.isInstalled()) {
            return alert("Please open this app in World App to continue.");
        }
        try {
            const nonce = String(Math.random());
            const result = await MiniKit.commandsAsync.walletAuth({ nonce });
    
            if (result.finalPayload.status === 'error') {
                throw new Error("Wallet authentication failed.");
            }
            
            const address = result.finalPayload.message.match(/0x[a-fA-F0-9]{40}/)?.[0];
    
            if (address) {
                setWalletAddress(address);
                loadGameFromBackend(address);
            } else {
                throw new Error("Could not parse address from wallet response.");
            }
    
        } catch (error) {
            console.error("Wallet connection error:", error);
            alert(`Error connecting wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [loadGameFromBackend]);

    const formatNumber = useCallback((num: number) => {
        if (num < 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
        if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
        if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
        return `${(num / 1e12).toFixed(2)}T`;
    }, []);

    const prestigeBoost = useMemo(() => prestigeBalance * 0.1, [prestigeBalance]);

    const { totalCPS, clickValue } = useMemo(() => {
        const purchasedUpgrades = upgrades.filter(u => u.purchased);
        let clickMultiplier = 1, clickAddition = 0, globalMultiplier = 1;
        purchasedUpgrades.forEach(upg => {
            upg.effect.forEach(eff => {
                if (eff.type === 'multiplyClick') clickMultiplier *= eff.value;
                if (eff.type === 'addClick') clickAddition += eff.value;
                if (eff.type === 'multiplyGlobal') globalMultiplier *= eff.value;
            });
        });
        const totalAutoclickerCPS = autoclickers.reduce((total, auto) => total + auto.purchased * auto.tps, 0);
        const humanityBoost = 1; // World ID boost disabled for now
        const finalGlobalMultiplier = globalMultiplier * humanityBoost * (1 + prestigeBoost / 100);
        const finalTotalCPS = totalAutoclickerCPS * finalGlobalMultiplier;
        const baseClickValue = (initialState.tokensPerClick * clickMultiplier) + clickAddition;
        const finalClickValue = baseClickValue * humanityBoost;
        return { totalCPS: finalTotalCPS, clickValue: finalClickValue };
    }, [upgrades, autoclickers, prestigeBoost]);

    // Game loop for passive token generation
    useEffect(() => {
        const interval = setInterval(() => {
            const tokensToAdd = totalCPS / 10;
            setGameState(prev => ({ ...prev, tokens: prev.tokens + tokensToAdd }));
            setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + tokensToAdd }));
        }, 100);
        return () => clearInterval(interval);
    }, [totalCPS]);

    // Game saving loop
    useEffect(() => {
        if (!walletAddress) return;
        const saveInterval = setInterval(() => saveGameToBackend(false), 30000); // Save every 30 seconds
        return () => clearInterval(saveInterval);
    }, [saveGameToBackend, walletAddress]);

    const checkRequirements = useCallback((req: Requirement | undefined): boolean => {
        if (!req) return true;
    
        if (req.totalTokensEarned !== undefined && stats.totalTokensEarned < req.totalTokensEarned) {
            return false;
        }
        if (req.totalClicks !== undefined && stats.totalClicks < req.totalClicks) {
            return false;
        }
        if (req.tps !== undefined && totalCPS < req.tps) {
            return false;
        }
        if (req.autoclickers !== undefined) {
            const auto = autoclickers.find(a => a.id === req.autoclickers!.id);
            if (!auto || auto.purchased < req.autoclickers.amount) {
                return false;
            }
        }
        if (req.verified !== undefined) {
            return false; // World ID verification disabled
        }
    
        return true;
    }, [stats, totalCPS, autoclickers]);

    // Achievement checking loop
    useEffect(() => {
        const unlockedAchievements = new Set(achievements.filter(a => a.unlocked).map(a => a.id));
        const newAchievements = achievements.filter(ach => !ach.unlocked && checkRequirements(ach.req));
        if (newAchievements.length > 0) {
            newAchievements.forEach(ach => {
                setToast(`Achievement Unlocked: ${ach.name}`);
                unlockedAchievements.add(ach.id);
            });
            setAchievements(prev => prev.map(ach => unlockedAchievements.has(ach.id) ? { ...ach, unlocked: true } : ach));
        }
    }, [stats, achievements, checkRequirements]);

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

    const purchaseAutoclicker = useCallback((id: number) => {
        const autoclicker = autoclickers.find(a => a.id === id);
        if (!autoclicker) return;

        const cost = calculateBulkCost(autoclicker, buyAmount);
        if (gameState.tokens >= cost) {
            setGameState(prev => ({ ...prev, tokens: prev.tokens - cost }));
            setAutoclickers(prev => prev.map(a => a.id === id ? { ...a, purchased: a.purchased + buyAmount } : a));
            saveGameToBackend(false);
        }
    }, [autoclickers, gameState.tokens, calculateBulkCost, saveGameToBackend, buyAmount]);

    const purchaseUpgrade = useCallback((id: number) => {
        const upgrade = upgrades.find(u => u.id === id);
        if (!upgrade || upgrade.purchased || !checkRequirements(upgrade.req)) return;

        if (gameState.tokens >= upgrade.cost) {
            setGameState(prev => ({ ...prev, tokens: prev.tokens - upgrade.cost }));
            setUpgrades(prev => prev.map(u => u.id === id ? { ...u, purchased: true } : u));
            saveGameToBackend(false);
        }
    }, [upgrades, gameState.tokens, checkRequirements, saveGameToBackend]);

    if (!isClient) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

    if (!walletAddress) {
        return (
            <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
                <h1 className="text-4xl font-bold mb-4">Bienvenido a World Idle</h1>
                <p className="mb-8 text-slate-400">Conecta tu billetera de World App para empezar.</p>
                <button 
                    onClick={handleConnectWallet} 
                    className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg"
                >
                    Conectar Billetera
                </button>
            </div>
        );
    }

    return (
        <>
            <NewsTicker />
            <AnimatePresence>
                {floatingNumbers.map(num => (
                    <motion.div key={num.id} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -100, scale: 1.5 }} transition={{ duration: 2 }} className="pointer-events-none absolute font-bold text-lime-300 text-2xl" style={{ left: num.x, top: num.y, zIndex: 9999 }} aria-hidden="true">
                        {num.value}
                    </motion.div>
                ))}
                {toast && <Toast message={toast} onDone={() => setToast(null)} />}
            </AnimatePresence>
            <div className="w-full max-w-6xl mx-auto p-4 pt-12 flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    <div className="text-center">
                        <h1 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-slate-200 to-slate-400 text-transparent bg-clip-text">World Idle</h1>
                    </div>
                    <HeaderStats
                        tokens={gameState.tokens}
                        tokensPerSecond={totalCPS}
                        humanityGems={gameState.humanityGems}
                        formatNumber={formatNumber}
                    />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleManualClick} className="w-full bg-cyan-500/80 hover:bg-cyan-500/100 text-white font-bold py-6 rounded-xl text-2xl shadow-lg shadow-cyan-500/20 border border-cyan-400">
                        Click! (+{formatNumber(clickValue)})
                    </motion.button>
                    <AutoclickersSection
                        autoclickers={autoclickers}
                        buyAmount={buyAmount}
                        setBuyAmount={setBuyAmount}
                        gameState={gameState}
                        checkRequirements={checkRequirements}
                        calculateBulkCost={calculateBulkCost}
                        purchaseAutoclicker={purchaseAutoclicker}
                        formatNumber={formatNumber}
                        autoclickerCPSValues={new Map()} // Placeholder
                    />
                </div>
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <PrestigeSection
                        prestigeBoost={prestigeBoost}
                        prestigeBalance={prestigeBalance}
                        handlePrestige={() => {}} // Placeholder
                        isPrestigeReady={false} // Placeholder
                    />
                    <UpgradesSection
                        upgrades={upgrades}
                        gameState={gameState}
                        checkRequirements={checkRequirements}
                        purchaseUpgrade={purchaseUpgrade}
                        showRequirements={() => {}} // Placeholder
                        formatNumber={formatNumber}
                    />
                    <AchievementsSection
                        achievements={achievements}
                        showRequirements={() => {}} // Placeholder
                    />
                    <div className="mt-4">
                        <button 
                            onClick={() => saveGameToBackend(true)}
                            className="w-full flex items-center justify-center gap-2 bg-slate-500/20 hover:bg-slate-500/40 text-slate-300 font-bold py-2 px-4 rounded-lg"
                        >
                            <BookmarkIcon className="w-5 h-5" />
                            Guardar Partida
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
