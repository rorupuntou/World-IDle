"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { TestTube, MagicWand, ArrowUp } from "iconoir-react";

interface HeaderStatsProps {
    tokens: number;
    tokensPerSecond: number;
    humanityGems: number;
    totalClicks: number;
    permanentBoostBonus: number;
    formatNumber: (num: number) => string;
}

export default function HeaderStats({
    tokens,
    tokensPerSecond,
    humanityGems,
    totalClicks,
    permanentBoostBonus,
    formatNumber
}: HeaderStatsProps) {
    const { t } = useLanguage();
    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl text-center border border-slate-700 sticky top-4 z-20">
            <h2 className="text-5xl font-mono tracking-wider">{formatNumber(tokens)}</h2>
            <p className="text-sm text-slate-400">{t('wclick')}</p>
            <div className="flex justify-center items-center gap-4 mt-4">
                <p className="text-md text-lime-400">+{formatNumber(tokensPerSecond)}{t('per_second')}</p>
                <div className="flex items-center gap-2 text-cyan-400">
                    <MagicWand className="w-5 h-5" />
                    <p className="font-mono text-lg">{formatNumber(totalClicks)}</p>
                </div>
                <div className="flex items-center gap-2 text-yellow-400">
                    <TestTube className="w-5 h-5" />
                    <p className="font-mono text-lg">{humanityGems}</p>
                </div>
                {permanentBoostBonus > 0 && (
                    <div className="flex items-center gap-2 text-purple-400">
                        <ArrowUp className="w-5 h-5" />
                        <p className="font-mono text-lg">+{permanentBoostBonus * 100}%</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}