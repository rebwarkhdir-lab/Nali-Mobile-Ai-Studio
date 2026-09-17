import { useDesignSystem } from '../context/DesignContext';
import React, { useState, useEffect, useMemo } from 'react';
import {  
  Building2, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Star, 
  Edit2, 
  Trash2, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Layers, 
  RefreshCw, 
  Sparkles, 
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Users,
  ShieldAlert,
  Truck,
  Database
, X } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Supplier, 
  SupplierPurchaseInvoice, 
  SupplierPaymentVoucher, 
  SupplierCompanyType 
} from '../types/supplier';
import { 
  SupplierReturnItem, 
  SupplierReturnStatus, 
  RequestedResolution, 
  DefectCategory 
} from '../types/supplierReturn';
import { supplierService } from '../lib/supplierService';
import { formatCurrency, formatDualPrice, formatNumberWithCommas, cn } from '../lib/utils';
import { SearchInput } from '../components/common/SearchInput';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';

import AddSupplierDrawer from '../components/suppliers/AddSupplierDrawer';
import RecordSupplierPaymentModal from '../components/suppliers/RecordSupplierPaymentModal';
import AddSupplierInvoiceModal from '../components/suppliers/AddSupplierInvoiceModal';
import SupplierStatementModal from '../components/suppliers/SupplierStatementModal';
import SupplierPaymentVoucherModal from '../components/suppliers/SupplierPaymentVoucherModal';
import CreateSupplierReturnModal from '../components/suppliers/CreateSupplierReturnModal';
import SupplierReturnVoucherModal from '../components/suppliers/SupplierReturnVoucherModal';
import ResolveSupplierReturnModal from '../components/suppliers/ResolveSupplierReturnModal';
import { useTranslation } from 'react-i18next';
import { recycleBinService } from '../lib/recycleBinService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CloudStatusBadge } from '../components/common/CloudStatusBadge';
import MigrationModal from '../components/common/MigrationModal';

type ActiveTab = 'directory' | 'debts' | 'invoices' | 'payments' | 'returns' | 'analytics';

