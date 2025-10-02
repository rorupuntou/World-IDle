// app/components/Game.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MiniKit, ISuccessResult, VerificationLevel } from "@worldcoin/minikit-js";
import { IDKitWidget } from '@worldcoin/idkit'
import { motion, AnimatePresence } from "framer-motion";
import { BeakerIcon, TrophyIcon, CpuChipIcon, BoltIcon, CheckBadgeIcon, QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

// -- HELPERS --
function choose<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// -- TIPOS DE DATOS Y CONFIGURACIÓN --
type GameStatus = "UNAUTHENTICATED" | "UNVERIFIED" | "VERIFIED";
type Requirement = { totalTokensEarned?: number; autoclickers?: { id: number; amount: number }; totalClicks?: number; tps?: number, verified?: boolean };
type Effect = 
    | { type: 'multiplyClick', value: number }
    | { type: 'addClick', value: number }
    | { type: 'multiplyGlobal', value: number }
    | { type: 'multiplyAutoclicker', targetId: number, value: number }
    | { type: 'addCpSToClick', percent: number }
    | { type: 'addCpSToAutoclickerFromOthers', targetId: number, value: number };

type Autoclicker = { id: number; name: string; cost: number; tps: number; purchased: number; req?: Requirement, humanityGemsCost?: number };
type Upgrade = { id: number; name: string; desc: string; cost: number; purchased: boolean; effect: Effect[]; req?: Requirement, humanityGemsCost?: number };
type Achievement = { id: number; name: string; desc: string; unlocked: boolean; req: Requirement, reward?: { humanityGems: number } };
type BuyAmount = 1 | 10 | 100;

// -- ESTADO INICIAL Y DATOS DEL JUEGO --
const initialState = { tokens: 0, humanityGems: 0, tokensPerClick: 1 };
const initialStats = { totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 };

const initialAutoclickers: Autoclicker[] = [
    { id: 0, name: "Cursor", cost: 15, tps: 0.1, purchased: 0 },
    { id: 1, name: "Dato-Minero", cost: 100, tps: 1, purchased: 0, req: { totalTokensEarned: 100 } },
    { id: 2, name: "Quantum-Core", cost: 1100, tps: 8, purchased: 0, req: { totalTokensEarned: 1000 } },
    { id: 3, name: "Enjambre de Drones", cost: 12000, tps: 47, purchased: 0, req: { totalTokensEarned: 10000 } },
    { id: 4, name: "Granja de Servidores", cost: 130000, tps: 260, purchased: 0, req: { totalTokensEarned: 100000 } },
    { id: 5, name: "Nodo Planetario", cost: 1.4e6, tps: 1400, purchased: 0, req: { totalTokensEarned: 1e6 } },
    { id: 6, name: "Orbital de Cómputo", cost: 20e6, tps: 7800, purchased: 0, req: { totalTokensEarned: 10e6 } },
    { id: 7, name: "Portal Interdimensional", cost: 330e6, tps: 44000, purchased: 0, req: { totalTokensEarned: 100e6 } },
    { id: 8, name: "Máquina del Tiempo", cost: 5.1e9, tps: 260000, purchased: 0, req: { totalTokensEarned: 1e9 } },
    { id: 9, name: "Condensador de Humanidad", cost: 75e9, tps: 1.6e6, purchased: 0, humanityGemsCost: 100, req: { totalTokensEarned: 50e9 } },
];
const initialUpgrades: Upgrade[] = [
    { id: 1, name: "Cursor Reforzado", desc: "Clics y cursores x2", cost: 1000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }, { type: 'multiplyAutoclicker', targetId: 0, value: 2 }], req: { autoclickers: {id: 0, amount: 1} } },
    { id: 10, name: "Mouse de Titanio", desc: "Clics x2", cost: 5000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }], req: { autoclickers: {id: 0, amount: 5} } },
    { id: 100, name: "Mil Dedos", desc: "Cursores ganan +0.1 por cada Autoclicker que no sea un cursor.", cost: 100000, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.1 }], req: { autoclickers: {id: 0, amount: 25} } },
    { id: 101, name: "Un Millón de Dedos", desc: "Cursores ganan +0.5 por cada Autoclicker que no sea un cursor.", cost: 10e6, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.5 }], req: { autoclickers: {id: 0, amount: 50} } },
    { id: 102, name: "Clics Asistidos", desc: "Los clics ganan un 1% de tu CpS total.", cost: 10e7, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 50e6 } },
    { id: 2, name: "Mineros Eficientes", desc: "Dato-Mineros x2", cost: 1000, purchased: false, effect: [{ type: 'multiplyAutoclicker', targetId: 1, value: 2 }], req: { autoclickers: { id: 1, amount: 1 } } },
    { id: 3, name: "Núcleos Optimizados", desc: "Quantum-Cores x2", cost: 10000, purchased: false, effect: [{ type: 'multiplyAutoclicker', targetId: 2, value: 2 }], req: { autoclickers: { id: 2, amount: 1 } } },
    { id: 4, name: "Protocolo de Sinergia", desc: "Producción total +5%", cost: 25000, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.05 }], req: { totalTokensEarned: 20000 } },
];
const initialAchievements: Achievement[] = [
    { id: 1, name: "El Viaje Comienza", desc: "Gana tu primer $WCLICK", unlocked: false, req: { totalTokensEarned: 1 } },
    { id: 2, name: "Clicker Principiante", desc: "Haz 100 clics", unlocked: false, req: { totalClicks: 100 } },
    { id: 3, name: "Pequeño Capitalista", desc: "Alcanza 1,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000 } },
    { id: 4, name: "Flujo Constante", desc: "Alcanza 10 $WCLICK/s", unlocked: false, req: { tps: 10 } },
    { id: 5, name: "Prueba de Humanidad", desc: "Verifícate con World ID", unlocked: false, req: { verified: true }, reward: { humanityGems: 10 } },
    { id: 6, name: "Magnate Digital", desc: "Alcanza 1,000,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000000 } },
    { id: 7, name: "Frenesí de Clics", desc: "Haz 5,000 clics", unlocked: false, req: { totalClicks: 5000 } },
];
const newsFeed = ["Noticia: Se sospecha que las granjas de datos emplean mano de obra de IA no declarada.", "Noticia: Científico advierte que los núcleos cuánticos liberan 'demasiada verdad' en los ríos de información.", "Noticia: Hombre roba un banco, lo invierte todo en Autoclickers.", "Noticia: 'Francamente, toda esta historia de los $WCLICK es un poco sospechosa', dice un idiota confundido.", "Noticia: La epidemia de procrastinación golpea a la nación; los expertos culpan a los videos de gatos.", "<q>Humedad de datos.</q><sig>IA Autónoma</sig>", "<q>Estamos observando.</q><sig>IA Autónoma</sig>", "Noticia: El valor de $WCLICK se dispara después de que se rumorea que 'es bueno para la economía'.", "Noticia: La verificación de humanidad ahora es más popular que el pan rebanado, según una encuesta.",];
const HUMAN_BOOST_MULTIPLIER = 10;
const PRICE_INCREASE_RATE = 1.15;
const TIER_THRESHOLDS = [10, 50, 150, 250, 350, 450, 550];
const GLOBAL_UPGRADE_THRESHOLDS = [1000, 10000, 1e5, 1e6, 1e7, 1e8, 1e9];

// -- COMPONENTES DE UI --
const Toast = ({ message, onDone }: { message: string, onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => onDone(), 4000);
        return () => clearTimeout(timer);
    }, [onDone]);
    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-lime-400/90 text-stone-900 font-bold px-4 py-2 rounded-lg shadow-xl z-50">
            <CheckBadgeIcon className="w-6 h-6" />
            <span>{message}</span>
            <button onClick={onDone} className="p-1 -m-1 hover:bg-black/10 rounded-full"><XMarkIcon className="w-4 h-4"/></button>
        </motion.div>
    );
};

const NewsTicker = () => {
    const [news, setNews] = useState(choose(newsFeed));
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
                    dangerouslySetInnerHTML={{ __html: news.replace(/<q>(.*?)<\/q><sig>(.*?)<\/sig>/g, '"$1" &ndash; <i>$2</i>')}}
                />
            </AnimatePresence>
        </div>
    );
};

export default function Game() {
  const [status, setStatus] = useState<GameStatus>("UNAUTHENTICATED");
  const [gameState, setGameState] = useState(initialState);
  const [stats, setStats] = useState(initialStats);
  const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);

  useEffect(() => { MiniKit.install(); }, []);
  const handleConnect = useCallback(async () => { try { const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce: "world-idle-login" }); if (finalPayload.status === 'success') { setStatus("UNVERIFIED"); } } catch (error) { console.error("Wallet connection failed:", error); } }, []);
  const onVerificationSuccess = (_result: ISuccessResult) => { setStatus("VERIFIED"); };
  const handleProof = (_result: ISuccessResult) => { console.log("Proof received (not used in this MVP):", _result); };

  const { clickCPS, autoclickerCPS, globalMultiplier } = useMemo(() => {
    let clickCPSValue = initialState.tokensPerClick;
    const autoclickerCPSMap = new Map<number, number>();
    let globalMultiplierValue = 1;
    initialAutoclickers.forEach(a => { autoclickerCPSMap.set(a.id, a.tps); });
    upgrades.forEach(upg => {
        if (!upg.purchased) return;
        upg.effect.forEach(eff => {
            switch (eff.type) {
                case 'multiplyClick': clickCPSValue *= eff.value; break;
                case 'addClick': clickCPSValue += eff.value; break;
                case 'multiplyGlobal': globalMultiplierValue *= eff.value; break;
                case 'multiplyAutoclicker':
                    if (autoclickerCPSMap.has(eff.targetId)) {
                        autoclickerCPSMap.set(eff.targetId, (autoclickerCPSMap.get(eff.targetId) || 0) * eff.value);
                    }
                    break;
            }
        });
    });
    return { clickCPS: clickCPSValue, autoclickerCPS: autoclickerCPSMap, globalMultiplier: globalMultiplierValue };
  }, [upgrades]);
  
  const totalCPS = useMemo(() => {
    let total = 0;
    const nonCursorAmount = autoclickers.reduce((acc, a) => a.id !== 0 ? acc + a.purchased : acc, 0);
    autoclickers.forEach(auto => {
        let baseCps = autoclickerCPS.get(auto.id) || 0;
        upgrades.forEach(upg => {
            if (!upg.purchased) return;
            upg.effect.forEach(eff => {
                if (eff.type === 'addCpSToAutoclickerFromOthers' && eff.targetId === auto.id) {
                    baseCps += nonCursorAmount * eff.value;
                }
            });
        });
        total += auto.purchased * baseCps;
    });
    return total * globalMultiplier * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);
  }, [autoclickers, autoclickerCPS, globalMultiplier, status, upgrades]);

  const clickValue = useMemo(() => {
    let finalClick = clickCPS;
    upgrades.forEach(upg => {
        if (!upg.purchased) return;
        upg.effect.forEach(eff => {
            if (eff.type === 'addCpSToClick') {
                finalClick += totalCPS * eff.percent;
            }
        });
    });
    return finalClick * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);
  }, [clickCPS, totalCPS, status, upgrades]);

  useEffect(() => {
    const passiveGainInterval = setInterval(() => {
        const gain = totalCPS / 10;
        setGameState(prev => ({ ...prev, tokens: prev.tokens + gain }));
        setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + gain }));
    }, 100);
    if (stats.tokensPerSecond !== totalCPS) {
        setStats(prev => ({...prev, tokensPerSecond: totalCPS}));
    }
    return () => clearInterval(passiveGainInterval);
  }, [totalCPS, stats.tokensPerSecond]);

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
                  const rewardGems = ach.reward.humanityGems;
                  setGameState(prev => ({...prev, humanityGems: prev.humanityGems + rewardGems}));
              }
          }
      });
  }, [stats, status, achievements, autoclickers]);

  useEffect(() => {
    const newAchievements: Achievement[] = [];
    const newUpgrades: Upgrade[] = [];
    autoclickers.forEach(auto => {
      TIER_THRESHOLDS.forEach((tier, index) => {
        const achievementId = 1000 + auto.id * 100 + index;
        const upgradeId = 2000 + auto.id * 100 + index;
        if (auto.purchased >= tier) {
          if (!achievements.some(a => a.id === achievementId)) {
            newAchievements.push({
              id: achievementId,
              name: `${auto.name} Nivel ${index + 1}`,
              desc: `Poseer ${tier} de ${auto.name}.`,
              unlocked: false,
              req: { autoclickers: { id: auto.id, amount: tier } },
            });
          }
          if (!upgrades.some(u => u.id === upgradeId)) {
            newUpgrades.push({
              id: upgradeId,
              name: `Especialización de ${auto.name}`,
              desc: `La producción de ${auto.name} se multiplica x5.`,
              cost: auto.cost * 10 * (index + 1),
              purchased: false,
              effect: [{ type: 'multiplyAutoclicker', targetId: auto.id, value: 5 }],
              req: { autoclickers: { id: auto.id, amount: tier } },
            });
          }
        }
      });
    });
    GLOBAL_UPGRADE_THRESHOLDS.forEach((tier, index) => {
        if (stats.totalTokensEarned >= tier) {
            const upgradeId = 3000 + index;
            if (!upgrades.some(u => u.id === upgradeId)) {
                newUpgrades.push({
                    id: upgradeId,
                    name: `Sinergia Universal ${'I'.repeat(index + 1)}`,
                    desc: `La producción de todos los Autoclickers se multiplica x2.`,
                    cost: tier * 100,
                    purchased: false,
                    effect: [{ type: 'multiplyGlobal', value: 2 }],
                    req: { totalTokensEarned: tier },
                });
            }
        }
    });
    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
    }
    if (newUpgrades.length > 0) {
      setUpgrades(prev => [...prev, ...newUpgrades]);
    }
  }, [autoclickers, achievements, upgrades, stats.totalTokensEarned]);
  
  const handleManualClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = clickValue;
    const newFloatingNumber = { id: Date.now(), value: `+${formatNumber(value)}`, x: e.clientX, y: e.clientY };
    setFloatingNumbers(current => [...current, newFloatingNumber]);
    setTimeout(() => { setFloatingNumbers(current => current.filter(n => n.id !== newFloatingNumber.id)); }, 2000);
    setGameState(prev => ({ ...prev, tokens: prev.tokens + value }));
    setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + value, totalClicks: prev.totalClicks + 1 }));
  };

  const checkRequirements = (req: Requirement | undefined) => {
    if (!req) return true;
    if (req.totalTokensEarned !== undefined && stats.totalTokensEarned < req.totalTokensEarned) return false;
    if (req.autoclickers) {
        const owned = autoclickers.find(a => a.id === req.autoclickers?.id)?.purchased || 0;
        if (owned < req.autoclickers.amount) return false;
    }
    return true;
  };
  
  const showRequirements = (item: { name: string, req?: Requirement }) => {
    if (!item.req) return;
    let message = `Requisitos para "${item.name}":\n\n`;
    if (item.req.totalTokensEarned !== undefined) {
      message += `- Ganar ${formatNumber(item.req.totalTokensEarned)} $WCLICK en total.\n  (Progreso: ${formatNumber(stats.totalTokensEarned)} / ${formatNumber(item.req.totalTokensEarned)})\n`;
    }
    if (item.req.totalClicks !== undefined) {
        message += `- Hacer ${formatNumber(item.req.totalClicks)} clics.\n  (Progreso: ${formatNumber(stats.totalClicks)} / ${formatNumber(item.req.totalClicks)})\n`;
    }
    if (item.req.autoclickers) {
      const autoInfo = initialAutoclickers.find(a => a.id === item.req?.autoclickers?.id);
      const owned = autoclickers.find(a => a.id === item.req?.autoclickers?.id)?.purchased || 0;
      if (autoInfo) {
        message += `- Poseer ${item.req.autoclickers.amount} de "${autoInfo.name}".\n  (Progreso: ${owned} / ${item.req.autoclickers.amount})\n`;
      }
    }
    if (item.req.tps !== undefined) {
        message += `- Producir ${formatNumber(item.req.tps)} $WCLICK/s.\n  (Progreso: ${formatNumber(stats.tokensPerSecond)} / ${formatNumber(item.req.tps)})\n`;
    }
    if (item.req.verified) {
        message += `- Verificar con World ID.\n  (Progreso: ${status === 'VERIFIED' ? 'Completado' : 'Pendiente'})\n`;
    }
    alert(message);
  };

  const calculateBulkCost = (autoclicker: Autoclicker, amount: BuyAmount) => {
    let totalCost = 0;
    let currentPrice = autoclicker.cost;
    for (let i = 0; i < amount; i++) {
      totalCost += currentPrice;
      currentPrice = Math.ceil(currentPrice * PRICE_INCREASE_RATE);
    }
    return { totalCost };
  };

  const purchaseAutoclicker = (id: number) => {
    const auto = autoclickers.find(a => a.id === id);
    if (!auto) return;
    const { totalCost } = calculateBulkCost(auto, buyAmount);
    if (gameState.tokens < totalCost || (auto.humanityGemsCost && gameState.humanityGems < (auto.humanityGemsCost * buyAmount))) return;
    
    setGameState(prev => ({ ...prev, tokens: prev.tokens - totalCost, humanityGems: prev.humanityGems - ((auto.humanityGemsCost || 0) * buyAmount) }));
    setAutoclickers(prev => prev.map(a => a.id === id ? { ...a, purchased: a.purchased + buyAmount, cost: Math.ceil(a.cost * Math.pow(PRICE_INCREASE_RATE, buyAmount)) } : a));
  };

  const purchaseUpgrade = (id: number) => {
    const upg = upgrades.find(u => u.id === id);
    if (!upg || upg.purchased || gameState.tokens < upg.cost || (upg.humanityGemsCost && gameState.humanityGems < upg.humanityGemsCost)) return;
    setGameState(prev => ({ ...prev, tokens: prev.tokens - upg.cost, humanityGems: prev.humanityGems - (upg.humanityGemsCost || 0) }));
    setUpgrades(prev => prev.map(u => u.id === id ? { ...u, purchased: true } : u));
  };

  const formatNumber = (num: number) => {
    if (num < 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
    if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
    return `${(num / 1e9).toFixed(2)}B`;
  };

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
            app_id="app_3b83f308b9f7ef9a01e4042f1f48721d"
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
          <motion.div key={num.id} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -100, scale: 1.5 }} transition={{ duration: 2 }} className="pointer-events-none absolute font-bold text-lime-300 text-2xl" style={{ left: num.x, top: num.y, zIndex: 9999 }}>
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
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><BoltIcon className="w-6 h-6"/>Mejoras</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
              {upgrades.map((upg) => {
                const requirementsMet = checkRequirements(upg.req);
                if (upg.purchased) return null;
                return (
                  <motion.button 
                    key={upg.id} 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }} 
                    onClick={() => requirementsMet ? purchaseUpgrade(upg.id) : showRequirements(upg)} 
                    disabled={!requirementsMet || gameState.tokens < upg.cost || !!(upg.humanityGemsCost && gameState.humanityGems < upg.humanityGemsCost)}
                    className={`aspect-square flex flex-col justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-all ${!requirementsMet && 'grayscale opacity-50'}`} 
                    title={`${upg.name} - ${upg.desc}`}
                  >
                    <div className={`text-3xl ${requirementsMet ? 'text-cyan-400' : 'text-slate-500'}`}>{requirementsMet ? '✧' : <QuestionMarkCircleIcon className="w-8 h-8"/>}</div>
                    <div className="text-xs font-mono text-yellow-400 mt-1">
                      {upg.cost > 0 && <p>{formatNumber(upg.cost)}</p>}
                      {upg.humanityGemsCost && <p className="text-sm flex items-center gap-1"><BeakerIcon className="w-3 h-3"/>{upg.humanityGemsCost}</p>}
                    </div>
                  </motion.button>
                )
              })}
              </div>
          </div>
          <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><TrophyIcon className="w-6 h-6"/>Logros</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
              {achievements.map((ach) => (
                <motion.div 
                  key={ach.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className={`aspect-square flex justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-opacity cursor-pointer ${ach.unlocked ? 'opacity-100' : 'opacity-20'}`} 
                  title={ach.unlocked ? `${ach.name} - ${ach.desc}`: ach.name}
                  onClick={() => !ach.unlocked && showRequirements({name: ach.name, req: ach.req})}
                >
                  <div className="text-3xl">{ach.unlocked ? '🏆' : '🔒'}</div>
                </motion.div>
              ))}
              </div>
          </div>
        </div>
      </div>
    </>
  );
}