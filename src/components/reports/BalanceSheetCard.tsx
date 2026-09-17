import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  Coins, 
  CreditCard, 
  Scale, 
  ShieldCheck, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { FinancialPositionSummary } from '../../types/report';
import { formatNumberWithCommas } from '../../lib/utils';

interface BalanceSheetCardProps {
  position: FinancialPositionSummary;
  exchangeRate: number;
}

export default function BalanceSheetCard({ position, exchangeRate }: BalanceSheetCardProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const isHealthy = position.netWorkingCapitalUSD > 0;

  return (
    <div className={`bg-[#121829] rounded-3xl border border-slate-800/80 p-6 shadow-xl flex flex-col gap-6 ${isKu ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {t('reportsPage.balanceSheet.title', 'Balance Sheet & Working Capital Position')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('reportsPage.balanceSheet.subtitle', 'Receivables (Owed to Shop) vs. Payables (Owed to Suppliers) vs. Inventory Assets')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {t('reportsPage.balanceSheet.solvency', 'Solvency:')} <span className="text-emerald-400">{t('reportsPage.balanceSheet.solvencyStatus', 'Strong & Positive')}</span>
        </div>
      </div>

      {/* THREE PILLAR BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. ACCOUNTS RECEIVABLES (Customer Debts + Installments) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" /> {t('reportsPage.balanceSheet.receivablesTitle', 'Total Receivables')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                {t('reportsPage.balanceSheet.receivablesBadge', 'Incoming Money')}
              </span>
            </div>
            
            <div className="text-2xl font-black text-white">
              ${formatNumberWithCommas(position.totalReceivablesUSD)}
            </div>
            <div className="text-xs font-bold text-amber-300 mt-0.5">
              {formatNumberWithCommas(position.totalReceivablesIQD)} <span className="text-[10px]">IQD</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>{t('reportsPage.balanceSheet.customerDebts', 'Customer Debts:')}</span>
              <span className="font-semibold text-slate-200">${formatNumberWithCommas(position.customerDebtsUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('reportsPage.balanceSheet.installments', 'Installments Portfolio:')}</span>
              <span className="font-semibold text-slate-200">${formatNumberWithCommas(position.installmentsBalanceUSD)}</span>
            </div>
          </div>
        </div>

        {/* 2. ACCOUNTS PAYABLES (Supplier Debts) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4" /> {t('reportsPage.balanceSheet.payablesTitle', 'Total Payables')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                {t('reportsPage.balanceSheet.payablesBadge', 'Supplier Dues')}
              </span>
            </div>

            <div className="text-2xl font-black text-white">
              ${formatNumberWithCommas(position.totalPayablesUSD)}
            </div>
            <div className="text-xs font-bold text-amber-300 mt-0.5">
              {formatNumberWithCommas(position.totalPayablesIQD)} <span className="text-[10px]">IQD</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>{t('reportsPage.balanceSheet.wholesalers', 'Wholesalers & Distributors:')}</span>
              <span className="font-semibold text-slate-200">${formatNumberWithCommas(position.supplierPayablesUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('reportsPage.balanceSheet.pendingInvoices', 'Pending Invoices in IQD:')}</span>
              <span className="font-semibold text-slate-200">{formatNumberWithCommas(position.supplierPayablesIQD)} IQD</span>
            </div>
          </div>
        </div>

        {/* 3. NET WORKING CAPITAL POSITION */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> {t('reportsPage.balanceSheet.netCapitalTitle', 'Net Working Capital')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                {t('reportsPage.balanceSheet.netCapitalBadge', 'Net Equity')}
              </span>
            </div>

            <div className="text-2xl font-black text-indigo-200">
              ${formatNumberWithCommas(position.netWorkingCapitalUSD)}
            </div>
            <div className="text-xs font-bold text-amber-300 mt-0.5">
              {formatNumberWithCommas(position.netWorkingCapitalIQD)} <span className="text-[10px]">IQD</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>{t('reportsPage.balanceSheet.inStockAssets', 'In-Stock Assets:')}</span>
              <span className="font-semibold text-slate-200">+${formatNumberWithCommas(position.inventoryCostUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('reportsPage.balanceSheet.netPosition', 'Net Position:')}</span>
              <span className="font-bold text-emerald-400">
                {t('reportsPage.balanceSheet.netFormula', '(Stock + Receivables) - Payables')}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
