"use client";

import { motion } from "framer-motion";
import { CpuChipIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { Autoclicker, BuyAmount, GameState, Requirement } from "@/components/types";

interface AutoclickersSectionProps {
    autoclickers: Autoclicker[];
    buyAmount: BuyAmount;
    setBuyAmount: (amount: BuyAmount) => void;
    gameState: GameState;
    checkRequirements: (req: Requirement | undefined) => boolean;
    calculateBulkCost: (autoclicker: Autoclicker, amount: BuyAmount) => number;
    purchaseAutoclicker: (id: number) => void;
    formatNumber: (num: number) => string;
    autoclickerCPSValues: Map<number, number>;
}

export default function AutoclickersSection({
    autoclickers,
    buyAmount,
    setBuyAmount,
    gameState,
    checkRequirements,
    calculateBulkCost,
    purchaseAutoclicker,
    formatNumber,
    autoclickerCPSValues
}: AutoclickersSectionProps) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold flex items-center gap-2"><CpuChipIcon className="w-6 h-6" />Autoclickers</h3>
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
            {autoclickers.map((auto) => {
                if (!checkRequirements(auto.req)) return null;
                const totalTokenCost = calculateBulkCost(auto, buyAmount);
                const totalGemCost = (auto.humanityGemsCost || 0) * buyAmount;
                return (
                    <motion.button key={auto.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => purchaseAutoclicker(auto.id)} disabled={gameState.tokens < totalTokenCost || gameState.humanityGems < totalGemCost} className="w-full flex justify-between items-center bg-slate-500/10 backdrop-blur-sm p-3 rounded-lg border border-slate-700 hover:bg-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-500/10">
                        <div className="text-left">
                            <p className="font-bold">{auto.name} <span className="text-slate-400 text-sm">({auto.purchased})</span></p>
                            <p className="text-xs text-lime-400">+{formatNumber(autoclickerCPSValues.get(auto.id) || 0)}/s cada uno</p>
                        </div>
                        <div className="text-right font-mono text-yellow-400">
                            <p>{formatNumber(totalTokenCost)}</p>
                            {auto.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1"><BeakerIcon className="w-4 h-4" />{totalGemCost}</p>}
                        </div>
                    </motion.button>
                )
            })}
        </div>
    );
}