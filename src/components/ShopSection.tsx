"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import React from 'react';
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, MiniAppPaymentErrorPayload } from '@worldcoin/minikit-js';
import { GameState } from './types';

interface ShopSectionProps {
  walletAddress: string | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: (notification: { message: string; type: 'success' | 'error' } | null) => void;
  totalCPS: number;
  prestigeBalance: number;
  handleTimeWarpPurchase: (type: 'prestige' | 'wld') => void;
  formatNumber: (num: number) => string;
  timeWarpPrestigeCost: number;
  timeWarpWldCost: number;
  timeWarpCooldown: string;
}

const boosts = [
  { id: 'boost_10', name: 'shop.boost_10', price: 0.15, bonus: 0.1 },
  { id: 'boost_50', name: 'shop.boost_50', price: 0.60, bonus: 0.5 },
  { id: 'boost_100', name: 'shop.boost_100', price: 1, bonus: 1.0 },
];

const PAYMENT_RECIPIENT_ADDRESS = '0x536bB672A282df8c89DDA57E79423cC505750E52';

const ShopSection: React.FC<ShopSectionProps> = ({ walletAddress, setGameState, setNotification, totalCPS, prestigeBalance, handleTimeWarpPurchase, formatNumber, timeWarpPrestigeCost, timeWarpWldCost, timeWarpCooldown }) => {
  const { t } = useLanguage();

  const timeWarpReward = totalCPS * 86400; // 24 hours of production

  const handleBoostPurchase = async (boostId: string) => {
    if (!walletAddress) {
      setNotification({ message: t("wallet_prompt"), type: 'error' });
      return;
    }
    if (!MiniKit.isInstalled()) {
      setNotification({ message: t("wallet_prompt"), type: 'error' });
      return;
    }

    const selectedBoost = boosts.find(b => b.id === boostId);
    if (!selectedBoost) return;

    setNotification({ message: t("payment_initiated"), type: 'success' });

    try {
      const initRes = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, boostId }),
      });

      if (!initRes.ok) throw new Error(t("payment_failed_init"));
      const { reference } = await initRes.json();

      const payload: PayCommandInput = {
        reference,
        to: PAYMENT_RECIPIENT_ADDRESS,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(selectedBoost.price, Tokens.WLD).toString(),
          },
        ],
        description: `Purchase of ${t(selectedBoost.name)}`,
      };

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

      if (finalPayload.status === 'success') {
        setNotification({ message: t("payment_sent_verifying"), type: 'success' });

        const confirmRes = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: finalPayload, walletAddress, boostId }),
        });

        if (!confirmRes.ok) throw new Error(t("payment_failed_confirm"));
        const { success, newBonus, error } = await confirmRes.json();

        if (success) {
          setGameState(prev => ({
            ...prev,
            permanentBoostBonus: newBonus,
          }));
          setNotification({ message: t("boost_purchased"), type: 'success' });
        } else {
          throw new Error(error || t("confirmation_failed"));
        }
      } else {
        const errorPayload = finalPayload as MiniAppPaymentErrorPayload;
        console.error("Payment failed in World App:", errorPayload);
        throw new Error(t("payment_cancelled"));
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      setNotification({ message: t("purchase_failed", { error: error instanceof Error ? error.message : 'An unknown error occurred.' }), type: 'error' });
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 rounded-xl border border-slate-700 flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold mb-4">{t('permanent_boosts_shop')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {boosts.map((boost) => (
            <div key={boost.id} className="bg-slate-800/50 p-4 rounded-lg flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t(boost.name)}</h3>
                <p className="text-slate-400">{t('price')}: {boost.price} WLD</p>
              </div>
              <button
                onClick={() => handleBoostPurchase(boost.id)}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-slate-500"
                disabled={!walletAddress}
              >
                {t('buy_now')}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">{t('time_warps')}</h2>
        <div className="bg-slate-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">{t('time_warp_24h')}</h3>
          <p className="text-slate-400 mb-2">{t('time_warp_desc')}</p>
          <p className="text-lime-400 font-bold text-lg mb-4">
            {t('reward')}: +{formatNumber(timeWarpReward)} $WCLICK
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {timeWarpCooldown ? (
              <div className="flex-1 bg-pink-900/50 text-white font-bold py-2 px-4 rounded text-center">
                {t('available_in')} {timeWarpCooldown}
              </div>
            ) : (
              <button
                onClick={() => handleTimeWarpPurchase('prestige')}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded disabled:bg-slate-500"
                disabled={!walletAddress || prestigeBalance < timeWarpPrestigeCost}
              >
                {t('buy_with_prestige', { price: timeWarpPrestigeCost })}
              </button>
            )}
            <button
              onClick={() => handleTimeWarpPurchase('wld')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-slate-500"
              disabled={!walletAddress}
            >
              {t('buy_with_wld', { price: timeWarpWldCost.toFixed(2) })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopSection;