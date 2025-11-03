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
            const serverTime = serverState.gameState?.lastSaved ? Date.parse(serverState.gameState.lastSaved) : 0;
            const localTime = localSave.gameState?.lastSaved ? Date.parse(localSave.gameState.lastSaved) : 0;
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

    const saveGame = useCallback(
    async (walletAddress: string, gameData: FullGameState) => {
      if (!walletAddress || !walletAddress.trim()) {
        console.error('walletAddress required to save');
        return;
      }
      const normalizedWallet = walletAddress.trim().toLowerCase();
      const stateToSave: FullGameState = {
        ...gameData,
        gameState: { ...gameData.gameState, lastSaved: new Date().toISOString() },
      };
      // persist locally first
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('localStorage set failed', e);
      }
      // send to server
      try {
        // Optional: avoid logging full payload in prod
        if (process.env.NODE_ENV === 'development') {
          console.debug('[DEBUG] Saving to server', { wallet: normalizedWallet, lastSaved: stateToSave.gameState.lastSaved });
        }
        const res = await fetch('/api/save-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: normalizedWallet, gameData: stateToSave }),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => null);
          console.error('Save failed, status:', res.status, errBody);
          // optional retry logic here
          return;
        }
        const data = await res.json().catch(() => ({ success: false }));
        if (!data.success) {
          console.error('Failed to save game to server:', data.error);
          return;
        }
        // If server returns canonical saved timestamp, sync local copy
        if (data.savedAt) {
          const updatedState = { ...stateToSave, gameState: { ...stateToSave.gameState, lastSaved: data.savedAt } };
          try { localStorage.setItem(SAVE_KEY, JSON.stringify(updatedState)); } catch {}
        }
      } catch (error) {
        console.error('Error saving game to server:', error);
      }
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