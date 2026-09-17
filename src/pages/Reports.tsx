import { useDesignSystem } from '../context/DesignContext';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Package, 
  Smartphone, 
  Headphones, 
  Coins, 
  FileText, 
  Printer, 
  RefreshCcw, 
  Search, 
  Filter, 
  Download, 
  BarChart3, 
  Layers, 
  Scale, 
  SlidersHorizontal,
  Building2,
  Trophy,
  PieChart as PieIcon,
  CheckCircle2,
  Edit3,
  Percent
} from 'lucide-react';
import { reportService } from '../lib/reportService';
import { 
  ProfitPeriodSummary, 
  InStockCostSummary, 
  InStockItemReport, 
  ProductProfitRank, 
  BrandProfitBreakdown, 
  FinancialPositionSummary,
  DailySalesTrendPoint 
} from '../types/report';
import ProfitPeriodCards from '../components/reports/ProfitPeriodCards';
import InStockCostLedger from '../components/reports/InStockCostLedger';
import FinancialCharts from '../components/reports/FinancialCharts';
import BrandProductRankings from '../components/reports/BrandProductRankings';
import BalanceSheetCard from '../components/reports/BalanceSheetCard';
import SmartInsightsCard from '../components/reports/SmartInsightsCard';
import PrintableAuditModal from '../components/reports/PrintableAuditModal';
import { formatNumberWithCommas } from '../lib/utils';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';

