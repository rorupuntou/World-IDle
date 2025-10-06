
"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import React from 'react';
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, MiniAppPaymentErrorPayload } from '@worldcoin/minikit-js';
import { GameState } from './types';

interface ShopSectionProps {
  walletAddress: string | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setToast: (message: string | null) => void;
}

const boosts = [
  { id: 'boost_10', name: 'shop.boost_10', price: 0.15, bonus: 0.1 },
  { id: 'boost_50', name: 'shop.boost_50', price: 0.60, bonus: 0.5 },
  { id: 'boost_100', name: 'shop.boost_100', price: 1, bonus: 1.0 },
];

const PAYMENT_RECIPIENT_ADDRESS = '0x536bB672A282df8c89DDA57E79423cC505750E52';

const ShopSection: React.FC<ShopSectionProps> = ({ walletAddress, setGameState, setToast }) => {
  const { t } = useLanguage();

  const handlePurchase = async (boostId: string) => {
    if (!walletAddress) {
      setToast(t("wallet_prompt"));
      return;
    }
    if (!MiniKit.isInstalled()) {
      setToast(t("wallet_prompt"));
      return;
    }

    const selectedBoost = boosts.find(b => b.id === boostId);
    if (!selectedBoost) return;

    setToast(t("payment_initiated"));

    try {
      // 1. Initiate payment on the backend to get a reference ID
      const initRes = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, boostId }),
      });

      if (!initRes.ok) throw new Error(t("payment_failed_init"));
      const { reference } = await initRes.json();

      // 2. Prepare and send the payment command to World App
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

      // 3. Handle the response from World App
      if (finalPayload.status === 'success') {
        setToast(t("payment_sent_verifying"));

        // 4. Confirm payment on the backend
        const confirmRes = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: finalPayload, walletAddress, boostId }),
        });

        if (!confirmRes.ok) throw new Error(t("payment_failed_confirm"));
        const { success, newBonus, error } = await confirmRes.json();

        if (success) {
          // 5. Update local game state
          setGameState(prev => ({
            ...prev,
            permanentBoostBonus: newBonus,
          }));
          setToast(t("boost_purchased"));
        } else {
          throw new Error(error || t("confirmation_failed"));
        }
      } else {
        // Handle error payload safely
        const errorPayload = finalPayload as MiniAppPaymentErrorPayload;
        console.error("Payment failed in World App:", errorPayload);
        throw new Error(t("payment_cancelled"));
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      setToast(t("purchase_failed", { error: error instanceof Error ? error.message : 'An unknown error occurred.' }));
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">{t('permanent_boosts_shop')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {boosts.map((boost) => (
          <div key={boost.id} className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t(boost.name)}</h3>
              <p className="text-gray-400">{t('price')}: {boost.price} WLD</p>
            </div>
            <button
              onClick={() => handlePurchase(boost.id)}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
              disabled={!walletAddress}
            >
              {t('buy_now')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopSection;
