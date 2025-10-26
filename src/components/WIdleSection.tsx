import { motion } from "framer-motion";
import { Star, Refresh, Trash } from 'iconoir-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { contractConfig } from '@/app/contracts/config';

interface WIdleSectionProps {
    wIdleBoost: number;
    wIdleBalance: number;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    walletAddress: string;
    setPendingWIdleTxId: (txId: string) => void;
    resetGame: () => void;
    wIdleReward: number;
    canClaimWIdle: boolean;
    handleFetchWIdleReward: () => void;
}

export default function WIdleSection({
    wIdleBoost,
    wIdleBalance,
    isLoading,
    setIsLoading,
    walletAddress,
    setPendingWIdleTxId,
    resetGame,
    wIdleReward,
    canClaimWIdle,
    handleFetchWIdleReward,
}: WIdleSectionProps) {
    const { t } = useLanguage();
    

    const handleClaimWIdle = async () => {
        if (!canClaimWIdle) {
            alert(t('error.no_widle_reward'));
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
                action: 'claim-widle',
                signal: walletAddress,
                verification_level: VerificationLevel.Device,
            });

            if (finalPayload.status === 'error') {
                const errorPayload = finalPayload as { message?: string, debug_url?: string };
                console.error("DEBUG (MiniKit Error): " + JSON.stringify(errorPayload, null, 2));
                throw new Error(errorPayload.message || "Verification failed in World App.");
            }

            const response = await fetch('/api/claim-widle-with-worldid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: finalPayload,
                    action: 'claim-widle',
                    signal: walletAddress,
                }),
            });

            const backendResult = await response.json();

            if (!response.ok || !backendResult.success) {
                const errorDetail = backendResult.detail || backendResult.error || t('error.widle_claim_failed');
                if (backendResult.code === 'already_verified') {
                    throw new Error(t('error.already_verified_widle'));
                }
                throw new Error(errorDetail);
            }

            const { amount, nonce, signature } = backendResult;

            const { finalPayload: txFinalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: contractConfig.gameManagerV2Address,
                        abi: contractConfig.gameManagerV2Abi,
                        functionName: 'claimWIdle',
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
                setPendingWIdleTxId(txFinalPayload.transaction_id);
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

    const handleResetGame = () => {
        if (window.confirm(t('confirm_reset'))) {
            resetGame();
        }
    };

    return (
        <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-400" />{t('widle')}</h3>
            <p className="text-sm text-slate-300">
                {t('widle_bonus_part1')}<b className="text-yellow-300">+{wIdleBoost.toFixed(2)}%</b>{t('widle_bonus_part2')}            </p>
            <p className="text-xs text-slate-400 mt-2">{t('widle_balance_message', { wIdleBalance: wIdleBalance.toLocaleString() })}</p>
            
            <div className="text-center text-sm mt-3 text-yellow-200 flex items-center justify-center gap-2">
                <span>
                    {t('widle_reward_message', { wIdleReward: (wIdleReward).toLocaleString() })}
                </span>
                <button onClick={handleFetchWIdleReward} disabled={isLoading} className="p-1 rounded-full hover:bg-slate-600/50 disabled:opacity-50">
                    <Refresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <motion.button
                onClick={handleClaimWIdle}
                disabled={!canClaimWIdle || isLoading}
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
                ) : t('widle_button')}
            </motion.button>
            <button onClick={handleResetGame} className="w-full mt-2 text-sm text-red-500 hover:underline flex items-center justify-center gap-1">
                <Trash className="w-4 h-4" />
                {t('reset_game')}
            </button>
        </div>
    );
}