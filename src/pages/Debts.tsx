import { useDesignSystem } from '../context/DesignContext';
import React, { useState, useEffect, useMemo } from 'react';
import {  
  Plus, 
  Search, 
  Filter, 
  Coins, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Phone, 
  FileText, 
  Printer, 
  Trash2, 
  ArrowUpRight, 
  Send, 
  RefreshCw, 
  Database,
  Calendar,
  MoreVertical,
  Banknote,
  Receipt
, X } from 'lucide-react';
import { formatCurrency, formatDualPrice, cn, getCurrencyColor } from '../lib/utils';
import { SearchInput } from '../components/common/SearchInput';
import { Debt, DebtPayment } from '../types/debt';
import { debtService } from '../lib/debtService';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';

import AddDebtDrawer from '../components/debts/AddDebtDrawer';
import RecordDebtPaymentModal from '../components/debts/RecordDebtPaymentModal';
import DebtorStatementModal from '../components/debts/DebtorStatementModal';
import DebtReceiptModal from '../components/debts/DebtReceiptModal';
import MigrationModal from '../components/common/MigrationModal';
import InvoiceViewerModal from '../components/invoice/InvoiceViewerModal';
import CustomerStatementModal from '../components/invoice/CustomerStatementModal';
import InvoicesListModal from '../components/invoice/InvoicesListModal';
import { convertDebtToInvoiceDoc } from '../lib/invoiceUtils';
import { InvoiceDocument } from '../types/invoice';
import { shareDebtInvoicePDF } from '../services/whatsappShareService';
import { useTranslation } from 'react-i18next';
import { recycleBinService } from '../lib/recycleBinService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CloudStatusBadge } from '../components/common/CloudStatusBadge';

