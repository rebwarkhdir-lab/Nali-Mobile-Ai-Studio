import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  Coins, 
  FileText, 
  Printer, 
  Send, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp,
  Receipt,
  Filter
} from 'lucide-react';
import { Debt } from '../../types/debt';
import { InstallmentPlan } from '../../types/installment';
import { InvoiceCustomer, InvoiceDocument } from '../../types/invoice';
import { SearchInput } from '../common/SearchInput';
import { debtService } from '../../lib/debtService';
import { installmentService } from '../../lib/installmentService';
import { generateCustomerStatementDoc } from '../../lib/invoiceUtils';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { useDesignSystem } from '../../context/DesignContext';
import { sound } from '../../lib/sound';
import InvoiceViewerModal from './InvoiceViewerModal';
import { useTranslation } from 'react-i18next';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  defaultCustomerName?: string;
  defaultCustomerPhone?: string;
}

export default function CustomerStatementModal({
  isOpen,
  onClose,
  initialCustomerName = '',
  initialCustomerPhone = '',
  defaultCustomerName,
  defaultCustomerPhone
}: CustomerStatementModalProps) {
  const effectiveCustomerName = defaultCustomerName || initialCustomerName || '';
  const effectiveCustomerPhone = defaultCustomerPhone || initialCustomerPhone || '';
  const { t, i18n } = useTranslation();
  const isKu = i18n.language !== 'en';
  const { settings } = useDesignSystem();
  const exchangeRate = settings.exchangeRate || 1500;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerQuery, setCustomerQuery] = useState(effectiveCustomerName || effectiveCustomerPhone || '');
  const [selectedCustomer, setSelectedCustomer] = useState<InvoiceCustomer | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statementCurrency, setStatementCurrency] = useState<'USD' | 'IQD'>('USD');

  // Master Document Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeStatementDoc, setActiveStatementDoc] = useState<InvoiceDocument | null>(null);

  useEffect(() => {
    if (isOpen) {
      sound.play('click');
      loadAllData();
      if (effectiveCustomerName || effectiveCustomerPhone) {
        setCustomerQuery(effectiveCustomerName || effectiveCustomerPhone);
      }
    }
  }, [isOpen, initialCustomerName, initialCustomerPhone]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [debtsData, insData] = await Promise.all([
        debtService.getAllDebts(),
        installmentService.getAllInstallments()
      ]);
      const safeDebts = Array.isArray(debtsData) ? debtsData : [];
      const safeIns = Array.isArray(insData) ? insData : [];
      setDebts(safeDebts);
      setInstallments(safeIns);

      // Auto-select customer if matching initial name
      if (initialCustomerName) {
        const dMatch = safeDebts.find(d => (d?.customerName || '').toLowerCase() === initialCustomerName.toLowerCase());
        const iMatch = safeIns.find(i => (i?.customerName || '').toLowerCase() === initialCustomerName.toLowerCase());
        if (dMatch || iMatch) {
          setSelectedCustomer({
            name: dMatch?.customerName || iMatch?.customerName || initialCustomerName,
            phone: dMatch?.customerPhone || iMatch?.customerPhone || initialCustomerPhone,
            address: dMatch?.customerAddress || iMatch?.customerAddress,
            idCard: dMatch?.customerIdCard || iMatch?.customerIdCard,
            guarantorName: dMatch?.guarantorName || iMatch?.guarantorName,
            guarantorPhone: dMatch?.guarantorPhone || iMatch?.guarantorPhone
          });
        }
      }
    } catch (e) {
      console.error('Failed to load statement source data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Distinct customer list aggregated from debts & installments
  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, InvoiceCustomer>();

    (debts || []).forEach(d => {
      if (!d) return;
      const key = (d.customerPhone || d.customerName || '').toLowerCase().trim();
      if (key && !map.has(key)) {
        map.set(key, {
          name: d.customerName,
          phone: d.customerPhone,
          address: d.customerAddress,
          idCard: d.customerIdCard,
          guarantorName: d.guarantorName,
          guarantorPhone: d.guarantorPhone
        });
      }
    });

    (installments || []).forEach(i => {
      if (!i) return;
      const key = (i.customerPhone || i.customerName || '').toLowerCase().trim();
      if (key && !map.has(key)) {
        map.set(key, {
          name: i.customerName,
          phone: i.customerPhone,
          address: i.customerAddress,
          idCard: i.customerIdCard,
          guarantorName: i.guarantorName,
          guarantorPhone: i.guarantorPhone
        });
      }
    });

    return Array.from(map.values());
  }, [debts, installments]);

  // Filtered customer suggestions
  const customerSuggestions = useMemo(() => {
    if (!customerQuery.trim()) return uniqueCustomers.slice(0, 8);
    const q = customerQuery.toLowerCase();
    return uniqueCustomers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    ).slice(0, 10);
  }, [uniqueCustomers, customerQuery]);

  // Specific customer debts and installments
  const customerDebts = useMemo(() => {
    if (!selectedCustomer) return [];
    const name = selectedCustomer.name.toLowerCase();
    const phone = selectedCustomer.phone;
    return debts.filter(d => 
      d.customerName.toLowerCase() === name || 
      (phone && d.customerPhone === phone)
    );
  }, [debts, selectedCustomer]);

  const customerInstallments = useMemo(() => {
    if (!selectedCustomer) return [];
    const name = selectedCustomer.name.toLowerCase();
    const phone = selectedCustomer.phone;
    return installments.filter(i => 
      i.customerName.toLowerCase() === name || 
      (phone && i.customerPhone === phone)
    );
  }, [installments, selectedCustomer]);

  // Date range object
  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === '30days') {
      const past = new Date(Date.now() - 30 * 86400000);
      return { start: past.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (dateFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { start, end: now.toISOString().split('T')[0] };
    }
    if (dateFilter === 'custom' && customStartDate) {
      return { start: customStartDate, end: customEndDate || now.toISOString().split('T')[0] };
    }
    return undefined;
  }, [dateFilter, customStartDate, customEndDate]);

  // Generate Customer Statement Document
  const statementDoc = useMemo(() => {
    if (!selectedCustomer) return null;
    return generateCustomerStatementDoc(
      selectedCustomer,
      customerDebts,
      customerInstallments,
      statementCurrency,
      exchangeRate,
      settings,
      dateRange
    );
  }, [selectedCustomer, customerDebts, customerInstallments, statementCurrency, exchangeRate, settings, dateRange]);

  const handleOpenMasterDocument = () => {
    if (!statementDoc) return;
    sound.play('click');
    setActiveStatementDoc(statementDoc);
    setIsViewerOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isKu ? 'کەشفی هەژمار و باڵانسی کڕیار' : 'Customer Account Statement & Ledger'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isKu ? 'پوختە و ڕاپۆرتی گشتگیری هەموو قەرز، قیست و پارەدانەکانی کڕیار' : 'Comprehensive ledger of all sales, debts, installments, and payment vouchers'}
                </p>
              </div>
            </div>

            <button
              onClick={() => { sound.play('click'); onClose(); }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Customer Search & Select */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                {isKu ? 'دیاریکردنی کڕیار:' : 'Select or Search Customer:'}
              </label>
              
              <div>
                <SearchInput
                  value={customerQuery}
                  onChangeValue={(val) => {
                    setCustomerQuery(val);
                    if (selectedCustomer && val !== selectedCustomer.name) {
                      setSelectedCustomer(null);
                    }
                  }}
                  placeholder={isKu ? 'ناوی کڕیار یان ژمارەی مۆبایل بنووسە...' : 'Type customer name or phone number...'}
                  size="md"
                />
              </div>

              {/* Suggestions chips if not selected */}
              {!selectedCustomer && (customerSuggestions?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(customerSuggestions || []).map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        sound.play('click');
                        setSelectedCustomer(c);
                        setCustomerQuery(c.name);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{c.name}</span>
                      {c.phone && <span className="text-[10px] text-slate-400 font-mono" dir="ltr">({c.phone})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* If Customer Selected: Controls Bar & Metrics */}
            {selectedCustomer && statementDoc && (
              <>
                {/* Customer Profile Card & Filters */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-base text-white flex items-center gap-2">
                        <span>{selectedCustomer.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                        {selectedCustomer.phone && (
                          <span className="flex items-center gap-1 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {selectedCustomer.phone}
                          </span>
                        )}
                        {selectedCustomer.address && (
                          <span>• {selectedCustomer.address}</span>
                        )}
                        {selectedCustomer.guarantorName && (
                          <span className="text-amber-400/90">
                            • {isKu ? 'کەفیل:' : 'Guarantor:'} {selectedCustomer.guarantorName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg focus:outline-none"
                    >
                      <option value="all">{isKu ? 'هەموو کاتەکان' : 'All Time'}</option>
                      <option value="30days">{isKu ? '٣٠ ڕۆژی ڕابردوو' : 'Last 30 Days'}</option>
                      <option value="this_month">{isKu ? 'ئەم مانگە' : 'This Month'}</option>
                    </select>

                    <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        onClick={() => setStatementCurrency('USD')}
                        className={`px-2.5 py-1 text-xs font-bold rounded ${statementCurrency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        USD ($)
                      </button>
                      <button
                        onClick={() => setStatementCurrency('IQD')}
                        className={`px-2.5 py-1 text-xs font-bold rounded ${statementCurrency === 'IQD' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        IQD (د.ع)
                      </button>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Total Debits */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>{isKu ? 'کۆی گشتی کڕین و قەرز' : 'Total Debits / Sales'}</span>
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-xl font-black text-white font-mono" dir="ltr">
                      {formatCurrency(statementDoc.statementDetails?.totalDebits || 0, statementCurrency)}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {customerDebts?.length || 0} {isKu ? 'پسوڵەی قەرز' : 'debts'} • {customerInstallments?.length || 0} {isKu ? 'گرێبەستی قیست' : 'installments'}
                    </p>
                  </div>

                  {/* Total Credits */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                      <span>{isKu ? 'کۆی گشتی دراو و وەرگیراو' : 'Total Credits / Paid'}</span>
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xl font-black text-emerald-400 font-mono" dir="ltr">
                      {formatCurrency(statementDoc.statementDetails?.totalCredits || 0, statementCurrency)}
                    </div>
                    <p className="text-[10px] text-emerald-500/80">
                      {isKu ? 'کۆی پارەدان و پێشەکییەکان' : 'Sum of down payments and vouchers'}
                    </p>
                  </div>

                  {/* Outstanding Remaining Balance */}
                  <div className={`p-4 rounded-xl border space-y-1 ${
                    statementDoc.remainingBalance > 0 
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200' 
                      : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  }`}>
                    <div className="text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span>{isKu ? '🔴 قەرز / باڵانسی ئێستا' : '🔴 NET OUTSTANDING BALANCE'}</span>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-black font-mono" dir="ltr">
                      {formatCurrency(statementDoc.remainingBalance, statementCurrency)}
                    </div>
                    <p className="text-[10px] opacity-80">
                      {statementDoc.remainingBalance > 0 
                        ? (isKu ? 'قەرزی ماوەیە پێویستە بدرێت' : 'Balance currently due') 
                        : (isKu ? 'هەژمار بە تەواوی پاک کراوەتەوە' : 'All accounts settled')}
                    </p>
                  </div>

                </div>

                {/* Ledger Transactions Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{isKu ? 'لیستی تۆمار و جوڵە داراییەکان' : 'Financial Ledger Transactions'}</span>
                    <span className="font-mono text-slate-500">
                      {statementDoc.statementDetails?.transactions?.length || 0 || 0} {isKu ? 'تۆمار' : 'records'}
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] sticky top-0">
                            <th className="py-2.5 px-3">{isKu ? 'بەروار' : 'Date'}</th>
                            <th className="py-2.5 px-3">{isKu ? 'ژمارەی پسوڵە' : 'Ref / Inv'}</th>
                            <th className="py-2.5 px-3">{isKu ? 'شیکردنەوە' : 'Description'}</th>
                            <th className="py-2.5 px-3 text-right text-rose-400">{isKu ? 'قەرز (+)' : 'Debit (+)'}</th>
                            <th className="py-2.5 px-3 text-right text-emerald-400">{isKu ? 'دراو (-)' : 'Credit (-)'}</th>
                            <th className="py-2.5 px-3 text-right">{isKu ? 'باڵانس' : 'Balance'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          { (statementDoc.statementDetails?.transactions?.length || 0) === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-500">
                                {isKu ? 'هیچ تۆمارێک نەدۆزرایەوە لەم ماوەیەدا' : 'No transactions recorded in this period'}
                              </td>
                            </tr>
                          ) : (
                            statementDoc.statementDetails?.transactions.map((t, idx) => (
                              <tr key={t.id || idx} className="hover:bg-slate-900/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-slate-400" dir="ltr">{t.date}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-200" dir="ltr">{t.referenceNo}</td>
                                <td className="py-2.5 px-3 text-slate-300">{t.description}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-semibold" dir="ltr">
                                  {t.debit > 0 ? formatCurrency(t.debit, statementCurrency) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold" dir="ltr">
                                  {t.credit > 0 ? formatCurrency(t.credit, statementCurrency) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-white" dir="ltr">
                                  {formatCurrency(t.runningBalance, statementCurrency)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Footer Action Bar */}
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => { sound.play('click'); onClose(); }}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              {isKu ? 'داخستن' : 'Close'}
            </button>

            {selectedCustomer && statementDoc && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenMasterDocument}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isKu ? 'پێشبینین، چاپ و داگرتنی پسوڵە (A4)' : 'Open Master Statement Document'}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Embedded Master Document Viewer Modal */}
      {isViewerOpen && activeStatementDoc && (
        <InvoiceViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          document={activeStatementDoc}
          initialFormat="a4"
          initialLanguage={isKu ? 'ku' : 'en'}
        />
      )}
    </>
  );
}