export default function Suppliers() {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [loading, setLoading] = useState(true);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<SupplierPurchaseInvoice[]>([]);
  const [payments, setPayments] = useState<SupplierPaymentVoucher[]>([]);
  const [returns, setReturns] = useState<SupplierReturnItem[]>([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [debtOnlyFilter, setDebtOnlyFilter] = useState(false);

  // Return Specific Search & Filters
  const [returnSearchTerm, setReturnSearchTerm] = useState('');
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('all');
  const [returnSupplierFilter, setReturnSupplierFilter] = useState<string>('all');
  const [returnResolutionFilter, setReturnResolutionFilter] = useState<string>('all');

  // Modals & Drawers
  const [isAddSupplierDrawerOpen, setIsAddSupplierDrawerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SupplierPurchaseInvoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedSupplierForInvoice, setSelectedSupplierForInvoice] = useState<string | undefined>(undefined);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<Supplier | null>(null);
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<SupplierPaymentVoucher | null>(null);

  // Return Modals
  const [isCreateReturnModalOpen, setIsCreateReturnModalOpen] = useState(false);
  const [selectedReturnForVoucher, setSelectedReturnForVoucher] = useState<SupplierReturnItem | null>(null);
  const [selectedReturnForResolve, setSelectedReturnForResolve] = useState<SupplierReturnItem | null>(null);
  const [editingReturnItem, setEditingReturnItem] = useState<SupplierReturnItem | null>(null);

  const { settings } = useDesignSystem();
  const exchangeRate = settings.exchangeRate || 1500;

  const loadAllData = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const [sups, invs, pmts, rets] = await Promise.all([
        supplierService.getAllSuppliers(),
        supplierService.getAllInvoices(),
        supplierService.getAllPayments(),
        supplierService.getAllReturns()
      ]);
      
      const supsArray = Array.isArray(sups) ? sups : [];
      const validSupIds = new Set(supsArray.map((s: any) => s.id));
      
      const validInvs = (Array.isArray(invs) ? invs : []).filter((i: any) => validSupIds.has(i.supplierId));
      const validPmts = (Array.isArray(pmts) ? pmts : []).filter((p: any) => validSupIds.has(p.supplierId));
      const validRets = (Array.isArray(rets) ? rets : []).filter((r: any) => validSupIds.has(r.supplierId));

      setSuppliers(supsArray);
      setInvoices(validInvs);
      setPayments(validPmts);
      setReturns(validRets);

      // Auto-purge orphaned records from storage if any were found
      if (validInvs.length !== (invs?.length || 0)) {
        await supplierService.saveInvoices(validInvs);
      }
      if (validPmts.length !== (pmts?.length || 0)) {
        await supplierService.savePayments(validPmts);
      }
      if (validRets.length !== (rets?.length || 0)) {
        await supplierService.saveReturns(validRets);
      }
    } catch (e) {
      console.error('Error loading supplier data:', e);
      if (!silent) toastError('Failed to load supplier records');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('public:suppliers_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, (payload) => {
        console.log('Realtime update on suppliers table:', payload.eventType);
        loadAllData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_suppliers_data' }, () => {
        loadAllData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_supplier_invoices_data' }, () => {
        loadAllData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute summary stats
  const totalDebtUSD = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.currentDebtUSD || 0), 0);
  }, [suppliers]);

  const totalDebtIQD = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.currentDebtIQD || 0), 0);
  }, [suppliers]);

  const totalPurchasesUSD = useMemo(() => {
    return (suppliers || []).reduce((acc, s) => acc + (s.totalPurchasesUSD || 0), 0);
  }, [suppliers]);

  const totalPaidUSD = useMemo(() => {
    return (suppliers || []).reduce((acc, s) => acc + (s.totalPaidUSD || 0), 0);
  }, [suppliers]);

  const suppliersWithDebt = useMemo(() => {
    return (suppliers || []).filter(s => (s.currentDebtUSD > 0) || (s.currentDebtIQD > 0));
  }, [suppliers]);

  const overdueInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (invoices || []).filter(i => i.remainingDebt > 0 && i.dueDate && i.dueDate < today);
  }, [invoices]);

  // Return & RMA computed statistics
  const activePendingReturnsCount = useMemo(() => {
    return (returns || []).filter(r => r.status === 'pending_dispatch' || r.status === 'dispatched').length;
  }, [returns]);

  const returnStats = useMemo(() => {
    let pendingCount = 0;
    let dispatchedCount = 0;
    let resolvedCount = 0;
    let totalPendingValueUSD = 0;
    let totalPendingValueIQD = 0;
    let totalRecoveredUSD = 0;
    let totalRecoveredIQD = 0;

    for (const r of (returns || [])) {
      if (r.status === 'pending_dispatch') {
        pendingCount++;
        if (r.currency === 'USD') totalPendingValueUSD += (r.totalValue || 0);
        else totalPendingValueIQD += (r.totalValue || 0);
      } else if (r.status === 'dispatched') {
        dispatchedCount++;
        if (r.currency === 'USD') totalPendingValueUSD += (r.totalValue || 0);
        else totalPendingValueIQD += (r.totalValue || 0);
      } else if (['received_replacement', 'refunded_cash', 'credited_to_account'].includes(r.status)) {
        resolvedCount++;
        const val = r.refundAmount || r.totalValue || 0;
        const cur = r.refundCurrency || r.currency;
        if (cur === 'USD') totalRecoveredUSD += val;
        else totalRecoveredIQD += val;
      }
    }

    return {
      pendingCount,
      dispatchedCount,
      resolvedCount,
      totalPendingValueUSD,
      totalPendingValueIQD,
      totalRecoveredUSD,
      totalRecoveredIQD
    };
  }, [returns]);

  // Unique cities list for filtering
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach(s => { if (s.city) set.add(s.city); });
    return Array.from(set);
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.categoriesSupplied && s.categoriesSupplied.some(c => c.toLowerCase().includes(q)));

      const matchesType = selectedTypeFilter === 'all' || s.companyType === selectedTypeFilter;
      const matchesCity = selectedCityFilter === 'all' || s.city === selectedCityFilter;
      const matchesDebt = !debtOnlyFilter || (s.currentDebtUSD > 0 || s.currentDebtIQD > 0);

      return matchesSearch && matchesType && matchesCity && matchesDebt;
    });
  }, [suppliers, searchTerm, selectedTypeFilter, selectedCityFilter, debtOnlyFilter]);

  // Filtered Returns & RMA items
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const q = returnSearchTerm.toLowerCase();
      const matchesSearch = 
        !q ||
        r.rmaNumber.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        (r.model && r.model.toLowerCase().includes(q)) ||
        (r.serialOrImei && r.serialOrImei.toLowerCase().includes(q)) ||
        r.supplierName.toLowerCase().includes(q) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.defectDescription && r.defectDescription.toLowerCase().includes(q));

      const matchesStatus = returnStatusFilter === 'all' || r.status === returnStatusFilter;
      const matchesSupplier = returnSupplierFilter === 'all' || r.supplierId === returnSupplierFilter;
      const matchesResolution = returnResolutionFilter === 'all' || r.requestedResolution === returnResolutionFilter;

      return matchesSearch && matchesStatus && matchesSupplier && matchesResolution;
    });
  }, [returns, returnSearchTerm, returnStatusFilter, returnSupplierFilter, returnResolutionFilter]);

  // Handlers
  const handleSaveSupplier = async (data: any) => {
    try {
      const saved = await supplierService.saveSupplier(data);
      success(t('suppliers.alerts.savedSuccess'));
      loadAllData();
    } catch (e) {
      toastError(t('suppliers.alerts.savedSuccess'));
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(t('suppliers.alerts.deleteConfirm', { name, defaultValue: `Are you sure you want to remove "${name}" and all its history?` }))) return;
    try {
      const supplierToBin = suppliers.find(s => s.id === id);
      if (supplierToBin) {
        await recycleBinService.moveToBin({
          id: supplierToBin.id,
          type: 'supplier',
          name: supplierToBin.name,
          data: supplierToBin
        });
      }

      await supplierService.deleteSupplier(id);
      success("Supplier moved to Recycle Bin");
      loadAllData();
    } catch (e) {
      toastError('Failed to delete supplier');
    }
  };

  const handleSaveInvoice = async (invoiceData: any) => {
    try {
      await supplierService.saveInvoice(invoiceData);
      success(t('suppliers.alerts.invoiceSaved', { number: invoiceData.invoiceNumber, defaultValue: `Purchase bill #${invoiceData.invoiceNumber} recorded` }));
      loadAllData();
    } catch (e) {
      toastError('Failed to record purchase bill');
    }
  };

  const handleSavePayment = async (paymentData: any) => {
    try {
      const voucher = await supplierService.recordPayment(paymentData);
      success(t('suppliers.alerts.paymentSaved', { number: voucher.voucherNumber, defaultValue: `Payment voucher #${voucher.voucherNumber} issued successfully` }));
      loadAllData();
      setSelectedVoucherForView(voucher);
    } catch (e) {
      toastError('Failed to record payment voucher');
    }
  };

  const handleDeleteReturn = async (id: string, rmaNumber: string) => {
    if (!window.confirm(t('suppliers.alerts.returnDeletedConfirm', { rma: rmaNumber, defaultValue: `Are you sure you want to delete return record ${rmaNumber}?` }))) return;
    sound.playClick();
    try {
      await supplierService.deleteReturn(id);
      success(t('suppliers.alerts.returnDeleted', { rma: rmaNumber, defaultValue: `Return record ${rmaNumber} deleted` }));
      loadAllData();
    } catch (e) {
      toastError('Failed to delete return ticket');
    }
  };

  const handleMarkReturnDispatched = async (id: string, rmaNumber: string) => {
    sound.playClick();
    try {
      await supplierService.updateReturnStatus(id, {
        status: 'dispatched',
        dispatchedAt: new Date().toISOString()
      });
      sound.playSuccess();
      success(t('suppliers.alerts.dispatchedSuccess', { rma: rmaNumber, defaultValue: `RMA #${rmaNumber} marked as Dispatched to Supplier` }));
      loadAllData();
    } catch (e) {
      toastError('Failed to update status');
    }
  };

  return (
    <div dir={isKu ? 'rtl' : 'ltr'} className={cn("space-y-6", isKu && "text-right")}>
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{t('suppliers.title')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  {t('suppliers.companiesCount', { count: (suppliers?.length || 0) })}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                {t('suppliers.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              sound.playClick();
              setIsMigrationModalOpen(true);
            }}
            className="px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Database Schema & SQL Migration"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">SQL Migration</span>
          </button>

          <CloudStatusBadge
            onRefresh={() => loadAllData(false)}
            tableName="suppliers"
            isRefreshing={loading}
          />

          <button
            onClick={() => {
              sound.playClick();
              setEditingReturnItem(null);
              setIsCreateReturnModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t('suppliers.buttons.returnItem')}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setSelectedSupplierForPayment(null);
              setSelectedInvoiceForPayment(null);
              setIsPaymentModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Banknote className="w-4 h-4" />
            <span>{t('suppliers.buttons.paySupplier')}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setSelectedSupplierForInvoice(undefined);
              setIsInvoiceModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>{t('suppliers.buttons.recordBill')}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setEditingSupplier(null);
              setIsAddSupplierDrawerOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('suppliers.buttons.addCompany')}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Real-time Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Payables Owed */}
        <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-slate-800/80 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('suppliers.kpi.totalPayables')}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white font-mono">
              {formatCurrency(totalDebtUSD, 'USD')}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-amber-400 font-mono font-medium">
                {formatNumberWithCommas(totalDebtIQD)} IQD
              </span>
              <span className="text-slate-400 font-medium">
                {t('suppliers.kpi.vendorsWithDebt', { count: (suppliersWithDebt?.length || 0) })}
              </span>
            </div>
          </div>
        </div>

        {/* Total Purchases Vol */}
        <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-slate-800/80 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('suppliers.kpi.totalPurchased')}
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white font-mono">
              {formatCurrency(totalPurchasesUSD, 'USD')}
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-400">
              <span>{t('suppliers.kpi.billsCount', { count: invoices?.length || 0 })}</span>
              <span className="text-indigo-400 font-medium">{t('suppliers.kpi.allTimeVol')}</span>
            </div>
          </div>
        </div>

        {/* Total Payments Issued */}
        <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-slate-800/80 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('suppliers.kpi.totalPayments')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {formatCurrency(totalPaidUSD, 'USD')}
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-400">
              <span>{t('suppliers.kpi.vouchersCount', { count: payments?.length || 0 })}</span>
              <span className="text-emerald-400 font-medium">{t('suppliers.kpi.settledToVendors')}</span>
            </div>
          </div>
        </div>

        {/* Overdue / Urgent Alert */}
        <div className={cn(
          "bg-gradient-to-br from-[#181d2f] to-[#121624] border rounded-2xl p-4 shadow-lg relative overflow-hidden transition-all",
          (overdueInvoices?.length || 0) > 0 ? "border-rose-500/40" : "border-slate-800/80"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('suppliers.kpi.dueOverdue')}
            </span>
            <div className={cn("p-2 rounded-xl", (overdueInvoices?.length || 0) > 0 ? "bg-rose-500/10 text-rose-400" : "bg-blue-500/10 text-blue-400")}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white font-mono">
              {t('suppliers.kpi.overdueBills', { count: overdueInvoices?.length || 0 })}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={cn("font-medium", (overdueInvoices?.length || 0) > 0 ? "text-rose-400" : "text-emerald-400")}>
                {(overdueInvoices?.length || 0) > 0 ? t('suppliers.kpi.pastDueDate') : t('suppliers.kpi.allOnSchedule')}
              </span>
              <button
                onClick={() => { sound.playClick(); setActiveTab('invoices'); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                {t('suppliers.kpi.viewBills')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-800/80 flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'directory', label: t('suppliers.tabs.directory'), icon: Building2, count: (suppliers?.length || 0) },
            { id: 'debts', label: t('suppliers.tabs.debts'), icon: DollarSign, count: (suppliersWithDebt?.length || 0), badgeColor: 'bg-amber-500/20 text-amber-300' },
            { id: 'invoices', label: t('suppliers.tabs.invoices'), icon: FileText, count: (invoices?.length || 0) },
            { id: 'payments', label: t('suppliers.tabs.payments'), icon: Receipt, count: (payments?.length || 0) },
            { 
              id: 'returns', 
              label: t('suppliers.tabs.returns'), 
              icon: AlertTriangle, 
              count: activePendingReturnsCount, 
              badgeColor: activePendingReturnsCount > 0 ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold' : 'bg-slate-800 text-slate-400' 
            },
            { id: 'analytics', label: t('suppliers.tabs.analytics'), icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { sound.playClick(); setActiveTab(tab.id as ActiveTab); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  isActive 
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
                    tab.badgeColor || (isActive ? "bg-indigo-500/30 text-white" : "bg-slate-800 text-slate-400")
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-indigo-400")} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-[#121829] border border-slate-800/80 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChangeValue={setSearchTerm}
                placeholder={t('suppliers.filters.searchPlaceholder')}
                size="sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{t('suppliers.filters.allTypes')}</option>
                <option value="distributor">{t('suppliers.companyTypes.distributor')}</option>
                <option value="wholesaler">{t('suppliers.companyTypes.wholesaler')}</option>
                <option value="importer">{t('suppliers.companyTypes.importer')}</option>
                <option value="factory_direct">{t('suppliers.companyTypes.factory_direct')}</option>
                <option value="trade_in_partner">{t('suppliers.companyTypes.trade_in_partner')}</option>
                <option value="service_center">{t('suppliers.companyTypes.service_center')}</option>
              </select>

              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{t('suppliers.filters.allCities')}</option>
                {uniqueCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={() => { sound.playClick(); setDebtOnlyFilter(!debtOnlyFilter); }}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                  debtOnlyFilter 
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300" 
                    : "bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200"
                )}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{t('suppliers.filters.hasDebtOnly')}</span>
              </button>
            </div>
          </div>

          {/* Supplier Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filteredSuppliers?.length || 0) === 0 ? (
              <div className="col-span-full py-12 text-center bg-[#121829] border border-slate-800 rounded-3xl p-8 space-y-3">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">{t('suppliers.table.noSuppliers')}</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {t('suppliers.table.noSuppliersSub')}
                </p>
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsAddSupplierDrawerOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('suppliers.buttons.addCompany')}</span>
                </button>
              </div>
            ) : (
              filteredSuppliers.map((supplier) => {
                const hasDebt = (supplier.currentDebtUSD > 0) || (supplier.currentDebtIQD > 0);
                return (
                  <div
                    key={supplier.id}
                    className="bg-gradient-to-b from-[#141b2e] to-[#0f1422] border border-slate-800/90 hover:border-indigo-500/40 rounded-3xl p-5 shadow-xl transition-all space-y-4 flex flex-col justify-between group"
                  >
                    {/* Card Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm shrink-0">
                            {supplier.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-indigo-300 transition-colors">
                              {supplier.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                                {t(`suppliers.companyTypes.${supplier.companyType}` as any, { defaultValue: supplier.companyType?.replace('_', ' ').toUpperCase() })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                • {supplier.city}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              sound.playClick();
                              setEditingSupplier(supplier);
                              setIsAddSupplierDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                            title={t('suppliers.table.edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title={t('suppliers.table.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Channels */}
                      <div className="mt-3.5 space-y-1.5 text-xs text-slate-300 bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('suppliers.drawer.contactPerson')}:</span>
                          <strong className="text-slate-200 font-semibold">{supplier.contactPerson}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('suppliers.drawer.phone')}:</span>
                          <a href={`tel:${supplier.phone}`} className="text-indigo-400 hover:underline font-mono">
                            {supplier.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('suppliers.drawer.paymentTerms')}:</span>
                          <span className="text-amber-400 font-medium">{supplier.paymentTerms}</span>
                        </div>
                      </div>

                      {/* Product Category Pills */}
                      {Array.isArray(supplier?.categoriesSupplied) && (supplier.categoriesSupplied?.length || 0) > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {supplier.categoriesSupplied.slice(0, 3).map(cat => (
                            <span key={cat} className="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[10px] font-medium">
                              {cat}
                            </span>
                          ))}
                          {(supplier?.categoriesSupplied?.length || 0) > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                              +{(supplier?.categoriesSupplied?.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Financial Balances Footer */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            {t('suppliers.table.balance')}
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className={cn(
                              "text-base font-extrabold font-mono",
                              hasDebt ? "text-amber-400" : "text-emerald-400"
                            )}>
                              {formatCurrency(supplier.currentDebtUSD || 0, 'USD')}
                            </span>
                            {(supplier.currentDebtIQD > 0) && (
                              <span className="text-[10px] text-amber-300 font-mono">
                                ({formatNumberWithCommas(supplier.currentDebtIQD)} IQD)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Credit Limit Progress */}
                        {supplier.creditLimitUSD && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">
                              Limit: ${formatNumberWithCommas(supplier.creditLimitUSD)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              {Math.round(((supplier.currentDebtUSD || 0) / supplier.creditLimitUSD) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            sound.playClick();
                            setSelectedSupplierForStatement(supplier);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t('suppliers.table.statement')}</span>
                        </button>

                        <button
                          onClick={() => {
                            sound.playClick();
                            setSelectedSupplierForInvoice(supplier.id);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('suppliers.table.newBill')}</span>
                        </button>

                        <button
                          onClick={() => {
                            sound.playClick();
                            setSelectedSupplierForPayment(supplier);
                            setSelectedInvoiceForPayment(null);
                            setIsPaymentModalOpen(true);
                          }}
                          className={cn(
                            "px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer",
                            hasDebt 
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30" 
                              : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                          )}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>{t('suppliers.table.pay')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEBTS & PAYABLES CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="bg-[#121829] border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{t('suppliers.debtsTab.title')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('suppliers.debtsTab.subtitle')}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">{t('suppliers.kpi.totalPayables')}:</span>
              <div className="text-xl font-extrabold text-amber-400 font-mono">
                {formatCurrency(totalDebtUSD, 'USD')}
                {totalDebtIQD > 0 && <span className="text-xs text-slate-400 ml-2">({formatNumberWithCommas(totalDebtIQD)} IQD)</span>}
              </div>
            </div>
          </div>

          <div className="bg-[#121829] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className={cn("w-full text-xs", isKu ? "text-right" : "text-left")}>
                <thead className="bg-[#0b0f1a] text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">{t('suppliers.debtsTab.supplier')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.debtsTab.contact')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.debtsTab.terms')}</th>
                    <th className={cn("py-3.5 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.table.purchases')}</th>
                    <th className={cn("py-3.5 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.invoicesTab.paid')}</th>
                    <th className={cn("py-3.5 px-4", isKu ? "text-left" : "text-right")}>{t('suppliers.invoicesTab.remaining')}</th>
                    <th className="py-3.5 px-4 text-center">{t('suppliers.debtsTab.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(suppliersWithDebt?.length || 0) === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                        <div className="text-sm font-bold text-white">{t('suppliers.debtsTab.noDebts')}</div>
                        <div className="text-xs text-slate-400">{t('suppliers.debtsTab.noDebtsSub')}</div>
                      </td>
                    </tr>
                  ) : (
                    suppliersWithDebt.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{supplier.name}</div>
                          <div className="text-slate-400 text-[11px]">{supplier.contactPerson}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-slate-300">{supplier.city}, {supplier.country}</div>
                          <div className="font-mono text-indigo-400 text-[11px]">{supplier.phone}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium text-[11px]">
                            {supplier.paymentTerms}
                          </span>
                        </td>
                        <td className={cn("py-3.5 px-3 font-mono font-bold text-slate-200", isKu ? "text-left" : "text-right")}>
                          {formatCurrency(supplier.totalPurchasesUSD || 0, 'USD')}
                        </td>
                        <td className={cn("py-3.5 px-3 font-mono font-bold text-emerald-400", isKu ? "text-left" : "text-right")}>
                          {formatCurrency(supplier.totalPaidUSD || 0, 'USD')}
                        </td>
                        <td className={cn("py-3.5 px-4 font-mono font-extrabold text-amber-400 text-sm whitespace-nowrap", isKu ? "text-left" : "text-right")}>
                          {formatCurrency(supplier.currentDebtUSD || 0, 'USD')}
                          {supplier.currentDebtIQD > 0 && (
                            <div className="text-[10px] text-amber-300 font-normal">
                              {formatNumberWithCommas(supplier.currentDebtIQD)} IQD
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                sound.playClick();
                                setSelectedSupplierForStatement(supplier);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                            >
                              {t('suppliers.table.statement')}
                            </button>
                            <button
                              onClick={() => {
                                sound.playClick();
                                setSelectedSupplierForPayment(supplier);
                                setSelectedInvoiceForPayment(null);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-600/30 flex items-center gap-1"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>{t('suppliers.debtsTab.recordPayment')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PURCHASE INVOICES / BILLS */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-[#121829] border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>{t('suppliers.invoicesTab.title')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('suppliers.invoicesTab.subtitle')}
              </p>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setSelectedSupplierForInvoice(undefined);
                setIsInvoiceModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('suppliers.invoicesTab.recordNew')}</span>
            </button>
          </div>

          <div className="bg-[#121829] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className={cn("w-full text-xs", isKu ? "text-right" : "text-left")}>
                <thead className="bg-[#0b0f1a] text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">{t('suppliers.invoicesTab.invoiceNumber')} & {t('suppliers.invoicesTab.date')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.invoicesTab.supplier')}</th>
                    <th className="py-3.5 px-4">{t('suppliers.invoiceModal.itemsSummary')}</th>
                    <th className={cn("py-3.5 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.invoicesTab.total')}</th>
                    <th className={cn("py-3.5 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.invoicesTab.paid')}</th>
                    <th className={cn("py-3.5 px-3", isKu ? "text-left" : "text-right")}>{t('suppliers.invoicesTab.remaining')}</th>
                    <th className="py-3.5 px-3 text-center">{t('suppliers.invoicesTab.status')}</th>
                    <th className="py-3.5 px-4 text-center">{t('suppliers.invoicesTab.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(invoices?.length || 0) === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {t('suppliers.invoicesTab.noInvoices')}
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const isOverdue = inv.remainingDebt > 0 && inv.dueDate && inv.dueDate < new Date().toISOString().split('T')[0];
                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-white text-sm">#{inv.invoiceNumber}</div>
                            <div className="text-slate-400 text-[11px]">{inv.purchaseDate}</div>
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-slate-200">
                            {inv.supplierName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                            <div className="truncate font-medium">{inv.itemsSummary}</div>
                            {inv.itemCount && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Qty: {inv.itemCount}
                              </span>
                            )}
                          </td>
                          <td className={cn("py-3.5 px-3 font-mono font-bold text-white", isKu ? "text-left" : "text-right")}>
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </td>
                          <td className={cn("py-3.5 px-3 font-mono font-bold text-emerald-400", isKu ? "text-left" : "text-right")}>
                            {formatCurrency(inv.paidAmount, inv.currency)}
                          </td>
                          <td className={cn("py-3.5 px-3 font-mono font-extrabold text-amber-400 whitespace-nowrap", isKu ? "text-left" : "text-right")}>
                            {formatCurrency(inv.remainingDebt, inv.currency)}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {inv.status === 'paid' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                {t('suppliers.invoicesTab.fullyPaid')}
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                {t('suppliers.invoicesTab.overdue')}
                              </span>
                            ) : inv.status === 'partially_paid' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                {t('suppliers.invoicesTab.partial')}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                                {t('suppliers.invoicesTab.unpaid')}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {inv.remainingDebt > 0 ? (
                              <button
                                onClick={() => {
                                  sound.playClick();
                                  const sup = suppliers.find(s => s.id === inv.supplierId) || null;
                                  setSelectedSupplierForPayment(sup);
                                  setSelectedInvoiceForPayment(inv);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                {t('suppliers.invoicesTab.pay')}
                              </button>
                            ) : (
                              <span className="text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('suppliers.invoicesTab.fullyPaid')}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYMENT VOUCHERS & LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-[#121829] border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>{t('suppliers.paymentsTab.title')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('suppliers.paymentsTab.subtitle')}
              </p>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setSelectedSupplierForPayment(null);
                setSelectedInvoiceForPayment(null);
                setIsPaymentModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('suppliers.paymentsTab.issueNew')}</span>
            </button>
          </div>

          <div className="bg-[#121829] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className={cn("w-full text-xs", isKu ? "text-right" : "text-left")}>
                <thead className="bg-[#0b0f1a] text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">{t('suppliers.paymentsTab.voucherNumber')} & {t('suppliers.paymentsTab.date')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.paymentsTab.supplier')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.paymentsTab.method')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.paymentModal.exchangeBank')}</th>
                    <th className="py-3.5 px-3">{t('suppliers.paymentModal.receiptNumber')}</th>
                    <th className={cn("py-3.5 px-4", isKu ? "text-left" : "text-right")}>{t('suppliers.paymentsTab.amount')}</th>
                    <th className="py-3.5 px-4 text-center">{t('suppliers.paymentsTab.receipt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(payments?.length || 0) === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        {t('suppliers.paymentsTab.noPayments')}
                      </td>
                    </tr>
                  ) : (
                    payments.map((voucher) => (
                      <tr key={voucher.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-white text-sm">{voucher.voucherNumber}</div>
                          <div className="text-slate-400 text-[11px]">{voucher.paymentDate}</div>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-200">
                          {voucher.supplierName}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium text-[11px]">
                            {t(`suppliers.paymentMethods.${voucher.paymentMethod}` as any, { defaultValue: voucher.paymentMethod.replace('_', ' ').toUpperCase() })}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">
                          {voucher.exchangeOfficeOrBank || '-'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-indigo-300">
                          {voucher.receiptNumber || '-'}
                        </td>
                        <td className={cn("py-3.5 px-4 font-mono font-extrabold text-emerald-400 text-sm whitespace-nowrap", isKu ? "text-left" : "text-right")}>
                          {formatCurrency(voucher.amount, voucher.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              sound.playClick();
                              setSelectedVoucherForView(voucher);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {t('suppliers.paymentsTab.viewVoucher')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ANALYTICS & SUPPLIER CASHFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchases by Supplier Chart */}
            <div className="bg-[#121829] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{t('suppliers.analyticsTab.purchasesBySupplier')}</h3>
                  <p className="text-xs text-slate-400">{t('suppliers.analyticsTab.subtitle')}</p>
                </div>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={suppliers.slice(0, 6).map(s => ({
                      name: s.name.split(' ')[0],
                      Purchases: s.totalPurchasesUSD || 0,
                      Paid: s.totalPaidUSD || 0,
                      Debt: s.currentDebtUSD || 0
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1422', borderColor: '#334155', borderRadius: '12px' }}
                      formatter={(val: any) => [`$${formatNumberWithCommas(val)}`, '']}
                    />
                    <Bar dataKey="Purchases" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Debt" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-indigo-500"></span>
                  <span>{t('suppliers.debtsTab.totalPurchases', { defaultValue: 'Total Purchases' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span>{t('suppliers.invoicesTab.paid', { defaultValue: 'Total Paid' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span>{t('suppliers.invoicesTab.remaining', { defaultValue: 'Current Debt' })}</span>
                </div>
              </div>
            </div>

            {/* Classification Breakdown */}
            <div className="bg-[#121829] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{t('suppliers.analyticsTab.debtDistribution', { defaultValue: 'Vendor Classification Distribution' })}</h3>
                  <p className="text-xs text-slate-400">{t('suppliers.analyticsTab.performanceSummary', { defaultValue: 'Breakdown of supplier relationships' })}</p>
                </div>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { type: 'distributor', label: t('suppliers.companyTypes.distributor'), color: 'bg-indigo-500' },
                  { type: 'wholesaler', label: t('suppliers.companyTypes.wholesaler'), color: 'bg-cyan-500' },
                  { type: 'importer', label: t('suppliers.companyTypes.importer'), color: 'bg-emerald-500' },
                  { type: 'trade_in_partner', label: t('suppliers.companyTypes.trade_in_partner'), color: 'bg-amber-500' },
                  { type: 'service_center', label: t('suppliers.companyTypes.service_center'), color: 'bg-purple-500' }
                ].map(item => {
                  const count = (suppliers || []).filter(s => s && s.companyType === item.type).length;
                  const pct = (suppliers?.length || 0) > 0 ? Math.round((count / (suppliers?.length || 0)) * 100) : 0;
                  return (
                    <div key={item.type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{item.label}</span>
                        <span className="text-slate-400 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEFECTIVE RETURNS & RMA (SUPPLIER WARRANTY SYSTEM) */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          
          {/* Top RMA Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* In-Store Defective Units */}
            <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-amber-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  {t('suppliers.returnsTab.inStorePending')}
                </span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {returnStats.pendingCount} <span className="text-sm font-sans font-normal text-slate-400">{t('suppliers.returnsTab.units')}</span>
                </div>
                <div className="text-xs text-amber-300 font-mono font-medium mt-1">
                  ${returnStats.totalPendingValueUSD.toLocaleString()} {t('suppliers.returnsTab.claimValue')}
                </div>
              </div>
            </div>

            {/* Dispatched to Suppliers */}
            <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-blue-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  {t('suppliers.returnsTab.withSuppliers')}
                </span>
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {returnStats.dispatchedCount} <span className="text-sm font-sans font-normal text-slate-400">{t('suppliers.returnsTab.units')}</span>
                </div>
                <div className="text-xs text-blue-300 font-medium mt-1">
                  {t('suppliers.returnsTab.withSuppliersSub')}
                </div>
              </div>
            </div>

            {/* Total Recovered */}
            <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-emerald-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  {t('suppliers.returnsTab.recoveredSettlements')}
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-extrabold text-white font-mono">
                  ${returnStats.totalRecoveredUSD.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-300 font-medium mt-1">
                  {returnStats.resolvedCount} {t('suppliers.returnsTab.claimsSettled')}
                </div>
              </div>
            </div>

            {/* Total RMA History */}
            <div className="bg-gradient-to-br from-[#181d2f] to-[#121624] border border-slate-800/80 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('suppliers.returnsTab.totalRmaTickets')}
                </span>
                <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {returns?.length || 0}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  {t('suppliers.returnsTab.totalRmaSub')}
                </div>
              </div>
            </div>
          </div>

          {/* Search, Filter and Actions Toolbar */}
          <div className="bg-[#121829] border border-slate-800/80 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <SearchInput
                value={returnSearchTerm}
                onChangeValue={setReturnSearchTerm}
                placeholder={t('suppliers.returnsTab.searchPlaceholder')}
                size="sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={returnStatusFilter}
                onChange={(e) => setReturnStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">{t('suppliers.returnsTab.allStatuses')}</option>
                <option value="pending_dispatch">{t('suppliers.returnsTab.statusInStore')}</option>
                <option value="dispatched">{t('suppliers.returnsTab.statusDispatched')}</option>
                <option value="received_replacement">{t('suppliers.returnsTab.statusReplacement')}</option>
                <option value="refunded_cash">{t('suppliers.returnsTab.statusCashRefund')}</option>
                <option value="credited_to_account">{t('suppliers.returnsTab.statusCredited')}</option>
                <option value="rejected">{t('suppliers.returnsTab.statusRejected')}</option>
              </select>

              <select
                value={returnSupplierFilter}
                onChange={(e) => setReturnSupplierFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">{t('suppliers.returnsTab.allSuppliers')}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={returnResolutionFilter}
                onChange={(e) => setReturnResolutionFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">{t('suppliers.returnsTab.allResolutions')}</option>
                <option value="replacement">{t('suppliers.createReturnModal.resReplacement')}</option>
                <option value="cash_refund">{t('suppliers.createReturnModal.resRefund')}</option>
                <option value="account_credit">{t('suppliers.createReturnModal.resCredit')}</option>
              </select>

              <button
                onClick={() => {
                  sound.playClick();
                  setEditingReturnItem(null);
                  setIsCreateReturnModalOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('suppliers.returnsTab.logDefectiveReturn')}</span>
              </button>
            </div>
          </div>

          {/* Return Records List */}
          {(filteredReturns?.length || 0) === 0 ? (
            <div className="p-12 text-center bg-[#121829] border border-slate-800 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('suppliers.returnsTab.noReturnsFound')}</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {t('suppliers.returnsTab.noReturnsFoundSub')}
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  setEditingReturnItem(null);
                  setIsCreateReturnModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('suppliers.returnsTab.logFirstReturn')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturns.map(item => {
                const isPending = item.status === 'pending_dispatch';
                const isDispatched = item.status === 'dispatched';
                const isResolved = ['received_replacement', 'refunded_cash', 'credited_to_account'].includes(item.status);
                const isRejected = item.status === 'rejected';

                let statusBadgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                let statusLabel = t('suppliers.returnsTab.statusInStore');
                if (isDispatched) {
                  statusBadgeStyle = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                  statusLabel = t('suppliers.returnsTab.statusDispatched');
                } else if (item.status === 'received_replacement') {
                  statusBadgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  statusLabel = t('suppliers.returnsTab.statusReplacement');
                } else if (item.status === 'refunded_cash') {
                  statusBadgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  statusLabel = t('suppliers.returnsTab.statusCashRefund');
                } else if (item.status === 'credited_to_account') {
                  statusBadgeStyle = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
                  statusLabel = t('suppliers.returnsTab.statusCredited');
                } else if (isRejected) {
                  statusBadgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                  statusLabel = t('suppliers.returnsTab.statusRejected');
                }

                return (
                  <div
                    key={item.id}
                    className="bg-[#121829] hover:bg-[#151c30] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 transition-all space-y-3"
                  >
                    {/* Top Row: RMA ID, Item Name, Status, Priority */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            sound.playClick();
                            setSelectedReturnForVoucher(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-500/60 text-xs font-mono font-bold text-amber-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="View RMA Voucher"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{item.rmaNumber}</span>
                        </button>

                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{item.itemName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {t('suppliers.returnsTab.qty')}: {item.quantity}
                          </span>
                        </span>

                        <span className="text-[11px] text-slate-500 ml-1">
                          • {new Date(item.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.priority === 'urgent' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            {t('suppliers.createReturnModal.priorityUrgent')}
                          </span>
                        )}
                        {item.priority === 'high' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {t('suppliers.createReturnModal.priorityHigh')}
                          </span>
                        )}

                        <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full border", statusBadgeStyle)}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Supplier, item specs, defect description, claim value */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                      
                      {/* Item Details (5 cols) */}
                      <div className="lg:col-span-5 space-y-1">
                        <div className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{item.supplierName}</span>
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                          <span>{t('suppliers.createReturnModal.brand')}: <strong className="text-slate-300">{item.brand}</strong></span>
                          {item.serialOrImei && (
                            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[11px] text-amber-300">
                              IMEI/SN: {item.serialOrImei}
                            </span>
                          )}
                          {item.customerName && (
                            <span className="text-slate-500 text-[11px]">
                              ({t('suppliers.returnsTab.customer')}: {item.customerName})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Defect Description & Diagnosis (4 cols) */}
                      <div className="lg:col-span-4 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>{t('suppliers.returnsTab.defect')}: {item.defectCategory.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          "{item.defectDescription}"
                        </p>
                      </div>

                      {/* Financial Claim & Resolution (3 cols) */}
                      <div className="lg:col-span-3 text-left lg:text-right space-y-1">
                        <div className="text-[11px] text-slate-400">{t('suppliers.returnsTab.claimValue')}:</div>
                        <div className="text-base font-bold font-mono text-amber-400">
                          {item.currency === 'USD' ? `$${item.totalValue.toLocaleString()}` : `${item.totalValue.toLocaleString()} IQD`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t('suppliers.returnsTab.resolution')}: <strong className="text-slate-300 capitalize">{item.requestedResolution.replace(/_/g, ' ')}</strong>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            onClick={() => handleMarkReturnDispatched(item.id, item.rmaNumber)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{t('suppliers.returnsTab.markDispatched')}</span>
                          </button>
                        )}

                        {(isPending || isDispatched) && (
                          <button
                            onClick={() => {
                              sound.playClick();
                              setSelectedReturnForResolve(item);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('suppliers.returnsTab.receiveReplacement')}</span>
                          </button>
                        )}

                        {isResolved && (
                          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('suppliers.returnsTab.claimResolved')}</span>
                            {item.replacementSerialOrImei && (
                              <span className="font-mono text-white text-[11px]">
                                (New S/N: {item.replacementSerialOrImei})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            sound.playClick();
                            setSelectedReturnForVoucher(item);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Print / WhatsApp RMA Voucher"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t('suppliers.returnsTab.voucher')}</span>
                        </button>

                        <button
                          onClick={() => {
                            sound.playClick();
                            setEditingReturnItem(item);
                            setIsCreateReturnModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title={t('suppliers.table.edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteReturn(item.id, item.rmaNumber)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title={t('suppliers.table.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* Add / Edit Supplier Drawer */}
      <AddSupplierDrawer
        isOpen={isAddSupplierDrawerOpen}
        onClose={() => setIsAddSupplierDrawerOpen(false)}
        initialData={editingSupplier}
        onSave={handleSaveSupplier}
      />

      {/* Record Payment Voucher Modal */}
      <RecordSupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        suppliers={suppliers}
        invoices={invoices}
        initialSupplier={selectedSupplierForPayment}
        initialInvoice={selectedInvoiceForPayment}
        onSavePayment={handleSavePayment}
      />

      {/* Add Supplier Invoice / Purchase Bill Modal */}
      <AddSupplierInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        suppliers={suppliers}
        initialSupplierId={selectedSupplierForInvoice}
        onSaveInvoice={handleSaveInvoice}
      />

      {/* Supplier Statement of Account / Ledger Modal */}
      <SupplierStatementModal
        isOpen={!!selectedSupplierForStatement}
        onClose={() => setSelectedSupplierForStatement(null)}
        supplier={selectedSupplierForStatement}
        onMakePayment={(sup) => {
          setSelectedSupplierForPayment(sup);
          setSelectedInvoiceForPayment(null);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* View Printable Voucher Modal */}
      <SupplierPaymentVoucherModal
        isOpen={!!selectedVoucherForView}
        onClose={() => setSelectedVoucherForView(null)}
        voucher={selectedVoucherForView}
        supplier={selectedVoucherForView ? suppliers.find(s => s.id === selectedVoucherForView.supplierId) : null}
      />

      {/* Create / Edit Defective Return Modal (RMA) */}
      <CreateSupplierReturnModal
        isOpen={isCreateReturnModalOpen}
        onClose={() => {
          setIsCreateReturnModalOpen(false);
          setEditingReturnItem(null);
        }}
        onSuccess={(saved) => {
          loadAllData();
          setSelectedReturnForVoucher(saved);
        }}
        suppliers={suppliers}
        editingReturn={editingReturnItem}
      />

      {/* Printable / Shareable RMA Return Voucher Modal */}
      <SupplierReturnVoucherModal
        isOpen={!!selectedReturnForVoucher}
        onClose={() => setSelectedReturnForVoucher(null)}
        returnItem={selectedReturnForVoucher}
        supplier={selectedReturnForVoucher ? suppliers.find(s => s.id === selectedReturnForVoucher.supplierId) : undefined}
        onStatusUpdated={(updated) => {
          loadAllData();
          setSelectedReturnForVoucher(updated);
        }}
        onOpenResolveModal={(item) => {
          setSelectedReturnForVoucher(null);
          setSelectedReturnForResolve(item);
        }}
      />

      {/* Resolve / Settle Supplier Return Modal */}
      <ResolveSupplierReturnModal
        isOpen={!!selectedReturnForResolve}
        onClose={() => setSelectedReturnForResolve(null)}
        returnItem={selectedReturnForResolve}
        onResolved={() => {
          loadAllData();
        }}
      />

      {/* Database Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
}
