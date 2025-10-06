"use client";

import { motion } from "framer-motion";
import * as HIcons from '@heroicons/react/24/outline';
import { Upgrade, GameState, Requirement, Effect, Autoclicker } from "@/components/types";

const { 
    BeakerIcon, BoltIcon, QuestionMarkCircleIcon, CursorArrowRaysIcon, GlobeAltIcon, 
    CpuChipIcon, CircleStackIcon, PaperAirplaneIcon, ServerStackIcon, CloudIcon, 
    ArrowsRightLeftIcon, ClockIcon, UserGroupIcon, SparklesIcon, StopCircleIcon, 
    CubeTransparentIcon 
} = HIcons;

const iconMap: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = {
    CursorArrowRaysIcon, CpuChipIcon, CircleStackIcon, PaperAirplaneIcon, ServerStackIcon, 
    GlobeAltIcon, CloudIcon, ArrowsRightLeftIcon, ClockIcon, UserGroupIcon, SparklesIcon, 
    StopCircleIcon, CubeTransparentIcon
};

const tierColorMap: { [key: string]: string } = {
    common: 'border-slate-600',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-400',
};

interface UpgradesSectionProps {
  upgrades: Upgrade[];
  autoclickers: Autoclicker[];
  gameState: GameState;
  checkRequirements: (req: Requirement | undefined) => boolean;
  purchaseUpgrade: (id: number) => void;
  showRequirements: (item: Upgrade, itemType: 'upgrade') => void;
  formatNumber: (num: number) => string;
}

const getUpgradeIcon = (upgrade: Upgrade, autoclickers: Autoclicker[]) => {
    if (!upgrade.effect || upgrade.effect.length === 0) return QuestionMarkCircleIcon;

    const effect = upgrade.effect[0];

    if (effect.type === 'multiplyClick' || effect.type === 'addClick' || effect.type === 'addCpSToClick') {
        return CursorArrowRaysIcon;
    }

    if (effect.type === 'multiplyGlobal') {
        return GlobeAltIcon;
    }

    if (effect.type === 'multiplyAutoclicker' || effect.type === 'addCpSToAutoclickerFromOthers' || effect.type === 'multiplyAutoclickerByOtherCount') {
        const autoclicker = autoclickers.find(a => a.id === effect.targetId);
        if (autoclicker && autoclicker.icon) {
            return iconMap[autoclicker.icon] || QuestionMarkCircleIcon;
        }
    }

    return QuestionMarkCircleIcon;
};

export default function UpgradesSection({ upgrades, autoclickers, gameState, checkRequirements, purchaseUpgrade, showRequirements, formatNumber }: UpgradesSectionProps) {
  return (
    <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><BoltIcon className="w-6 h-6"/>Mejoras</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
        {upgrades.map((upg) => {
          const requirementsMet = checkRequirements(upg.req);
          const isAffordable = gameState.tokens >= upg.cost && gameState.humanityGems >= (upg.humanityGemsCost || 0);
          const isPurchasable = requirementsMet && isAffordable;
          const IconComponent = getUpgradeIcon(upg, autoclickers);
          const borderColor = upg.tier ? tierColorMap[upg.tier] || 'border-slate-700' : 'border-slate-700';

          if (upg.purchased) return null;
          return (
            <motion.button 
              key={upg.id} 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }} 
              onClick={() => showRequirements(upg, 'upgrade')} 
              className={`aspect-square flex flex-col justify-center items-center bg-slate-500/10 rounded-lg border-2 ${borderColor} transition-all ${!isPurchasable ? 'grayscale opacity-50' : ''}`} 
              title={`${upg.name} - ${upg.desc}`}
            >
              <div className={`text-3xl ${isPurchasable ? 'text-cyan-400' : 'text-slate-500'}`}>
                {isPurchasable ? <IconComponent className="w-8 h-8" /> : <QuestionMarkCircleIcon className="w-8 h-8"/>}
              </div>
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