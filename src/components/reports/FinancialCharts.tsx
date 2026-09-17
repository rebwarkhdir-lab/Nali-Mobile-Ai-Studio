import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { TrendingUp, BarChart3, LineChart as LineChartIcon, DollarSign, Coins, Sparkles } from 'lucide-react';
import { DailySalesTrendPoint } from '../../types/report';
import { formatNumberWithCommas } from '../../lib/utils';

interface FinancialChartsProps {
  trendData: DailySalesTrendPoint[];
  exchangeRate: number;
}

export default function FinancialCharts({ trendData, exchangeRate }: FinancialChartsProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'IQD'>('USD');

  // Format tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isUSD = currencyMode === 'USD';
      return (
        <div className={`bg-[#0e1626] border border-slate-700/80 p-3.5 rounded-xl shadow-2xl text-xs font-sans ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
          <p className="font-bold text-white mb-2 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-slate-400 font-normal text-[11px]">{isUSD ? t('reportsPage.charts.usd', 'USD ($)') : t('reportsPage.charts.iqd', 'IQD (د.ع)')}</span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                {t('reportsPage.charts.netProfit', 'Net Profit')}:
              </span>
              <span className="font-bold">
                {isUSD ? `$${formatNumberWithCommas(payload.find((p: any) => p.dataKey === 'profitUSD')?.value || 0)}` : `${formatNumberWithCommas(payload.find((p: any) => p.dataKey === 'profitIQD')?.value || 0)} IQD`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-indigo-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                {t('reportsPage.charts.grossSales', 'Gross Sales')}:
              </span>
              <span className="font-semibold">
                {isUSD ? `$${formatNumberWithCommas(payload.find((p: any) => p.dataKey === 'revenueUSD')?.value || 0)}` : `${formatNumberWithCommas(payload.find((p: any) => p.dataKey === 'revenueIQD')?.value || 0)} IQD`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                {t('reportsPage.charts.cogsBuyCost', 'COGS (Buy Cost)')}:
              </span>
              <span className="font-semibold">
                {isUSD ? `$${formatNumberWithCommas(payload.find((p: any) => p.dataKey === 'cogsUSD')?.value || 0)}` : `${formatNumberWithCommas(Math.round((payload.find((p: any) => p.dataKey === 'cogsUSD')?.value || 0) * exchangeRate))} IQD`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-[#121829] rounded-3xl border border-slate-800/80 p-6 shadow-xl flex flex-col gap-6 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {t('reportsPage.charts.title', 'Daily Revenue, Cost & Net Profit Trends')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('reportsPage.charts.subtitle', '14-day chronological financial trajectory and gross margin performance')}
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (CURRENCY TOGGLE & CHART TYPE) */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          
          {/* Currency Toggle */}
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setCurrencyMode('USD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                currencyMode === 'USD' 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-200" /> {t('reportsPage.charts.usd', 'USD ($)')}
            </button>
            <button
              onClick={() => setCurrencyMode('IQD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                currencyMode === 'IQD' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-sky-200" /> {t('reportsPage.charts.iqd', 'IQD (د.ع)')}
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                chartType === 'area' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title={t('reportsPage.charts.areaView', 'Area Curve View')}
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                chartType === 'bar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title={t('reportsPage.charts.barView', 'Bar Chart View')}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="h-80 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => currencyMode === 'USD' ? `$${val}` : `${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Area 
                type="monotone" 
                dataKey={currencyMode === 'USD' ? 'revenueUSD' : 'revenueIQD'} 
                name={t('reportsPage.charts.grossSales', 'Gross Sales')} 
                stroke="#6366f1" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#revGrad)" 
              />
              <Area 
                type="monotone" 
                dataKey={currencyMode === 'USD' ? 'profitUSD' : 'profitIQD'} 
                name={t('reportsPage.charts.netProfit', 'Net Profit')} 
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#profitGrad)" 
              />
            </AreaChart>
          ) : (
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => currencyMode === 'USD' ? `$${val}` : `${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Bar 
                dataKey={currencyMode === 'USD' ? 'revenueUSD' : 'revenueIQD'} 
                name={t('reportsPage.charts.grossSales', 'Gross Sales')} 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey={currencyMode === 'USD' ? 'profitUSD' : 'profitIQD'} 
                name={t('reportsPage.charts.netProfit', 'Net Profit')} 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

    </div>
  );
}
