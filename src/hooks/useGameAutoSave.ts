"use client";

import { useEffect, useRef, useCallback } from 'react';
import { FullGameState } from '@/components/types';
import { useDebouncedCallback } from 'use-debounce';

const DEBOUNCE_INTERVAL = 3000; // 3 seconds of inactivity
const FORCE_SAVE_INTERVAL = 30000; // 30 seconds

export function useGameAutoSave(
  isLoaded: boolean,
  walletAddress: string | null,
  fullGameState: FullGameState,
  saveGame: (walletAddress: string, gameState: FullGameState) => void
) {
  const lastSavedState = useRef<string | null>(null);
  const latestGameState = useRef(fullGameState);

  // Keep the ref updated with the latest state on every render
  useEffect(() => {
    latestGameState.current = fullGameState;
  }, [fullGameState]);

  // The core save function
  const performSave = useCallback(() => {
    if (!isLoaded || !walletAddress) return;

    const currentState = latestGameState.current;
    const currentStateJson = JSON.stringify(currentState);

    if (currentStateJson !== lastSavedState.current) {
      saveGame(walletAddress, currentState);
      lastSavedState.current = currentStateJson;
      console.log(`[AutoSave] Game state saved at ${new Date().toISOString()}`);
    }
  }, [isLoaded, walletAddress, saveGame]);

  // Debounced save function - triggers after user is inactive
  const debouncedSave = useDebouncedCallback(performSave, DEBOUNCE_INTERVAL);

  // Effect for debouncing based on game state changes
  useEffect(() => {
    if (isLoaded && walletAddress) {
      debouncedSave();
    }
  }, [fullGameState, isLoaded, walletAddress, debouncedSave]);

  // Effect for the periodic force-save
  useEffect(() => {
    // Temporary alert for debugging
    alert(`[AutoSave] Periodic effect triggered. isLoaded: ${isLoaded}, walletAddress: !!${walletAddress}`);

    if (!isLoaded || !walletAddress) return;

    const timer = setInterval(() => {
      performSave();
    }, FORCE_SAVE_INTERVAL);

    return () => clearInterval(timer);
  }, [isLoaded, walletAddress, performSave]);

  // Effect for saving when the user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log(`[AutoSave] Saving game state on page unload.`);
      performSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [performSave]);

  // Expose a manual save function if needed elsewhere
  const forceSave = useCallback(() => {
    console.log(`[AutoSave] Manual force-save triggered.`);
    // Cancel any pending debounced save and save immediately
    debouncedSave.flush();
  }, [debouncedSave]);

  return { forceSave };
}
