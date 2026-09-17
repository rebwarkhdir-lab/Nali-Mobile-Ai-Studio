import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, TrendingDown, TrendingUp, X, Check, ArrowRightLeft, Clock } from 'lucide-react';
import { useDesignSystem } from '../../context/DesignContext';
import { sound } from '../../lib/sound';
import { motion, AnimatePresence } from 'motion/react';

interface CurrencyData {
  currency: string;
  buy_rate: number;
  sell_rate: number;
  change_percent: number | null;
}

export default function LiveExchangeRate() {
  const { settings, updateSettings } = useDesignSystem();
  const fallbackRate = settings.exchangeRate || 1500;
  const initialFallbackData: CurrencyData = {
    currency: 'USD',
    buy_rate: fallbackRate >= 1000 ? fallbackRate * 100 : 150000,
    sell_rate: (fallbackRate >= 1000 ? fallbackRate * 100 : 150000) + 500,
    change_percent: 0
  };

  const [rateData, setRateData] = useState<CurrencyData>(() => {
    try {
      const cached = localStorage.getItem('nali_exchange_rate_data');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return initialFallbackData;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(false);
      let json: any = null;

      // 1. Try local proxy first
      try {
        const res = await fetch('/api/currency-rates', { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          json = await res.json();
        }
      } catch {
        // Proxy not available or failed
      }

      // 2. Try direct external endpoint if needed
      if (!json || !json.data) {
        try {
          const directRes = await fetch('https://cashnrx.innovation-pulsehub.com/api/mobile/currency-rates', {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(4000)
          });
          if (directRes.ok) {
            json = await directRes.json();
          }
        } catch {
          // Direct fetch failed (e.g. CORS or offline)
        }
      }

      if (json && json.success && json.data && json.data.rates) {
        const usdData = json.data.rates.find((r: any) => r.currency === 'USD');
        if (usdData) {
          setRateData(usdData);
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          localStorage.setItem('nali_exchange_rate_data', JSON.stringify(usdData));
          
          const ratePerDollar = usdData.buy_rate > 10000 ? usdData.buy_rate / 100 : usdData.buy_rate;
          if (ratePerDollar > 0) {
            const currentSavedRate = localStorage.getItem('nali_exchange_rate');
            if (!currentSavedRate || parseFloat(currentSavedRate) !== ratePerDollar) {
              updateSettings({ exchangeRate: ratePerDollar });
            }
          }
          return;
        }
      }

      // 3. If remote failed, use latest persisted or settings rate
      const savedRate = localStorage.getItem('nali_exchange_rate');
      const currentVal = savedRate ? parseFloat(savedRate) : settings.exchangeRate;
      if (currentVal) {
        const localData: CurrencyData = {
          currency: 'USD',
          buy_rate: currentVal * 100,
          sell_rate: (currentVal * 100) + 500,
          change_percent: null
        };
        setRateData(localData);
      }
    } catch (err) {
      console.warn('Currency rates using offline/cached fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !rateData) {
    return (
      <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-800/40 border border-slate-700/50 rounded-xl text-slate-400 font-mono text-xs shrink-0">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span className="hidden sm:inline text-[11px]">Borsa Rate...</span>
      </div>
    );
  }

  if (error && !rateData) {
    return (
      <button 
        onClick={fetchRates}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-400 font-mono text-[11px] shrink-0" 
        title="Click to retry loading market rate"
      >
        <span>$ Rate Error</span>
        <RefreshCw className="w-3 h-3" />
      </button>
    );
  }

  if (!rateData) return null;

  const isPositive = rateData.change_percent && rateData.change_percent > 0;
  const isNegative = rateData.change_percent && rateData.change_percent < 0;
  const ratePerDollar = rateData.buy_rate > 10000 ? rateData.buy_rate / 100 : rateData.buy_rate;

  return (
    <>
      <button
        onClick={() => {
          sound.playClick();
          setIsDetailsOpen(true);
        }}
        className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-slate-800/60 hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/60 hover:border-slate-600 rounded-xl text-slate-200 font-mono text-xs shadow-sm shrink-0 cursor-pointer"
        title="Click for Live USD / IQD Market Exchange Details"
      >
        {/* Dollar Icon / Badge */}
        <div className="flex items-center text-amber-400 font-bold bg-amber-500/15 px-1 sm:px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px]">
          <DollarSign className="w-3 h-3" />
          <span className="hidden sm:inline">100</span>
        </div>

        {/* Rate Display */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <span className="font-bold text-white tracking-tight text-[11px] sm:text-xs">
            {Math.round(rateData.buy_rate).toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-sans font-medium">IQD</span>
        </div>

        {/* Trend Indicator (hidden on mobile to maintain clean header) */}
        {rateData.change_percent !== null && rateData.change_percent !== 0 && (
          <span className={`hidden md:flex items-center text-[10px] font-bold ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {Math.abs(rateData.change_percent)}%
          </span>
        )}
      </button>

      {/* Live Market Exchange Rate Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsDetailsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-[#0C101D] border border-slate-700/80 rounded-2xl p-5 shadow-2xl z-10 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Market Exchange Rate</h3>
                    <p className="text-[11px] text-slate-400">Live Iraq Borsa / Market Index</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Rates Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    $100 Buy Rate
                  </span>
                  <div className="text-base font-extrabold text-white font-mono">
                    {rateData.buy_rate.toLocaleString()} <span className="text-xs text-slate-400 font-normal">IQD</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    $1 = {Math.round(ratePerDollar).toLocaleString()} IQD
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    $100 Sell Rate
                  </span>
                  <div className="text-base font-extrabold text-slate-200 font-mono">
                    {rateData.sell_rate ? rateData.sell_rate.toLocaleString() : (rateData.buy_rate + 500).toLocaleString()} <span className="text-xs text-slate-400 font-normal">IQD</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Market Spread: ~500 IQD
                  </div>
                </div>
              </div>

              {/* Status & Sync Time */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">Updated at {lastUpdated || 'recently'}</span>
                </div>
                {rateData.change_percent !== null && (
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {rateData.change_percent}% 24h
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    sound.playClick();
                    fetchRates();
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Refreshing...' : 'Refresh Live Rate'}</span>
                </button>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

