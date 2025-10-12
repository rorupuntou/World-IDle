'use client';

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import * as HIcons from '@heroicons/react/24/outline';
import { Upgrade, GameState, Requirement, Autoclicker, Effect, StatsState } from "@/components/types";

const { 
    BeakerIcon, BoltIcon, QuestionMarkCircleIcon, CursorArrowRaysIcon, GlobeAltIcon, 
    CpuChipIcon, CircleStackIcon, PaperAirplaneIcon, ServerStackIcon, CloudIcon, 
    ArrowsRightLeftIcon, ClockIcon, UserGroupIcon, SparklesIcon, StopCircleIcon, 
    CubeTransparentIcon, CheckCircleIcon, XCircleIcon
} = HIcons;

const iconMap: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = {
    CursorArrowRaysIcon, CpuChipIcon, CircleStackIcon, PaperAirplaneIcon, ServerStackIcon, 
    GlobeAltIcon, CloudIcon, ArrowsRightLeftIcon, ClockIcon, UserGroupIcon, SparklesIcon, 
    StopCircleIcon, CubeTransparentIcon
};

const tierColorMap: { [key: string]: { border: string, text: string, bg: string } } = {
    common: { border: 'border-slate-600', text: 'text-slate-300', bg: 'bg-slate-800/30' },
    rare: { border: 'border-blue-500', text: 'text-blue-300', bg: 'bg-blue-900/30' },
    epic: { border: 'border-purple-500', text: 'text-purple-300', bg: 'bg-purple-900/30' },
    legendary: { border: 'border-yellow-400', text: 'text-yellow-300', bg: 'bg-yellow-900/30' },
};

interface UpgradesSectionProps {
  upgrades: Upgrade[];
  autoclickers: Autoclicker[];
  gameState: GameState;
  stats: StatsState;
  checkRequirements: (req: Requirement | undefined) => boolean;
  purchaseUpgrade: (id: number) => void;
  purchaseAllAffordableUpgrades: () => void;
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
        if (autoclicker && autoclicker.icon && iconMap[autoclicker.icon]) {
            return iconMap[autoclicker.icon];
        }
    }
    return QuestionMarkCircleIcon;
};

function getRequirementText(req: Requirement | undefined, t: (key: string, replacements?: { [key: string]: string | number }) => string, autoclickers: Autoclicker[], formatNumber: (num: number) => string, stats: StatsState): {text: string, met: boolean}[] {
    const texts: {text: string, met: boolean}[] = [];
    if (!req) return texts;

    if (req.totalTokensEarned) {
        const met = stats.totalTokensEarned >= req.totalTokensEarned;
        texts.push({ text: t('req.totalTokensEarned', { amount: formatNumber(req.totalTokensEarned) }), met });
    }
    if (req.totalClicks) {
        const met = stats.totalClicks >= req.totalClicks;
        texts.push({ text: t('req.totalClicks', { amount: formatNumber(req.totalClicks) }), met });
    }
    if (req.autoclickers) {
        const autoclickerReqs = Array.isArray(req.autoclickers) ? req.autoclickers : [req.autoclickers];
        autoclickerReqs.forEach(autoReq => {
            const auto = autoclickers.find(a => a.id === autoReq.id);
            if (auto) {
                const met = auto.purchased >= autoReq.amount;
                texts.push({ text: t('req.autoclicker', { amount: autoReq.amount, name: t(auto.name) }), met });
            }
        });
    }
    if (req.eachAutoclickerAmount) {
        const met = autoclickers.every(a => a.purchased >= req.eachAutoclickerAmount!);
        texts.push({ text: t('req.eachAutoclickerAmount', { amount: req.eachAutoclickerAmount }), met });
    }
    return texts;
};

