"use client";

import { useState, useEffect, useCallback } from 'react';
import { GameState, StatsState, Autoclicker, Upgrade, Achievement, FullGameState } from '@/components/types';
import { 
    initialState, initialStats, initialAutoclickers, 
    initialUpgrades, initialAchievements, SAVE_KEY 
} from '@/app/data';

export function useGameSave(serverState: FullGameState | null) {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>(initialStats);
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
    const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
    const [isLoaded, setIsLoaded] = useState(false);

    const saveGame = useCallback((walletAddress?: string) => {
        const saveState: FullGameState = { gameState, stats, autoclickers, upgrades, achievements };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
        console.log("Game saved locally.");

        if (walletAddress) {
            fetch('/api/save-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, gameData: saveState }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log("Game saved to server.");
                } else {
                    console.error("Failed to save game to server:", data.error);
                }
            })
            .catch(error => console.error("Error saving game to server:", error));
        }
    }, [gameState, stats, autoclickers, upgrades, achievements]);
    
    const setFullState = useCallback((fullState: FullGameState) => {
        setGameState(prev => ({ ...prev, ...fullState.gameState }));
        setStats(prev => ({ ...prev, ...fullState.stats }));
        setAutoclickers(initialAutoclickers.map(a => fullState.autoclickers.find(la => la.id === a.id) || a));
        setUpgrades(initialUpgrades.map(u => fullState.upgrades.find(lu => lu.id === u.id) || u));
        setAchievements(initialAchievements.map(ac => fullState.achievements.find(la => la.id === ac.id) || ac));
    }, []);

    useEffect(() => {
        const localSaveRaw = localStorage.getItem(SAVE_KEY);
        const localSave = localSaveRaw ? JSON.parse(localSaveRaw) as FullGameState : null;

        // Server state takes precedence
        if (serverState) {
            let finalState = serverState;
            // But if local is newer, merge it, preserving server boost
            if (localSave && localSave.gameState.lastSaved && serverState.gameState.lastSaved && localSave.gameState.lastSaved > serverState.gameState.lastSaved) {
                finalState = {
                    ...localSave,
                    gameState: {
                        ...localSave.gameState,
                        // CRITICAL: Always preserve the server's permanent boost bonus
                        permanentBoostBonus: serverState.gameState.permanentBoostBonus || localSave.gameState.permanentBoostBonus || 0,
                    }
                };
            }
            setFullState(finalState);
            setIsLoaded(true);
        } 
        // If no server state, fall back to local storage for the initial load
        else if (!isLoaded && localSave) {
            setFullState(localSave);
            setIsLoaded(true);
        }
        // If no server state and no local state, mark as loaded so the game can start
        else if (!isLoaded) {
            setIsLoaded(true);
        }

    }, [serverState, setFullState, isLoaded]);

    return { 
        gameState, setGameState, 
        stats, setStats, 
        autoclickers, setAutoclickers, 
        upgrades, setUpgrades, 
        achievements, setAchievements, 
        saveGame,
        setFullState,
        isLoaded
    };
}