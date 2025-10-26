"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, StatsState, Autoclicker, Upgrade, Achievement, FullGameState } from '@/components/types';
import { 
    initialState, initialStats, initialAutoclickers, 
    initialUpgrades, initialAchievements
} from '@/app/data';




export function useGameSave(serverState: FullGameState | null, walletAddress: string | null) {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>(initialStats);
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
    const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
    const [isLoaded, setIsLoaded] = useState(false);

    // To prevent saving initial/empty state on first load
    const isInitialized = useRef(false);

    const setFullState = useCallback((fullState: Partial<FullGameState>) => {
        setGameState(prev => ({ ...initialState, ...prev, ...fullState.gameState }));
        setStats(prev => ({ ...initialStats, ...prev, ...fullState.stats }));

        const savedAutoclickers = fullState.autoclickers || [];
        setAutoclickers(initialAutoclickers.map(template => {
            const saved = savedAutoclickers.find(s => s.id === template.id);
            return saved ? { ...template, ...saved } : template;
        }));

        const savedUpgrades = fullState.upgrades || [];
        setUpgrades(initialUpgrades.map(template => {
            const saved = savedUpgrades.find(s => s.id === template.id);
            return saved ? { ...template, ...saved } : template;
        }));

        const savedAchievements = fullState.achievements || [];
        setAchievements(initialAchievements.map(template => {
            const saved = savedAchievements.find(s => s.id === template.id);
            return saved ? { ...template, ...saved } : template;
        }));
    }, []);

    useEffect(() => {
        if (serverState) {
            setFullState(serverState);
        } else {
            setFullState({}); // Reset to initial values for new user
        }
        setIsLoaded(true);
        // Mark as initialized after a short delay to allow state to settle
        setTimeout(() => {
            isInitialized.current = true;
        }, 1000);
    }, [serverState, setFullState]);

    const saveGame = useCallback(async (stateToSave: FullGameState) => {
        if (!walletAddress) return;
        
        try {
            const response = await fetch('/api/save-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, gameData: stateToSave }),
            });
            const data = await response.json();
            if (!data.success) {
                console.error("Failed to save game to server:", data.error);
            }
        } catch (error) {
            console.error("Error saving game to server:", error);
        }
    }, [walletAddress]);

    

    const resetGame = useCallback(async () => {
        if (!walletAddress) return;

        const permanentBoost = gameState.permanentBoostBonus || 0;
        const permanentReferralBoost = gameState.permanent_referral_boost || 0;
        const wldTimeWarps = gameState.wldTimeWarpsPurchased || 0;
        const isVerified = stats.isVerified;

        const newGameState = { ...initialState, permanentBoostBonus: permanentBoost, permanent_referral_boost: permanentReferralBoost, wldTimeWarpsPurchased: wldTimeWarps };
        const newStats = { ...initialStats, isVerified: isVerified };
        const newAutoclickers = initialAutoclickers.map(a => ({ ...a, purchased: 0 }));
        const newUpgrades = initialUpgrades.map(u => ({ ...u, purchased: false }));
        const newAchievements = initialAchievements.map(a => ({ ...a, unlocked: false }));

        const resetState: FullGameState = {
            gameState: { ...newGameState, lastSaved: Date.now() },
            stats: newStats,
            autoclickers: newAutoclickers,
            upgrades: newUpgrades,
            achievements: newAchievements,
        };

        setFullState(resetState);
        await saveGame(resetState);

    }, [walletAddress, gameState, stats.isVerified, saveGame, setFullState]);

    return { 
        gameState, setGameState, 
        stats, setStats, 
        autoclickers, setAutoclickers, 
        upgrades, setUpgrades, 
        achievements, setAchievements, 
        saveGame: (state: FullGameState) => saveGame(state), // Keep an explicit save for critical moments if needed
        resetGame,
        setFullState,
        isLoaded
    };
}