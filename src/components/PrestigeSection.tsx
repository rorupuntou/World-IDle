import { motion } from "framer-motion";
import { Star } from 'iconoir-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js';
import { contractConfig } from '@/app/contracts/config';

interface PrestigeSectionProps {
    prestigeBoost: number;
    prestigeBalance: number;
    prestigeReward: number;
    isPrestigeReady: boolean;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    walletAddress: string;
    setPendingPrestigeTxId: (txId: string) => void;
    saveGame: (walletAddress: string, immediate?: boolean) => Promise<void>;
}

export default function PrestigeSection({
    prestigeBoost,
    prestigeBalance,
    prestigeReward,
    isPrestigeReady,
    isLoading,
    setIsLoading,
    walletAddress,
    setPendingPrestigeTxId,
    saveGame,
}: PrestigeSectionProps) {
    const { t } = useLanguage();

    const handlePrestige = async () => {
        await saveGame(walletAddress, true); // Force save before prestiging

        if (!MiniKit.isInstalled()) {
            console.error("World App not installed");
            alert(t('error.wallet_not_installed'));
            return;
        }

        if (prestigeReward <= 0) {
            alert(t('error.no_prestige_reward'));
            return;
        }

        setIsLoading(true);

        const verifyPayload: VerifyCommandInput = {
            action: 'prestige-game',
            signal: walletAddress,
            verification_level: VerificationLevel.Orb,
        };

        try {
            // 1. Verify with World ID
            const { finalPayload: verifyFinalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

            if (verifyFinalPayload.status === 'error') {
                throw new Error((verifyFinalPayload as { message?: string }).message || t('error.verification_failed'));
            }

            // 2. Send proof to our backend for verification and to get signature
            const response = await fetch('/api/prestige-with-worldid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: verifyFinalPayload as ISuccessResult,
                    action: 'prestige-game',
                    signal: walletAddress,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                const errorDetail = result.detail || result.error || t('error.prestige_failed');
                if (result.code === 'already_verified') {
                    throw new Error(t('error.already_verified_prestige'));
                }
                throw new Error(errorDetail);
            }

            // 3. If backend is successful, send the prestige transaction with the signature
            const { amount, nonce, signature } = result;

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
                formatPayload: false, // Added for debugging
            });

            if (txFinalPayload.status === 'error') {
                throw new Error((txFinalPayload as { message?: string }).message || t('error.transaction_failed'));
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

    return (
        <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-400" />{t('prestige')}</h3>
            <p className="text-sm text-slate-300">
                {t('prestige_bonus_part1')}<b className="text-yellow-300">+{prestigeBoost.toFixed(2)}%</b>{t('prestige_bonus_part2')}
            </p>
            <p className="text-xs text-slate-400 mt-2">{t('prestige_balance_message', { prestigeBalance: prestigeBalance.toLocaleString() })}</p>
            
            {isPrestigeReady && (
                <p className="text-center text-sm mt-3 text-yellow-200">
                    {t('prestige_reward_message', { prestigeReward: (prestigeReward / 100000).toLocaleString() })}
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
                        {t('processing')}
                    </>
                ) : t('prestige_button')}
            </motion.button>
        </div>
    );
}