export default function Debts() {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language !== 'en';
  const { settings } = useDesignSystem();
  const exchangeRate = settings.exchangeRate || 1500;
  const { success, error: toastError } = useToast();
  const [sharingDebtId, setSharingDebtId] = useState<string | null>(null);

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'outstanding' | 'partially_paid' | 'overdue' | 'paid'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'USD' | 'IQD'>('all');
  
  // Modals state
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const [selectedDebtForStatement, setSelectedDebtForStatement] = useState<Debt | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<{ debt: Debt; payment: DebtPayment } | null>(null);

  // Financial Documents Modal state
  const [activeInvoiceDoc, setActiveInvoiceDoc] = useState<InvoiceDocument | null>(null);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [isCustomerStatementOpen, setIsCustomerStatementOpen] = useState(false);
  const [statementCustomerName, setStatementCustomerName] = useState<string | undefined>(undefined);
  const [statementCustomerPhone, setStatementCustomerPhone] = useState<string | undefined>(undefined);
  const [isInvoicesArchiveOpen, setIsInvoicesArchiveOpen] = useState(false);

  // Load debts
  useEffect(() => {
    const handleUpdate = () => loadDebts();
    window.addEventListener("payment_recorded", handleUpdate);
    return () => window.removeEventListener("payment_recorded", handleUpdate);
  }, []);
  const loadDebts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await debtService.getAllDebts();
      const safeData = Array.isArray(data) ? data : [];
      setDebts(safeData);
      const searchParams = new URLSearchParams(window.location.search);
      const pId = searchParams.get("pay");
      if (pId) {
        const debt = safeData.find(d => d.id === pId);
        if (debt) {
          setSelectedDebtForPayment(debt);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Error loading debts:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();

    // Set up Realtime Supabase Channel for instant multi-device synchronization
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:nali_debts_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'nali_debts' },
          (payload) => {
            console.log('Realtime change received for debts:', payload.eventType);
            loadDebts(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'nali_debt_payments' },
          (payload) => {
            console.log('Realtime change received for debt payments:', payload.eventType);
            loadDebts(true);
          }
        )
        .subscribe((status) => {
          console.log('Debts realtime subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return (debts || []).filter((d) => {
      // Search matches
      const matchesSearch = 
        d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.customerPhone && d.customerPhone.includes(searchTerm)) ||
        (d.productSummary && d.productSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status match
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

      // Currency match
      const matchesCurrency = currencyFilter === 'all' || d.currency === currencyFilter;

      return matchesSearch && matchesStatus && matchesCurrency;
    });
  }, [debts, searchTerm, statusFilter, currencyFilter]);

  // Financial KPIs
  const stats = useMemo(() => {
    let totalOutstandingUSD = 0;
    let totalOutstandingIQD = 0;
    let totalCollectedUSD = 0;
    let totalCollectedIQD = 0;
    let overdueCount = 0;
    let activeDebtorsCount = 0;

    (debts || []).forEach((d) => {
      if (d.currency === 'USD') {
        totalOutstandingUSD += d.remainingAmount;
        totalCollectedUSD += d.paidAmount;
      } else {
        totalOutstandingIQD += d.remainingAmount;
        totalCollectedIQD += d.paidAmount;
      }

      if (d.status === 'overdue') overdueCount++;
      if (d.remainingAmount > 0) activeDebtorsCount++;
    });

    return {
      totalOutstandingUSD,
      totalOutstandingIQD,
      totalCollectedUSD,
      totalCollectedIQD,
      overdueCount,
      activeDebtorsCount,
      totalCount: debts?.length || 0
    };
  }, [debts]);

  const handleDeleteDebt = async (debt: Debt) => {
    sound.playAlert();
    if (confirm(t('debts.deleteDebtConfirm', { name: debt.customerName }))) {
      await recycleBinService.moveToBin({
        id: debt.id,
        type: 'debt',
        name: `${debt.customerName} - ${debt.originalAmount} ${debt.currency}`,
        data: debt
      });

      await debtService.deleteDebt(debt.id);
      setDebts((prev) => prev.filter((d) => d.id !== debt.id));
      success("Debt moved to Recycle Bin");
    }
  };

  const handlePaymentSuccess = (updatedDebt: Debt, payment: DebtPayment) => {
    setDebts((prev) => prev.map((d) => (d.id === updatedDebt.id ? updatedDebt : d)));
    setSelectedDebtForPayment(null);
    setReceiptModalData({ debt: updatedDebt, payment });
  };

  const handleShareDebtPDF = async (debt: Debt) => {
    sound.playClick();
    setSharingDebtId(debt.id);
    try {
      const result = await shareDebtInvoicePDF(debt, exchangeRate);
      if (result.success) {
        if (result.mode === 'desktop_download') {
          success(t('debts.pdfDownloadedAndWhatsApp', { filename: result.filename, name: debt.customerName }));
        } else {
          success(t('debts.pdfSharedSuccess', { name: debt.customerName }));
        }
      }
    } catch (err) {
      console.error('Failed to share PDF invoice via WhatsApp:', err);
      toastError(t('debts.pdfShareFailed'));
    } finally {
      setSharingDebtId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-100 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <span>{t('debts.pageTitle')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  {t('debts.recordsCount', { count: debts?.length || 0 })}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('debts.pageSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Financial Documents Archive */}
          <button
            onClick={() => {
              sound.playClick();
              setIsInvoicesArchiveOpen(true);
            }}
            className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title={t('debts.invoicesArchiveTooltip')}
          >
            <Receipt className="w-4 h-4 text-indigo-400" />
            <span>{t('debts.invoicesArchive')}</span>
          </button>

          {/* Customer Statement */}
          <button
            onClick={() => {
              sound.playClick();
              setStatementCustomerName(undefined);
              setStatementCustomerPhone(undefined);
              setIsCustomerStatementOpen(true);
            }}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t('debts.accountStatementTooltip')}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>{t('debts.accountStatement')}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsMigrationModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t('debts.sqlMigrationTooltip')}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{t('debts.sqlMigration')}</span>
          </button>

          <CloudStatusBadge
            onRefresh={() => loadDebts(false)}
            tableName="nali_debts"
            isRefreshing={loading}
          />

          <button
            onClick={() => {
              sound.playClick();
              setIsAddDrawerOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('debts.registerNewDebt')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Outstanding USD */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('debts.totalUnpaidUsd')}</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">
            {formatCurrency(stats.totalOutstandingUSD, 'USD')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('debts.collected')}</span>
            <span className="text-amber-400 font-semibold font-mono">{formatCurrency(stats.totalCollectedUSD, 'USD')}</span>
          </div>
        </div>

        {/* Total Outstanding IQD */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('debts.totalUnpaidIqd')}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-400 mt-2 font-mono">
            {formatCurrency(stats.totalOutstandingIQD, 'IQD')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('debts.collected')}</span>
            <span className="text-sky-400 font-semibold font-mono">{formatCurrency(stats.totalCollectedIQD, 'IQD')}</span>
          </div>
        </div>

        {/* Overdue Accounts */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('debts.overdueDebts')}</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-400 mt-2">
            {stats.overdueCount} <span className="text-xs font-normal text-slate-400">{t('debts.accounts')}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('debts.requiresFollowUp')}</span>
            <span className="text-rose-400 font-semibold">{stats.overdueCount > 0 ? t('debts.urgent') : t('debts.allClear')}</span>
          </div>
        </div>

        {/* Active Debtors */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('debts.activeDebtors')}</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <User className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-300 mt-2">
            {stats.activeDebtorsCount} <span className="text-xs font-normal text-slate-400">{t('debts.customers')}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('debts.totalRecorded')}</span>
            <span className="text-slate-300 font-semibold">{stats.totalCount} {t('debts.customers')}</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="w-full md:w-96">
          <SearchInput
            placeholder={t('debts.searchPlaceholder')}
            value={searchTerm}
            onChangeValue={setSearchTerm}
            size="sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Status Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'all', label: t('debts.all') },
              { id: 'outstanding', label: t('debts.unpaid') },
              { id: 'partially_paid', label: t('debts.partial') },
              { id: 'overdue', label: t('debts.overdue') },
              { id: 'paid', label: t('debts.settled') }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setStatusFilter(tab.id as any);
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Currency Filter */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'all', label: t('debts.allCurrencies') },
              { id: 'USD', label: t('debts.usd') },
              { id: 'IQD', label: t('debts.iqd') }
            ].map((curr) => (
              <button
                key={curr.id}
                onClick={() => {
                  sound.playClick();
                  setCurrencyFilter(curr.id as any);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currencyFilter === curr.id
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {curr.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Debts Table / List */}
      <div className="bg-[#121829] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0e1322] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">{t('debts.customerAndContact')}</th>
                <th className="py-3.5 px-4">{t('debts.itemReference')}</th>
                <th className="py-3.5 px-4 text-right">{t('debts.totalDebt')}</th>
                <th className="py-3.5 px-4 text-right">{t('debts.paidToDate')}</th>
                <th className="py-3.5 px-4 text-right">{t('debts.remainingBalance')}</th>
                <th className="py-3.5 px-4">{t('debts.dueDate')}</th>
                <th className="py-3.5 px-4 text-center">{t('debts.status')}</th>
                <th className="py-3.5 px-4 text-right">{t('debts.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                    <span>{t('debts.loadingRecords')}</span>
                  </td>
                </tr>
              ) : (filteredDebts?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Coins className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
                    <p className="text-slate-400 font-medium">{t('debts.noDebtsFound')}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      {searchTerm ? t('debts.adjustSearchQuery') : t('debts.registerFirstDebtPrompt')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt) => {
                  const isPaid = debt.status === 'paid';
                  const isOverdue = debt.status === 'overdue';

                  return (
                    <tr key={debt.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{debt.customerName}</div>
                        {debt.customerPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{debt.customerPhone}</span>
                          </div>
                        )}
                        {debt.guarantorName && (
                          <div className="text-[10px] text-indigo-400/80 mt-0.5">
                            {t('debts.guarantor')} {debt.guarantorName}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200 line-clamp-1 max-w-[200px]">
                          {debt.productSummary || t('debts.generalStoreSale')}
                        </div>
                        {debt.invoiceNumber && (
                          <span className="font-mono text-[10px] text-slate-500 block">
                            {debt.invoiceNumber}
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className={cn("py-3.5 px-4 text-right font-medium font-mono", getCurrencyColor(debt.currency))}>
                        {formatCurrency(debt.originalAmount, debt.currency)}
                      </td>

                      {/* Paid */}
                      <td className={cn("py-3.5 px-4 text-right font-semibold font-mono", debt.currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                        {formatCurrency(debt.paidAmount, debt.currency)}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={cn("font-bold text-sm font-mono", isPaid ? 'text-slate-400' : (debt.currency === 'USD' ? 'text-rose-400' : 'text-amber-400'))}>
                          {formatCurrency(debt.remainingAmount, debt.currency)}
                        </span>
                        <span className={cn("text-[10px] block font-mono", debt.currency === 'USD' ? 'text-sky-400/80' : 'text-amber-400/80')}>
                          ≈ {formatDualPrice(debt.remainingAmount, debt.currency, exchangeRate).secondary}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`font-medium ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {debt.dueDate}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {t('debts.registered')} {debt.startDate}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isOverdue
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : debt.status === 'partially_paid'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {t(`debts.statuses.${debt.status}`, debt.status.replace('_', ' '))}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pay button */}
                          {debt.remainingAmount > 0 && (
                            <button
                              onClick={() => {
                                sound.playClick();
                                setSelectedDebtForPayment(debt);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>{t('debts.pay')}</span>
                            </button>
                          )}

                          {/* WhatsApp PDF Direct Share button */}
                          <button
                            onClick={() => handleShareDebtPDF(debt)}
                            disabled={sharingDebtId === debt.id}
                            className="p-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 rounded-xl hover:text-white border border-emerald-500/40 transition-colors flex items-center justify-center"
                            title={t('debts.shareWhatsAppTooltip', { name: debt.customerName })}
                          >
                            <Send className={`w-4 h-4 text-emerald-400 ${sharingDebtId === debt.id ? 'animate-pulse' : ''}`} />
                          </button>

                          {/* Debt Official Invoice button */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              const doc = convertDebtToInvoiceDoc(debt, undefined, settings);
                              setActiveInvoiceDoc(doc);
                              setIsInvoiceViewerOpen(true);
                            }}
                            className="p-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 rounded-xl hover:text-white border border-indigo-500/30 transition-colors"
                            title={t('debts.officialInvoiceTooltip')}
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* Customer Statement button */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              setStatementCustomerName(debt.customerName);
                              setStatementCustomerPhone(debt.customerPhone);
                              setIsCustomerStatementOpen(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl hover:text-white transition-colors"
                            title={t('debts.customerLedgerTooltip')}
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteDebt(debt)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                            title={t('debts.deleteDebt')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Debt Drawer */}
      <AddDebtDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onDebtCreated={(newDebt) => setDebts((prev) => [newDebt, ...prev])}
        exchangeRate={exchangeRate}
      />

      {/* Record Payment Modal */}
      {selectedDebtForPayment && (
        <RecordDebtPaymentModal
          isOpen={true}
          onClose={() => setSelectedDebtForPayment(null)}
          debt={selectedDebtForPayment}
          exchangeRate={exchangeRate}
          onPaymentSuccess={(updatedDebt, payment) => {
            handlePaymentSuccess(updatedDebt, payment);
            // Open official receipt in new unified invoice viewer
            const receiptDoc = convertDebtToInvoiceDoc(updatedDebt, payment, settings);
            setActiveInvoiceDoc(receiptDoc);
            setIsInvoiceViewerOpen(true);
          }}
        />
      )}

      {/* Debtor Statement Modal */}
      {selectedDebtForStatement && (
        <DebtorStatementModal
          isOpen={true}
          onClose={() => setSelectedDebtForStatement(null)}
          debt={selectedDebtForStatement}
          exchangeRate={exchangeRate}
          onRecordPaymentClick={() => {
            setSelectedDebtForPayment(selectedDebtForStatement);
          }}
        />
      )}

      {/* Legacy Receipt Voucher Modal (fallback) */}
      {receiptModalData && !isInvoiceViewerOpen && (
        <DebtReceiptModal
          isOpen={true}
          onClose={() => setReceiptModalData(null)}
          debt={receiptModalData.debt}
          payment={receiptModalData.payment}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Master Invoice Viewer Modal */}
      {isInvoiceViewerOpen && activeInvoiceDoc && (
        <InvoiceViewerModal
          isOpen={isInvoiceViewerOpen}
          onClose={() => {
            setIsInvoiceViewerOpen(false);
            setActiveInvoiceDoc(null);
          }}
          document={activeInvoiceDoc}
          initialFormat="a4"
          onUpdateDocument={(updated) => setActiveInvoiceDoc(updated)}
        />
      )}

      {/* Master Customer Statement Modal */}
      {isCustomerStatementOpen && (
        <CustomerStatementModal
          isOpen={isCustomerStatementOpen}
          onClose={() => {
            setIsCustomerStatementOpen(false);
            setStatementCustomerName(undefined);
            setStatementCustomerPhone(undefined);
          }}
          defaultCustomerName={statementCustomerName}
          defaultCustomerPhone={statementCustomerPhone}
        />
      )}

      {/* Financial Documents Archive Hub */}
      {isInvoicesArchiveOpen && (
        <InvoicesListModal
          isOpen={isInvoicesArchiveOpen}
          onClose={() => setIsInvoicesArchiveOpen(false)}
        />
      )}

      {/* Migration Script Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />

    </div>
  );
}
