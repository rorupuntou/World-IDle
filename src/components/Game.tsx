// app/components/Game.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MiniKit, ISuccessResult, VerificationLevel } from "@worldcoin/minikit-js";
import { IDKitWidget } from '@worldcoin/idkit'
import { motion, AnimatePresence } from "framer-motion";
import { BeakerIcon, CheckBadgeIcon, QuestionMarkCircleIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ethers } from "ethers";
import { GameStatus, Requirement, Effect, Autoclicker, Upgrade, Achievement, BuyAmount, GameState } from "@/app/types";
import { prestigeTokenContract, gameManagerContract } from "@/app/contracts/config";
import { useGameSave } from "@/app/hooks/useGameSave";
import { 
    initialState, initialAutoclickers, newsFeed, HUMAN_BOOST_MULTIPLIER, 
    PRICE_INCREASE_RATE, TIER_THRESHOLDS, GLOBAL_UPGRADE_THRESHOLDS, SAVE_KEY 
} from "@/app/data";
import HeaderStats from "./HeaderStats";
import UpgradesSection from "./UpgradesSection";
import AchievementsSection from "./AchievementsSection";
import PrestigeSection from "./PrestigeSection";
import AutoclickersSection from "./AutoclickersSection";

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
    const [status, setStatus] = useState<GameStatus>("UNAUTHENTICATED");
    const {
        gameState, setGameState, stats, setStats, autoclickers, setAutoclickers,
        upgrades, setUpgrades, achievements, setAchievements, saveGame
    } = useGameSave();

    const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);
    const [prestigeBalance, setPrestigeBalance] = useState(0);
    const [isPrestigeReady, setIsPrestigeReady] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    // -- EFECTOS Y LÓGICA PRINCIPAL --

    // Carga de datos externos y guardado automático
    useEffect(() => {
        const loadBalanceAndSetupSaving = async () => {
            if ((window as any).ethereum) {
                try {
                    const provider = new ethers.BrowserProvider((window as any).ethereum);
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    setWalletAddress(address);
                    const tokenContract = new ethers.Contract(prestigeTokenContract.address, prestigeTokenContract.abi, provider);
                    const balance = await tokenContract.balanceOf(address);
                    setPrestigeBalance(Number(ethers.formatUnits(balance, 18)));
                    console.log("Balance de Prestigio cargado:", Number(ethers.formatUnits(balance, 18)));
                } catch (e) {
                    console.error("No se pudo conectar a la wallet para leer el balance:", e);
                }
            }
        };

        loadBalanceAndSetupSaving();
        const saveInterval = setInterval(saveGame, 15000);
        window.addEventListener('beforeunload', saveGame);

        return () => {
            clearInterval(saveInterval);
            window.removeEventListener('beforeunload', saveGame);
        };
    }, [saveGame]);

    // Inicialización de World ID
    useEffect(() => { MiniKit.install(); }, []);

    // Formateo de números (memoizado para estabilidad)
    const formatNumber = useCallback((num: number) => {
        if (num < 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
        if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
        if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
        return `${(num / 1e12).toFixed(2)}T`;
    }, []);

    // -- CÁLCULOS DE PRODUCCIÓN (CPS) --
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

        const humanityBoost = status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1;
        const finalGlobalMultiplier = globalMultiplier * humanityBoost * (1 + prestigeBoost / 100);
        const finalTotalCPS = totalAutoclickerCPS * finalGlobalMultiplier;

        let baseClickValue = (initialState.tokensPerClick * clickMultiplier) + clickAddition;
        clickCpSUpgrades.forEach(eff => {
            if (eff.type === 'addCpSToClick') baseClickValue += finalTotalCPS * eff.percent;
        });
        const finalClickValue = baseClickValue * humanityBoost;

        return { totalCPS: finalTotalCPS, clickValue: finalClickValue, autoclickerCPSValues: autoclickerCPS };
    }, [upgrades, autoclickers, status, prestigeBoost]);

    // -- EFECTOS SECUNDARIOS DEL JUEGO --

    // Ganancia pasiva y actualización de stats
    useEffect(() => {
        const passiveGainInterval = setInterval(() => {
            const gain = totalCPS / 10;
            setGameState(prev => ({ ...prev, tokens: prev.tokens + gain }));
            setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + gain }));
        }, 100);

        if (stats.tokensPerSecond !== totalCPS) {
            setStats(prev => ({ ...prev, tokensPerSecond: totalCPS }));
        }

        return () => clearInterval(passiveGainInterval);
    }, [totalCPS, setGameState, setStats, stats.tokensPerSecond]);

    // Comprobación de logros
    useEffect(() => {
        achievements.forEach(ach => {
            if (ach.unlocked) return;
            let conditionMet = false;
            if (ach.req.totalTokensEarned !== undefined && stats.totalTokensEarned >= ach.req.totalTokensEarned) conditionMet = true;
            if (ach.req.totalClicks !== undefined && stats.totalClicks >= ach.req.totalClicks) conditionMet = true;
            if (ach.req.tps !== undefined && stats.tokensPerSecond >= ach.req.tps) conditionMet = true;
            if (ach.req.verified && status === "VERIFIED") conditionMet = true;
            if (ach.req.autoclickers) {
                const owned = autoclickers.find(a => a.id === ach.req.autoclickers?.id)?.purchased || 0;
                if (owned >= ach.req.autoclickers.amount) conditionMet = true;
            }

            if (conditionMet) {
                setAchievements(prev => prev.map(a => a.id === ach.id ? { ...a, unlocked: true } : a));
                setToast(`Logro: ${ach.name}`);
                if (ach.reward?.humanityGems) {
                    setGameState(prev => ({ ...prev, humanityGems: prev.humanityGems + ach.reward!.humanityGems }));
                }
            }
        });
    }, [stats, status, autoclickers, achievements, setAchievements, setGameState, setToast]);

    // Generación dinámica de mejoras y logros
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

    // Habilitar prestigio
    useEffect(() => {
        if (stats.totalTokensEarned >= 1e9) { // Umbral para prestigio
            setIsPrestigeReady(true);
        }
    }, [stats.totalTokensEarned]);

    // -- MANEJADORES DE EVENTOS Y ACCIONES --

    const handleManualClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const value = clickValue;
        const newFloatingNumber = { id: Date.now(), value: `+${formatNumber(value)}`, x: e.clientX, y: e.clientY };
        setFloatingNumbers(current => [...current, newFloatingNumber]);
        setTimeout(() => { setFloatingNumbers(current => current.filter(n => n.id !== newFloatingNumber.id)); }, 2000);
        setGameState(prev => ({ ...prev, tokens: prev.tokens + value }));
        setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + value, totalClicks: prev.totalClicks + 1 }));
    }, [clickValue, formatNumber, setGameState, setStats]);

    const checkRequirements = useCallback((req: Requirement | undefined) => {
        if (!req) return true;
        if (req.totalTokensEarned !== undefined && stats.totalTokensEarned < req.totalTokensEarned) return false;
        if (req.totalClicks !== undefined && stats.totalClicks < req.totalClicks) return false;
        if (req.tps !== undefined && stats.tokensPerSecond < req.tps) return false;
        if (req.verified && status !== "VERIFIED") return false;
        if (req.autoclickers) {
            const owned = autoclickers.find(a => a.id === req.autoclickers?.id)?.purchased || 0;
            if (owned < req.autoclickers.amount) return false;
        }
        return true;
    }, [stats, status, autoclickers]);

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
        if (item.req.verified) message += `- Verificar con World ID.\n  (Progreso: ${status === 'VERIFIED' ? 'Completado' : 'Pendiente'})\n`;
        alert(message);
    }, [stats, status, autoclickers, formatNumber]);

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

        setGameState(prev => ({ ...prev, tokens: prev.tokens - totalTokenCost, humanityGems: prev.humanityGems - totalGemCost }));
        setAutoclickers(prev => prev.map(a => a.id === id ? { ...a, purchased: a.purchased + buyAmount, cost: Math.ceil(a.cost * Math.pow(PRICE_INCREASE_RATE, buyAmount)) } : a));
    }, [autoclickers, buyAmount, calculateBulkCost, gameState, setGameState, setAutoclickers]);

    const purchaseUpgrade = useCallback((id: number) => {
        const upg = upgrades.find(u => u.id === id);
        if (!upg || upg.purchased || gameState.tokens < upg.cost || (upg.humanityGemsCost && gameState.humanityGems < upg.humanityGemsCost)) return;

        setGameState(prev => ({ ...prev, tokens: prev.tokens - upg.cost, humanityGems: prev.humanityGems - (upg.humanityGemsCost || 0) }));
        setUpgrades(prev => prev.map(u => u.id === id ? { ...u, purchased: true } : u));
    }, [upgrades, gameState, setGameState, setUpgrades]);

    const wipeSave = useCallback(() => {
        if (window.confirm("¿Estás seguro de que quieres borrar tu progreso? Esta acción NO te dará tokens de Prestigio y no se puede deshacer.")) {
            localStorage.removeItem(SAVE_KEY);
            window.location.reload();
        }
    }, []);

    const onVerificationSuccess = useCallback((_result: ISuccessResult) => { setStatus("VERIFIED"); }, []);
    const handleProof = useCallback((_result: ISuccessResult) => { }, []);
    const handleConnect = useCallback(async () => {
        try {
            await MiniKit.commandsAsync.walletAuth({ nonce: "world-idle-login" });
            setStatus("UNVERIFIED");
            window.location.reload();
        } catch (error) {
            console.error("Wallet connection failed:", error);
        }
    }, []);

    const handlePrestige = useCallback(async () => {
        if (!isPrestigeReady || !walletAddress) return;
        if (!window.confirm("¿Estás seguro de que quieres reiniciar para reclamar tus tokens de Prestigio? Tu progreso actual se borrará, pero empezarás la siguiente partida con un boost permanente.")) return;

        try {
            if (!process.env.NEXT_PUBLIC_SIGNER_PRIVATE_KEY) {
                throw new Error("La clave privada del firmante no está configurada en las variables de entorno.");
            }
            const signer = new ethers.Wallet(process.env.NEXT_PUBLIC_SIGNER_PRIVATE_KEY);
            const totalTokensInt = BigInt(Math.floor(stats.totalTokensEarned));
            const messageHash = ethers.solidityPackedKeccak256(["address", "uint256"], [walletAddress, totalTokensInt]);
            const signature = await signer.signMessage(ethers.getBytes(messageHash));
            const gameManagerInterface = new ethers.Interface(gameManagerContract.abi);
            const calldata = gameManagerInterface.encodeFunctionData("claimPrestigeReward", [totalTokensInt, signature]);

            const tx = { to: gameManagerContract.address, data: calldata, value: '0' };
            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(tx);

            if (finalPayload.status === 'success') {
                setToast("¡Recompensa de Prestigio reclamada! Reiniciando partida...");
                setTimeout(() => {
                    localStorage.removeItem(SAVE_KEY);
                    window.location.reload();
                }, 3000);
            } else {
                alert("La transacción de Prestigio falló.");
            }
        } catch (error) {
            console.error("Error al ejecutar el Prestigio:", error);
            alert(`Ocurrió un error al procesar el Prestigio. ${error instanceof Error ? error.message : ''}`);
        }
    }, [isPrestigeReady, walletAddress, stats.totalTokensEarned, setToast]);

  // -- RENDERIZADO --
  if (status !== "VERIFIED") {
    return status === "UNAUTHENTICATED" ? (
      <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
        <h1 className="text-4xl font-bold mb-4">Bienvenido a World Idle</h1>
        <p className="mb-8 text-slate-400">Conecta tu World App para empezar a construir tu imperio.</p>
        <button onClick={handleConnect} className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg">
          Conectar Wallet
        </button>
      </div>
    ) : (
      <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
        <h1 className="text-3xl font-bold mb-4">¡Un paso más!</h1>
        <p className="mb-8 text-slate-400">Verifícate como humano con World ID para obtener un boost de producción x10.</p>
        <IDKitWidget
          app_id={process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`}
          action="play-world-idle"
            onSuccess={onVerificationSuccess}
            handleVerify={handleProof}
            verification_level={VerificationLevel.Orb}
        >
          {({ open }) =>
            <button onClick={open} className="w-full bg-lime-500/80 hover:bg-lime-500 text-stone-900 font-bold py-3 px-6 rounded-lg text-lg">
              Verificar con World ID
            </button>
          }
        </IDKitWidget>
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
            <p className="text-cyan-400 font-semibold animate-pulse">🚀 Boost de Humanidad Activado 🚀</p>
          </div>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl text-center border border-slate-700 sticky top-4 z-20">
              <h2 className="text-5xl font-mono tracking-wider">{formatNumber(gameState.tokens)}</h2>
              <p className="text-sm text-slate-400">$WCLICK</p>
              <div className="flex justify-center items-center gap-6 mt-2">
                  <p className="text-md text-lime-400">+{formatNumber(stats.tokensPerSecond)}/s</p>
                  <div className="flex items-center gap-2 text-yellow-400">
                      <BeakerIcon className="w-5 h-5" />
                      <p className="font-mono text-lg">{gameState.humanityGems}</p>
                  </div>
              </div>
          </motion.div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleManualClick} className="w-full bg-cyan-500/80 hover:bg-cyan-500/100 text-white font-bold py-6 rounded-xl text-2xl shadow-lg shadow-cyan-500/20 border border-cyan-400">
            Click! (+{formatNumber(clickValue)})
          </motion.button>
          <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold flex items-center gap-2"><CpuChipIcon className="w-6 h-6"/>Autoclickers</h3>
                <div className="flex items-center bg-slate-500/10 border border-slate-700 rounded-lg">
                    {( [1, 10, 100] as BuyAmount[]).map(amount => (
                        <button 
                            key={amount}
                            onClick={() => setBuyAmount(amount)}
                            className={`px-4 py-1 text-sm font-bold rounded-md transition-colors ${buyAmount === amount ? 'bg-cyan-500/80 text-white' : 'text-slate-400 hover:bg-slate-500/20'}`}
                        >
                            x{amount}
                        </button>
                    ))}
                </div>
              </div>
              {autoclickers.map((auto) => {
                if (!checkRequirements(auto.req)) return null;
                const { totalCost } = calculateBulkCost(auto, buyAmount);
                return (
                    <motion.button key={auto.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => purchaseAutoclicker(auto.id)} disabled={gameState.tokens < totalCost || !!(auto.humanityGemsCost && gameState.humanityGems < (auto.humanityGemsCost * buyAmount))} className="w-full flex justify-between items-center bg-slate-500/10 backdrop-blur-sm p-3 rounded-lg border border-slate-700 hover:bg-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-500/10">
                    <div className="text-left">
                        <p className="font-bold">{auto.name} <span className="text-slate-400 text-sm">({auto.purchased})</span></p>
                        <p className="text-xs text-lime-400">+{formatNumber(autoclickerCPS.get(auto.id) || 0)}/s cada uno</p>
                    </div>
                    <div className="text-right font-mono text-yellow-400">
                        <p>{formatNumber(totalCost)}</p>
                        {auto.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1"><BeakerIcon className="w-4 h-4"/>{auto.humanityGemsCost * buyAmount}</p>}
                    </div>
                    </motion.button>
                )
              })}
          </div>
        </div>
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><StarIcon className="w-6 h-6 text-yellow-400"/>Prestigio</h3>
            <p className="text-sm text-slate-300">
              Tu bonus de prestigio actual es de <b className="text-yellow-300">+{prestigeBoost.toFixed(2)}%</b> a todas tus ganancias.
            </p>
            <p className="text-xs text-slate-400 mt-1">Se basa en tu saldo de {prestigeBalance.toLocaleString()} $PRESTIGE.</p>
            <motion.button
              onClick={handlePrestige}
              disabled={!isPrestigeReady}
              whileHover={{ scale: 1.05 }}
              className="w-full mt-4 bg-yellow-500/80 hover:bg-yellow-500/100 text-stone-900 font-bold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/80"
            >
              Reiniciar para Prestigio
            </motion.button>
          </div>
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