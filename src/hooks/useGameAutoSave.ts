"use client";

import { useEffect, useRef, useCallback } from 'react';
import { FullGameState } from '@/components/types';

const AUTOSAVE_INTERVAL = 60000; // 60 seconds

export function useGameAutoSave(
  isLoaded: boolean,
  walletAddress: string | null,
  getGameState: () => FullGameState,
  saveGame: (walletAddress: string, gameState: FullGameState) => void
) {
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedState = useRef<string | null>(null);

  const forceSave = useCallback((immediate = true) => {
    if (!isLoaded || !walletAddress) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const currentState = getGameState();
    const currentStateJson = JSON.stringify(currentState);

    if (currentStateJson === lastSavedState.current) {
      // If state hasn't changed, don't save, but still reset the timer
      if (immediate) {
         // console.log("State unchanged, skipping immediate save.");
      }
    } else {
        saveGame(walletAddress, currentState);
        lastSavedState.current = currentStateJson;
        // console.log(`Game state ${immediate ? 'force saved' : 'auto-saved'}.`);
    }

    // Reset the auto-save timer
    saveTimer.current = setTimeout(() => forceSave(false), AUTOSAVE_INTERVAL);

  }, [isLoaded, walletAddress, getGameState, saveGame]);

  useEffect(() => {
    if (isLoaded && walletAddress) {
      // Initial save and start the timer
      forceSave(true);
    }

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [isLoaded, walletAddress, forceSave]);

  return { forceSave };
}
