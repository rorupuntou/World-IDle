/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion } from "framer-motion";
import { StarIcon } from '@heroicons/react/24/outline';

interface PrestigeSectionProps {
    prestigeBoost: number;
    prestigeBalance: number;
    prestigeReward: number;
    handlePrestige: () => void;
    isPrestigeReady: boolean;
    isLoading: boolean;
}

export default function PrestigeSection({
    prestigeBoost,
    prestigeBalance,
    prestigeReward,
    handlePrestige,
    isPrestigeReady,
    isLoading
}: PrestigeSectionProps) {
    return (
        <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><StarIcon className="w-6 h-6 text-yellow-400" />Prestigio</h3>
            <p className="text-sm text-slate-300">
                Tu bonus de prestigio actual es de <b className="text-yellow-300">+{prestigeBoost.toFixed(2)}%</b> a todas tus ganancias.
            </p>
            <p className="text-xs text-slate-400 mt-1">Se basa en tu saldo de {prestigeBalance.toLocaleString()} $PRESTIGE.</p>
            
            {isPrestigeReady && (
                <p className="text-center text-sm mt-3 text-yellow-200">
                    Reinicia para obtener <b>{prestigeReward.toLocaleString()}</b> tokens de prestigio.
                </p>
            )}

            <motion.button
                onClick={handlePrestige}
                disabled={!isPrestigeReady || isLoading}
                whileHover={{ scale: 1.05 }}
                className="w-full mt-4 bg-yellow-500/80 hover:bg-yellow-500/100 text-stone-900 font-bold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/80 flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Procesando...
                    </>
                ) : 'Reiniciar para Prestigio'}
            </motion.button>
        </div>
    );
}