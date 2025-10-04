/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/Game.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckBadgeIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ethers } from "ethers";
import { ISuccessResult } from "@worldcoin/idkit";
import { MiniKit } from "@worldcoin/minikit-js";
import { Requirement, Effect, Autoclicker, Upgrade, Achievement, BuyAmount, GameState, StatsState } from "./types";
import { prestigeTokenContract } from "../app/contracts/config";
import {
    initialState, initialAutoclickers, newsFeed, HUMAN_BOOST_MULTIPLIER,
    PRICE_INCREASE_RATE, TIER_THRESHOLDS, GLOBAL_UPGRADE_THRESHOLDS
} from "@/app/data";
import HeaderStats from "./HeaderStats";
import UpgradesSection from "./UpgradesSection";
import AchievementsSection from "./AchievementsSection";
import PrestigeSection from "./PrestigeSection";
import AutoclickersSection from "./AutoclickersSection";
import { WorldIDAuth } from "./WorldIDAuth";

// -- HELPERS --
function choose<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// -- COMPONENTES DE UI --
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
    // Estados del Jugador y Autenticación
    const [player, setPlayer] = useState<{ proof: ISuccessResult, isVerified: boolean } | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Estados del Juego
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>({ totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 });
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [prestigeBalance, setPrestigeBalance] = useState(0);
    const [isPrestigeReady, setIsPrestigeReady] = useState(false);

    // Estados de UI
    const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);

    // -- LÓGICA DE CARGA Y GUARDADO --
    const handleLoadGame = useCallback((data: any, proof: ISuccessResult) => {
        console.log("Loading game data from backend:", data);
        if (data.gameState) setGameState(data.gameState);
        if (data.stats) setStats(data.stats);
        if (data.autoclickers) setAutoclickers(data.autoclickers);
        if (data.upgrades) setUpgrades(data.upgrades);
        if (data.achievements) setAchievements(data.achievements);
        setPlayer({ proof, isVerified: true });
        setToast("Partida cargada exitosamente!");
    }, []);

    const saveGameToBackend = useCallback(async () => {
        if (!player?.isVerified) return;
        const fullGameState = { gameState, stats, autoclickers, upgrades, achievements };
        await fetch("/api/world-idle-auth", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proof: player.proof, game_data: fullGameState }),
        });
    }, [player, gameState, stats, autoclickers, upgrades, achievements]);

    // -- LÓGICA DE AUTENTICACIÓN --
    const handleSignIn = useCallback(async () => {
        if (!MiniKit.isInstalled()) {
            return alert("Please open this app in World App to continue.");
        }
        setIsAuthenticating(true);
        try {
            const res = await fetch(`/api/nonce`);
            const { nonce } = await res.json();
            const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce });
            if (finalPayload.status === 'error') {
                throw new Error("Wallet authentication failed.");
            }
            const response = await fetch('/api/complete-siwe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: finalPayload }),
            });
            const { isValid, address } = await response.json();
            if (isValid) {
                setWalletAddress(address);
                setToast("Wallet Connected!");
            } else {
                throw new Error("Signature verification failed.");
            }
        } catch (error) {
            console.error("Sign in error:", error);
            alert(`Error connecting wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAuthenticating(false);
        }
    }, []);

    // -- HELPERS Y CÁLCULOS --
    const formatNumber = useCallback((num: number) => {
        if (num < 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
        if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
        if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
        return `${(num / 1e12).toFixed(2)}T`;
    }, []);

    const prestigeBoost = useMemo(() => prestigeBalance * 0.1, [prestigeBalance]);

    const { totalCPS, clickValue, autoclickerCPSValues } = useMemo(() => {
        const purchasedUpgrades = upgrades.filter(u => u.purchased);
        let clickMultiplier = 1, clickAddition = 0, globalMultiplier = 1;
        const autoclickerMultipliers = new Map<number, number>();
        const clickCpSUpgrades: Effect[] = [];
        const autoclickerCpSUpgrades: Effect[] = [];

        purchasedUpgrades.forEach(upg => {
            upg.effect.forEach(eff => {
                switch (eff.type) {
                    case 'multiplyClick': clickMultiplier *= eff.value; break;
                    case 'addClick': clickAddition += eff.value; break;
                    case 'multiplyGlobal': globalMultiplier *= eff.value; break;
                    case 'multiplyAutoclicker':
                        autoclickerMultipliers.set(eff.targetId, (autoclickerMultipliers.get(eff.targetId) || 1) * eff.value);
                        break;
                    case 'addCpSToClick': clickCpSUpgrades.push(eff); break;
                    case 'addCpSToAutoclickerFromOthers': autoclickerCpSUpgrades.push(eff); break;
                }
            });
        });

        const nonCursorAmount = autoclickers.reduce((acc, a) => a.id !== 0 ? acc + a.purchased : acc, 0);
        const autoclickerCPS = new Map<number, number>();
        initialAutoclickers.forEach(auto => {
            let baseTps = auto.tps * (autoclickerMultipliers.get(auto.id) || 1);
            autoclickerCpSUpgrades.forEach(eff => {
                if (eff.type === 'addCpSToAutoclickerFromOthers' && eff.targetId === auto.id) {
                    baseTps += nonCursorAmount * eff.value;
                }
            });
            autoclickerCPS.set(auto.id, baseTps);
        });

        const totalAutoclickerCPS = autoclickers.reduce((total, auto) => total + auto.purchased * (autoclickerCPS.get(auto.id) || 0), 0);
        const humanityBoost = player?.isVerified ? HUMAN_BOOST_MULTIPLIER : 1;
        const finalGlobalMultiplier = globalMultiplier * humanityBoost * (1 + prestigeBoost / 100);
        const finalTotalCPS = totalAutoclickerCPS * finalGlobalMultiplier;
        let baseClickValue = (initialState.tokensPerClick * clickMultiplier) + clickAddition;
        clickCpSUpgrades.forEach(eff => {
            if (eff.type === 'addCpSToClick') baseClickValue += finalTotalCPS * eff.percent;
        });
        const finalClickValue = baseClickValue * humanityBoost;
        return { totalCPS: finalTotalCPS, clickValue: finalClickValue, autoclickerCPSValues: autoclickerCPS };
    }, [upgrades, autoclickers, player, prestigeBoost]);

    // -- EFECTOS SECUNDARIOS DEL JUEGO --
    useEffect(() => {
        if (!player?.isVerified) return;
        const saveInterval = setInterval(saveGameToBackend, 15000);
        window.addEventListener('beforeunload', saveGameToBackend);
        return () => {
            clearInterval(saveInterval);
            window.removeEventListener('beforeunload', saveGameToBackend);
        };
    }, [saveGameToBackend, player]);

    useEffect(() => {
        const loadBalance = async () => {
            if (walletAddress && (window as any).ethereum) {
                try {
                    const provider = new ethers.BrowserProvider((window as any).ethereum);
                    const tokenContract = new ethers.Contract(prestigeTokenContract.address, prestigeTokenContract.abi, provider);
                    const balance = await tokenContract.balanceOf(walletAddress);
                    setPrestigeBalance(Number(ethers.formatUnits(balance, 18)));
                } catch (e) {
                    console.error("No se pudo leer el balance de prestigio:", e);
                }
            }
        };
        loadBalance();
    }, [walletAddress]);

    useEffect(() => {
        const passiveGainInterval = setInterval(() => {
            const gain = totalCPS / 10;
            setGameState((prev: GameState) => ({ ...prev, tokens: prev.tokens + gain }));
            setStats((prev: StatsState) => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + gain }));
        }, 100);
        if (stats.tokensPerSecond !== totalCPS) {
            setStats((prev: StatsState) => ({ ...prev, tokensPerSecond: totalCPS }));
        }
        return () => clearInterval(passiveGainInterval);
    }, [totalCPS, setGameState, setStats, stats.tokensPerSecond]);

    useEffect(() => {
        achievements.forEach(ach => {
            if (ach.unlocked) return;
            let conditionMet = false;
            if (ach.req.totalTokensEarned !== undefined && stats.totalTokensEarned >= ach.req.totalTokensEarned) conditionMet = true;
            if (ach.req.totalClicks !== undefined && stats.totalClicks >= ach.req.totalClicks) conditionMet = true;
            if (ach.req.tps !== undefined && stats.tokensPerSecond >= ach.req.tps) conditionMet = true;
            if (ach.req.verified && player?.isVerified) conditionMet = true;
            if (ach.req.autoclickers) {
                const owned = autoclickers.find(a => a.id === ach.req.autoclickers?.id)?.purchased || 0;
                if (owned >= ach.req.autoclickers.amount) conditionMet = true;
            }
            if (conditionMet) {
                setAchievements(prev => prev.map(a => a.id === ach.id ? { ...a, unlocked: true } : a));
                setToast(`Logro: ${ach.name}`);
                if (ach.reward?.humanityGems) {
                    setGameState((prev: GameState) => ({ ...prev, humanityGems: prev.humanityGems + ach.reward!.humanityGems }));
                }
            }
        });
    }, [stats, player, autoclickers, achievements, setAchievements, setGameState, setToast]);

    useEffect(() => {
        const newAchievements: Achievement[] = [];
        const newUpgrades: Upgrade[] = [];
        autoclickers.forEach(auto => {
            TIER_THRESHOLDS.forEach((tier, index) => {
                if (auto.purchased >= tier) {
                    const achievementId = 1000 + auto.id * 100 + index;
                    if (!achievements.some(a => a.id === achievementId) && !newAchievements.some(a => a.id === achievementId)) {
                        newAchievements.push({ id: achievementId, name: `${auto.name} Nivel ${index + 1}`, desc: `Poseer ${tier} de ${auto.name}.`, unlocked: false, req: { autoclickers: { id: auto.id, amount: tier } } });
                    }
                    const upgradeId = 2000 + auto.id * 100 + index;
                    if (!upgrades.some(u => u.id === upgradeId) && !newUpgrades.some(u => u.id === upgradeId)) {
                        newUpgrades.push({ id: upgradeId, name: `Especialización de ${auto.name}`, desc: `La producción de ${auto.name} se multiplica x5.`, cost: (initialAutoclickers.find(a => a.id === auto.id)?.cost || 10) * 100 * (index + 1), purchased: false, effect: [{ type: 'multiplyAutoclicker', targetId: auto.id, value: 5 }], req: { autoclickers: { id: auto.id, amount: tier } } });
                    }
                }
            });
        });
        GLOBAL_UPGRADE_THRESHOLDS.forEach((tier, index) => {
            if (stats.totalTokensEarned >= tier) {
                const upgradeId = 3000 + index;
                if (!upgrades.some(u => u.id === upgradeId) && !newUpgrades.some(u => u.id === upgradeId)) {
                    newUpgrades.push({ id: upgradeId, name: `Sinergia Universal ${'I'.repeat(index + 1)}`, desc: `La producción de todos los Autoclickers se multiplica x2.`, cost: tier * 100, purchased: false, effect: [{ type: 'multiplyGlobal', value: 2 }], req: { totalTokensEarned: tier } });
                }
            }
        });
        if (newAchievements.length > 0) setAchievements(prev => [...prev, ...newAchievements]);
        if (newUpgrades.length > 0) setUpgrades(prev => [...prev, ...newUpgrades]);
    }, [autoclickers, achievements, upgrades, stats.totalTokensEarned, setAchievements, setUpgrades]);

    useEffect(() => {
        if (stats.totalTokensEarned >= 1e9) { setIsPrestigeReady(true); }
    }, [stats.totalTokensEarned]);

    // -- MANEJADORES DE EVENTOS Y ACCIONES --
    const handleManualClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const value = clickValue;
        const newFloatingNumber = { id: Date.now(), value: `+${formatNumber(value)}`, x: e.clientX, y: e.clientY };
        setFloatingNumbers(current => [...current, newFloatingNumber]);
        setTimeout(() => { setFloatingNumbers(current => current.filter(n => n.id !== newFloatingNumber.id)); }, 2000);
        setGameState((prev: GameState) => ({ ...prev, tokens: prev.tokens + value }));
        setStats((prev: StatsState) => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + value, totalClicks: prev.totalClicks + 1 }));
    }, [clickValue, formatNumber, setGameState, setStats]);

    const checkRequirements = useCallback((req: Requirement | undefined) => {
        if (!req) return true;
        if (req.totalTokensEarned !== undefined && stats.totalTokensEarned < req.totalTokensEarned) return false;
        if (req.totalClicks !== undefined && stats.totalClicks < req.totalClicks) return false;
        if (req.tps !== undefined && stats.tokensPerSecond < req.tps) return false;
        if (req.verified && !player?.isVerified) return false;
        if (req.autoclickers) {
            const owned = autoclickers.find(a => a.id === req.autoclickers?.id)?.purchased || 0;
            if (owned < req.autoclickers.amount) return false;
        }
        return true;
    }, [stats, player, autoclickers]);

    const showRequirements = useCallback((item: { name: string, req?: Requirement }) => {
        if (!item.req) return;
        let message = `Requisitos para "${item.name}":\n\n`;
        if (item.req.totalTokensEarned !== undefined) message += `- Ganar ${formatNumber(item.req.totalTokensEarned)} $WCLICK en total.\n  (Progreso: ${formatNumber(stats.totalTokensEarned)} / ${formatNumber(item.req.totalTokensEarned)})\n`;
        if (item.req.totalClicks !== undefined) message += `- Hacer ${formatNumber(item.req.totalClicks)} clics.\n  (Progreso: ${formatNumber(stats.totalClicks)} / ${formatNumber(item.req.totalClicks)})\n`;
        if (item.req.autoclickers) {
            const autoInfo = initialAutoclickers.find(a => a.id === item.req?.autoclickers?.id);
            const owned = autoclickers.find(a => a.id === item.req?.autoclickers?.id)?.purchased || 0;
            if (autoInfo) message += `- Poseer ${item.req.autoclickers.amount} de "${autoInfo.name}".\n  (Progreso: ${owned} / ${item.req.autoclickers.amount})\n`;
        }
        if (item.req.tps !== undefined) message += `- Producir ${formatNumber(item.req.tps)} $WCLICK/s.\n  (Progreso: ${formatNumber(stats.tokensPerSecond)} / ${formatNumber(item.req.tps)})\n`;
        if (item.req.verified) message += `- Verificar con World ID.\n  (Progreso: ${player?.isVerified ? 'Completado' : 'Pendiente'})
`;
        alert(message);
    }, [stats, player, autoclickers, formatNumber]);

    const calculateBulkCost = useCallback((autoclicker: Autoclicker, amount: BuyAmount) => {
        let totalCost = 0;
        let currentPrice = autoclicker.cost;
        for (let i = 0; i < amount; i++) {
            totalCost += currentPrice;
            currentPrice = Math.ceil(currentPrice * PRICE_INCREASE_RATE);
        }
        return totalCost;
    }, []);

    const purchaseAutoclicker = useCallback((id: number) => {
        const auto = autoclickers.find(a => a.id === id);
        if (!auto) return;
        const totalTokenCost = calculateBulkCost(auto, buyAmount);
        const totalGemCost = (auto.humanityGemsCost || 0) * buyAmount;
        if (gameState.tokens < totalTokenCost || gameState.humanityGems < totalGemCost) return;
        setGameState((prev: GameState) => ({ ...prev, tokens: prev.tokens - totalTokenCost, humanityGems: prev.humanityGems - totalGemCost }));
        setAutoclickers(prev => prev.map(a => a.id === id ? { ...a, purchased: a.purchased + buyAmount, cost: Math.ceil(a.cost * Math.pow(PRICE_INCREASE_RATE, buyAmount)) } : a));
    }, [autoclickers, buyAmount, calculateBulkCost, gameState, setGameState, setAutoclickers]);

    const purchaseUpgrade = useCallback((id: number) => {
        const upg = upgrades.find(u => u.id === id);
        if (!upg || upg.purchased || gameState.tokens < upg.cost || (upg.humanityGemsCost && gameState.humanityGems < upg.humanityGemsCost)) return;
        setGameState((prev: GameState) => ({ ...prev, tokens: prev.tokens - upg.cost, humanityGems: prev.humanityGems - (upg.humanityGemsCost || 0) }));
        setUpgrades(prev => prev.map(u => u.id === id ? { ...u, purchased: true } : u));
    }, [upgrades, gameState, setGameState, setUpgrades]);

    const wipeSave = useCallback(() => {
        if (window.confirm("¿Estás seguro de que quieres borrar tu progreso? Esta acción es irreversible.")) {
            // Idealmente, esto debería llamar a un endpoint para borrar en el backend
            window.location.reload();
        }
    }, []);

    const handlePrestige = useCallback(async () => {
        if (!isPrestigeReady || !walletAddress) return;
        if (!window.confirm("¿Estás seguro de que quieres reiniciar para reclamar tus tokens de Prestigio?")) return;
        try {
            alert("La funcionalidad de Prestigio está temporalmente deshabilitada.");
        } catch (error) {
            console.error("Error al ejecutar el Prestigio:", error);
            alert(`Ocurrió un error al procesar el Prestigio. ${error instanceof Error ? error.message : ''}`);
        }
    }, [isPrestigeReady, walletAddress]);

    // -- RENDERIZADO --
    if (!walletAddress) {
        return (
            <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
                <h1 className="text-4xl font-bold mb-4">Bienvenido a World Idle</h1>
                <p className="mb-8 text-slate-400">Conecta tu billetera de World App para empezar a construir tu imperio.</p>
                <button 
                    onClick={handleSignIn} 
                    disabled={isAuthenticating}
                    className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isAuthenticating ? "Conectando..." : "Conectar Billetera"}
                </button>
            </div>
        );
    }

    if (!player?.isVerified) {
        return (
            <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
                <h1 className="text-3xl font-bold mb-4">¡Un paso más!</h1>
                <p className="mb-8 text-slate-400">Verifícate con World ID para cargar tu partida o empezar una nueva.</p>
                <WorldIDAuth onSuccessfulVerify={handleLoadGame} />
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
                        {player?.isVerified && <p className="text-cyan-400 font-semibold animate-pulse">🚀 Boost de Humanidad Activado 🚀</p>}
                    </div>
                    <HeaderStats
                        tokens={gameState.tokens}
                        tokensPerSecond={stats.tokensPerSecond}
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
                        autoclickerCPSValues={autoclickerCPSValues}
                    />
                </div>
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <PrestigeSection
                        prestigeBoost={prestigeBoost}
                        prestigeBalance={prestigeBalance}
                        handlePrestige={handlePrestige}
                        isPrestigeReady={isPrestigeReady}
                    />
                    <UpgradesSection
                        upgrades={upgrades}
                        gameState={gameState}
                        checkRequirements={checkRequirements}
                        purchaseUpgrade={purchaseUpgrade}
                        showRequirements={showRequirements}
                        formatNumber={formatNumber}
                    />
                    <AchievementsSection
                        achievements={achievements}
                        showRequirements={showRequirements}
                    />
                    <div className="text-center">
                        <button onClick={wipeSave} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 mx-auto">
                            <ArrowPathIcon className="w-4 h-4" />
                            Reiniciar Partida (Sin Prestigio)
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}