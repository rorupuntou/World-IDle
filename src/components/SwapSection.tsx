'use client';

import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatUnits } from 'viem';
import { ArrowDown } from 'iconoir-react';

// Define the props for the component
interface SwapSectionProps {
  prestigeBalance: number;
  onSwap: (params: {
    fromToken: `0x${string}`;
    toToken: `0x${string}`;
    amountIn: string;
    amountOutMin: string;
    fee: number;
  }) => Promise<void>;
  isSwapping: boolean;
}

const supportedTokens = [
  { symbol: 'PSTG', name: 'Prestige Token', address: '0x6671c7c52B5Ee08174d432408086E1357ED07246' as `0x${string}` },
  { symbol: 'WLD', name: 'Worldcoin', address: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' as `0x${string}` },
  { symbol: 'USDC', name: 'USD Coin', address: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' as `0x${string}` },
];

export default function SwapSection({ prestigeBalance, onSwap, isSwapping }: SwapSectionProps) {
  const { t } = useLanguage();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState(''); // For display
  const [fromTokenSymbol, setFromTokenSymbol] = useState(supportedTokens[0].symbol);
  const [toTokenSymbol, setToTokenSymbol] = useState(supportedTokens[1].symbol);
  
  const [error, setError] = useState<string | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quotedAmountOut, setQuotedAmountOut] = useState<string | null>(null); // The raw amount from the quote
  const [quoteFee, setQuoteFee] = useState<number | null>(null); // The fee from the best quote

  const handleAmountChange = (amount: string) => {
    setFromAmount(amount);
    // Reset quote if amount changes
    setToAmount('');
    setQuotedAmountOut(null);
    setQuoteFee(null);
  }

  const handleGetQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError(t('enter_valid_amount'));
      return;
    }

    setError(null);
    setQuotedAmountOut(null);
    setQuoteFee(null);
    setIsFetchingQuote(true);

    try {
      const fromToken = supportedTokens.find(t => t.symbol === fromTokenSymbol);
      const toToken = supportedTokens.find(t => t.symbol === toTokenSymbol);
      if (!fromToken || !toToken) return;

      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: fromToken.address,
          toToken: toToken.address,
          amount: fromAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('quote_failed'));
      }

      const formattedToAmount = formatUnits(BigInt(data.toAmount), data.toTokenDecimals);
      setToAmount(formattedToAmount);
      setQuotedAmountOut(data.toAmount);
      setQuoteFee(data.fee);

    } catch (err) {
      const message = err instanceof Error ? err.message : t('unknown_error');
      setError(message);
      console.error(err);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const executeSwap = useCallback(async () => {
    const fromToken = supportedTokens.find(t => t.symbol === fromTokenSymbol);
    const toToken = supportedTokens.find(t => t.symbol === toTokenSymbol);

    if (!quotedAmountOut || !quoteFee || !fromToken || !toToken) return;

    await onSwap({
      fromToken: fromToken.address,
      toToken: toToken.address,
      amountIn: fromAmount,
      amountOutMin: quotedAmountOut,
      fee: quoteFee,
    });

    // Reset state after swap is sent
    setQuotedAmountOut(null);
    setQuoteFee(null);
    setFromAmount('');
    setToAmount('');
  }, [fromTokenSymbol, toTokenSymbol, fromAmount, quotedAmountOut, quoteFee, onSwap]);

  const displayBalance = fromTokenSymbol === 'PSTG' ? prestigeBalance : 0; // Placeholder for other token balances

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-lg font-bold text-slate-200">{t('token_swap')}</h3>
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input 
            type="number"
            value={fromAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.0"
            className="w-full bg-slate-900/80 border border-slate-600 rounded-md px-3 py-2 text-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <select 
            value={fromTokenSymbol} 
            onChange={(e) => setFromTokenSymbol(e.target.value)}
            className="bg-slate-900/80 border border-slate-600 rounded-md px-2 py-2 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {supportedTokens.map(token => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-400 px-1">{t('balance')}: {displayBalance.toLocaleString()}</p>
      </div>

      <div className="flex justify-center -my-2 z-10">
        <button className="p-1 bg-slate-700 border-2 border-slate-800 rounded-full">
            <ArrowDown className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="number"
          value={toAmount}
          readOnly
          placeholder="0.0"
          className="w-full bg-slate-900/80 border border-slate-600 rounded-md px-3 py-2 text-lg text-slate-400 focus:outline-none"
        />
        <select 
          value={toTokenSymbol} 
          onChange={(e) => setToTokenSymbol(e.target.value)}
          className="bg-slate-900/80 border border-slate-600 rounded-md px-2 py-2 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {supportedTokens.map(token => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <div className="flex items-center gap-2">
        <button 
          onClick={handleGetQuote}
          disabled={isFetchingQuote || isSwapping || !fromAmount}
          className="w-full bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {isFetchingQuote ? t('getting_quote') : t('get_quote')}
        </button>
        <button 
          onClick={executeSwap}
          disabled={!quotedAmountOut || isSwapping}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {isSwapping ? t('swapping') : t('swap')}
        </button>
      </div>
    </div>
  );
}