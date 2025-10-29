import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";
import { motion } from "framer-motion";
import Image from 'next/image';
import { Cpu, InfoCircle } from 'iconoir-react';
import { Autoclicker, BuyAmount, GameState, Requirement, Effect } from "@/components/types";
import clsx from "clsx";

interface AutoclickersSectionProps {
    autoclickers: Autoclicker[];
    buyAmount: BuyAmount;
    setBuyAmount: (amount: BuyAmount) => void;
    gameState: GameState;
    checkRequirements: (req: Requirement | undefined) => boolean;
    showRequirements: (item: { name: string, desc?: string, req?: Requirement, effect?: Effect[] }, itemType: 'autoclicker') => void;
    calculateBulkCost: (autoclicker: Autoclicker, amount: BuyAmount) => number;
    calculateWIdleBulkCost: (autoclicker: Autoclicker, amount: BuyAmount) => number;
    purchaseAutoclicker: (id: number) => void;
    formatNumber: (num: number) => string;
    autoclickerCPSValues: Map<number, number>;
    devModeActive: boolean;
    isConfirmingPurchase: boolean;
    pendingPurchaseTx: { txId: string; itemId: number } | null;
    wIdleBalance: number;
}

export default function AutoclickersSection({
    autoclickers,
    buyAmount,
    setBuyAmount,
    gameState,
    checkRequirements,
    showRequirements,
    calculateBulkCost,
    calculateWIdleBulkCost,
    purchaseAutoclicker,
    formatNumber,
    autoclickerCPSValues,
    devModeActive,
    isConfirmingPurchase,
    pendingPurchaseTx,
    wIdleBalance
}: AutoclickersSectionProps) {
    const { t } = useLanguage();

    const visibleAutoclickers = useMemo(() => {
        const regularAutoclickers = autoclickers.filter(a => !a.devOnly);
        if (devModeActive) {
            const devAutoclicker = autoclickers.find(a => a.devOnly);
            if (devAutoclicker) {
                return [devAutoclicker, ...regularAutoclickers];
            }
        }
        return regularAutoclickers;
    }, [autoclickers, devModeActive]);

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-xl font-semibold flex items-center gap-2"><Cpu className="w-6 h-6" />{t('autoclickers_section.title')}</h3>
                <div className="flex items-center bg-slate-900/80 border border-slate-700 rounded-lg">
                    {([1, 10, 100] as BuyAmount[]).map(amount => (
                        <button
                            key={amount}
                            onClick={() => setBuyAmount(amount)}
                            className={clsx(
                                "px-3 py-1 text-sm font-bold rounded-md transition-colors",
                                {
                                    'bg-cyan-500 text-white': buyAmount === amount,
                                    'text-slate-400 hover:bg-slate-700/50': buyAmount !== amount
                                }
                            )}
                        >
                            x{amount}
                        </button>
                    ))}
                </div>
            </div>
            {visibleAutoclickers.map((auto) => {
                if (!checkRequirements(auto.req)) return null;
                const isThisItemPending = pendingPurchaseTx?.itemId === auto.id;
                const totalTokenCost = calculateBulkCost(auto, buyAmount);
                const totalWIdleCost = auto.prestigeCost ? calculateWIdleBulkCost(auto, buyAmount) : 0;
                const translatedName = t(auto.name);
                const translatedDesc = t(auto.desc);

                const canAfford = gameState.tokens >= totalTokenCost && wIdleBalance >= totalWIdleCost;
                const isDisabled = !canAfford || isConfirmingPurchase || isThisItemPending;

                return (
                    <div 
                        key={auto.id} 
                        className={clsx(
                            "w-full flex items-center bg-slate-900/70 rounded-xl border transition-all duration-200",
                            {
                                "border-slate-700 hover:bg-slate-800/60": !isDisabled,
                                "border-slate-800 opacity-60": isDisabled
                            }
                        )}
                    >
                        <motion.button 
                            onClick={() => purchaseAutoclicker(auto.id)} 
                            disabled={isDisabled}
                            className="flex-grow flex justify-between items-center p-3 disabled:cursor-not-allowed"
                            whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                        >
                            <div className="text-left">
                                <p className={clsx("font-bold", auto.devOnly ? 'text-yellow-400' : 'text-slate-100')}>{translatedName} <span className="text-slate-400 text-sm font-normal">({auto.purchased})</span></p>
                                <p className="text-xs text-slate-400 italic">{translatedDesc}</p>
                                <p className="text-xs text-lime-400">+{formatNumber(autoclickerCPSValues.get(auto.id) || 0)}{t('per_second')} {t('each')}</p>
                            </div>
                            <div className="text-right font-mono">
                                <p className={clsx("text-lg", canAfford ? "text-yellow-400" : "text-red-500/70")}>{formatNumber(totalTokenCost)}</p>
                                {totalWIdleCost > 0 && (
                                    <p className="text-sm flex items-center justify-end gap-1">
                                        <Image src="/file.svg" alt="wIDle Token" width={16} height={16} />
                                        {formatNumber(totalWIdleCost)}
                                    </p>
                                )}
                            </div>
                        </motion.button>
                        <button 
                            onClick={() => showRequirements({ name: translatedName, desc: translatedDesc, req: auto.req, effect: [{type: 'addTps', value: auto.tps}] }, 'autoclicker')}
                            className="p-4 text-slate-500 hover:text-cyan-400 border-l border-slate-700/80 transition-colors"
                        >
                            <InfoCircle className="w-5 h-5" />
                        </button>
                    </div>
                )
            })}
        </div>
    );
}