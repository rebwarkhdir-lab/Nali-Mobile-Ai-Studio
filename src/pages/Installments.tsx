import { useDesignSystem } from '../context/DesignContext';
import React, { useState, useEffect, useMemo } from 'react';
import {  
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Phone, 
  FileText, 
  Printer, 
  Trash2, 
  Coins, 
  RefreshCw, 
  Database,
  Calculator,
  ShieldCheck,
  CreditCard,
  Send,
  Eye,
  Receipt
, X } from 'lucide-react';
import { formatCurrency, formatDualPrice, cn, getCurrencyColor } from '../lib/utils';
import { SearchInput } from '../components/common/SearchInput';
import { InstallmentPlan } from '../types/installment';
import { installmentService } from '../lib/installmentService';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';

import CreateInstallmentDrawer from '../components/installments/CreateInstallmentDrawer';
import InstallmentDetailsDrawer from '../components/installments/InstallmentDetailsDrawer';
import InstallmentContractModal from '../components/installments/InstallmentContractModal';
import MigrationModal from '../components/common/MigrationModal';
import InvoiceViewerModal from '../components/invoice/InvoiceViewerModal';
import CustomerStatementModal from '../components/invoice/CustomerStatementModal';
import InvoicesListModal from '../components/invoice/InvoicesListModal';
import { convertInstallmentToInvoiceDoc } from '../lib/invoiceUtils';
import { InvoiceDocument } from '../types/invoice';
import { shareInstallmentInvoicePDF } from '../services/whatsappShareService';
import { useTranslation } from 'react-i18next';
import { recycleBinService } from '../lib/recycleBinService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CloudStatusBadge } from '../components/common/CloudStatusBadge';

