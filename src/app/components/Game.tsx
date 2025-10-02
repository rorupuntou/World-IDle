// app/components/Game.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MiniKit, ISuccessResult, VerificationLevel } from "@worldcoin/minikit-js";
import { IDKitWidget } from '@worldcoin/idkit'
import { motion, AnimatePresence } from "framer-motion";
import { BeakerIcon, TrophyIcon, CpuChipIcon, BoltIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

// -- TIPOS DE DATOS Y CONFIGURACIÓN --
type GameStatus = "UNAUTHENTICATED" | "UNVERIFIED" | "VERIFIED";
type Requirement = { tokensEarned?: number; autoclickers?: { id: number; amount: number } };

const initialState = { tokens: 0, humanityGems: 0, tokensPerClick: 1, tokensPerSecond: 0 };
const initialStats = { totalTokensEarned: 0, totalClicks: 0 };
const initialAutoclickers = [
    { id: 1, name: "Dato-Minero", cost: 15, tps: 0.1, purchased: 0 },
    { id: 2, name: "Quantum-Core", cost: 100, tps: 1, purchased: 0, req: { tokensEarned: 100 } },
    { id: 3, name: "IA Autónoma", cost: 1100, tps: 8, purchased: 0, req: { tokensEarned: 1000 } },
    { id: 4, name: "Enjambre de Drones", cost: 12000, tps: 47, purchased: 0, req: { tokensEarned: 10000 } },
    { id: 5, name: "Granja de Servidores", cost: 130000, tps: 260, purchased: 0, req: { tokensEarned: 100000 } },
    { id: 6, name: "Nodo Planetario", cost: 1.4e6, tps: 1400, purchased: 0, req: { tokensEarned: 1e6 } },
    { id: 7, name: "Orbital de Cómputo", cost: 20e6, tps: 7800, purchased: 0, humanityGemsCost: 10, req: { tokensEarned: 10e6 } },
];
const initialUpgrades = [
    { id: 1, name: "Cursor Reforzado", desc: "Clics x2", cost: 100, purchased: false, effect: { type: 'multiply', target: 'click', value: 2 }, req: { tokensEarned: 50 } },
    { id: 2, name: "Mineros Eficientes", desc: "Dato-Mineros x2", cost: 500, purchased: false, effect: { type: 'multiply', target: 'autoclicker', targetId: 1, value: 2 }, req: { autoclickers: { id: 1, amount: 5 } } },
    { id: 3, name: "Manos de Diamante", desc: "Clics x2", cost: 1000, purchased: false, effect: { type: 'multiply', target: 'click', value: 2 }, req: { tokensEarned: 500 } },
    { id: 4, name: "Protocolo de Sinergia", desc: "Producción total +5%", cost: 10000, purchased: false, effect: { type: 'multiply', target: 'all', value: 1.05 }, req: { tokensEarned: 5000 } },
    { id: 5, name: "Núcleos Optimizados", desc: "Quantum-Cores x2", cost: 5000, purchased: false, effect: { type: 'multiply', target: 'autoclicker', targetId: 2, value: 2 }, req: { autoclickers: { id: 2, amount: 5 } } },
    { id: 6, name: "Conciencia Colectiva IA", desc: "IAs Autónomas x2", cost: 50000, purchased: false, effect: { type: 'multiply', target: 'autoclicker', targetId: 3, value: 2 }, req: { autoclickers: { id: 3, amount: 10 } } },
    { id: 7, name: "Gema de Productividad", desc: "Producción total +10%", cost: 0, humanityGemsCost: 20, purchased: false, effect: { type: 'multiply', target: 'all', value: 1.10 }, req: { tokensEarned: 1e6 } },
];
const initialAchievements = [
    { id: 1, name: "El Viaje Comienza", desc: "Gana tu primer $WCLICK", unlocked: false, req: { totalTokensEarned: 1 } },
    { id: 2, name: "Clicker Principiante", desc: "Haz 100 clics", unlocked: false, req: { totalClicks: 100 } },
    { id: 3, name: "Pequeño Capitalista", desc: "Alcanza 1,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000 } },
    { id: 4, name: "Flujo Constante", desc: "Alcanza 10 $WCLICK/s", unlocked: false, req: { tps: 10 } },
    { id: 5, name: "Prueba de Humanidad", desc: "Verifícate con World ID", unlocked: false, req: { verified: true }, reward: { humanityGems: 10 } },
    { id: 6, name: "Magnate Digital", desc: "Alcanza 1,000,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000000 } },
];
const HUMAN_BOOST_MULTIPLIER = 10;

const Toast = ({ message, onDone }: { message: string, onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => onDone(), 3000);
        return () => clearTimeout(timer);
    }, [onDone]);
    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-lime-400/90 text-stone-900 font-bold px-4 py-2 rounded-lg shadow-xl z-50">
            <CheckBadgeIcon className="w-6 h-6" />
            <span>{message}</span>
        </motion.div>
    );
};

