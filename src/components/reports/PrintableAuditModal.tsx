import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Smartphone, 
  Calendar, 
  DollarSign, 
  Coins, 
  ShieldCheck 
} from 'lucide-react';
import { 
  ProfitPeriodSummary, 
  InStockCostSummary, 
  FinancialPositionSummary 
} from '../../types/report';
import { formatNumberWithCommas } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface PrintableAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayProfit: ProfitPeriodSummary;
  monthProfit: ProfitPeriodSummary;
  yearProfit: ProfitPeriodSummary;
  inStockSummary: InStockCostSummary;
  financialPosition: FinancialPositionSummary;
  exchangeRate: number;
}

export default function PrintableAuditModal({
  isOpen,
  onClose,
  todayProfit,
  monthProfit,
  yearProfit,
  inStockSummary,
  financialPosition,
  exchangeRate
}: PrintableAuditModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const currentDate = new Date().toLocaleString(isKu ? 'ku' : 'en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      <div className="bg-[#0b0f1a] border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        
        {/* MODAL CONTROLS HEADER (HIDDEN ON PRINT) */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t('reportsPage.auditModal.title', 'Official Financial & Inventory Audit Statement')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('reportsPage.auditModal.subtitle', 'Ready for printing or PDF export')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              {t('reportsPage.auditModal.printBtn', 'Print / Save as PDF')}
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div ref={printRef} className={`p-8 bg-white text-slate-900 font-sans printable-audit-sheet ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
          
          {/* SHOP AUDIT HEADER */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">
                {t('reportsPage.auditModal.company', 'NALI MOBILE')}
              </h1>
              <p className="text-sm font-semibold text-slate-600">
                {t('reportsPage.auditModal.shopSubtitle', 'Smart Electronics & Mobile Devices Management System')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('reportsPage.auditModal.locations', 'Erbil • Sulaymaniyah • Baghdad • Kurdistan Region, Iraq')}
              </p>
              <p className="text-xs text-slate-500">
                {t('reportsPage.auditModal.rateInfo', { rate: exchangeRate, defaultValue: `Official Currency Rate: $1 USD = ${exchangeRate} IQD` })}
              </p>
            </div>

            <div className={isKu ? 'text-left' : 'text-right'}>
              <div className="inline-block px-3 py-1 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider rounded">
                {t('reportsPage.auditModal.badge', 'Executive Audit Report')}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                {t('reportsPage.auditModal.genDate', 'Generated Date:')} <strong>{currentDate}</strong>
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {t('reportsPage.auditModal.auditDoc', 'Audit Doc:')} #AUD-{Date.now().toString().slice(-8)}
              </p>
            </div>
          </div>

          {/* SECTION 1: PROFIT & LOSS PERFORMANCE */}
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3 flex items-center gap-1.5">
              {t('reportsPage.auditModal.sec1Title', '1. Profit & Loss Performance (Dual Currencies)')}
            </h2>
            <table className={`w-full text-xs border border-slate-300 ${isKu ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2.5">{t('reportsPage.auditModal.thTimeframe', 'Timeframe')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.auditModal.thSalesUsd', 'Gross Sales (USD)')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.auditModal.thCogsUsd', 'COGS Buy Cost (USD)')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.auditModal.thNetUsd', 'Net Profit (USD)')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} bg-amber-50`}>{t('reportsPage.auditModal.thNetIqd', 'Net Profit (IQD)')}</th>
                  <th className="p-2.5 text-center">{t('reportsPage.auditModal.thMargin', 'Margin %')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">{t('reportsPage.auditModal.today', 'Today')}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(todayProfit.revenueUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(todayProfit.cogsUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-black text-emerald-700`}>${formatNumberWithCommas(todayProfit.profitUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-amber-800 bg-amber-50/50`}>{formatNumberWithCommas(todayProfit.profitIQD)} IQD</td>
                  <td className="p-2.5 text-center font-bold">{todayProfit.marginPercent}%</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">{t('reportsPage.auditModal.thisMonth', 'This Month (MTD)')}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(monthProfit.revenueUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(monthProfit.cogsUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-black text-emerald-700`}>${formatNumberWithCommas(monthProfit.profitUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-amber-800 bg-amber-50/50`}>{formatNumberWithCommas(monthProfit.profitIQD)} IQD</td>
                  <td className="p-2.5 text-center font-bold">{monthProfit.marginPercent}%</td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="p-2.5 font-bold text-slate-900">{t('reportsPage.auditModal.thisYear', 'This Year (YTD)')}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(yearProfit.revenueUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(yearProfit.cogsUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-black text-emerald-700`}>${formatNumberWithCommas(yearProfit.profitUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-amber-800 bg-amber-50/50`}>{formatNumberWithCommas(yearProfit.profitIQD)} IQD</td>
                  <td className="p-2.5 text-center font-bold">{yearProfit.marginPercent}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 2: IN-STOCK INVENTORY COST VALUATION */}
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3 flex items-center gap-1.5">
              {t('reportsPage.auditModal.sec2Title', '2. In-Stock Inventory Cost Valuation (Capital Assets)')}
            </h2>
            <table className={`w-full text-xs border border-slate-300 ${isKu ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2.5">{t('reportsPage.auditModal.thCategory', 'Category')}</th>
                  <th className="p-2.5 text-center">{t('reportsPage.auditModal.thStockQty', 'In-Stock Qty')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.auditModal.thBuyCostUsd', 'Total Buy Cost (USD)')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} bg-amber-50`}>{t('reportsPage.auditModal.thBuyCostIqd', 'Total Buy Cost (IQD)')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.auditModal.thExpectedRetail', 'Expected Retail (USD)')}</th>
                  <th className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>{t('reportsPage.auditModal.thPotentialProfit', 'Potential Profit (USD)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-medium">{t('reportsPage.auditModal.mobiles', 'Mobiles & Tablets')}</td>
                  <td className="p-2.5 text-center font-bold">
                    {inStockSummary.totalMobilesCount} {t('reportsPage.auditModal.devices', 'devices')}
                  </td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold`}>${formatNumberWithCommas(inStockSummary.totalMobilesCostUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-amber-800 bg-amber-50/50`}>{formatNumberWithCommas(inStockSummary.totalMobilesCostIQD)} IQD</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(inStockSummary.totalMobilesRetailUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-emerald-700`}>+${formatNumberWithCommas(inStockSummary.totalMobilesPotentialProfitUSD)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">{t('reportsPage.auditModal.accessories', 'Accessories & Peripherals')}</td>
                  <td className="p-2.5 text-center font-bold">
                    {inStockSummary.totalAccessoriesCount} {t('reportsPage.auditModal.units', 'units')} ({inStockSummary.totalAccessoriesSkus} {t('reportsPage.auditModal.skus', 'SKUs')})
                  </td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold`}>${formatNumberWithCommas(inStockSummary.totalAccessoriesCostUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-amber-800 bg-amber-50/50`}>{formatNumberWithCommas(inStockSummary.totalAccessoriesCostIQD)} IQD</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(inStockSummary.totalAccessoriesRetailUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-bold text-emerald-700`}>+${formatNumberWithCommas(inStockSummary.totalAccessoriesPotentialProfitUSD)}</td>
                </tr>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td className="p-2.5 uppercase">{t('reportsPage.auditModal.totalCapital', 'Total Inventory Capital')}</td>
                  <td className="p-2.5 text-center">
                    {inStockSummary.totalMobilesCount + inStockSummary.totalAccessoriesCount} {t('reportsPage.auditModal.items', 'items')}
                  </td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-black text-indigo-900`}>${formatNumberWithCommas(inStockSummary.totalCombinedCostUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} font-black text-amber-900 bg-amber-100/60`}>{formatNumberWithCommas(inStockSummary.totalCombinedCostIQD)} IQD</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'}`}>${formatNumberWithCommas(inStockSummary.totalCombinedRetailUSD)}</td>
                  <td className={`p-2.5 ${isKu ? 'text-left' : 'text-right'} text-emerald-800`}>+${formatNumberWithCommas(inStockSummary.totalCombinedPotentialProfitUSD)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 3: BALANCE SHEET & WORKING CAPITAL */}
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3 flex items-center gap-1.5">
              {t('reportsPage.auditModal.sec3Title', '3. Receivables, Payables & Working Capital Position')}
            </h2>
            <div className="grid grid-cols-3 gap-4 border border-slate-300 p-4 bg-slate-50 text-xs">
              <div>
                <span className="text-slate-500 font-semibold uppercase block">
                  {t('reportsPage.auditModal.recTitle', 'Accounts Receivables')}
                </span>
                <span className="text-base font-black text-slate-900">${formatNumberWithCommas(financialPosition.totalReceivablesUSD)}</span>
                <span className="text-xs text-amber-800 font-bold block">{formatNumberWithCommas(financialPosition.totalReceivablesIQD)} IQD</span>
                <p className="text-[10px] text-slate-500 mt-1">
                  {t('reportsPage.auditModal.recNote', 'Customer debts + active installment plans')}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-semibold uppercase block">
                  {t('reportsPage.auditModal.payTitle', 'Accounts Payables')}
                </span>
                <span className="text-base font-black text-slate-900">${formatNumberWithCommas(financialPosition.totalPayablesUSD)}</span>
                <span className="text-xs text-amber-800 font-bold block">{formatNumberWithCommas(financialPosition.totalPayablesIQD)} IQD</span>
                <p className="text-[10px] text-slate-500 mt-1">
                  {t('reportsPage.auditModal.payNote', 'Company / Wholesaler outstanding balances')}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded border border-slate-300">
                <span className="text-indigo-900 font-bold uppercase block">
                  {t('reportsPage.auditModal.netCapTitle', 'Net Working Capital')}
                </span>
                <span className="text-base font-black text-indigo-950">${formatNumberWithCommas(financialPosition.netWorkingCapitalUSD)}</span>
                <span className="text-xs text-amber-800 font-bold block">{formatNumberWithCommas(financialPosition.netWorkingCapitalIQD)} IQD</span>
                <p className="text-[10px] text-slate-500 mt-1">
                  {t('reportsPage.auditModal.netCapNote', '(Stock Capital + Receivables) - Payables')}
                </p>
              </div>
            </div>
          </div>

          {/* SIGNATURES & VERIFICATION */}
          <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <p className="font-bold text-slate-900">{t('reportsPage.auditModal.prepBy', 'Prepared By')}</p>
              <div className="h-16 border-b border-dashed border-slate-400 mt-2" />
              <p className="text-slate-500 text-[11px] mt-1">{t('reportsPage.auditModal.prepRole', 'Store Accountant / Cashier')}</p>
            </div>

            <div>
              <p className="font-bold text-slate-900">{t('reportsPage.auditModal.auditedBy', 'Audited & Verified By')}</p>
              <div className="h-16 border-b border-dashed border-slate-400 mt-2" />
              <p className="text-slate-500 text-[11px] mt-1">{t('reportsPage.auditModal.auditedRole', 'Branch Auditor')}</p>
            </div>

            <div>
              <p className="font-bold text-slate-900">{t('reportsPage.auditModal.authBy', 'Executive Authorization')}</p>
              <div className="h-16 border-b border-dashed border-slate-400 mt-2" />
              <p className="text-slate-500 text-[11px] mt-1">{t('reportsPage.auditModal.authRole', 'Store Owner / General Manager')}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
