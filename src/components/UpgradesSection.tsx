"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import * as HIcons from '@heroicons/react/24/outline';
import { Upgrade, GameState, Requirement, Autoclicker } from "@/components/types";

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

'use client';

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import * as HIcons from '@heroicons/react/24/outline';
import { Upgrade, GameState, Requirement, Autoclicker, Effect } from "@/components/types";

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
    common: 'border-slate-600 text-slate-400',
    rare: 'border-blue-500 text-blue-400',
    epic: 'border-purple-500 text-purple-400',
    legendary: 'border-yellow-400 text-yellow-300',
};

interface UpgradesSectionProps {
  upgrades: Upgrade[];
  autoclickers: Autoclicker[];
  gameState: GameState;
  checkRequirements: (req: Requirement | undefined) => boolean;
  purchaseUpgrade: (id: number) => void;
  purchaseAllAffordableUpgrades: () => void; // New prop
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

const getEffectDescription = (effect: Effect, t: (key: string, replacements?: any) => string): string => {
    switch (effect.type) {
        case 'multiplyClick':
            return t('effect_desc.multiplyClick', { value: effect.value });
        case 'addClick':
            return t('effect_desc.addClick', { value: effect.value });
        case 'multiplyGlobal':
            return t('effect_desc.multiplyGlobal', { value: (effect.value - 1) * 100 });
        case 'addCpSToClick':
            return t('effect_desc.addCpSToClick', { percent: effect.percent * 100 });
        case 'multiplyAutoclicker':
            return t('effect_desc.multiplyAutoclicker', { value: effect.value });
        // Add other effect descriptions here
        default:
            return t('effect_desc.unknown');
    }
}

export default function UpgradesSection({ upgrades, autoclickers, gameState, checkRequirements, purchaseUpgrade, purchaseAllAffordableUpgrades, showRequirements, formatNumber }: UpgradesSectionProps) {
  const { t } = useLanguage();
  const availableUpgrades = upgrades.filter(upg => !upg.purchased && checkRequirements(upg.req) && gameState.tokens >= upg.cost);

  return (
    <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold flex items-center gap-2"><BoltIcon className="w-6 h-6"/>{t('upgrades')}</h3>
            <button 
                onClick={purchaseAllAffordableUpgrades}
                disabled={availableUpgrades.length === 0}
                className="bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {t('buy_all_affordable')}
            </button>
        </div>
        <div className="flex flex-col gap-2">
        {upgrades.map((upg) => {
          if (upg.purchased) return null;

          const requirementsMet = checkRequirements(upg.req);
          const isAffordable = gameState.tokens >= upg.cost && gameState.humanityGems >= (upg.humanityGemsCost || 0);
          const isPurchasable = requirementsMet && isAffordable;
          const IconComponent = getUpgradeIcon(upg, autoclickers);
          const tierClasses = upg.tier ? tierColorMap[upg.tier] || 'border-slate-700 text-slate-400' : 'border-slate-700 text-slate-400';
          const translatedName = upg.dynamicName ? t(upg.dynamicName.key, upg.dynamicName.replacements) : t(upg.name);
          const translatedDesc = t(upg.desc);

          return (
            <motion.div 
              key={upg.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className={`w-full flex items-center gap-4 p-3 bg-slate-500/10 rounded-lg border ${!requirementsMet ? 'grayscale opacity-50' : tierClasses} transition-all`}
            >
                <div className={`flex-shrink-0 text-3xl ${isPurchasable ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {requirementsMet ? <IconComponent className="w-8 h-8" /> : <QuestionMarkCircleIcon className="w-8 h-8"/>}
                </div>
                <div className="flex-grow">
                    <p className="font-bold">{translatedName}</p>
                    <p className="text-xs text-slate-400 italic">{translatedDesc}</p>
                    {upg.effect.map((eff, index) => (
                        <p key={index} className="text-xs text-lime-400">{getEffectDescription(eff, t)}</p>
                    ))}
                </div>
                <div className="flex-shrink-0 text-right">
                    <button 
                        onClick={() => purchaseUpgrade(upg.id)}
                        disabled={!isPurchasable}
                        className="bg-yellow-500/80 hover:bg-yellow-500 text-stone-900 font-bold py-2 px-4 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <div className="font-mono">
                            {upg.cost > 0 && <p>{formatNumber(upg.cost)}</p>}
                            {upg.humanityGemsCost && <p className="text-sm flex items-center gap-1"><BeakerIcon className="w-3 h-3"/>{upg.humanityGemsCost}</p>}
                        </div>
                    </button>
                </div>
            </motion.div>
          )
        })}
        </div>
    </div>
  );
}