export default function Installments() {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language !== 'en';
  const { settings } = useDesignSystem();
  const exchangeRate = settings.exchangeRate || 1500;
  const { success, error: toastError } = useToast();
  const [sharingPlanId, setSharingPlanId] = useState<string | null>(null);

  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'USD' | 'IQD'>('all');

  // Drawer / Modals state
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<InstallmentPlan | null>(null);
  const [selectedPlanForContract, setSelectedPlanForContract] = useState<InstallmentPlan | null>(null);

  // Unified Invoice State
  const [activeInvoiceDoc, setActiveInvoiceDoc] = useState<InvoiceDocument | null>(null);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [isCustomerStatementOpen, setIsCustomerStatementOpen] = useState(false);
  const [statementCustomerName, setStatementCustomerName] = useState<string | undefined>(undefined);
  const [statementCustomerPhone, setStatementCustomerPhone] = useState<string | undefined>(undefined);
  const [isInvoicesArchiveOpen, setIsInvoicesArchiveOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => loadInstallments();
    window.addEventListener("payment_recorded", handleUpdate);
    return () => window.removeEventListener("payment_recorded", handleUpdate);
  }, []);
  const loadInstallments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await installmentService.getAllInstallments();
      const safeData = Array.isArray(data) ? data : [];
      setPlans(safeData);
      const searchParams = new URLSearchParams(window.location.search);
      const pId = searchParams.get("pay");
      if (pId) {
        const plan = safeData.find(p => p.id === pId);
        if (plan) {
          setSelectedPlanForDetails(plan);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Error loading installments:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadInstallments();

    // Set up Realtime Supabase Channel for instant multi-device synchronization
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:nali_installments_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'nali_installments' },
          (payload) => {
            console.log('Realtime change received for installments:', payload.eventType);
            loadInstallments(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'nali_installment_schedules' },
          (payload) => {
            console.log('Realtime change received for installment schedules:', payload.eventType);
            loadInstallments(true);
          }
        )
        .subscribe((status) => {
          console.log('Installments realtime subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return (plans || []).filter((p) => {
      const matchesSearch =
        p.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.customerPhone && p.customerPhone.includes(searchTerm)) ||
        (p.productSummary && p.productSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.guarantorName && p.guarantorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesCurrency = currencyFilter === 'all' || p.currency === currencyFilter;

      return matchesSearch && matchesStatus && matchesCurrency;
    });
  }, [plans, searchTerm, statusFilter, currencyFilter]);

  // KPIs
  const stats = useMemo(() => {
    let totalPortfolioUSD = 0;
    let totalPortfolioIQD = 0;
    let totalRemainingUSD = 0;
    let totalRemainingIQD = 0;
    let overdueCount = 0;
    let activeContractsCount = 0;

    (plans || []).forEach((p) => {
      if (p.currency === 'USD') {
        totalPortfolioUSD += p.totalAmount;
        totalRemainingUSD += p.balanceRemaining;
      } else {
        totalPortfolioIQD += p.totalAmount;
        totalRemainingIQD += p.balanceRemaining;
      }

      if (p.status === 'overdue') overdueCount++;
      if (p.status === 'active') activeContractsCount++;
    });

    return {
      totalPortfolioUSD,
      totalPortfolioIQD,
      totalRemainingUSD,
      totalRemainingIQD,
      overdueCount,
      activeContractsCount,
      totalContracts: plans?.length || 0
    };
  }, [plans]);

  const handleDeletePlan = async (plan: InstallmentPlan) => {
    sound.playAlert();
    if (confirm(t('installments.deleteConfirm', { contractNumber: plan.contractNumber, customerName: plan.customerName }))) {
      await recycleBinService.moveToBin({
        id: plan.id,
        type: 'installment',
        name: `${plan.contractNumber} - ${plan.customerName}`,
        data: plan
      });

      await installmentService.deletePlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      success("Installment moved to Recycle Bin");
    }
  };

  const handlePlanUpdated = (updatedPlan: InstallmentPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
    setSelectedPlanForDetails(updatedPlan);
  };

  const handleSharePlanPDF = async (plan: InstallmentPlan) => {
    sound.playClick();
    setSharingPlanId(plan.id);
    try {
      const result = await shareInstallmentInvoicePDF(plan, undefined, exchangeRate);
      if (result.success) {
        if (result.mode === 'desktop_download') {
          success(t('installments.pdfDownloadedAndWhatsApp', { filename: result.filename, name: plan.customerName }));
        } else {
          success(t('installments.pdfSharedSuccess', { name: plan.customerName }));
        }
      }
    } catch (err) {
      console.error('Failed to share PDF invoice via WhatsApp:', err);
      toastError(t('installments.pdfShareFailed'));
    } finally {
      setSharingPlanId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-100 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <span>{t('installments.pageTitle')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  {t('installments.contractsCount', { count: plans?.length || 0 })}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('installments.pageSubtitle')}
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
            title={t('installments.invoicesArchiveTooltip')}
          >
            <Receipt className="w-4 h-4 text-indigo-400" />
            <span>{t('installments.invoicesArchive')}</span>
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
            title={t('installments.accountStatementTooltip')}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>{t('installments.accountStatement')}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsMigrationModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t('installments.sqlMigrationTooltip')}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{t('installments.sqlMigration')}</span>
          </button>

          <CloudStatusBadge
            onRefresh={() => loadInstallments(false)}
            tableName="nali_installments"
            isRefreshing={loading}
          />

          <button
            onClick={() => {
              sound.playClick();
              setIsCreateDrawerOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('installments.createContract')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Remaining Portfolio USD */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('installments.financedPortfolioUsd')}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2 font-mono">
            {formatCurrency(stats.totalPortfolioUSD, 'USD')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('installments.remainingToCollect')}</span>
            <span className="text-rose-400 font-semibold font-mono">{formatCurrency(stats.totalRemainingUSD, 'USD')}</span>
          </div>
        </div>

        {/* Remaining Portfolio IQD */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('installments.financedPortfolioIqd')}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-400 mt-2 font-mono">
            {formatCurrency(stats.totalPortfolioIQD, 'IQD')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('installments.remainingToCollect')}</span>
            <span className="text-amber-400 font-semibold font-mono">{formatCurrency(stats.totalRemainingIQD, 'IQD')}</span>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('installments.activeContracts')}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {stats.activeContractsCount} <span className="text-xs font-normal text-slate-400">{t('installments.active')}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('installments.totalRegistered')}</span>
            <span className="text-slate-300 font-semibold">{stats.totalContracts} {t('installments.plans')}</span>
          </div>
        </div>

        {/* Overdue Schedules */}
        <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t('installments.overdueInstallments')}</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-400 mt-2">
            {stats.overdueCount} <span className="text-xs font-normal text-slate-400">{t('installments.contracts')}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
            <span>{t('installments.actionRequired')}</span>
            <span className="text-rose-400 font-semibold">{stats.overdueCount > 0 ? t('installments.sendReminder') : t('installments.none')}</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#121829] border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="w-full md:w-96">
          <SearchInput
            placeholder={t('installments.searchPlaceholder')}
            value={searchTerm}
            onChangeValue={setSearchTerm}
            size="sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Status Filter */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'all', label: t('installments.allPlans') },
              { id: 'active', label: t('installments.active') },
              { id: 'overdue', label: t('installments.overdue') },
              { id: 'completed', label: t('installments.completed') }
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
              { id: 'all', label: t('installments.all') },
              { id: 'USD', label: t('installments.usd') },
              { id: 'IQD', label: t('installments.iqd') }
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

      {/* Contracts Table */}
      <div className="bg-[#121829] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0e1322] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">{t('installments.customerAndGuarantor')}</th>
                <th className="py-3.5 px-4">{t('installments.financedProducts')}</th>
                <th className="py-3.5 px-4 text-right">{t('installments.agreementTotal')}</th>
                <th className="py-3.5 px-4 text-right">{t('installments.monthlyRate')}</th>
                <th className="py-3.5 px-4 text-center">{t('installments.repaymentProgress')}</th>
                <th className="py-3.5 px-4 text-center">{t('installments.status')}</th>
                <th className="py-3.5 px-4 text-right">{t('installments.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                    <span>{t('installments.loadingContracts')}</span>
                  </td>
                </tr>
              ) : (filteredPlans?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
                    <p className="text-slate-400 font-medium">{t('installments.noContractsFound')}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      {searchTerm ? t('installments.adjustSearchQuery') : t('installments.createFirstContractPrompt')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => {
                  const paidSchedulesCount = (plan.schedules || []).filter((s) => s.status === 'paid').length;
                  const totalSchedulesCount = plan.schedules?.length || plan.durationMonths || 1;
                  
                  // Accurate monetary calculation for FINANCED portion (excluding down payment)
                  const actualPaid = plan.paidAmount !== undefined 
                    ? plan.paidAmount 
                    : ((plan.downPayment || 0) + plan.schedules.reduce((sum, s) => sum + (s.amountPaid || (s.status === 'paid' ? s.amountDue : 0)), 0));
                  
                  const financedAmount = Math.max(0, plan.totalAmount - (plan.downPayment || 0));
                  const financedPaid = Math.max(0, actualPaid - (plan.downPayment || 0));

                  const progressPct = financedAmount > 0 
                    ? Math.min(100, Math.round((financedPaid / financedAmount) * 100))
                    : (actualPaid >= plan.totalAmount ? 100 : 0);
                  
                  const isCompleted = plan.status === 'completed';
                  const isOverdue = plan.status === 'overdue';

                  return (
                    <tr key={plan.id} className="hover:bg-slate-800/40 transition-colors">

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{plan.customerName}</div>
                        {plan.customerPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{plan.customerPhone}</span>
                          </div>
                        )}
                        {plan.guarantorName && (
                          <div className="text-[10px] text-cyan-400/80 mt-0.5">
                            {t('installments.guarantor')} {plan.guarantorName}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200 line-clamp-1 max-w-[200px]">
                          {plan.productSummary || t('installments.storeProductPackage')}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {t('installments.down')} {formatCurrency(plan.downPayment, plan.currency)}
                        </span>
                      </td>

                      {/* Agreement Total */}
                      <td className="py-3.5 px-4 text-right">
                        <div className={cn("font-bold text-sm font-mono", getCurrencyColor(plan.currency))}>
                          {formatCurrency(plan.totalAmount, plan.currency)}
                        </div>
                        <span className={cn("text-[10px] block font-mono", plan.currency === 'USD' ? 'text-rose-400' : 'text-amber-400')}>
                          {t('installments.rem')} {formatCurrency(plan.balanceRemaining, plan.currency)}
                        </span>
                      </td>

                      {/* Monthly Payment */}
                      <td className="py-3.5 px-4 text-right">
                        <div className={cn("font-bold text-xs font-mono", getCurrencyColor(plan.currency))}>
                          {formatCurrency(plan.monthlyPayment, plan.currency)}
                        </div>
                        <span className="text-[10px] text-slate-500">{t('installments.perMonth')}</span>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        <div className="w-36 mx-auto space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400 font-mono" title={`${t('installments.details.paidTotalLabel')} ${formatCurrency(actualPaid, plan.currency)}\n${formatCurrency(financedPaid, plan.currency)}`}>
                              {t('installments.monthsCount', { paid: paidSchedulesCount, total: totalSchedulesCount })} <span className="text-slate-500">({formatCurrency(financedPaid, plan.currency)})</span>
                            </span>
                            <span className="text-emerald-400 font-bold font-mono">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isCompleted 
                                  ? 'bg-emerald-500' 
                                  : isOverdue 
                                    ? 'bg-amber-500' 
                                    : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isOverdue
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {t(`installments.statuses.${plan.status}`, { defaultValue: plan.status })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details / Pay Button */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              setSelectedPlanForDetails(plan);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('installments.schedule')}</span>
                          </button>

                          {/* Master Commercial Invoice & Contract */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              const doc = convertInstallmentToInvoiceDoc(plan, undefined, settings);
                              setActiveInvoiceDoc(doc);
                              setIsInvoiceViewerOpen(true);
                            }}
                            className="p-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 rounded-xl hover:text-white border border-indigo-500/30 transition-colors"
                            title={t('installments.officialInvoiceTooltip')}
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* WhatsApp PDF Direct Share button */}
                          <button
                            onClick={() => handleSharePlanPDF(plan)}
                            disabled={sharingPlanId === plan.id}
                            className="p-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 rounded-xl hover:text-white border border-emerald-500/40 transition-colors flex items-center justify-center"
                            title={t('installments.sendWhatsAppPdfTooltip', { name: plan.customerName })}
                          >
                            <Send className={`w-4 h-4 text-emerald-400 ${sharingPlanId === plan.id ? 'animate-pulse' : ''}`} />
                          </button>

                          {/* Customer Statement */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              setStatementCustomerName(plan.customerName);
                              setStatementCustomerPhone(plan.customerPhone);
                              setIsCustomerStatementOpen(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl hover:text-white transition-colors"
                            title={t('installments.customerLedgerTooltip')}
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Delete Plan */}
                          <button
                            onClick={() => handleDeletePlan(plan)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                            title={t('installments.deleteContract')}
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

      {/* Create Installment Drawer */}
      <CreateInstallmentDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onPlanCreated={(newPlan) => setPlans((prev) => [newPlan, ...prev])}
        exchangeRate={exchangeRate}
      />

      {/* Installment Details / Schedule Drawer */}
      {selectedPlanForDetails && (
        <InstallmentDetailsDrawer
          isOpen={true}
          onClose={() => setSelectedPlanForDetails(null)}
          plan={selectedPlanForDetails}
          exchangeRate={exchangeRate}
          onPlanUpdated={handlePlanUpdated}
        />
      )}

      {/* Contract Printable Modal (Legacy fallback) */}
      {selectedPlanForContract && !isInvoiceViewerOpen && (
        <InstallmentContractModal
          isOpen={true}
          onClose={() => setSelectedPlanForContract(null)}
          plan={selectedPlanForContract}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Master Invoice & Contract Viewer Modal */}
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
