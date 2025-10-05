export type GameStatus = "DETECTING" | "MINIKIT_UNAVAILABLE" | "MINIKIT_AVAILABLE" | "UNAUTHENTICATED" | "UNVERIFIED" | "VERIFIED";

export type Requirement = {
  totalTokensEarned?: number;
  autoclickers?: { id: number; amount: number };
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
  | { type: 'addCpSToAutoclickerFromOthers'; targetId: number; value: number };

export type Autoclicker = {
  id: number;
  name: string;
  cost: number;
  tps: number;
  purchased: number;
  req?: Requirement;
  humanityGemsCost?: number;
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
};

export type Achievement = {
  id: number;
  name: string;
  desc: string;
  unlocked: boolean;
  req: Requirement;
  reward?: { humanityGems: number };
};

export type BuyAmount = 1 | 10 | 100;

export type GameState = {
  tokens: number;
  humanityGems: number;
  tokensPerClick: number;
};

export type StatsState = {
  totalTokensEarned: number;
  totalClicks: number;
  tokensPerSecond: number;
};

// Define the structure of the full game data saved and loaded from the backend
export type FullGameState = {
    gameState: GameState;
    stats: StatsState;
    autoclickers: Autoclicker[];
    upgrades: Upgrade[];
    achievements: Achievement[];
};
