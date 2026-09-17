import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins, 
  Percent, 
  ShoppingBag,
  Clock,
  Layers
} from 'lucide-react';
import { ProfitPeriodSummary } from '../../types/report';
import { formatCurrency, formatNumberWithCommas } from '../../lib/utils';

interface ProfitPeriodCardsProps {
  todayProfit: ProfitPeriodSummary;
  yesterdayProfit: ProfitPeriodSummary;
  monthProfit: ProfitPeriodSummary;
  yearProfit: ProfitPeriodSummary;
  allTimeProfit: ProfitPeriodSummary;
  exchangeRate: number;
}

export default function ProfitPeriodCards({
  todayProfit,
  yesterdayProfit,
  monthProfit,
  yearProfit,
  allTimeProfit,
  exchangeRate
}: ProfitPeriodCardsProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  // Calculate day-over-day profit growth
  const todayProfitDiff = todayProfit.profitUSD - yesterdayProfit.profitUSD;
  const todayGrowthPercent = yesterdayProfit.profitUSD > 0 
    ? ((todayProfitDiff / yesterdayProfit.profitUSD) * 100).toFixed(1) 
    : (todayProfit.profitUSD > 0 ? '+100' : '0');

  // Month-end projection based on daily average
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthProfitUSD = currentDay > 0 
    ? Math.round((monthProfit.profitUSD / currentDay) * daysInMonth) 
    : monthProfit.profitUSD;
  const projectedMonthProfitIQD = Math.round(projectedMonthProfitUSD * exchangeRate);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* 1. TODAY'S PROFIT CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#111c2e] to-[#0f172a] border border-emerald-500/30 p-5 shadow-xl hover:border-emerald-500/50 transition-all group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {t('reportsPage.profitCards.todayTitle', "Today's Profit")}
              </span>
              <p className="text-[11px] text-slate-400">
                {t('reportsPage.profitCards.todaySubtitle', 'Real-time Net Earnings')}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {t('reportsPage.profitCards.marginBadge', { margin: todayProfit.marginPercent, defaultValue: `${todayProfit.marginPercent}% margin` })}
          </span>
        </div>

        {/* Primary Amount: USD */}
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-3xl font-black text-white tracking-tight">
            ${formatNumberWithCommas(todayProfit.profitUSD)}
          </div>
          <span className="text-xs font-semibold text-amber-400">USD</span>
        </div>

        {/* Dual Currency Amount: IQD */}
        <div className="mt-1 flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs text-slate-400">{t('reportsPage.profitCards.inIqd', 'In Iraqi Dinar:')}</span>
          <span className="text-sm font-bold text-sky-400 font-mono">
            {formatNumberWithCommas(todayProfit.profitIQD)} <span className="text-[11px] text-sky-400/90">د.ع IQD</span>
          </span>
        </div>

        {/* Breakdown Row: Revenue vs COGS */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.todaySales', "Today's Sales:")}</span>
            <span className="font-semibold text-slate-200">${formatNumberWithCommas(todayProfit.revenueUSD)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.itemsSold', 'Items Sold:')}</span>
            <span className="font-semibold text-slate-200">
              {todayProfit.itemsSoldCount} {t('reportsPage.profitCards.units', 'units')} <span className="text-slate-500 text-[10px]">({t('reportsPage.profitCards.mobilesAbbr', { count: todayProfit.mobilesSoldCount, defaultValue: `${todayProfit.mobilesSoldCount}M` })} / {t('reportsPage.profitCards.accessoriesAbbr', { count: todayProfit.accessoriesSoldCount, defaultValue: `${todayProfit.accessoriesSoldCount}A` })})</span>
            </span>
          </div>
        </div>

        {/* Comparison indicator */}
        <div className="mt-2 text-[11px] flex items-center gap-1.5 text-slate-400">
          {todayProfitDiff >= 0 ? (
            <span className="text-emerald-400 font-medium flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 inline mx-0.5" />
              {t('reportsPage.profitCards.vsYesterdayUp', { diff: todayProfitDiff, defaultValue: `+${todayProfitDiff} vs yesterday` })}
            </span>
          ) : (
            <span className="text-rose-400 font-medium flex items-center">
              <ArrowDownRight className="w-3.5 h-3.5 inline mx-0.5" />
              {t('reportsPage.profitCards.vsYesterdayDown', { diff: Math.abs(todayProfitDiff), defaultValue: `-${Math.abs(todayProfitDiff)} vs yesterday` })}
            </span>
          )}
        </div>
      </div>

      {/* 2. THIS MONTH'S PROFIT CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#111c2e] to-[#0f172a] border border-indigo-500/30 p-5 shadow-xl hover:border-indigo-500/50 transition-all group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                {t('reportsPage.profitCards.monthTitle', "This Month's Profit")}
              </span>
              <p className="text-[11px] text-slate-400">
                {t('reportsPage.profitCards.monthSubtitle', 'Month-to-Date (MTD)')}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {t('reportsPage.profitCards.marginBadge', { margin: monthProfit.marginPercent, defaultValue: `${monthProfit.marginPercent}% margin` })}
          </span>
        </div>

        {/* Primary Amount: USD */}
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-3xl font-black text-white tracking-tight">
            ${formatNumberWithCommas(monthProfit.profitUSD)}
          </div>
          <span className="text-xs font-semibold text-indigo-400">USD</span>
        </div>

        {/* Dual Currency Amount: IQD */}
        <div className="mt-1 flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs text-slate-400">{t('reportsPage.profitCards.inIqd', 'In Iraqi Dinar:')}</span>
          <span className="text-sm font-bold text-sky-400 font-mono">
            {formatNumberWithCommas(monthProfit.profitIQD)} <span className="text-[11px] text-sky-400/90">د.ع IQD</span>
          </span>
        </div>

        {/* Breakdown Row */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.monthRevenue', 'Month Revenue:')}</span>
            <span className="font-semibold text-slate-200">${formatNumberWithCommas(monthProfit.revenueUSD)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.itemsSold', 'Items Sold:')}</span>
            <span className="font-semibold text-slate-200">{monthProfit.itemsSoldCount} {t('reportsPage.profitCards.units', 'units')}</span>
          </div>
        </div>

        {/* Projection */}
        <div className="mt-2 text-[11px] text-indigo-300/90 flex items-center justify-between">
          <span>{t('reportsPage.profitCards.projectedMonth', 'Projected Month-End:')}</span>
          <span className="font-bold text-indigo-300">${formatNumberWithCommas(projectedMonthProfitUSD)}</span>
        </div>
      </div>

      {/* 3. THIS YEAR'S PROFIT CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[#111c2e] to-[#0f172a] border border-cyan-500/30 p-5 shadow-xl hover:border-cyan-500/50 transition-all group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                {t('reportsPage.profitCards.yearTitle', "This Year's Profit")}
              </span>
              <p className="text-[11px] text-slate-400">
                {t('reportsPage.profitCards.yearSubtitle', { year: now.getFullYear(), defaultValue: `Year-to-Date (YTD ${now.getFullYear()})` })}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {t('reportsPage.profitCards.marginBadge', { margin: yearProfit.marginPercent, defaultValue: `${yearProfit.marginPercent}% margin` })}
          </span>
        </div>

        {/* Primary Amount: USD */}
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-3xl font-black text-white tracking-tight">
            ${formatNumberWithCommas(yearProfit.profitUSD)}
          </div>
          <span className="text-xs font-semibold text-cyan-400">USD</span>
        </div>

        {/* Dual Currency Amount: IQD */}
        <div className="mt-1 flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs text-slate-400">{t('reportsPage.profitCards.inIqd', 'In Iraqi Dinar:')}</span>
          <span className="text-sm font-bold text-sky-400 font-mono">
            {formatNumberWithCommas(yearProfit.profitIQD)} <span className="text-[11px] text-sky-400/90">د.ع IQD</span>
          </span>
        </div>

        {/* Breakdown Row */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.annualSales', 'Annual Sales:')}</span>
            <span className="font-semibold text-slate-200">${formatNumberWithCommas(yearProfit.revenueUSD)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.cogsCost', 'COGS Cost:')}</span>
            <span className="font-semibold text-slate-200">${formatNumberWithCommas(yearProfit.cogsUSD)}</span>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{t('reportsPage.profitCards.annualVolume', 'Annual Volume:')}</span>
          <span className="font-semibold text-slate-300">
            {t('reportsPage.profitCards.volumeDesc', { count: yearProfit.itemsSoldCount, defaultValue: `${yearProfit.itemsSoldCount} devices & accessories` })}
          </span>
        </div>
      </div>

      {/* 4. ALL-TIME CUMULATIVE PROFIT CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#111c2e] to-[#0f172a] border border-amber-500/30 p-5 shadow-xl hover:border-amber-500/50 transition-all group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                {t('reportsPage.profitCards.allTimeTitle', 'All-Time Net Profit')}
              </span>
              <p className="text-[11px] text-slate-400">
                {t('reportsPage.profitCards.allTimeSubtitle', 'Total Historic Earnings')}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {t('reportsPage.profitCards.marginBadge', { margin: allTimeProfit.marginPercent, defaultValue: `${allTimeProfit.marginPercent}% margin` })}
          </span>
        </div>

        {/* Primary Amount: USD */}
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-3xl font-black text-white tracking-tight">
            ${formatNumberWithCommas(allTimeProfit.profitUSD)}
          </div>
          <span className="text-xs font-semibold text-amber-400">USD</span>
        </div>

        {/* Dual Currency Amount: IQD */}
        <div className="mt-1 flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs text-slate-400">{t('reportsPage.profitCards.inIqd', 'In Iraqi Dinar:')}</span>
          <span className="text-sm font-bold text-sky-400 font-mono">
            {formatNumberWithCommas(allTimeProfit.profitIQD)} <span className="text-[11px] text-sky-400/90">د.ع IQD</span>
          </span>
        </div>

        {/* Breakdown Row */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.totalGrossSales', 'Total Gross Sales:')}</span>
            <span className="font-semibold text-slate-200">${formatNumberWithCommas(allTimeProfit.revenueUSD)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">{t('reportsPage.profitCards.avgPerSale', 'Avg / Sale:')}</span>
            <span className="font-semibold text-slate-200">${allTimeProfit.averageProfitPerSaleUSD}</span>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{t('reportsPage.profitCards.allTimeUnits', 'All-time Units:')}</span>
          <span className="font-semibold text-slate-300">
            {t('reportsPage.profitCards.totalItems', { count: allTimeProfit.itemsSoldCount, defaultValue: `${allTimeProfit.itemsSoldCount} total items` })}
          </span>
        </div>
      </div>

    </div>
  );
}
