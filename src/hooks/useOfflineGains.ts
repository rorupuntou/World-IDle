import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, StatsState } from '@/components/types';

export const useOfflineGains = (isLoaded: boolean, totalCPS: number, lastSaved: number | undefined, setGameState: React.Dispatch<React.SetStateAction<GameState>>, setStats: React.Dispatch<React.SetStateAction<StatsState>>) => {
  const [offlineGains, setOfflineGains] = useState(0);
  const offlineGainsProcessed = useRef(false);

  useEffect(() => {
    if (isLoaded && !offlineGainsProcessed.current) {
      const lastSavedTime = lastSaved || Date.now();
      const elapsedSeconds = (Date.now() - lastSavedTime) / 1000;
      if (elapsedSeconds > 60) {
        const maxOfflineSeconds = 86400; // 24 hours
        const secondsToReward = Math.min(elapsedSeconds, maxOfflineSeconds);
        const calculatedGains = secondsToReward * totalCPS;

        if (calculatedGains > 1) {
          setOfflineGains(calculatedGains);
        }
      }
      offlineGainsProcessed.current = true;
    }
  }, [isLoaded, totalCPS, lastSaved]);

  const handleClaimOfflineGains = useCallback(() => {
    if (offlineGains > 0) {
      setGameState((prev) => ({
        ...prev,
        tokens: prev.tokens + offlineGains,
      }));
      setStats((prev) => ({
        ...prev,
        totalTokensEarned: prev.totalTokensEarned + offlineGains,
      }));
      setOfflineGains(0);
    }
  }, [offlineGains, setGameState, setStats]);

  return { offlineGains, handleClaimOfflineGains };
};