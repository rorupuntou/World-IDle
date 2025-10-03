"use client";

import { motion } from "framer-motion";
import { BeakerIcon, BoltIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Upgrade, GameState, Requirement } from "@/components/types";

interface UpgradesSectionProps {
  upgrades: Upgrade[];
  gameState: GameState;
  checkRequirements: (req: Requirement | undefined) => boolean;
  purchaseUpgrade: (id: number) => void;
  showRequirements: (item: { name: string, req?: Requirement }) => void;
  formatNumber: (num: number) => string;
}

export default function UpgradesSection({ upgrades, gameState, checkRequirements, purchaseUpgrade, showRequirements, formatNumber }: UpgradesSectionProps) {
  return (
    <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><BoltIcon className="w-6 h-6"/>Mejoras</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
        {upgrades.map((upg) => {
          const requirementsMet = checkRequirements(upg.req);
          if (upg.purchased) return null;
          return (
            <motion.button 
              key={upg.id} 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }} 
              onClick={() => requirementsMet ? purchaseUpgrade(upg.id) : showRequirements(upg)} 
              disabled={!requirementsMet || gameState.tokens < upg.cost || !!(upg.humanityGemsCost && gameState.humanityGems < upg.humanityGemsCost)}
              className={`aspect-square flex flex-col justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-all ${!requirementsMet && 'grayscale opacity-50'}`} 
              title={`${upg.name} - ${upg.desc}`}
            >
              <div className={`text-3xl ${requirementsMet ? 'text-cyan-400' : 'text-slate-500'}`}>{requirementsMet ? '✧' : <QuestionMarkCircleIcon className="w-8 h-8"/>}</div>
              <div className="text-xs font-mono text-yellow-400 mt-1">
                {upg.cost > 0 && <p>{formatNumber(upg.cost)}</p>}
                {upg.humanityGemsCost && <p className="text-sm flex items-center gap-1"><BeakerIcon className="w-3 h-3"/>{upg.humanityGemsCost}</p>}
              </div>
            </motion.button>
          )
        })}
        </div>
    </div>
  );
}