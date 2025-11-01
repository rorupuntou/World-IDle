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
        let localSave: FullGameState | null = null;
        const localSaveRaw = localStorage.getItem(SAVE_KEY);
        if (localSaveRaw) {
            try {
                localSave = JSON.parse(localSaveRaw) as FullGameState;
            } catch (e) {
                console.error("Error parsing local save:", e);
                localStorage.removeItem(SAVE_KEY);
            }
        }

        if (serverState && localSave) {
            const serverTime = serverState.gameState?.lastSaved || 0;
            const localTime = localSave.gameState?.lastSaved || 0;
            if (serverTime >= localTime) {
                setFullState(serverState);
            } else {
                setFullState(localSave);
            }
        } else if (serverState) {
            setFullState(serverState);
        } else if (localSave) {
            setFullState(localSave);
        }

        setIsLoaded(true);
    }, [serverState, setFullState]);

    const saveGame = useCallback((walletAddress: string, gameData: FullGameState) => {
        const stateToSave: FullGameState = {
            ...gameData,
            gameState: { ...gameData.gameState, lastSaved: Date.now() },
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));

        fetch('/api/save-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, gameData: stateToSave }),
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                console.error("Failed to save game to server:", data.error);
            }
        })
        .catch(error => console.error("Error saving game to server:", error));
    }, []);

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