export default function Game() {
  const [status, setStatus] = useState<GameStatus>("UNAUTHENTICATED");
  const [gameState, setGameState] = useState(initialState);
  const [stats, setStats] = useState(initialStats);
  const [autoclickers, setAutoclickers] = useState(initialAutoclickers);
  const [upgrades, setUpgrades] = useState(initialUpgrades);
  const [achievements, setAchievements] = useState(initialAchievements);
  const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { MiniKit.install(); }, []);

  const handleConnect = useCallback(async () => { 
      try {
          const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce: "world-idle-login" });
          if (finalPayload.status === 'success') { setStatus("UNVERIFIED"); }
      } catch (error) { console.error("Wallet connection failed:", error); }
  }, []);

  const onVerificationSuccess = (_result: ISuccessResult) => { setStatus("VERIFIED"); };
  const handleProof = (_result: ISuccessResult) => { console.log("Proof received (not used in this MVP):", _result); };

  const multipliers = useMemo(() => {
      const click = upgrades.filter(u => u.purchased && u.effect.target === 'click').reduce((acc, u) => acc * u.effect.value, 1);
      const all = upgrades.filter(u => u.purchased && u.effect.target === 'all').reduce((acc, u) => acc * u.effect.value, 1);
      const autoclickerSpecific: Record<number, number> = {};
      initialAutoclickers.forEach(g => {
          autoclickerSpecific[g.id] = upgrades.filter(u => u.purchased && u.effect.target === 'autoclicker' && u.effect.targetId === g.id).reduce((acc, u) => acc * u.effect.value, 1);
      });
      return { click, all, autoclickerSpecific };
  }, [upgrades]);

  useEffect(() => {
      const baseTPS = autoclickers.reduce((acc, auto) => {
          const specificMultiplier = multipliers.autoclickerSpecific[auto.id] || 1;
          return acc + (auto.purchased * auto.tps * specificMultiplier);
      }, 0);
      setGameState(prev => ({ ...prev, tokensPerSecond: baseTPS }));
  }, [autoclickers, multipliers.autoclickerSpecific]);

  useEffect(() => {
      const effectiveTPS = gameState.tokensPerSecond * multipliers.all * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);
      const interval = setInterval(() => {
          setGameState(prev => ({ ...prev, tokens: prev.tokens + effectiveTPS }));
          setStats(prev => ({ ...prev, totalTokensEarned: prev.totalTokensEarned + effectiveTPS }));
      }, 1000);
      return () => clearInterval(interval);
  }, [gameState.tokensPerSecond, multipliers.all, status]);

  useEffect(() => {
      const effectiveTPS = gameState.tokensPerSecond * multipliers.all * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);
      achievements.forEach(ach => {
          if (ach.unlocked) return;
          let conditionMet = false;
          if (ach.req.totalTokensEarned && stats.totalTokensEarned >= ach.req.totalTokensEarned) conditionMet = true;
          if (ach.req.totalClicks && stats.totalClicks >= ach.req.totalClicks) conditionMet = true;
          if (ach.req.tps && effectiveTPS >= ach.req.tps) conditionMet = true;
          if (ach.req.verified && status === "VERIFIED") conditionMet = true;
          if (conditionMet) {
              setAchievements(prev => prev.map(a => a.id === ach.id ? { ...a, unlocked: true } : a));
              setToast(`Logro: ${ach.name}`);
              if (ach.reward?.humanityGems) {
                  setGameState(prev => ({...prev, humanityGems: prev.humanityGems + ach.reward.humanityGems}));
              }
          }
      });
  }, [stats, gameState.tokensPerSecond, status, achievements, multipliers.all]);
  
  const handleManualClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const effectiveTPC = gameState.tokensPerClick * multipliers.click * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);
    const newFloatingNumber = { id: Date.now(), value: `+${effectiveTPC.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, x: e.clientX, y: e.clientY };
    setFloatingNumbers(current => [...current, newFloatingNumber]);
    setTimeout(() => { setFloatingNumbers(current => current.filter(n => n.id !== newFloatingNumber.id)); }, 2000);
    setGameState(prev => ({ ...prev, tokens: prev.tokens + effectiveTPC }));
    setStats(prev => ({ totalTokensEarned: prev.totalTokensEarned + effectiveTPC, totalClicks: prev.totalClicks + 1 }));
  };

  const checkRequirements = (req: Requirement | undefined) => {
    if (!req) return true;
    if (req.tokensEarned && stats.totalTokensEarned < req.tokensEarned) return false;
    if (req.autoclickers) {
        const owned = autoclickers.find(a => a.id === req.autoclickers?.id)?.purchased || 0;
        if (owned < req.autoclickers.amount) return false;
    }
    return true;
  };

  const purchaseAutoclicker = (id: number) => {
    const auto = autoclickers.find(a => a.id === id);
    if (!auto || gameState.tokens < auto.cost || (auto.humanityGemsCost && gameState.humanityGems < auto.humanityGemsCost)) return;
    setGameState(prev => ({ ...prev, tokens: prev.tokens - auto.cost, humanityGems: prev.humanityGems - (auto.humanityGemsCost || 0) }));
    setAutoclickers(prev => prev.map(a => a.id === id ? { ...a, purchased: a.purchased + 1, cost: Math.ceil(a.cost * 1.15) } : a));
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
  if (status === "UNAUTHENTICATED") {
    return (
      <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
        <h1 className="text-4xl font-bold mb-4">Bienvenido a World Idle</h1>
        <p className="mb-8 text-slate-400">Conecta tu World App para empezar a construir tu imperio.</p>
        <button onClick={handleConnect} className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg">
          Conectar Wallet
        </button>
      </div>
    );
  }
  
  if (status === "UNVERIFIED") {
    return (
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

  const effectiveTPS = gameState.tokensPerSecond * multipliers.all * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);
  const effectiveTPC = gameState.tokensPerClick * multipliers.click * (status === "VERIFIED" ? HUMAN_BOOST_MULTIPLIER : 1);

  return (
    <>
      <AnimatePresence>
        {floatingNumbers.map(num => (
          <motion.div key={num.id} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -100, scale: 1.5 }} transition={{ duration: 2 }} className="pointer-events-none absolute font-bold text-lime-300 text-2xl" style={{ left: num.x, top: num.y, zIndex: 9999 }}>
            {num.value}
          </motion.div>
        ))}
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
      <div className="w-full max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-slate-200 to-slate-400 text-transparent bg-clip-text">World Idle</h1>
            <p className="text-cyan-400 font-semibold animate-pulse">🚀 Boost de Humanidad Activado 🚀</p>
          </div>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl text-center border border-slate-700">
              <h2 className="text-5xl font-mono tracking-wider">{formatNumber(gameState.tokens)}</h2>
              <p className="text-sm text-slate-400">$WCLICK</p>
              <div className="flex justify-center items-center gap-6 mt-2">
                  <p className="text-md text-lime-400">+{formatNumber(effectiveTPS)}/s</p>
                  <div className="flex items-center gap-2 text-yellow-400">
                      <BeakerIcon className="w-5 h-5" />
                      <p className="font-mono text-lg">{gameState.humanityGems}</p>
                  </div>
              </div>
          </motion.div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleManualClick} className="w-full bg-cyan-500/80 hover:bg-cyan-500/100 text-white font-bold py-6 rounded-xl text-2xl shadow-lg shadow-cyan-500/20 border border-cyan-400">
            Click! (+{formatNumber(effectiveTPC)})
          </motion.button>
          <div className="space-y-3">
              <h3 className="text-xl font-semibold flex items-center gap-2"><CpuChipIcon className="w-6 h-6"/>Autoclickers</h3>
              {autoclickers.map((auto) => checkRequirements(auto.req) && (
                <motion.button key={auto.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => purchaseAutoclicker(auto.id)} disabled={gameState.tokens < auto.cost || !!(auto.humanityGemsCost && gameState.humanityGems < auto.humanityGemsCost)} className="w-full flex justify-between items-center bg-slate-500/10 backdrop-blur-sm p-3 rounded-lg border border-slate-700 hover:bg-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-500/10">
                  <div className="text-left">
                    <p className="font-bold">{auto.name} <span className="text-slate-400 text-sm">({auto.purchased})</span></p>
                    <p className="text-xs text-lime-400">+{formatNumber(auto.tps)}/s cada uno</p>
                  </div>
                  <div className="text-right font-mono text-yellow-400">
                    <p>{formatNumber(auto.cost)}</p>
                    {auto.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1"><BeakerIcon className="w-4 h-4"/>{auto.humanityGemsCost}</p>}
                  </div>
                </motion.button>
              ))}
          </div>
        </div>
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><BoltIcon className="w-6 h-6"/>Mejoras</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
              {upgrades.map((upg) => !upg.purchased && checkRequirements(upg.req) && (
                <motion.button key={upg.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => purchaseUpgrade(upg.id)} disabled={gameState.tokens < upg.cost || !!(upg.humanityGemsCost && gameState.humanityGems < upg.humanityGemsCost)} className="aspect-square flex flex-col justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 hover:bg-slate-500/20 disabled:opacity-40" title={`${upg.name} - ${upg.desc}`}>
                  <div className="text-3xl text-cyan-400">✧</div>
                  <div className="text-xs font-mono text-yellow-400 mt-1">
                    {upg.cost > 0 && <p>{formatNumber(upg.cost)}</p>}
                    {upg.humanityGemsCost && <p className="text-sm flex items-center gap-1"><BeakerIcon className="w-3 h-3"/>{upg.humanityGemsCost}</p>}
                  </div>
                </motion.button>
              ))}
              </div>
          </div>
          <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><TrophyIcon className="w-6 h-6"/>Logros</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
              {achievements.map((ach) => (
                <motion.div key={ach.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`aspect-square flex justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-opacity ${ach.unlocked ? 'opacity-100' : 'opacity-20'}`} title={`${ach.name} - ${ach.desc}`}>
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