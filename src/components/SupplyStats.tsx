import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";

interface SupplyStatsProps {
    totalSupply: string;
    cap: string;
}

// Small utility to format large numbers, similar to the one in Game.tsx
const formatNumber = (num: number) => {
    if (num < 1e3) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (num < 1e6) return `${(num / 1e3).toFixed(0)}K`;
    if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
    if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
    return `${(num / 1e12).toFixed(2)}T`;
};

export default function SupplyStats({ totalSupply, cap }: SupplyStatsProps) {
    const { t } = useLanguage();

    const { percentage, totalSupplyNum, capNum } = useMemo(() => {
        const ts = parseFloat(totalSupply);
        const c = parseFloat(cap);
        if (isNaN(ts) || isNaN(c) || c === 0) {
            return { percentage: 0, totalSupplyNum: 0, capNum: 0 };
        }
        return {
            percentage: (ts / c) * 100,
            totalSupplyNum: ts,
            capNum: c,
        };
    }, [totalSupply, cap]);

    return (
        <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-3">{t('token_supply_title') || 'Token Supply'}</h3>
            <div className="flex justify-between items-center text-sm text-slate-300 mb-1">
                <span>{t('minted') || 'Minted'}</span>
                <span>{formatNumber(totalSupplyNum)} / {formatNumber(capNum)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4 border border-slate-600 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-right text-sm font-bold text-cyan-300 mt-1">{percentage.toFixed(2)}%</p>
        </div>
    );
}
