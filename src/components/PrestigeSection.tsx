/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion } from "framer-motion";
import { StarIcon } from '@heroicons/react/24/outline';
import { GameState, Requirement } from "@/components/types";
interface PrestigeSectionProps {
    prestigeBoost: number;
    prestigeBalance: number;
    handlePrestige: () => void;
    isPrestigeReady: boolean;
}

export default function PrestigeSection({
    prestigeBoost,
    prestigeBalance,
    handlePrestige,
    isPrestigeReady
}: PrestigeSectionProps) {
    return (
        <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><StarIcon className="w-6 h-6 text-yellow-400" />Prestigio</h3>
            <p className="text-sm text-slate-300">
                Tu bonus de prestigio actual es de <b className="text-yellow-300">+{prestigeBoost.toFixed(2)}%</b> a todas tus ganancias.
            </p>
            <p className="text-xs text-slate-400 mt-1">Se basa en tu saldo de {prestigeBalance.toLocaleString()} $PRESTIGE.</p>
            <motion.button
                onClick={handlePrestige}
                disabled={!isPrestigeReady}
                whileHover={{ scale: 1.05 }}
                className="w-full mt-4 bg-yellow-500/80 hover:bg-yellow-500/100 text-stone-900 font-bold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/80"
            >
                Reiniciar para Prestigio
            </motion.button>
        </div>
    );
}