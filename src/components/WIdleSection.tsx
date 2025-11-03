import { motion } from "framer-motion";
import { Star } from 'iconoir-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { VerificationLevel } from '@worldcoin/minikit-js';
import safeMiniKit from '@/lib/safeMiniKit';
import { contractConfig } from '@/app/contracts/config';
import { useState, useEffect } from 'react';

interface WIdleSectionProps {
    wIdleBoost: number;
    wIdleBalance: number;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    walletAddress: string;
    setPendingWIdleTxId: (txId: string) => void;
    wIdleReward: number;
    lastWidleClaimAt?: string;
    onClaimSuccess: () => void;
}

export default function WIdleSection({
    wIdleBoost,
    wIdleBalance,
    isLoading,
    setIsLoading,
    walletAddress,
    setPendingWIdleTxId,
    wIdleReward,
    lastWidleClaimAt,
    onClaimSuccess,
}: WIdleSectionProps) {
    const { t } = useLanguage();
    const [cooldownTime, setCooldownTime] = useState("");

    useEffect(() => {
        if (!lastWidleClaimAt) {
            setCooldownTime("");
            return;
        }

        const interval = setInterval(() => {
            const lastClaimDate = new Date(lastWidleClaimAt);
            const cooldownEndDate = new Date(lastClaimDate.getTime() + 8 * 60 * 60 * 1000);
            const now = new Date();
            const timeLeft = cooldownEndDate.getTime() - now.getTime();

            if (timeLeft > 0) {
                const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
                const seconds = Math.floor((timeLeft / 1000) % 60);
                setCooldownTime(
                    `${hours.toString().padStart(2, "0")}:${minutes
                        .toString()
                        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
                );
            } else {
                setCooldownTime("");
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastWidleClaimAt]);
    

    const handleClaimWIdle = async () => {
        if (cooldownTime) { // Check cooldownTime
            alert(t('error.no_widle_reward'));
            return;
        }

        if (!safeMiniKit.isAvailable()) {
            console.error("World App not available / MiniKit not installed");
            alert(t('error.wallet_not_installed'));
            return;
        }

        setIsLoading(true);

        try {
            const verifyResp = await safeMiniKit.safeCall('verify', {
                action: 'claim-widle',
                signal: walletAddress,
                verification_level: VerificationLevel.Orb,
            });

            if (!verifyResp.ok || !verifyResp.finalPayload) {
                throw new Error('Verification failed: no response from MiniKit');
            }

            const finalPayload = verifyResp.finalPayload;

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

                const txResp = await safeMiniKit.safeCall('sendTransaction', {
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

                if (!txResp.ok || !txResp.finalPayload) {
                    throw new Error('Transaction failed: no response from MiniKit');
                }

                const txFinalPayload = txResp.finalPayload as { status?: string; message?: string; debug_url?: string; transaction_id?: string };

                if (txFinalPayload.status === 'error') {
                    console.error('Transaction failed payload:', JSON.stringify(txFinalPayload, null, 2));
                    let errorMessage = txFinalPayload.message || t('error.transaction_failed');
                    if (txFinalPayload.debug_url) {
                        errorMessage += `\n\nDEBUG URL (copy and paste in browser):\n${txFinalPayload.debug_url}`;
                    }
                    throw new Error(errorMessage);
                }

                if (txFinalPayload.transaction_id) {
                    setPendingWIdleTxId(txFinalPayload.transaction_id);
                    onClaimSuccess(); // Call on success
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

    const isButtonDisabled = isLoading || !!cooldownTime;

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
            </div>

            <motion.button
                onClick={handleClaimWIdle}
                disabled={isButtonDisabled}
                whileHover={{ scale: isButtonDisabled ? 1 : 1.05 }}
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
                ) : cooldownTime ? (
                    <span>{cooldownTime}</span>
                ) : (
                    t('widle_button')
                )}
            </motion.button>
        </div>
    );
}
