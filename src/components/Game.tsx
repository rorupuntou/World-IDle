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
    PRICE_INCREASE_RATE, TIER_THRESHOLDS, GLOBAL_UPGRADE_THRESHOLDS, SAVE_KEY 
} from "@/app/data";
import HeaderStats from "./HeaderStats";
import UpgradesSection from "./UpgradesSection";
import AchievementsSection from "./AchievementsSection";
import PrestigeSection from "./PrestigeSection";
import AutoclickersSection from "./AutoclickersSection";
import { WorldIDAuth } from "./WorldIDAuth";

// ... (UI Components: Toast, NewsTicker)

export default function Game() {
    const [player, setPlayer] = useState<{ proof: ISuccessResult, isVerified: boolean } | null>(null);
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>({ totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 });
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);

    const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);
    const [prestigeBalance, setPrestigeBalance] = useState(0);
    const [isPrestigeReady, setIsPrestigeReady] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

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

    useEffect(() => {
        if (!player?.isVerified) return; // No empezar a guardar hasta que el jugador esté verificado
        const saveInterval = setInterval(saveGameToBackend, 15000);
        window.addEventListener('beforeunload', saveGameToBackend);
        return () => {
            clearInterval(saveInterval);
            window.removeEventListener('beforeunload', saveGameToBackend);
        };
    }, [saveGameToBackend, player]);

    const handleSignIn = useCallback(async () => {
        if (!MiniKit.isInstalled()) {
            return alert("Please open this app in World App to continue.");
        }
        setIsAuthenticating(true);
        try {
            const { address } = await MiniKit.commands.getWalletAddress();
            setWalletAddress(address);
            setToast("Wallet Connected!");
        } catch (error) {
            console.error("Sign in error:", error);
            alert(`Error connecting wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAuthenticating(false);
        }
    }, []);

    // ... (Toda la otra lógica del juego se mantiene)

    if (!walletAddress) {
        return (
            <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
                <h1 className="text-4xl font-bold mb-4">Welcome to World Idle</h1>
                <p className="mb-8 text-slate-400">Connect your World App wallet to start building your empire.</p>
                <button 
                    onClick={handleSignIn} 
                    disabled={isAuthenticating}
                    className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isAuthenticating ? "Connecting..." : "Connect Wallet"}
                </button>
            </div>
        );
    }

    if (!player?.isVerified) {
        return (
            <div className="w-full max-w-md text-center p-8 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-700">
                <h1 className="text-3xl font-bold mb-4">One more step!</h1>
                <p className="mb-8 text-slate-400">Verify with World ID to load your save or start a new game.</p>
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
