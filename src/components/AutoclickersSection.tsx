import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";
import { motion } from "framer-motion";
import Image from 'next/image';
import { CpuChipIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Autoclicker, BuyAmount, GameState, Requirement, Effect } from "@/components/types";

interface AutoclickersSectionProps {
    autoclickers: Autoclicker[];
    buyAmount: BuyAmount;
    setBuyAmount: (amount: BuyAmount) => void;
    gameState: GameState;
    checkRequirements: (req: Requirement | undefined) => boolean;
    showRequirements: (item: { name: string, desc?: string, req?: Requirement, effect?: Effect[] }, itemType: 'autoclicker') => void;
    calculateBulkCost: (autoclicker: Autoclicker, amount: BuyAmount) => number;
    calculatePrestigeBulkCost: (autoclicker: Autoclicker, amount: BuyAmount) => number;
    purchaseAutoclicker: (id: number) => void;
    formatNumber: (num: number) => string;
    autoclickerCPSValues: Map<number, number>;
    devModeActive: boolean;
    isConfirmingPurchase: boolean;
    pendingPurchaseTx: { txId: string; itemId: number } | null;
    prestigeBalance: number;
}

export default function AutoclickersSection({
    autoclickers,
    buyAmount,
    setBuyAmount,
    gameState,
    checkRequirements,
    showRequirements,
    calculateBulkCost,
    calculatePrestigeBulkCost,
    purchaseAutoclicker,
    formatNumber,
    autoclickerCPSValues,
    devModeActive,
    isConfirmingPurchase,
    pendingPurchaseTx,
    prestigeBalance
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
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold flex items-center gap-2"><CpuChipIcon className="w-6 h-6" />{t('autoclickers_section.title')}</h3>
                <div className="flex items-center bg-slate-500/10 border border-slate-700 rounded-lg">
                    {([1, 10, 100] as BuyAmount[]).map(amount => (
                        <button
                            key={amount}
                            onClick={() => setBuyAmount(amount)}
                            className={`px-4 py-1 text-sm font-bold rounded-md transition-colors ${buyAmount === amount ? 'bg-cyan-500/80 text-white' : 'text-slate-400 hover:bg-slate-500/20'}`}
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
                const totalPrestigeCost = auto.prestigeCost ? calculatePrestigeBulkCost(auto, buyAmount) : 0;
                const translatedName = t(auto.name);
                const translatedDesc = t(auto.desc);

                const canAfford = gameState.tokens >= totalTokenCost && prestigeBalance >= totalPrestigeCost;

                return (
                    <div key={auto.id} className="w-full flex items-center bg-slate-500/10 backdrop-blur-sm rounded-lg border border-slate-700 hover:bg-slate-500/20 transition-colors">
                        <motion.button 
                            onClick={() => purchaseAutoclicker(auto.id)} 
                            disabled={!canAfford || isConfirmingPurchase || isThisItemPending}
                            className="flex-grow flex justify-between items-center p-4 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <div className="text-left">
                                <p className={`font-bold ${auto.devOnly ? 'text-yellow-400' : ''}`}>{translatedName} <span className="text-slate-400 text-sm">({auto.purchased})</span></p>
                                <p className="text-xs text-slate-400 italic">{translatedDesc}</p>
                                <p className="text-xs text-lime-400">+{formatNumber(autoclickerCPSValues.get(auto.id) || 0)}{t('per_second')} {t('each')}</p>
                            </div>
                            <div className="text-right font-mono text-yellow-400">
                                <p>{formatNumber(totalTokenCost)}</p>
                                {totalPrestigeCost > 0 && (
                                    <p className="text-sm flex items-center justify-end gap-1">
                                        <Image src="/prestige-token-icon.svg" alt="Prestige Token" width={16} height={16} />
                                        {formatNumber(totalPrestigeCost)}
                                    </p>
                                )}
                            </div>
                        </motion.button>
                        <button 
                            onClick={() => showRequirements({ name: translatedName, desc: translatedDesc, req: auto.req, effect: [{type: 'addTps', value: auto.tps}] }, 'autoclicker')}
                            className="p-4 text-slate-400 hover:text-white border-l border-slate-700"
                        >
                            <InformationCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                )
            })}
        </div>
    );
}