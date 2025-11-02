"use client";

import { useEffect, useRef, useCallback } from 'react';
import { FullGameState } from '@/components/types';

const AUTOSAVE_INTERVAL = 60000; // 60 seconds

export function useGameAutoSave(
  isLoaded: boolean,
  walletAddress: string | null,
  fullGameState: FullGameState, // Accept the full state directly
  saveGame: (walletAddress: string, gameState: FullGameState) => void
) {
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedState = useRef<string | null>(null);
  const latestGameState = useRef(fullGameState); // Use a ref to hold the latest state

  // Keep the ref updated with the latest state on every render
  useEffect(() => {
    latestGameState.current = fullGameState;
  }, [fullGameState]);

  const forceSave = useCallback(() => {
    if (!isLoaded || !walletAddress) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const currentState = latestGameState.current; // Read from the ref
    const currentStateJson = JSON.stringify(currentState);

    if (currentStateJson !== lastSavedState.current) {
      saveGame(walletAddress, currentState);
      lastSavedState.current = currentStateJson;
      // console.log(`Game state ${immediate ? 'force saved' : 'auto-saved'}.`);
    }

    // Reset the auto-save timer
    saveTimer.current = setTimeout(() => forceSave(), AUTOSAVE_INTERVAL);

  }, [isLoaded, walletAddress, saveGame]); // `getGameState` is removed, making this stable

  useEffect(() => {
    if (isLoaded && walletAddress) {
      // Initial save and start the timer
      forceSave();
    }

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, walletAddress]); // forceSave is stable, but we keep it off the deps array to be safe

  return { forceSave };
}