export default function Reports() {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { info, success } = useToast();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'valuation' | 'products' | 'balancesheet'>('overview');

  const { settings, updateSettings } = useDesignSystem();
  const exchangeRate = settings.exchangeRate || 1500;
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [inStockSummary, setInStockSummary] = useState<InStockCostSummary | null>(null);
  const [inStockItems, setInStockItems] = useState<InStockItemReport[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<Array<any>>([]);
  const [financialPosition, setFinancialPosition] = useState<FinancialPositionSummary | null>(null);
  const [trendData, setTrendData] = useState<DailySalesTrendPoint[]>([]);

  // Print audit modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Load all live and cached report data
  const loadReportsData = async (rate: number = exchangeRate) => {
    try {
      const [mobiles, accessories] = await Promise.all([
        reportService.getAllMobiles(),
        reportService.getAllAccessories()
      ]);

      // 1. Calculate In-stock valuation
      const { summary, items } = reportService.calculateInStockValuation(mobiles, accessories, rate);
      setInStockSummary(summary);
      setInStockItems(items);

      // 2. Fetch sales transactions
      const sales = reportService.getSalesTransactions(mobiles, accessories, rate);
      setSalesTransactions(sales);

      // 3. Trends
      const trends = reportService.getSalesTrendPoints(sales, 14);
      setTrendData(trends);

      // 4. Balance sheet
      const position = await reportService.getFinancialPosition(summary, rate);
      setFinancialPosition(position);

    } catch (e) {
      console.warn('Error compiling report data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReportsData(exchangeRate);
  }, [exchangeRate]);

  // Handle Exchange rate save
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(tempRate);
    if (!isNaN(parsed) && parsed > 0) {
      updateSettings({ exchangeRate: parsed });
      setIsEditingRate(false);
      sound.playSuccess();
      success(t('reportsPage.header.rateUpdated', { rate: parsed, defaultValue: `Exchange rate updated: $1 = ${parsed} IQD` }));
    }
  };

  // Period Profits calculated on the fly
  const todayProfit = useMemo(() => {
    return reportService.calculateProfitForPeriod(salesTransactions, 'today', undefined, undefined, exchangeRate);
  }, [salesTransactions, exchangeRate]);

  const yesterdayProfit = useMemo(() => {
    return reportService.calculateProfitForPeriod(salesTransactions, 'yesterday', undefined, undefined, exchangeRate);
  }, [salesTransactions, exchangeRate]);

  const monthProfit = useMemo(() => {
    return reportService.calculateProfitForPeriod(salesTransactions, 'month', undefined, undefined, exchangeRate);
  }, [salesTransactions, exchangeRate]);

  const yearProfit = useMemo(() => {
    return reportService.calculateProfitForPeriod(salesTransactions, 'year', undefined, undefined, exchangeRate);
  }, [salesTransactions, exchangeRate]);

  const allTimeProfit = useMemo(() => {
    return reportService.calculateProfitForPeriod(salesTransactions, 'all', undefined, undefined, exchangeRate);
  }, [salesTransactions, exchangeRate]);

  // Product Rankings and Brand breakdowns
  const productRankings = useMemo(() => {
    return reportService.getProductProfitRankings(salesTransactions);
  }, [salesTransactions]);

  const brandBreakdowns = useMemo(() => {
    return reportService.getBrandProfitBreakdown(salesTransactions, inStockItems);
  }, [salesTransactions, inStockItems]);

  return (
    <div className={`w-full flex flex-col gap-6 font-sans pb-16 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* 1. TOP EXECUTIVE HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#121829] p-5 rounded-3xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {t('reportsPage.header.badge', 'Executive Business Intelligence & Profit Engine')}
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            {t('reportsPage.header.title', 'Financial & Inventory Reports')}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t('reportsPage.header.subtitle', 'Real-time profit tracking (Today, Month, Year), dual-currency inventory cost valuation & balance sheet.')}
          </p>
        </div>

        {/* CONTROLS: EXCHANGE RATE, REFRESH, AUDIT PRINT */}
        <div className={`flex flex-wrap items-center gap-3 w-full lg:w-auto ${isKu ? 'justify-start lg:justify-start' : 'justify-start lg:justify-end'}`}>
          
          {/* Exchange Rate Badge & Fast Edit */}
          <div className="relative">
            {isEditingRate ? (
              <form onSubmit={handleSaveRate} className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-indigo-500 shadow-lg">
                <span className="text-xs font-bold text-slate-400 px-2">$1 =</span>
                <input
                  type="number"
                  step="1"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-bold bg-slate-800 text-amber-300 rounded-xl focus:outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400">IQD</span>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                >
                  {t('reportsPage.header.save', 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRate(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {t('reportsPage.header.cancel', 'Cancel')}
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  setTempRate(exchangeRate.toString());
                  setIsEditingRate(true);
                }}
                className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/50 text-xs flex items-center gap-2 text-slate-300 transition-all shadow-md group"
                title={t('reportsPage.header.rateTooltip', 'Click to modify USD to IQD exchange rate')}
              >
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div className={isKu ? 'text-right' : 'text-left'}>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    {t('reportsPage.header.liveRate', 'Live Exchange Rate')}
                  </span>
                  <span className="font-bold text-white group-hover:text-indigo-300">
                    $1 = <strong className="text-amber-300">{formatNumberWithCommas(exchangeRate)}</strong> IQD
                  </span>
                </div>
                <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
              </button>
            )}
          </div>

          {/* Refresh Data Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsRefreshing(true);
              loadReportsData(exchangeRate);
            }}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors shadow"
            title={t('reportsPage.header.refreshTooltip', 'Refresh Report Data')}
          >
            <RefreshCcw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Official Audit Statement Generator */}
          <button
            onClick={() => {
              sound.playClick();
              setIsAuditModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <FileText className="w-4 h-4" />
            <span>{t('reportsPage.header.printAudit', 'Print Audit Statement')}</span>
          </button>

        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-[#121829] rounded-2xl border border-slate-800/80 shadow-md overflow-x-auto">
        
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('overview');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{t('reportsPage.tabs.overview', 'Executive Overview & Profits')}</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('valuation');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'valuation'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('reportsPage.tabs.valuation', 'In-Stock Cost & Valuation (Dual Currencies)')}</span>
          {inStockSummary && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/80 text-indigo-300 border border-indigo-500/30">
              ${formatNumberWithCommas(inStockSummary.totalCombinedCostUSD)}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('products');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{t('reportsPage.tabs.products', 'Top Profit Champions & Brands')}</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('balancesheet');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'balancesheet'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{t('reportsPage.tabs.balanceSheet', 'Working Capital & Balance Sheet')}</span>
        </button>

      </div>

      {/* 3. TAB VIEWS */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          
          {/* PROFIT STAT CARDS (TODAY, MONTH, YEAR, ALL-TIME) */}
          <ProfitPeriodCards
            todayProfit={todayProfit}
            yesterdayProfit={yesterdayProfit}
            monthProfit={monthProfit}
            yearProfit={yearProfit}
            allTimeProfit={allTimeProfit}
            exchangeRate={exchangeRate}
          />

          {/* 14-DAY FINANCIAL TREND CHART */}
          <FinancialCharts
            trendData={trendData}
            exchangeRate={exchangeRate}
          />

          {/* SMART BUSINESS INTELLIGENCE INSIGHTS */}
          <SmartInsightsCard
            inStockItems={inStockItems}
            productRanks={productRankings}
            exchangeRate={exchangeRate}
          />

          {/* WORKING CAPITAL MINI POSITION */}
          {financialPosition && (
            <BalanceSheetCard
              position={financialPosition}
              exchangeRate={exchangeRate}
            />
          )}

        </div>
      )}

      {activeTab === 'valuation' && inStockSummary && (
        <InStockCostLedger
          summary={inStockSummary}
          items={inStockItems}
          exchangeRate={exchangeRate}
        />
      )}

      {activeTab === 'products' && (
        <BrandProductRankings
          products={productRankings}
          brands={brandBreakdowns}
          exchangeRate={exchangeRate}
        />
      )}

      {activeTab === 'balancesheet' && financialPosition && (
        <div className="flex flex-col gap-6">
          <BalanceSheetCard
            position={financialPosition}
            exchangeRate={exchangeRate}
          />
          {inStockSummary && (
            <InStockCostLedger
              summary={inStockSummary}
              items={inStockItems}
              exchangeRate={exchangeRate}
            />
          )}
        </div>
      )}

      {/* PRINTABLE AUDIT STATEMENT MODAL */}
      {inStockSummary && financialPosition && (
        <PrintableAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          todayProfit={todayProfit}
          monthProfit={monthProfit}
          yearProfit={yearProfit}
          inStockSummary={inStockSummary}
          financialPosition={financialPosition}
          exchangeRate={exchangeRate}
        />
      )}

    </div>
  );
}
