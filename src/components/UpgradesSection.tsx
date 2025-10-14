'use client';

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { 
    Flash, TestTube, CheckCircle, XmarkCircle, QuestionMark, MagicWand, Globe, 
    Cpu, Send, Server, Cloud, ArrowRight, Clock, Group, Star, 
    Cube, Database
} from 'iconoir-react';
import { Upgrade, GameState, Requirement, Autoclicker, Effect, StatsState } from "@/components/types";
import clsx from "clsx";

const iconMap: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = {
    CursorArrowRaysIcon: MagicWand,
    CpuChipIcon: Cpu,
    CircleStackIcon: Database,
    PaperAirplaneIcon: Send,
    ServerStackIcon: Server,
    GlobeAltIcon: Globe,
    CloudIcon: Cloud,
    ArrowsRightLeftIcon: ArrowRight,
    ClockIcon: Clock,
    UserGroupIcon: Group,
    SparklesIcon: Star,
    StopCircleIcon: XmarkCircle,
    CubeTransparentIcon: Cube,
};

const tierColorMap: { [key: string]: { border: string, text: string, bg: string, shadow: string } } = {
    common: { border: 'border-slate-700', text: 'text-slate-300', bg: 'bg-slate-900/50', shadow: 'shadow-transparent' },
    rare: { border: 'border-blue-600', text: 'text-blue-300', bg: 'bg-blue-950/50', shadow: 'shadow-blue-500/20' },
    epic: { border: 'border-purple-600', text: 'text-purple-300', bg: 'bg-purple-950/50', shadow: 'shadow-purple-500/25' },
    legendary: { border: 'border-yellow-500', text: 'text-yellow-300', bg: 'bg-yellow-950/50', shadow: 'shadow-yellow-400/30' },
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
    if (!upgrade.effect || upgrade.effect.length === 0) return QuestionMark;
    const effect = upgrade.effect[0];
    if (effect.type === 'multiplyClick' || effect.type === 'addClick' || effect.type === 'addCpSToClick') {
        return MagicWand;
    }
    if (effect.type === 'multiplyGlobal') {
        return Globe;
    }
    if (effect.type === 'multiplyAutoclicker' || effect.type === 'addCpSToAutoclickerFromOthers' || effect.type === 'multiplyAutoclickerByOtherCount') {
        const autoclicker = autoclickers.find(a => a.id === effect.targetId);
        if (autoclicker && autoclicker.icon && iconMap[autoclicker.icon]) {
            return iconMap[autoclicker.icon];
        }
    }
    return QuestionMark;
};

function getRequirementText(req: Requirement | undefined, t: (key: string, replacements?: { [key: string]: string | number }) => string, autoclickers: Autoclicker[], formatNumber: (num: number) => string, stats: StatsState): {text: string, met: boolean}[] {
    const texts: {text: string, met: boolean}[] = [];
    if (!req) return texts;

    if (req.totalTokensEarned) {
        const met = stats.totalTokensEarned >= req.totalTokensEarned;
        texts.push({ text: t('item_details.req_total_tokens', { amount: formatNumber(req.totalTokensEarned) }), met });
    }
    if (req.totalClicks) {
        const met = stats.totalClicks >= req.totalClicks;
        texts.push({ text: t('item_details.req_total_clicks', { amount: formatNumber(req.totalClicks) }), met });
    }
    if (req.tps) {
        const met = stats.tokensPerSecond >= req.tps;
        texts.push({ text: t('item_details.req_tps', { amount: formatNumber(req.tps) }), met });
    }
    if (req.autoclickers) {
        const autoclickerReqs = Array.isArray(req.autoclickers) ? req.autoclickers : [req.autoclickers];
        autoclickerReqs.forEach(autoReq => {
            const auto = autoclickers.find(a => a.id === autoReq.id);
            if (auto) {
                const met = auto.purchased >= autoReq.amount;
                texts.push({ text: t('item_details.req_autoclicker_amount', { amount: autoReq.amount, name: t(auto.name) }), met });
            }
        });
    }
    if (req.eachAutoclickerAmount) {
        const met = autoclickers.every(a => a.purchased >= req.eachAutoclickerAmount!);
        texts.push({ text: t('item_details.req_each_autoclicker', { amount: req.eachAutoclickerAmount }), met });
    }
    if (req.verified) {
        const met = stats.isVerified || false; 
        texts.push({ text: t('item_details.req_verified'), met });
    }
    return texts;
};

