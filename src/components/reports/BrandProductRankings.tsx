import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  Smartphone, 
  Headphones, 
  Percent, 
  TrendingUp, 
  Layers, 
  PieChart as PieIcon,
  ChevronRight,
  Flame
} from 'lucide-react';
import { ProductProfitRank, BrandProfitBreakdown } from '../../types/report';
import { formatNumberWithCommas } from '../../lib/utils';

interface BrandProductRankingsProps {
  products: ProductProfitRank[];
  brands: BrandProfitBreakdown[];
  exchangeRate: number;
}

export default function BrandProductRankings({ products, brands, exchangeRate }: BrandProductRankingsProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [filterType, setFilterType] = useState<'all' | 'mobile' | 'accessory'>('all');

  const filteredProducts = (products || []).filter(p => {
    if (filterType === 'all') return true;
    return p.type === filterType;
  }).slice(0, 7);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* 1. TOP PROFIT PRODUCING PRODUCTS */}
      <div className="bg-[#121829] rounded-3xl border border-slate-800/80 p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t('reportsPage.rankings.topProfitTitle', 'Top Profit Generators')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('reportsPage.rankings.topProfitSubtitle', 'Highest net margin products sold')}
                </p>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('reportsPage.rankings.all', 'All')}
              </button>
              <button
                onClick={() => setFilterType('mobile')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterType === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('reportsPage.rankings.phones', 'Phones')}
              </button>
              <button
                onClick={() => setFilterType('accessory')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterType === 'accessory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('reportsPage.rankings.accessories', 'Accessories')}
              </button>
            </div>
          </div>

          {/* RANKED LIST */}
          <div className="space-y-3">
            {(filteredProducts?.length || 0) === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                {t('reportsPage.rankings.noRecords', 'No sales records found for this category yet.')}
              </div>
            ) : (
              filteredProducts.map((p, idx) => (
                <div 
                  key={p.id || idx} 
                  className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                        : (idx === 1 
                          ? 'bg-slate-300 text-slate-950' 
                          : (idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'))
                    }`}>
                      {idx + 1}
                    </span>

                    <div className={`p-2 rounded-xl border ${
                      p.type === 'mobile' 
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    }`}>
                      {p.type === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-white line-clamp-1">{p.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{p.brand}</span>
                        <span>•</span>
                        <span className="text-slate-300">
                          {t('reportsPage.rankings.unitsSold', { count: p.unitsSold, defaultValue: `${p.unitsSold} units sold` })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={isKu ? 'text-left' : 'text-right'}>
                    <div className="text-sm font-bold text-emerald-400">
                      +${formatNumberWithCommas(p.totalProfitUSD)}
                    </div>
                    <div className="text-[11px] text-amber-400/90 font-medium">
                      +{formatNumberWithCommas(p.totalProfitIQD)} IQD
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {t('reportsPage.rankings.margin', { margin: p.marginPercent, defaultValue: `${p.marginPercent}% margin` })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{t('reportsPage.rankings.profitFormula', 'Profit = (Revenue - COGS)')}</span>
          <span className="text-indigo-400 font-medium">{t('reportsPage.rankings.autoRanked', 'Auto-Ranked by Cumulative Net Profit')}</span>
        </div>
      </div>

      {/* 2. BRAND PROFIT & INVENTORY SHARE */}
      <div className="bg-[#121829] rounded-3xl border border-slate-800/80 p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {t('reportsPage.rankings.brandTitle', 'Brand Contribution Breakdown')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('reportsPage.rankings.brandSubtitle', 'Profit share and in-stock capital tied to each brand')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {brands.slice(0, 6).map((b, idx) => (
              <div key={b.brand} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{b.brand}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {t('reportsPage.rankings.sold', { count: b.itemsSoldCount, defaultValue: `${b.itemsSoldCount} sold` })}
                    </span>
                  </div>

                  <div className={isKu ? 'text-left' : 'text-right'}>
                    <span className={`text-xs font-bold text-emerald-400 ${isKu ? 'ml-2' : 'mr-2'}`}>
                      +${formatNumberWithCommas(b.totalProfitUSD)}
                    </span>
                    <span className="text-xs font-semibold text-indigo-300">
                      ({b.profitContributionPercent}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, b.profitContributionPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t('reportsPage.rankings.inStockInventory', { count: b.inStockCount, defaultValue: `In-stock inventory: ${b.inStockCount} units` })}</span>
                  <span>{t('reportsPage.rankings.capitalLocked', 'Capital locked:')} <strong className="text-slate-300">${formatNumberWithCommas(b.inStockCostUSD)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{t('reportsPage.rankings.totalPortfolio', 'Total Brand Portfolio')}</span>
          <span className="text-slate-300">{t('reportsPage.rankings.activeBrands', { count: (brands?.length || 0), defaultValue: `${(brands?.length || 0)} active brands` })}</span>
        </div>
      </div>

    </div>
  );
}
