import { useMemo, useCallback } from "react";
import {
  Autoclicker,
  Upgrade,
  GameState,
  StatsState,
  Requirement,
} from "@/components/types";
import { initialState } from "@/app/data";

export const useGameCalculations = (
  upgrades: Upgrade[],
  autoclickers: Autoclicker[],
  wIdleBalance: number,
  gameState: GameState,
  stats: StatsState
) => {
  const wIdleBoost = useMemo(
    () => 15 * Math.log10(wIdleBalance + 1),
    [wIdleBalance]
  );

  const { totalCPS, clickValue, autoclickerCPSValues } = useMemo(() => {
    const purchasedUpgrades = upgrades.filter((u) => u.purchased);
    let clickMultiplier = 1;
    let clickAddition = 0;
    let globalMultiplier = 1;
    let cpsToClickPercent = 0;

    const autoclickerMultipliers = new Map<number, number>();
    autoclickers.forEach((a) => autoclickerMultipliers.set(a.id, 1));

    const autoclickerAdditions = new Map<number, number>();
    autoclickers.forEach((a) => autoclickerAdditions.set(a.id, 0));

    purchasedUpgrades.forEach((upg) => {
      upg.effect.forEach((eff) => {
        switch (eff.type) {
          case "multiplyClick":
            clickMultiplier *= eff.value;
            break;
          case "addClick":
            clickAddition += eff.value;
            break;
          case "multiplyGlobal":
            globalMultiplier *= eff.value;
            break;
          case "multiplyAutoclicker":
            autoclickerMultipliers.set(
              eff.targetId,
              (autoclickerMultipliers.get(eff.targetId) || 1) * eff.value
            );
            break;
          case "addCpSToClick":
            cpsToClickPercent += eff.percent;
            break;
          case "multiplyAutoclickerByOtherCount": {
            const sourceAutoclicker = autoclickers.find(
              (a) => a.id === eff.sourceId
            );
            const sourceCount = sourceAutoclicker
              ? sourceAutoclicker.purchased
              : 0;
            const multiplier = 1 + sourceCount * eff.value;
            autoclickerMultipliers.set(
              eff.targetId,
              (autoclickerMultipliers.get(eff.targetId) || 1) * multiplier
            );
            break;
          }
          case "addCpSToAutoclickerFromOthers": {
            const otherAutoclickersCount = autoclickers.reduce(
              (sum, a) => (a.id === eff.targetId ? sum : sum + a.purchased),
              0
            );
            autoclickerAdditions.set(
              eff.targetId,
              (autoclickerAdditions.get(eff.targetId) || 0) +
                otherAutoclickersCount * eff.value
            );
            break;
          }
        }
      });
    });

    const finalGlobalMultiplier =
      globalMultiplier *
      (1 + wIdleBoost / 100) *
      (1 +
        (gameState.permanentBoostBonus || 0) +
        (gameState.permanent_referral_boost || 0));

    const autoclickerCPSValues = new Map<number, number>();
    let totalAutoclickerCPS = 0;

    autoclickers.forEach((auto) => {
      const baseCPS = auto.purchased * auto.tps;
      const multipliedCPS =
        baseCPS * (autoclickerMultipliers.get(auto.id) || 1);
      const addedCPS = autoclickerAdditions.get(auto.id) || 0;
      const finalIndividualCPS =
        (multipliedCPS + addedCPS) * finalGlobalMultiplier;
      autoclickerCPSValues.set(auto.id, finalIndividualCPS);
      totalAutoclickerCPS += finalIndividualCPS;
    });

    const baseClickValue =
      initialState.tokensPerClick * clickMultiplier + clickAddition;
    const finalClickValue =
      baseClickValue + totalAutoclickerCPS * cpsToClickPercent;

    return {
      totalCPS: totalAutoclickerCPS,
      clickValue: finalClickValue,
      autoclickerCPSValues,
    };
  }, [
    upgrades,
    autoclickers,
    wIdleBoost,
    gameState.permanentBoostBonus,
    gameState.permanent_referral_boost,
  ]);

  const checkRequirements = useCallback(
    (req: Requirement | undefined): boolean => {
      if (!req) return true;
      if (
        req.totalTokensEarned !== undefined &&
        stats.totalTokensEarned < req.totalTokensEarned
      )
        return false;
      if (req.totalClicks !== undefined && stats.totalClicks < req.totalClicks)
        return false;
      if (req.tps !== undefined && totalCPS < req.tps) return false;
      if (req.verified !== undefined && req.verified && !stats.isVerified)
        return false;
      if (req.autoclickers !== undefined) {
        const autoclickerReqs = Array.isArray(req.autoclickers)
          ? req.autoclickers
          : [req.autoclickers];
        for (const autoReq of autoclickerReqs) {
          const auto = autoclickers.find((a) => a.id === autoReq.id);
          if (!auto || auto.purchased < autoReq.amount) return false;
        }
      }
      if (req.eachAutoclickerAmount !== undefined) {
        for (const auto of autoclickers) {
          if (auto.purchased < req.eachAutoclickerAmount) {
            return false;
          }
        }
      }
      return true;
    },
    [stats, totalCPS, autoclickers]
  );

  const availableUpgradesCount = useMemo(() => {
    return upgrades.filter(
      (u) =>
        !u.purchased && checkRequirements(u.req) && gameState.tokens >= u.cost
    ).length;
  }, [upgrades, gameState.tokens, checkRequirements]);

  const sortedUpgrades = useMemo(() => {
    return [...upgrades].sort((a, b) => {
      const aAvailable = checkRequirements(a.req) && gameState.tokens >= a.cost;
      const bAvailable = checkRequirements(b.req) && gameState.tokens >= b.cost;
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;
      return a.cost - b.cost;
    });
  }, [upgrades, gameState.tokens, checkRequirements]);

  const timeWarpWIdleCost = useMemo(() => {
    const baseCost = 25;
    const balanceFactor = Math.floor(wIdleBalance / 100);
    return baseCost + balanceFactor;
  }, [wIdleBalance]);

    const timeWarpWldCost = useMemo(() => {
        return 1 + (gameState.wldTimeWarpsPurchased || 0) * 0.5;
    }, [gameState.wldTimeWarpsPurchased]);

    return {
        wIdleBoost,
        totalCPS,
        clickValue,
        autoclickerCPSValues,
        checkRequirements,
        availableUpgradesCount,
        sortedUpgrades,
        timeWarpWIdleCost,
        timeWarpWldCost,
    };
}
