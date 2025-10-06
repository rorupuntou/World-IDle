import { motion } from "framer-motion";
import { CpuChipIcon, BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Autoclicker, BuyAmount, GameState, Requirement, Effect } from "@/components/types";

interface AutoclickersSectionProps {
    autoclickers: Autoclicker[];
    buyAmount: BuyAmount;
    setBuyAmount: (amount: BuyAmount) => void;
    gameState: GameState;
    checkRequirements: (req: Requirement | undefined) => boolean;
    showRequirements: (item: { name: string, desc?: string, req?: Requirement, effect?: Effect[] }, itemType: 'autoclicker') => void;
    calculateBulkCost: (autoclicker: Autoclicker, amount: BuyAmount) => number;
    purchaseAutoclicker: (id: number) => void;
    formatNumber: (num: number) => string;
    autoclickerCPSValues: Map<number, number>;
    devModeActive: boolean;
}

export default function AutoclickersSection({
    autoclickers,
    buyAmount,
    setBuyAmount,
    gameState,
    checkRequirements,
    showRequirements,
    calculateBulkCost,
    purchaseAutoclicker,
    formatNumber,
    autoclickerCPSValues,
    devModeActive
}: AutoclickersSectionProps) {
    const visibleAutoclickers = devModeActive ? autoclickers : autoclickers.filter(a => !a.devOnly);

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
            {visibleAutoclickers.map((auto) => {
                if (!checkRequirements(auto.req)) return null;
                const totalTokenCost = calculateBulkCost(auto, buyAmount);
                const totalGemCost = (auto.humanityGemsCost || 0) * buyAmount;
                return (
                    <div key={auto.id} className="w-full flex items-center bg-slate-500/10 backdrop-blur-sm rounded-lg border border-slate-700 hover:bg-slate-500/20 transition-colors">
                        <motion.button 
                            onClick={() => purchaseAutoclicker(auto.id)} 
                            disabled={gameState.tokens < totalTokenCost || gameState.humanityGems < totalGemCost}
                            className="flex-grow flex justify-between items-center p-3 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <div className="text-left">
                                <p className={`font-bold ${auto.devOnly ? 'text-yellow-400' : ''}`}>{auto.name} <span className="text-slate-400 text-sm">({auto.purchased})</span></p>
                                <p className="text-xs text-slate-400 italic">{auto.desc}</p>
                                <p className="text-xs text-lime-400">+{formatNumber(autoclickerCPSValues.get(auto.id) || 0)}/s cada uno</p>
                            </div>
                            <div className="text-right font-mono text-yellow-400">
                                <p>{formatNumber(totalTokenCost)}</p>
                                {auto.humanityGemsCost && <p className="text-sm flex items-center justify-end gap-1"><BeakerIcon className="w-4 h-4" />{totalGemCost}</p>}
                            </div>
                        </motion.button>
                        <button 
                            onClick={() => showRequirements({ name: auto.name, desc: auto.desc, req: auto.req, effect: [{type: 'addTps', value: auto.tps}] }, 'autoclicker')}
                            className="p-3 text-slate-400 hover:text-white border-l border-slate-700"
                        >
                            <InformationCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                )
            })}
        </div>
    );
}