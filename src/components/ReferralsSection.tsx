'use client';

import { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useLanguage } from '@/contexts/LanguageContext';
import { GameState, Referral } from './types';

interface ReferralsSectionProps {
  walletAddress: `0x${string}` | null;
  gameState: GameState;
}

// TODO: Replace with your real App ID from the Worldcoin Developer Portal
const YOUR_APP_ID = 'app_fe80f47dce293e5f434ea9553098015d';

interface RawReferral {
  referee_id: string;
  created_at: string;
}

export default function ReferralsSection({ walletAddress, gameState }: ReferralsSectionProps) {
  const { t } = useLanguage();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!walletAddress) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await fetch(`/api/get-referrals?walletAddress=${walletAddress}`);
        const data = await response.json();
        if (data.success) {
          // The API returns referee_id, let's adapt it to the Referral type
          const formattedReferrals = data.referrals.map((r: RawReferral, index: number) => ({
            id: index, // The id is just for the key, so index is fine
            wallet_address: r.referee_id,
            created_at: r.created_at,
          }));
          setReferrals(formattedReferrals);
        } else {
          console.error("Failed to fetch referrals:", data.error);
        }
      } catch (error) {
        console.error("Error fetching referrals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferrals();
  }, [walletAddress]);

  const handleShare = async () => {
    if (!walletAddress) return;

    // The path includes the query param `code` which will be read by new users
    const path = encodeURIComponent(`/invite?code=${walletAddress}`);
    const inviteLink = `https://world.org/mini-app?app_id=${YOUR_APP_ID}&path=${path}`;

    try {
      await MiniKit.commandsAsync.share({
        title: t('referral_share_title'),
        text: t('referral_share_text'),
        url: inviteLink,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const referralBoostPercent = Math.round((gameState.permanent_referral_boost || 0) * 100);

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-lg">
      <h2 className="text-2xl font-bold text-center text-cyan-400">{t('referrals_title')}</h2>
      <p className="text-center text-slate-300">
        {t('referrals_desc')}
      </p>
      
      <div className="my-4 text-center">
        <p className="text-slate-400">{t('your_referral_boost')}</p>
        <p className="text-4xl font-bold text-lime-400">{referralBoostPercent}%</p>
      </div>

      <button 
        onClick={handleShare}
        disabled={!walletAddress}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
      >
        {t('invite_friends_button')}
      </button>

      <div className="mt-6">
        <h3 className="text-xl font-bold text-center text-slate-300 mb-3">{t('your_referrals_title')}</h3>
        {isLoading ? (
          <p className="text-center text-slate-500">{t('loading_referrals')}</p>
        ) : referrals.length > 0 ? (
          <ul className="space-y-2">
            {referrals.map((ref: Referral) => (
              <li key={ref.id} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
                <p className="font-mono text-sm text-slate-400">
                  {`${ref.wallet_address.substring(0, 6)}...${ref.wallet_address.substring(ref.wallet_address.length - 4)}`}
                </p>
                <div className="flex items-center gap-2 text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium">{t('reward_claimed')}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-slate-500">{t('no_referrals_yet')}</p>
        )}
      </div>
    </div>
  );
}