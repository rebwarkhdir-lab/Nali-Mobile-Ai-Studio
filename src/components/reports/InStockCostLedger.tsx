import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {  
  Package, 
  Smartphone, 
  Headphones, 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  DollarSign, 
  Coins, 
  Tag, 
  Layers, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Building2,
  Sparkles,
  Percent,
  SlidersHorizontal
, X } from 'lucide-react';
import { InStockCostSummary, InStockItemReport } from '../../types/report';
import { formatNumberWithCommas } from '../../lib/utils';
import { SearchInput } from '../common/SearchInput';

interface InStockCostLedgerProps {
  summary: InStockCostSummary;
  items: InStockItemReport[];
  exchangeRate: number;
}

export default function InStockCostLedger({
  summary,
  items,
  exchangeRate
}: InStockCostLedgerProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'mobile' | 'accessory'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [agingFilter, setAgingFilter] = useState<'all' | 'fresh' | 'aging' | 'stagnant'>('all');
  const [sortBy, setSortBy] = useState<'cost_desc' | 'cost_asc' | 'profit_desc' | 'days_desc' | 'name_asc'>('cost_desc');

  // Extract unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.brand) set.add(i.brand);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter & sort items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (categoryFilter !== 'all' && item.type !== categoryFilter) return false;

      // Brand filter
      if (brandFilter !== 'all' && item.brand !== brandFilter) return false;

      // Aging filter
      if (agingFilter === 'fresh' && item.daysInStock > 14) return false;
      if (agingFilter === 'aging' && (item.daysInStock <= 14 || item.daysInStock > 30)) return false;
      if (agingFilter === 'stagnant' && item.daysInStock <= 30) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBrand = item.brand.toLowerCase().includes(q);
        const matchesId = item.identifier.toLowerCase().includes(q);
        const matchesSupplier = item.supplierName?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesBrand && !matchesId && !matchesSupplier) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'cost_desc') return b.totalCostUSD - a.totalCostUSD;
      if (sortBy === 'cost_asc') return a.totalCostUSD - b.totalCostUSD;
      if (sortBy === 'profit_desc') return b.potentialUnitProfitUSD - a.potentialUnitProfitUSD;
      if (sortBy === 'days_desc') return b.daysInStock - a.daysInStock;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [items, categoryFilter, brandFilter, agingFilter, searchTerm, sortBy]);

  // Aggregated figures for filtered subset
  const filteredTotals = useMemo(() => {
    let totalUnits = 0;
    let costUSD = 0;
    let costIQD = 0;
    let retailUSD = 0;
    let retailIQD = 0;

    filteredItems.forEach(i => {
      totalUnits += i.quantity;
      costUSD += i.totalCostUSD;
      costIQD += i.totalCostIQD;
      retailUSD += i.totalRetailUSD;
      retailIQD += i.totalRetailIQD;
    });

    const potentialProfitUSD = retailUSD - costUSD;
    const potentialProfitIQD = retailIQD - costIQD;
    const marginPercent = retailUSD > 0 ? parseFloat(((potentialProfitUSD / retailUSD) * 100).toFixed(1)) : 0;

    return {
      totalUnits,
      costUSD: parseFloat(costUSD.toFixed(2)),
      costIQD: Math.round(costIQD),
      retailUSD: parseFloat(retailUSD.toFixed(2)),
      retailIQD: Math.round(retailIQD),
      potentialProfitUSD: parseFloat(potentialProfitUSD.toFixed(2)),
      potentialProfitIQD: Math.round(potentialProfitIQD),
      marginPercent
    };
  }, [filteredItems]);

  // Export to CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'Type',
      'Brand',
      'Identifier (IMEI/Barcode)',
      'Condition',
      'In Stock Qty',
      'Unit Cost (USD)',
      'Unit Cost (IQD)',
      'Total Cost (USD)',
      'Total Cost (IQD)',
      'Unit Sell Price (USD)',
      'Unit Sell Price (IQD)',
      'Total Retail (USD)',
      'Total Retail (IQD)',
      'Potential Unit Profit (USD)',
      'Potential Unit Profit (IQD)',
      'Margin %',
      'Days in Stock',
      'Supplier'
    ];

    const rows = filteredItems.map(i => [
      `"${i.name.replace(/"/g, '""')}"`,
      i.type.toUpperCase(),
      `"${i.brand}"`,
      `"${i.identifier}"`,
      `"${i.condition || 'N/A'}"`,
      i.quantity,
      i.unitBuyPriceUSD,
      i.unitBuyPriceIQD,
      i.totalCostUSD,
      i.totalCostIQD,
      i.unitSellPriceUSD,
      i.unitSellPriceIQD,
      i.totalRetailUSD,
      i.totalRetailIQD,
      i.potentialUnitProfitUSD,
      i.potentialUnitProfitIQD,
      `${i.marginPercent}%`,
      i.daysInStock,
      `"${i.supplierName || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nali_Mobile_InStock_Cost_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col gap-6 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* HERO CAPITAL VALUATION BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-[#121c33] via-[#10192d] to-[#0c1322] border border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {t('reportsPage.ledger.heroBadge', 'Real-time In-Stock Inventory Cost Valuation')}
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {t('reportsPage.ledger.heroTitle', 'Total Capital Invested In Stock')}
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mt-1">
              {t('reportsPage.ledger.heroSubtitle', { mobiles: summary.totalMobilesCount, accessories: summary.totalAccessoriesCount, defaultValue: `Exact purchase cost valuation of all ${summary.totalMobilesCount} phones and ${summary.totalAccessoriesCount} accessory units currently in warehouse and store inventory.` })}
            </p>
          </div>

          {/* DUAL CURRENCY HERO TOTALS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-inner flex flex-col justify-center min-w-[200px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> {t('reportsPage.ledger.totalCostUsd', 'Total Cost (USD)')}
              </span>
              <div className="text-2xl lg:text-3xl font-black text-amber-300 mt-1 font-mono">
                ${formatNumberWithCommas(summary.totalCombinedCostUSD)}
              </div>
              <span className="text-[11px] text-slate-400">{t('reportsPage.ledger.totalCostBuyCost', 'Total Purchase Buy Cost')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 shadow-inner flex flex-col justify-center min-w-[230px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" /> {t('reportsPage.ledger.totalCostIqd', 'Total Cost (IQD)')}
              </span>
              <div className="text-2xl lg:text-3xl font-black text-sky-300 mt-1 font-mono">
                {formatNumberWithCommas(summary.totalCombinedCostIQD)} <span className="text-xs text-sky-400">د.ع IQD</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {t('reportsPage.ledger.rateNote', { rate: exchangeRate, defaultValue: `Rate: $1 = ${exchangeRate} IQD` })}
              </span>
            </div>
          </div>
        </div>

        {/* VALUATION BREAKDOWN MINI-CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          
          {/* Mobiles Cost */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {t('reportsPage.ledger.mobilesCost', { count: summary.totalMobilesCount, defaultValue: `Mobiles Cost (${summary.totalMobilesCount} units)` })}
              </span>
              <span className="text-base font-bold text-white">${formatNumberWithCommas(summary.totalMobilesCostUSD)}</span>
              <span className="text-xs text-sky-400/90 block font-mono">{formatNumberWithCommas(summary.totalMobilesCostIQD)} د.ع IQD</span>
            </div>
          </div>

          {/* Accessories Cost */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {t('reportsPage.ledger.accessoriesCost', { count: summary.totalAccessoriesCount, defaultValue: `Accessories Cost (${summary.totalAccessoriesCount} units)` })}
              </span>
              <span className="text-base font-bold text-white">${formatNumberWithCommas(summary.totalAccessoriesCostUSD)}</span>
              <span className="text-xs text-sky-400/90 block font-mono">{formatNumberWithCommas(summary.totalAccessoriesCostIQD)} د.ع IQD</span>
            </div>
          </div>

          {/* Total Retail Value */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {t('reportsPage.ledger.retailValue', 'Expected Retail Value')}
              </span>
              <span className="text-base font-bold text-amber-400">${formatNumberWithCommas(summary.totalCombinedRetailUSD)}</span>
              <span className="text-xs text-sky-400/90 block font-mono">{formatNumberWithCommas(summary.totalCombinedRetailIQD)} د.ع IQD</span>
            </div>
          </div>

          {/* Potential Gross Profit */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {t('reportsPage.ledger.potentialProfit', 'Potential Locked Profit')}
              </span>
              <span className="text-base font-bold text-purple-300">+${formatNumberWithCommas(summary.totalCombinedPotentialProfitUSD)}</span>
              <span className="text-xs text-purple-400/80 block">
                {t('reportsPage.ledger.overallMargin', { margin: summary.combinedMarginPercent, defaultValue: `${summary.combinedMarginPercent}% overall margin` })}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#121829] p-4 rounded-2xl border border-slate-800/80 shadow-lg">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {t('reportsPage.ledger.allProducts', { count: (items?.length || 0), defaultValue: `All Products (${(items?.length || 0)})` })}
          </button>
          <button
            onClick={() => setCategoryFilter('mobile')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              categoryFilter === 'mobile'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            {t('reportsPage.ledger.mobilesTablets', { count: summary.totalMobilesCount, defaultValue: `Mobiles & Tablets (${summary.totalMobilesCount})` })}
          </button>
          <button
            onClick={() => setCategoryFilter('accessory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              categoryFilter === 'accessory'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            {t('reportsPage.ledger.accessories', { count: summary.totalAccessoriesSkus, defaultValue: `Accessories (${summary.totalAccessoriesSkus})` })}
          </button>
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
          
          {/* Search Box */}
          <div className="flex-1 sm:max-w-xs min-w-[200px]">
            <SearchInput
              placeholder={t('reportsPage.ledger.searchPlaceholder', 'Search model, brand, IMEI, SKU, supplier...')}
              value={searchTerm}
              onChangeValue={setSearchTerm}
              size="sm"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">
              {t('reportsPage.ledger.allBrands', { count: (brands?.length || 0), defaultValue: `All Brands (${(brands?.length || 0)})` })}
            </option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Aging Filter */}
          <select
            value={agingFilter}
            onChange={(e) => setAgingFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('reportsPage.ledger.allAges', 'All Stock Ages')}</option>
            <option value="fresh">{t('reportsPage.ledger.freshAge', 'Fresh (≤ 14 days)')}</option>
            <option value="aging">{t('reportsPage.ledger.agingAge', 'Aging (15 - 30 days)')}</option>
            <option value="stagnant">{t('reportsPage.ledger.stagnantAge', 'Stagnant (> 30 days)')}</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="cost_desc">{t('reportsPage.ledger.sortCostDesc', 'Highest Total Cost')}</option>
            <option value="cost_asc">{t('reportsPage.ledger.sortCostAsc', 'Lowest Total Cost')}</option>
            <option value="profit_desc">{t('reportsPage.ledger.sortProfitDesc', 'Highest Profit Margin')}</option>
            <option value="days_desc">{t('reportsPage.ledger.sortDaysDesc', 'Longest in Stock (Aging)')}</option>
            <option value="name_asc">{t('reportsPage.ledger.sortNameAsc', 'Alphabetical (A-Z)')}</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all shadow"
            title={t('reportsPage.ledger.exportCsv', 'Export CSV')}
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            {t('reportsPage.ledger.exportCsv', 'Export CSV')}
          </button>

        </div>
      </div>

      {/* ITEM-BY-ITEM COST VALUATION TABLE */}
      <div className="bg-[#121829] rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse text-xs ${isKu ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <th className="py-3 px-4">{t('reportsPage.ledger.thItem', 'Item Details')}</th>
                <th className="py-3 px-3">{t('reportsPage.ledger.thIdentifier', 'Identifier (IMEI / SKU)')}</th>
                <th className="py-3 px-3 text-center">{t('reportsPage.ledger.thInStock', 'In Stock')}</th>
                <th className={`py-3 px-3 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.ledger.thUnitCost', 'Unit Buy Cost (USD & IQD)')}</th>
                <th className={`py-3 px-3 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.ledger.thBatchCost', 'Total Batch Cost (USD & IQD)')}</th>
                <th className={`py-3 px-3 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.ledger.thUnitSell', 'Unit Sell Price')}</th>
                <th className={`py-3 px-3 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.ledger.thUnitProfit', 'Unit Profit ($ & IQD)')}</th>
                <th className="py-3 px-3 text-center">{t('reportsPage.ledger.thMargin', 'Margin %')}</th>
                <th className="py-3 px-3 text-center">{t('reportsPage.ledger.thAge', 'Stock Age')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {(filteredItems?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('reportsPage.ledger.empty', 'No in-stock inventory found matching the chosen filters.')}
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Item Name & Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${
                          item.type === 'mobile' 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          {item.type === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {item.name}
                            {item.condition && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {item.condition}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-indigo-400">{item.brand}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                            {item.supplierName && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  <Building2 className="w-3 h-3 inline" /> {item.supplierName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Identifier */}
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {item.identifier}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs ${
                        item.quantity > 5 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.quantity} {item.quantity === 1 ? t('reportsPage.ledger.pc', 'pc') : t('reportsPage.ledger.pcs', 'pcs')}
                      </span>
                    </td>

                    {/* Unit Buy Cost (USD & IQD) */}
                    <td className={`py-3.5 px-3 ${isKu ? 'text-left' : 'text-right'}`}>
                      <div className="font-bold text-white font-mono">
                        ${formatNumberWithCommas(item.unitBuyPriceUSD)}
                      </div>
                      <div className="text-[11px] text-sky-400/90 font-medium font-mono">
                        {formatNumberWithCommas(item.unitBuyPriceIQD)} <span className="text-[10px]">IQD</span>
                      </div>
                    </td>

                    {/* Total Batch Cost (USD & IQD) */}
                    <td className={`py-3.5 px-3 ${isKu ? 'text-left' : 'text-right'}`}>
                      <div className="font-bold text-indigo-300 font-mono">
                        ${formatNumberWithCommas(item.totalCostUSD)}
                      </div>
                      <div className="text-[11px] text-sky-400 font-medium font-mono">
                        {formatNumberWithCommas(item.totalCostIQD)} <span className="text-[10px]">IQD</span>
                      </div>
                    </td>

                    {/* Unit Sell Price */}
                    <td className={`py-3.5 px-3 ${isKu ? 'text-left' : 'text-right'}`}>
                      <div className="font-semibold text-slate-200 font-mono">
                        ${formatNumberWithCommas(item.unitSellPriceUSD)}
                      </div>
                      <div className="text-[11px] text-sky-400/80 font-mono">
                        {formatNumberWithCommas(item.unitSellPriceIQD)} IQD
                      </div>
                    </td>

                    {/* Unit Profit ($ & IQD) */}
                    <td className={`py-3.5 px-3 ${isKu ? 'text-left' : 'text-right'}`}>
                      <div className="font-bold text-emerald-400">
                        +${formatNumberWithCommas(item.potentialUnitProfitUSD)}
                      </div>
                      <div className="text-[11px] text-emerald-300/80">
                        +{formatNumberWithCommas(item.potentialUnitProfitIQD)} IQD
                      </div>
                    </td>

                    {/* Margin % */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        item.marginPercent >= 25 
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {item.marginPercent}%
                      </span>
                    </td>

                    {/* Stock Age */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${
                        item.daysInStock > 30 
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                          : (item.daysInStock > 14 
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' 
                            : 'bg-slate-800/80 text-slate-400')
                      }`}>
                        <Clock className="w-3 h-3" />
                        {item.daysInStock === 0 ? t('reportsPage.ledger.today', 'Today') : t('reportsPage.ledger.days', { days: item.daysInStock, defaultValue: `${item.daysInStock}d` })}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
            
            {/* TABLE TOTALS FOOTER */}
            {(filteredItems?.length || 0) > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                  <td className="py-3.5 px-4 text-slate-300" colSpan={2}>
                    {t('reportsPage.ledger.filteredTotal', { count: (filteredItems?.length || 0), defaultValue: `Filtered Total: ${(filteredItems?.length || 0)} SKUs` })}
                  </td>
                  <td className="py-3.5 px-3 text-center text-indigo-300">
                    {t('reportsPage.ledger.totalUnits', { count: filteredTotals.totalUnits, defaultValue: `${filteredTotals.totalUnits} Units` })}
                  </td>
                  <td className={`py-3.5 px-3 text-slate-400 text-[11px] ${isKu ? 'text-left' : 'text-right'}`}>
                    {t('reportsPage.ledger.avgUnit', 'Average / Unit')}
                  </td>
                  <td className={`py-3.5 px-3 ${isKu ? 'text-left' : 'text-right'}`}>
                    <div className="text-indigo-400 font-extrabold text-sm">
                      ${formatNumberWithCommas(filteredTotals.costUSD)}
                    </div>
                    <div className="text-amber-400 text-xs">
                      {formatNumberWithCommas(filteredTotals.costIQD)} IQD
                    </div>
                  </td>
                  <td className={`py-3.5 px-3 text-slate-300 ${isKu ? 'text-left' : 'text-right'}`}>
                    <div>${formatNumberWithCommas(filteredTotals.retailUSD)}</div>
                    <div className="text-[11px] text-slate-400">{formatNumberWithCommas(filteredTotals.retailIQD)} IQD</div>
                  </td>
                  <td className={`py-3.5 px-3 ${isKu ? 'text-left' : 'text-right'}`}>
                    <div className="text-emerald-400 font-extrabold text-sm">
                      +${formatNumberWithCommas(filteredTotals.potentialProfitUSD)}
                    </div>
                    <div className="text-emerald-300 text-xs">
                      +{formatNumberWithCommas(filteredTotals.potentialProfitIQD)} IQD
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center text-purple-300">
                    {filteredTotals.marginPercent}%
                  </td>
                  <td className="py-3.5 px-3"></td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>
      </div>

    </div>
  );
}
