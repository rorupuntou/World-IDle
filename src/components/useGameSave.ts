"use client";

import { useState, useEffect, useCallback } from 'react';
import { GameState, StatsState, Autoclicker, Upgrade, Achievement, FullGameState } from '@/components/types';
import { 
    initialState, initialStats, initialAutoclickers, 
    initialUpgrades, initialAchievements
} from '@/app/data';

export function useGameSave(serverState: FullGameState | null) {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>(initialStats);
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
    const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
    const [isLoaded, setIsLoaded] = useState(false);

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
            // If there's no server state (e.g., new user), we ensure the game starts from a clean slate.
            setFullState({}); // This will reset to initial values
        }
        setIsLoaded(true);
    }, [serverState, setFullState]);

    const saveGame = useCallback(async (walletAddress: string) => {
        const currentState: FullGameState = { 
            gameState: { ...gameState, lastSaved: Date.now() },
            stats, 
            autoclickers, 
            upgrades, 
            achievements 
        };
        
        try {
            const response = await fetch('/api/save-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, gameData: currentState }),
            });
            const data = await response.json();
            if (!data.success) {
                console.error("Failed to save game to server:", data.error);
            }
        } catch (error) {
            console.error("Error saving game to server:", error);
        }
    }, [gameState, stats, autoclickers, upgrades, achievements]);

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