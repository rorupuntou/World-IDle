export type GameStatus = "DETECTING" | "MINIKIT_UNAVAILABLE" | "MINIKIT_AVAILABLE" | "UNAUTHENTICATED" | "UNVERIFIED" | "VERIFIED";

export type Requirement = {
  totalTokensEarned?: number;
  autoclickers?: { id: number; amount: number } | { id: number; amount: number }[];
  eachAutoclickerAmount?: number;
  totalClicks?: number;
  tps?: number;
  verified?: boolean;
};

export type Effect =
  | { type: 'multiplyClick'; value: number }
  | { type: 'addClick'; value: number }
  | { type: 'multiplyGlobal'; value: number }
  | { type: 'multiplyAutoclicker'; targetId: number; value: number }
  | { type: 'addCpSToClick'; percent: number }
  | { type: 'addCpSToAutoclickerFromOthers'; targetId: number; value: number }
  | { type: 'multiplyAutoclickerByOtherCount'; targetId: number; sourceId: number; value: number }
  | { type: 'addTps'; value: number };

export type Autoclicker = {
  id: number;
  name: string;
  desc: string;
  cost: number;
  tps: number;
  purchased: number;
  req?: Requirement;
  prestigeCost?: number; // Added for ERC20 token cost
  humanityGemsCost?: number;
  icon?: string;
  devOnly?: boolean;
};

export type Upgrade = {
  id: number;
  name: string;
  desc: string;
  cost: number;
  purchased: boolean;
  effect: Effect[];
  req?: Requirement;
  humanityGemsCost?: number;
  tier?: string;
  dynamicName?: { key: string; replacements: { [key: string]: string | number } };
};

export type Achievement = {
  id: number;
  name: string;
  desc: string;
  unlocked: boolean;
  req: Requirement;
  reward?: { humanityGems: number };
  type?: 'shadow';
};

export type BuyAmount = 1 | 10 | 100;

export interface Referral {
  id: string;
  wallet_address: string;
  claimed: boolean;
}

export type GameState = {
  tokens: number;
  humanityGems: number;
  tokensPerClick: number;
  permanentBoostBonus: number;
  permanent_referral_boost?: number; // For referral system boosts
  lastSaved?: number;
  wldTimeWarpsPurchased?: number;
  lastWIdleTimeWarp?: number;
  lastWidleClaimAt?: string;
  referrals?: Referral[];
};

export type StatsState = {
  totalTokensEarned: number;
  totalClicks: number;
  tokensPerSecond: number;
  isVerified: boolean;
};

// Define the structure of the full game data saved and loaded from the backend
export type FullGameState = {
    gameState: GameState;
    stats: StatsState;
    autoclickers: Autoclicker[];
    upgrades: Upgrade[];
    achievements: Achievement[];
};