function getEffectDescription(effects: Effect[], t: (key: string, replacements?: { [key: string]: string | number }) => string, autoclickers: Autoclicker[]): string[] {
    return effects.map(e => {
        switch (e.type) {
            case 'multiplyClick': return t('item_details.eff_multiply_click', { value: e.value });
            case 'addClick': return t('item_details.eff_add_click', { value: e.value });
            case 'multiplyGlobal': return t('item_details.eff_multiply_global', { value: e.value });
            case 'multiplyAutoclicker': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return t('item_details.eff_multiply_autoclicker', { name: auto ? t(auto.name) : `ID ${e.targetId}`, value: e.value });
            }
            case 'addCpSToClick': return t('item_details.eff_add_cps_to_click', { percent: e.percent * 100 });
            case 'addCpSToAutoclickerFromOthers': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return t('item_details.eff_add_cps_from_others', { name: auto ? t(auto.name) : `ID ${e.targetId}` });
            }
            case 'multiplyAutoclickerByOtherCount': {
                const target = autoclickers.find(a => a.id === e.targetId);
                const source = autoclickers.find(a => a.id === e.sourceId);
                return t('item_details.eff_multiply_by_other', { target: target ? t(target.name) : `ID ${e.targetId}`, source: source ? t(source.name) : `ID ${e.sourceId}` });
            }
            case 'addTps': return t('item_details.eff_add_tps', { value: e.value });
            default: return t('item_details.eff_unknown');
        }
    });
}

export default function UpgradesSection({ upgrades, autoclickers, gameState, stats, checkRequirements, purchaseUpgrade, purchaseAllAffordableUpgrades, formatNumber }: UpgradesSectionProps) {
  const { t } = useLanguage();
  const availableUpgrades = upgrades.filter(upg => !upg.purchased && checkRequirements(upg.req) && gameState.tokens >= upg.cost);

  return (
    <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-semibold flex items-center gap-2"><Flash className="w-6 h-6 text-cyan-400"/>{t('upgrades')}</h3>
            <button 
                onClick={purchaseAllAffordableUpgrades}
                disabled={availableUpgrades.length === 0}
                className="bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              className={clsx(
                'w-full flex flex-col gap-3 p-3 rounded-xl border transition-all duration-300',
                tierClasses.border,
                tierClasses.bg,
                {
                  'opacity-50 grayscale': !requirementsMet,
                  'opacity-75': requirementsMet && !isAffordable,
                  'opacity-100': isPurchasable,
                  [tierClasses.shadow]: isPurchasable,
                  'shadow-lg': isPurchasable,
                }
              )}
            >
                <div className="flex items-start gap-4">
                    <div className={clsx(
                        'flex-shrink-0 p-2 mt-1 rounded-full bg-black/30',
                        isPurchasable ? tierClasses.text : 'text-slate-600'
                    )}>
                        <IconComponent className="w-7 h-7"/>
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className={clsx("font-bold", tierClasses.text)}>{translatedName}</p>
                        <p className="text-xs text-slate-400 italic">{translatedDesc}</p>
                        {effectTexts.map((eff, index) => (
                            <p key={index} className="text-sm text-lime-400/90">+ {eff}</p>
                        ))}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="font-mono text-right">
                            {upg.cost > 0 && <p className="text-base font-bold text-yellow-400">{formatNumber(upg.cost)}</p>}
                            {upg.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1 text-cyan-300"><TestTube className="w-4 h-4"/>{upg.humanityGemsCost}</p>}
                        </div>
                        <button 
                            onClick={() => purchaseUpgrade(upg.id)}
                            disabled={!isPurchasable}
                            className={clsx(
                                "text-stone-900 font-bold py-1 px-4 rounded-md text-sm transition-all",
                                {
                                    'bg-yellow-500 hover:bg-yellow-400 shadow-md hover:shadow-lg': isPurchasable,
                                    'bg-slate-600 opacity-50 cursor-not-allowed': !isPurchasable
                                }
                            )}
                        >
                            {t('buy')}
                        </button>
                    </div>
                </div>
                {!requirementsMet && requirementTexts.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs">
                        <p className="font-bold text-red-400/90 mb-1">{t('requirements')}:</p>
                        <ul className="list-none pl-1 space-y-1">
                            {requirementTexts.map((req, i) => (
                                <li key={i} className={clsx("flex items-center gap-2", {
                                    'text-slate-400': req.met,
                                    'text-red-400': !req.met
                                })}>
                                    {req.met ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XmarkCircle className="w-4 h-4 text-red-500" />}
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
