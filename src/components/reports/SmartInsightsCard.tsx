import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  AlertTriangle, 
  Flame, 
  Percent, 
  Clock, 
  ArrowRight, 
  Smartphone, 
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { InStockItemReport, ProductProfitRank } from '../../types/report';
import { formatNumberWithCommas } from '../../lib/utils';

interface SmartInsightsCardProps {
  inStockItems: InStockItemReport[];
  productRanks: ProductProfitRank[];
  exchangeRate: number;
}

export default function SmartInsightsCard({
  inStockItems,
  productRanks,
  exchangeRate
}: SmartInsightsCardProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  // 1. Aging / Stagnant stock (> 30 days)
  const agingItems = inStockItems
    .filter(i => i.daysInStock > 30)
    .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  const totalAgingCostUSD = agingItems.reduce((acc, i) => acc + i.totalCostUSD, 0);

  // 2. High Margin items (> 35% margin)
  const highMarginItems = inStockItems
    .filter(i => i.marginPercent >= 35)
    .sort((a, b) => b.potentialUnitProfitUSD - a.potentialUnitProfitUSD)
    .slice(0, 3);

  // 3. Top fast sellers
  const topSellers = productRanks.slice(0, 3);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* 1. AGING CAPITAL ALERT */}
      <div className="p-5 rounded-3xl bg-[#121829] border border-amber-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {t('reportsPage.insights.agingAlert', { count: (agingItems?.length || 0), defaultValue: `${(agingItems?.length || 0)} SKUs Alert` })}
            </span>
          </div>

          <h4 className="text-base font-bold text-white tracking-tight">
            {t('reportsPage.insights.agingTitle', 'Stagnant Capital Alert')}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {t('reportsPage.insights.agingSubtitle', 'Items in warehouse > 30 days holding capital:')}
          </p>

          <div className="mt-2 text-xl font-extrabold text-amber-400">
            ${formatNumberWithCommas(totalAgingCostUSD)} <span className="text-xs font-normal text-slate-400">{t('reportsPage.insights.agingLocked', { amount: '', defaultValue: 'USD locked' })}</span>
          </div>

          <div className="mt-3 space-y-2">
            {agingItems.slice(0, 3).map(item => (
              <div key={item.id} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-300 line-clamp-1">{item.name}</span>
                <span className="text-amber-400 font-bold mx-2 whitespace-nowrap">
                  {t('reportsPage.insights.daysUnit', { days: item.daysInStock, defaultValue: `${item.daysInStock} days` })} (${item.totalCostUSD})
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-amber-400/80 mt-4">
          {t('reportsPage.insights.agingTip', 'Tip: Consider discount campaigns or promotional bundling to liberate locked cash.')}
        </p>
      </div>

      {/* 2. HIGH MARGIN CHAMPIONS */}
      <div className="p-5 rounded-3xl bg-[#121829] border border-emerald-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {t('reportsPage.insights.highMarginBadge', '≥ 35% Margin')}
            </span>
          </div>

          <h4 className="text-base font-bold text-white tracking-tight">
            {t('reportsPage.insights.highMarginTitle', 'High Margin Champions')}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {t('reportsPage.insights.highMarginSubtitle', 'Products generating the highest profit efficiency per unit:')}
          </p>

          <div className="mt-3 space-y-2">
            {highMarginItems.map(item => (
              <div key={item.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white line-clamp-1">{item.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {t('reportsPage.insights.buy', 'Buy')}: ${item.unitBuyPriceUSD} | {t('reportsPage.insights.sell', 'Sell')}: ${item.unitSellPriceUSD}
                  </div>
                </div>
                <div className={isKu ? 'text-left' : 'text-right'}>
                  <span className="text-xs font-bold text-emerald-400 block">+{item.marginPercent}%</span>
                  <span className="text-[10px] text-emerald-300/80">
                    +${item.potentialUnitProfitUSD} {t('reportsPage.insights.profit', 'profit')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-emerald-400/80 mt-4">
          {t('reportsPage.insights.highMarginTip', 'Tip: Display these accessories near checkout to maximize profit per customer.')}
        </p>
      </div>

      {/* 3. VELOCITY LEADERS */}
      <div className="p-5 rounded-3xl bg-[#121829] border border-indigo-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {t('reportsPage.insights.velocityBadge', 'Top Sellers')}
            </span>
          </div>

          <h4 className="text-base font-bold text-white tracking-tight">
            {t('reportsPage.insights.velocityTitle', 'Sales Velocity Leaders')}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {t('reportsPage.insights.velocitySubtitle', 'Most frequently purchased inventory items:')}
          </p>

          <div className="mt-3 space-y-2">
            {topSellers.map(seller => (
              <div key={seller.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white line-clamp-1">{seller.name}</div>
                  <div className="text-[10px] text-indigo-400">{seller.brand}</div>
                </div>
                <div className={isKu ? 'text-left' : 'text-right'}>
                  <span className="text-xs font-bold text-indigo-300 block">
                    {seller.unitsSold} {t('reportsPage.insights.sold', 'sold')}
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    +${formatNumberWithCommas(seller.totalProfitUSD)} {t('reportsPage.insights.net', 'net')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-indigo-400/80 mt-4">
          {t('reportsPage.insights.velocityTip', 'Tip: Maintain minimum buffer stock for these high turnover models to avoid lost sales.')}
        </p>
      </div>

    </div>
  );
}
