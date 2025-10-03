"use client";

import { useState, useEffect, useCallback } from 'react';
import { GameState, StatsState, Autoclicker, Upgrade, Achievement } from '@/app/types';
import { 
    initialState, initialStats, initialAutoclickers, 
    initialUpgrades, initialAchievements, SAVE_KEY 
} from '@/app/data';

export function useGameSave() {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [stats, setStats] = useState<StatsState>(initialStats);
    const [autoclickers, setAutoclickers] = useState<Autoclicker[]>(initialAutoclickers);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
    const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);

    const saveGame = useCallback(() => {
        try {
            const saveState = { gameState, stats, autoclickers, upgrades, achievements };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
            console.log("Partida guardada.");
        } catch (error) { console.error("Error al guardar la partida:", error); }
    }, [gameState, stats, autoclickers, upgrades, achievements]);

    useEffect(() => {
        try {
            const savedGame = localStorage.getItem(SAVE_KEY);
            if (savedGame) {
                const loaded = JSON.parse(savedGame);
                setGameState(prev => ({ ...prev, ...loaded.gameState }));
                setStats(prev => ({ ...prev, ...loaded.stats }));
                setAutoclickers(initialAutoclickers.map(a => loaded.autoclickers.find((la: Autoclicker) => la.id === a.id) || a));
                setUpgrades(initialUpgrades.map(u => loaded.upgrades.find((lu: Upgrade) => lu.id === u.id) || u));
                setAchievements(initialAchievements.map(ac => loaded.achievements.find((la: Achievement) => la.id === ac.id) || ac));
                console.log("Partida cargada.");
            }
        } catch (error) { console.error("Error al cargar la partida:", error); }
    }, []);

    return { gameState, setGameState, stats, setStats, autoclickers, setAutoclickers, upgrades, setUpgrades, achievements, setAchievements, saveGame };
}