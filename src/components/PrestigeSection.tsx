import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Refresh } from 'iconoir-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { contractConfig } from '@/app/contracts/config';

interface PrestigeSectionProps {
    prestigeBoost: number;
    prestigeBalance: number;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    walletAddress: string;
    setPendingPrestigeTxId: (txId: string) => void;
    saveGame: (walletAddress: string) => Promise<void>;
}

export default function PrestigeSection({
    prestigeBoost,
    prestigeBalance,
    isLoading,
    setIsLoading,
    walletAddress,
    setPendingPrestigeTxId,
    saveGame,
}: PrestigeSectionProps) {
    const { t } = useLanguage();
    const [prestigeReward, setPrestigeReward] = useState(0);
    const [isFetchingReward, setIsFetchingReward] = useState(false);

    const fetchPrestigeReward = useCallback(async () => {
        if (!walletAddress) return;
        setIsFetchingReward(true);
        try {
            await saveGame(walletAddress); // Ensure latest state is saved before fetching reward
            const response = await fetch(`/api/get-prestige-reward?walletAddress=${walletAddress}`);
            const data = await response.json();
            if (data.success) {
                setPrestigeReward(data.prestigeReward);
            } else {
                console.error("Failed to fetch prestige reward:", data.error);
            }
        } catch (error) {
            console.error("Error fetching prestige reward:", error);
        } finally {
            setIsFetchingReward(false);
        }
    }, [walletAddress, saveGame]);

    useEffect(() => {
        fetchPrestigeReward();
    }, [fetchPrestigeReward]);

    const handlePrestige = async () => {
        if (prestigeReward <= 0) {
            alert(t('error.no_prestige_reward'));
            return;
        }

        if (!MiniKit.isInstalled()) {
            console.error("World App not installed");
            alert(t('error.wallet_not_installed'));
            return;
        }

        setIsLoading(true);

        try {
            const { finalPayload } = await MiniKit.commandsAsync.verify({
                action: 'prestige-game',
                signal: walletAddress,
                verification_level: VerificationLevel.Device,
            });

            if (finalPayload.status === 'error') {
                const errorPayload = finalPayload as { message?: string, debug_url?: string };
                console.error("DEBUG (MiniKit Error): " + JSON.stringify(errorPayload, null, 2));
                throw new Error(errorPayload.message || "Verification failed in World App.");
            }

            const response = await fetch('/api/prestige-with-worldid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: finalPayload,
                    action: 'prestige-game',
                    signal: walletAddress,
                }),
            });

            const backendResult = await response.json();

            if (!response.ok || !backendResult.success) {
                const errorDetail = backendResult.detail || backendResult.error || t('error.prestige_failed');
                if (backendResult.code === 'already_verified') {
                    throw new Error(t('error.already_verified_prestige'));
                }
                throw new Error(errorDetail);
            }

            const { amount, nonce, signature } = backendResult;

            const { finalPayload: txFinalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: contractConfig.gameManagerV2Address,
                        abi: contractConfig.gameManagerV2Abi,
                        functionName: 'prestige',
                        args: [amount, nonce, signature],
                        value: '0x0',
                    },
                ],
            });

            if (txFinalPayload.status === 'error') {
                const errorPayload = txFinalPayload as { message?: string, debug_url?: string };
                console.error("Transaction failed payload:", JSON.stringify(errorPayload, null, 2));
                let errorMessage = errorPayload.message || t('error.transaction_failed');
                if (errorPayload.debug_url) {
                    errorMessage += `\n\nDEBUG URL (copy and paste in browser):\n${errorPayload.debug_url}`;
                }
                throw new Error(errorMessage);
            }

            if (txFinalPayload.transaction_id) {
                setPendingPrestigeTxId(txFinalPayload.transaction_id);
            } else {
                throw new Error(t('error.transaction_id_missing'));
            }

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const isPrestigeReady = prestigeReward >= 1;

    return (
        <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-400" />{t('prestige')}</h3>
            <p className="text-sm text-slate-300">
                {t('prestige_bonus_part1')}<b className="text-yellow-300">+{prestigeBoost.toFixed(2)}%</b>{t('prestige_bonus_part2')}
            </p>
            <p className="text-xs text-slate-400 mt-2">{t('prestige_balance_message', { prestigeBalance: prestigeBalance.toLocaleString() })}</p>
            
            <div className="text-center text-sm mt-3 text-yellow-200 flex items-center justify-center gap-2">
                <span>
                    {t('prestige_reward_message', { prestigeReward: (prestigeReward / 100000).toLocaleString() })}
                </span>
                <button onClick={fetchPrestigeReward} disabled={isFetchingReward} className="p-1 rounded-full hover:bg-slate-600/50 disabled:opacity-50">
                    <Refresh className={`w-4 h-4 ${isFetchingReward ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <motion.button
                onClick={handlePrestige}
                disabled={!isPrestigeReady || isLoading || isFetchingReward}
                whileHover={{ scale: 1.05 }}
                className="w-full mt-4 bg-yellow-500/80 hover:bg-yellow-500/100 text-stone-900 font-bold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/80 flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('processing')}
                    </>
                ) : t('prestige_button')}
            </motion.button>
        </div>
    );
}
