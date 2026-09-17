import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Receipt, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  Layers
} from 'lucide-react';
import { Supplier, SupplierStatementItem } from '../../types/supplier';
import { supplierService } from '../../lib/supplierService';
import { formatCurrency, formatDualPrice, cn } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface SupplierStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onMakePayment?: (supplier: Supplier) => void;
}

export default function SupplierStatementModal({
  isOpen,
  onClose,
  supplier,
  onMakePayment
}: SupplierStatementModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [statementData, setStatementData] = useState<{
    supplier: Supplier | null;
    items: SupplierStatementItem[];
    totals: {
      totalPurchasesUSD: number;
      totalPurchasesIQD: number;
      totalPaymentsUSD: number;
      totalPaymentsIQD: number;
      finalBalanceUSD: number;
      finalBalanceIQD: number;
    };
  }>({
    supplier: null,
    items: [],
    totals: {
      totalPurchasesUSD: 0,
      totalPurchasesIQD: 0,
      totalPaymentsUSD: 0,
      totalPaymentsIQD: 0,
      finalBalanceUSD: 0,
      finalBalanceIQD: 0
    }
  });

  const [dateRange, setDateRange] = useState<'all' | '30d' | 'this_month' | 'this_year'>('all');
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && supplier) {
      setLoading(true);
      let startDate: string | undefined = undefined;
      const now = new Date();

      if (dateRange === '30d') {
        startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      } else if (dateRange === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (dateRange === 'this_year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      supplierService.getSupplierStatement(supplier.id, startDate).then(res => {
        setStatementData(res);
        setLoading(false);
      });
    }
  }, [isOpen, supplier, dateRange]);

  if (!isOpen || !supplier) return null;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div 
        dir={isKu ? 'rtl' : 'ltr'} 
        className="bg-[#0f1422] border border-slate-700/80 rounded-3xl w-full max-w-4xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {t('suppliers.statementModal.title')}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-medium text-[11px]">
                  {t('suppliers.statementModal.officialLedger')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {supplier.name} • {supplier.city}, {supplier.country}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('suppliers.statementModal.print')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-[#121829] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium mr-1">{t('suppliers.statementModal.period')}</span>
            {[
              { id: 'all', label: t('suppliers.statementModal.all') },
              { id: '30d', label: t('suppliers.statementModal.days30') },
              { id: 'this_month', label: t('suppliers.statementModal.thisMonth') },
              { id: 'this_year', label: t('suppliers.statementModal.thisYear') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { sound.playClick(); setDateRange(tab.id as any); }}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                  dateRange === tab.id 
                    ? "bg-indigo-600 text-white font-bold" 
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {onMakePayment && (
            <button
              onClick={() => {
                onClose();
                onMakePayment(supplier);
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t('suppliers.statementModal.recordPayment')}</span>
            </button>
          )}
        </div>

        {/* Printable Statement Area */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Company & Supplier Cards Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('suppliers.statementModal.storeInfo')}
              </div>
              <div className="text-sm font-extrabold text-white">{t('suppliers.statementModal.storeName')}</div>
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>{t('suppliers.statementModal.storeAddress')}</div>
                <div className="font-mono">{t('suppliers.statementModal.storePhone')}</div>
                <div>{t('suppliers.statementModal.storeOfficial')}</div>
              </div>
            </div>

            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('suppliers.statementModal.vendorDetails')}
              </div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{supplier.name}</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {supplier.companyType?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>{t('suppliers.statementModal.attn')} <strong className="text-slate-300">{supplier.contactPerson}</strong></div>
                <div>{t('suppliers.statementModal.phone')} <span className="font-mono">{supplier.phone}</span></div>
                <div>{t('suppliers.statementModal.terms')} <span className="text-amber-400 font-medium">{supplier.paymentTerms}</span></div>
              </div>
            </div>
          </div>

          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#141b2d] border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-400">{t('suppliers.statementModal.totalPurchases')}</div>
              <div className="text-base font-extrabold text-white font-mono mt-1">
                {formatCurrency(statementData.totals.totalPurchasesUSD, 'USD')}
              </div>
              {statementData.totals.totalPurchasesIQD > 0 && (
                <div className="text-[11px] text-slate-400 font-mono">
                  {formatCurrency(statementData.totals.totalPurchasesIQD, 'IQD')}
                </div>
              )}
            </div>

            <div className="bg-[#141b2d] border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-400">{t('suppliers.statementModal.totalPayments')}</div>
              <div className="text-base font-extrabold text-emerald-400 font-mono mt-1">
                {formatCurrency(statementData.totals.totalPaymentsUSD, 'USD')}
              </div>
              {statementData.totals.totalPaymentsIQD > 0 && (
                <div className="text-[11px] text-emerald-500 font-mono">
                  {formatCurrency(statementData.totals.totalPaymentsIQD, 'IQD')}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-[#141b2d] border border-amber-500/30 rounded-2xl p-3.5">
              <div className="text-[11px] font-semibold text-amber-300">{t('suppliers.statementModal.debtBalance')}</div>
              <div className="text-base font-extrabold text-amber-400 font-mono mt-1">
                {formatCurrency(statementData.totals.finalBalanceUSD, 'USD')}
              </div>
              {statementData.totals.finalBalanceIQD > 0 && (
                <div className="text-[11px] text-amber-300 font-mono">
                  {formatCurrency(statementData.totals.finalBalanceIQD, 'IQD')}
                </div>
              )}
            </div>
          </div>

          {/* Statement Entries Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#121829]">
            <table className={cn("w-full text-xs", isKu ? "text-right" : "text-left")}>
              <thead className="bg-[#0b0f1a] text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">{t('suppliers.statementModal.date')}</th>
                  <th className="py-3 px-3">{t('suppliers.statementModal.type')}</th>
                  <th className="py-3 px-3">{t('suppliers.statementModal.refNumber')}</th>
                  <th className="py-3 px-4">{t('suppliers.statementModal.description')}</th>
                  <th className={cn("py-3 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.statementModal.debit')}</th>
                  <th className={cn("py-3 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.statementModal.credit')}</th>
                  <th className={cn("py-3 px-4", isKu ? "text-left" : "text-right")}>{t('suppliers.statementModal.runningBalance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(statementData.items?.length || 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {t('suppliers.statementModal.noTransactions')}
                    </td>
                  </tr>
                ) : (
                  (statementData.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.type === 'invoice' && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-[10px]">
                            {t('suppliers.statementModal.purchaseBill')}
                          </span>
                        )}
                        {item.type === 'payment' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                            {t('suppliers.statementModal.paymentVoucher')}
                          </span>
                        )}
                        {item.type === 'opening_balance' && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold text-[10px]">
                            {t('suppliers.statementModal.openingBal')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-white font-medium whitespace-nowrap">
                        {item.referenceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className={cn("py-3 px-3 font-mono font-bold text-slate-200", isKu ? "text-left" : "text-right")}>
                        {item.debit > 0 ? formatCurrency(item.debit, item.currency) : '-'}
                      </td>
                      <td className={cn("py-3 px-3 font-mono font-bold text-emerald-400", isKu ? "text-left" : "text-right")}>
                        {item.credit > 0 ? formatCurrency(item.credit, item.currency) : '-'}
                      </td>
                      <td className={cn("py-3 px-4 font-mono font-extrabold text-amber-400 whitespace-nowrap", isKu ? "text-left" : "text-right")}>
                        {formatCurrency(item.currency === 'USD' ? item.runningBalanceUSD : item.runningBalanceIQD, item.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Verification & Signatures */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
            <div>
              <div className="h-12 border-b border-dashed border-slate-700 mb-2"></div>
              <span>{t('suppliers.statementModal.storeSignature')}</span>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-700 mb-2"></div>
              <span>{t('suppliers.statementModal.supplierSignature')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0b0f1a] flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {t('suppliers.statementModal.generatedOn', { date: new Date().toLocaleString() })}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            {t('suppliers.statementModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