function getEffectDescription(effects: Effect[], t: (key: string, replacements?: { [key: string]: string | number }) => string, autoclickers: Autoclicker[]): string[] {
    return effects.map(e => {
        const findAutoclickerName = (id: number) => {
            const auto = autoclickers.find(a => a.id === id);
            return auto ? t(auto.name) : t('unknown_autoclicker');
        };

        switch (e.type) {
            case 'multiplyClick':
                return t('effect_desc.multiplyClick', { value: e.value });
            case 'addClick':
                return t('effect_desc.addClick', { value: e.value });
            case 'multiplyGlobal':
                return t('effect_desc.multiplyGlobal', { value: ((e.value - 1) * 100).toFixed(0) });
            case 'addCpSToClick':
                return t('effect_desc.addCpSToClick', { percent: (e.percent * 100).toFixed(0) });
            case 'multiplyAutoclicker':
                return t('effect_desc.multiplyAutoclicker', { name: findAutoclickerName(e.targetId), value: e.value });
            case 'multiplyAutoclickerByOtherCount':
                return t('effect_desc.multiplyAutoclickerByOtherCount', { targetName: findAutoclickerName(e.targetId), sourceName: findAutoclickerName(e.sourceId), value: (e.value * 100).toFixed(0) });
            case 'addCpSToAutoclickerFromOthers':
                 return t('effect_desc.addCpSToAutoclickerFromOthers', { name: findAutoclickerName(e.targetId), value: e.value });
            default:
                return t('effect_desc.unknown');
        }
    });
}

export default function UpgradesSection({ upgrades, autoclickers, gameState, stats, checkRequirements, purchaseUpgrade, purchaseAllAffordableUpgrades, formatNumber }: UpgradesSectionProps) {
  const { t } = useLanguage();
  const availableUpgrades = upgrades.filter(upg => !upg.purchased && checkRequirements(upg.req) && gameState.tokens >= upg.cost);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-700 flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold flex items-center gap-2"><BoltIcon className="w-6 h-6 text-cyan-400"/>{t('upgrades')}</h3>
            <button 
                onClick={purchaseAllAffordableUpgrades}
                disabled={availableUpgrades.length === 0}
                className="bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
                {t('buy_all_affordable')} ({availableUpgrades.length})
            </button>
        </div>
        <div className="flex flex-col gap-3">
        {upgrades.map((upg) => {
          if (upg.purchased) return null;

          const requirementsMet = checkRequirements(upg.req);
          const isAffordable = gameState.tokens >= upg.cost && gameState.humanityGems >= (upg.humanityGemsCost || 0);
          const isPurchasable = requirementsMet && isAffordable;
          const IconComponent = getUpgradeIcon(upg, autoclickers);
          const tierClasses = upg.tier ? tierColorMap[upg.tier] : tierColorMap.common;
          const translatedName = upg.dynamicName ? t(upg.dynamicName.key, upg.dynamicName.replacements) : t(upg.name);
          const translatedDesc = t(upg.desc);
          const requirementTexts = getRequirementText(upg.req, t, autoclickers, formatNumber, stats);
          const effectTexts = getEffectDescription(upg.effect, t, autoclickers);

          return (
            <motion.div 
              key={upg.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={`w-full flex flex-col gap-3 p-4 rounded-lg border ${tierClasses.border} ${tierClasses.bg} ${!requirementsMet ? 'opacity-60' : ''} transition-all`}
            >
                <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-2 mt-1 rounded-full bg-black/20 ${isPurchasable ? tierClasses.text : 'text-slate-500'}`}>
                        <IconComponent className="w-8 h-8"/>
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className={`font-bold ${tierClasses.text}`}>{translatedName}</p>
                        <p className="text-xs text-slate-400 italic">{translatedDesc}</p>
                        {effectTexts.map((eff, index) => (
                            <p key={index} className="text-sm text-lime-400/90">+ {eff}</p>
                        ))}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="font-mono text-right">
                            {upg.cost > 0 && <p className="text-lg font-bold text-yellow-300">{formatNumber(upg.cost)}</p>}
                            {upg.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1 text-cyan-300"><BeakerIcon className="w-4 h-4"/>{upg.humanityGemsCost}</p>}
                        </div>
                        <button 
                            onClick={() => purchaseUpgrade(upg.id)}
                            disabled={!isPurchasable}
                            className="bg-yellow-500/80 hover:bg-yellow-500 text-stone-900 font-bold py-1 px-3 rounded-md text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                        >
                            {t('buy')}
                        </button>
                    </div>
                </div>
                {!requirementsMet && requirementTexts.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs">
                        <p className="font-bold text-red-400/80 mb-1">{t('requirements')}:</p>
                        <ul className="list-none pl-2 space-y-1">
                            {requirementTexts.map((req, i) => (
                                <li key={i} className={`flex items-center gap-2 ${req.met ? 'text-green-400/70' : 'text-red-400/70'}`}>
                                    {req.met ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                                    <span>{req.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </motion.div>
          )
        })}
        </div>
    </div>
  );
}