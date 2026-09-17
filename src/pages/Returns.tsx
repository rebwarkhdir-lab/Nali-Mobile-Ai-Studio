import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {  
  ShieldAlert, 
  Plus, 
  Search, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Building2, 
  FileText, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Phone,
  Package,
  X,
  Copy,
  Check,
  DollarSign,
  Filter,
  Smartphone,
  Headphones,
  Layers,
  MessageCircle,
  RotateCcw,
  CheckCheck,
  CreditCard,
  Database
} from 'lucide-react';
import { SupplierReturnItem, ReturnItemType } from '../types/supplierReturn';
import { Supplier } from '../types/supplier';
import { supplierService } from '../lib/supplierService';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';
import { SearchInput } from '../components/common/SearchInput';
import { cn } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CloudStatusBadge } from '../components/common/CloudStatusBadge';
import MigrationModal from '../components/common/MigrationModal';

import CreateSupplierReturnModal from '../components/suppliers/CreateSupplierReturnModal';
import SupplierReturnVoucherModal from '../components/suppliers/SupplierReturnVoucherModal';
import ResolveSupplierReturnModal from '../components/suppliers/ResolveSupplierReturnModal';

type TabType = 'all' | 'in_shop' | 'with_supplier' | 'resolved' | 'refunds';

export default function Returns() {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [returns, setReturns] = useState<SupplierReturnItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedItemType, setSelectedItemType] = useState<string>('all');

  // Interaction feedback states
  const [copiedImeiId, setCopiedImeiId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierReturnItem | null>(null);
  const [selectedVoucherItem, setSelectedVoucherItem] = useState<SupplierReturnItem | null>(null);
  const [selectedResolveItem, setSelectedResolveItem] = useState<SupplierReturnItem | null>(null);

  const loadData = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const [allReturns, allSuppliers] = await Promise.all([
        supplierService.getAllReturns(),
        supplierService.getAllSuppliers()
      ]);
      setReturns(Array.isArray(allReturns) ? allReturns : []);
      setSuppliers(Array.isArray(allSuppliers) ? allSuppliers : []);
    } catch (err) {
      console.error('Failed to load RMA returns:', err);
      if (!silent) toastError(t('returnsPage.actions.loadError', 'Could not load return records'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('public:returns_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_supplier_returns_data' }, () => {
        loadData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_returns' }, (payload) => {
        console.log('Realtime update on supplier_returns table:', payload.eventType);
        loadData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        loadData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Financial and status metrics
  const stats = useMemo(() => {
    const safeReturns = Array.isArray(returns) ? returns : [];
    const totalCount = safeReturns?.length || 0;
    const inShop = safeReturns.filter(r => r.status === 'pending_dispatch');
    const withSupplier = safeReturns.filter(r => r.status === 'dispatched');
    const replaced = safeReturns.filter(r => r.status === 'received_replacement');
    const refunds = safeReturns.filter(r => ['refunded_cash', 'credited_to_account'].includes(r.status));
    const resolved = safeReturns.filter(r => ['received_replacement', 'refunded_cash', 'credited_to_account'].includes(r.status));

    // Valuation
    const totalClaimUSD = safeReturns.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.totalValue || 0), 0);
    const totalClaimIQD = safeReturns.filter(r => r.currency === 'IQD').reduce((s, r) => s + (r.totalValue || 0), 0);

    const recoveredUSD = resolved.reduce((acc, r) => {
      const cur = r.refundCurrency || r.currency;
      if (cur === 'USD') return acc + (r.refundAmount || r.totalValue || 0);
      return acc;
    }, 0);

    const recoveredIQD = resolved.reduce((acc, r) => {
      const cur = r.refundCurrency || r.currency;
      if (cur === 'IQD') return acc + (r.refundAmount || r.totalValue || 0);
      return acc;
    }, 0);

    return {
      totalCount,
      inShopCount: (inShop?.length || 0),
      withSupplierCount: (withSupplier?.length || 0),
      replacedCount: (replaced?.length || 0),
      refundsCount: (refunds?.length || 0),
      resolvedCount: (resolved?.length || 0),
      totalClaimUSD,
      totalClaimIQD,
      recoveredUSD,
      recoveredIQD
    };
  }, [returns]);

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return (returns || []).filter(item => {
      // Tab filter
      if (activeTab === 'in_shop' && item.status !== 'pending_dispatch') return false;
      if (activeTab === 'with_supplier' && item.status !== 'dispatched') return false;
      if (activeTab === 'resolved' && !['received_replacement', 'refunded_cash', 'credited_to_account'].includes(item.status)) return false;
      if (activeTab === 'refunds' && !['refunded_cash', 'credited_to_account'].includes(item.status)) return false;

      // Supplier dropdown
      if (selectedSupplier !== 'all' && item.supplierId !== selectedSupplier) return false;

      // Priority dropdown
      if (selectedPriority !== 'all' && (item.priority || 'normal') !== selectedPriority) return false;

      // Item type dropdown
      if (selectedItemType !== 'all' && item.itemType !== selectedItemType) return false;

      // Search query
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        item.rmaNumber.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.supplierName.toLowerCase().includes(q) ||
        (item.serialOrImei && item.serialOrImei.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.customerPhone && item.customerPhone.includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q)) ||
        (item.defectDescription && item.defectDescription.toLowerCase().includes(q)) ||
        (item.invoiceRef && item.invoiceRef.toLowerCase().includes(q))
      );
    });
  }, [returns, activeTab, searchTerm, selectedSupplier, selectedPriority, selectedItemType]);

  const hasActiveFilters = searchTerm !== '' || selectedSupplier !== 'all' || selectedPriority !== 'all' || selectedItemType !== 'all';

  const resetFilters = () => {
    sound.playClick();
    setSearchTerm('');
    setSelectedSupplier('all');
    setSelectedPriority('all');
    setSelectedItemType('all');
  };

  // Currency Formatter
  const formatCurrency = (val: number, currency: 'USD' | 'IQD') => {
    if (currency === 'USD') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return `${val.toLocaleString()} IQD`;
  };

  // Date Formatter
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(isKu ? 'ku' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Copy IMEI
  const handleCopyImei = (id: string, text: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedImeiId(id);
    success(t('returnsPage.actions.imeiCopied', 'IMEI copied to clipboard'));
    setTimeout(() => setCopiedImeiId(null), 2000);
  };

  // Copy full summary
  const handleCopyDetails = (item: SupplierReturnItem) => {
    sound.playClick();
    const text = [
      `📋 ${t('returnsPage.cards.rmaBadge', 'RMA')}: ${item.rmaNumber}`,
      `📦 ${item.itemName} (${item.brand})`,
      item.serialOrImei ? `🔢 ${t('returnsPage.cards.imeiSn', 'IMEI/SN')}: ${item.serialOrImei}` : null,
      `🏢 ${t('returnsPage.cards.supplier', 'Supplier')}: ${item.supplierName}`,
      `⚠️ ${t('returnsPage.cards.defect', 'Defect')}: ${item.defectDescription}`,
      `💰 ${t('returnsPage.cards.claimValue', 'Value')}: ${formatCurrency(item.totalValue, item.currency)}`,
      `⚙️ ${t('returnsPage.cards.expectedSettlement', 'Expected')}: ${item.requestedResolution === 'replacement' ? t('returnsPage.cards.replacementUnit', 'New Replacement Unit') : t('returnsPage.cards.cashRefund', 'Cash Refund')}`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    success(t('returnsPage.actions.copied', 'RMA details copied to clipboard'));
  };

  // Hand over to supplier in 1 click
  const handleHandOverToSupplier = async (item: SupplierReturnItem) => {
    setActionLoadingId(item.id);
    try {
      sound.playSuccess();
      await supplierService.updateReturnStatus(item.id, {
        status: 'dispatched',
        dispatchedAt: new Date().toISOString()
      });
      success(t('returnsPage.actions.handOverSuccess', { rma: item.rmaNumber }));
      await loadData();
    } catch (e) {
      console.error(e);
      toastError(t('returnsPage.actions.updateError', 'Failed to update return status'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete return
  const handleDeleteReturn = async (id: string, rmaNumber: string) => {
    const confirmMsg = t('returnsPage.actions.deleteConfirm', { rma: rmaNumber });
    if (!confirm(confirmMsg)) return;

    try {
      sound.playAlert();
      await supplierService.deleteReturn(id);
      success(t('returnsPage.actions.deleteSuccess', { rma: rmaNumber }));
      await loadData();
    } catch (e) {
      console.error(e);
      toastError(t('returnsPage.actions.deleteError', 'Failed to delete return record'));
    }
  };

  // WhatsApp Supplier
  const handleWhatsAppSupplier = (item: SupplierReturnItem) => {
    sound.playClick();
    const supplier = suppliers.find(s => s.id === item.supplierId);
    const phone = (supplier?.phone || item.supplierPhone || '').replace(/[^0-9]/g, '');

    const message = [
      `*${t('suppliers.returnVoucherModal.company', 'NALI MOBILE')} - ${t('returnsPage.cards.rmaBadge', 'RMA')}: ${item.rmaNumber}*`,
      `${t('suppliers.returnVoucherModal.item', 'Item')}: ${item.itemName} (${item.brand})`,
      item.serialOrImei ? `${t('suppliers.returnVoucherModal.imei', 'IMEI/SN')}: ${item.serialOrImei}` : null,
      `${t('returnsPage.cards.defect', 'Problem')}: ${item.defectDescription}`,
      `${t('returnsPage.cards.claimValue', 'Value')}: ${formatCurrency(item.totalValue, item.currency)}`,
      `${t('returnsPage.cards.expectedSettlement', 'Resolution')}: ${item.requestedResolution === 'replacement' ? t('returnsPage.cards.replacementUnit', 'New Replacement Unit') : t('returnsPage.cards.cashRefund', 'Cash Refund')}`
    ].filter(Boolean).join('\n');

    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Helper for type icons
  const renderItemTypeIcon = (type: ReturnItemType) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-indigo-400" />;
      case 'accessory':
        return <Headphones className="w-3.5 h-3.5 text-amber-400" />;
      case 'screen_protector':
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Package className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div dir={isKu ? 'rtl' : 'ltr'} className={cn("space-y-6 max-w-7xl mx-auto pb-12", isKu && "text-right")}>
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#121729] via-[#101426] to-[#0c101d] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl shadow-inner shadow-amber-500/10">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{t('returnsPage.title', 'Returns & Refunds (Warranty RMA)')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t('returnsPage.subtitle', 'Track defective devices and accessories returned to suppliers for warranty replacement or cash refund')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={() => {
              sound.playClick();
              setIsMigrationModalOpen(true);
            }}
            className="px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-300 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Database Schema & SQL Migration"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">SQL Migration</span>
          </button>

          <CloudStatusBadge
            onRefresh={() => loadData(false)}
            tableName="supplier_returns"
            isRefreshing={loading}
          />

          <button
            onClick={() => {
              sound.playClick();
              setEditingItem(null);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('returnsPage.logReturn', 'Log Defective Return')}</span>
          </button>
        </div>
      </div>

      {/* Smart KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Metric 1: Total Claims */}
        <div className="bg-[#121729] border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('returnsPage.stats.totalTickets', 'Total Claims')}
            </span>
            <div className="p-2 rounded-xl bg-slate-800/80 text-slate-300">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-white">
              {stats.totalCount}
            </div>
            <div className="text-[11px] font-mono text-amber-400/90 font-medium mt-0.5 truncate">
              {stats.totalClaimUSD > 0 && formatCurrency(stats.totalClaimUSD, 'USD')}
              {stats.totalClaimUSD > 0 && stats.totalClaimIQD > 0 && ' • '}
              {stats.totalClaimIQD > 0 && formatCurrency(stats.totalClaimIQD, 'IQD')}
              {stats.totalClaimUSD === 0 && stats.totalClaimIQD === 0 && '$0'}
            </div>
          </div>
        </div>

        {/* Metric 2: In Shop Quarantine */}
        <div className="bg-[#121729] border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              {t('returnsPage.stats.inShop', 'In Shop Quarantine')}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-amber-400">
              {stats.inShopCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {t('returnsPage.stats.inShopDesc', 'Awaiting courier pickup')}
            </div>
          </div>
        </div>

        {/* Metric 3: With Supplier */}
        <div className="bg-[#121729] border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              {t('returnsPage.stats.withSupplier', 'With Supplier')}
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-blue-400">
              {stats.withSupplierCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {t('returnsPage.stats.withSupplierDesc', 'Under warranty inspection')}
            </div>
          </div>
        </div>

        {/* Metric 4: Replacements Received */}
        <div className="bg-[#121729] border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              {t('returnsPage.stats.replacements', 'Units Replaced')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-400">
              {stats.replacedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {t('returnsPage.stats.replacementsDesc', 'Restocked replacement units')}
            </div>
          </div>
        </div>

        {/* Metric 5: Refunds & Credits */}
        <div className="col-span-2 sm:col-span-1 bg-[#121729] border border-indigo-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              {t('returnsPage.stats.refundsAndCredits', 'Refunds & Credits')}
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-indigo-400">
              {stats.refundsCount}
            </div>
            <div className="text-[11px] font-mono text-amber-400 font-semibold mt-0.5 truncate">
              {stats.recoveredUSD > 0 && formatCurrency(stats.recoveredUSD, 'USD')}
              {stats.recoveredUSD > 0 && stats.recoveredIQD > 0 && ' • '}
              {stats.recoveredIQD > 0 && formatCurrency(stats.recoveredIQD, 'IQD')}
              {stats.recoveredUSD === 0 && stats.recoveredIQD === 0 && t('returnsPage.stats.refundsAndCreditsDesc', 'Cash & debt deductions')}
            </div>
          </div>
        </div>

      </div>

      {/* Tabs & Filters Bar */}
      <div className="space-y-3 bg-[#121729] border border-slate-800 rounded-3xl p-4 shadow-md">
        
        {/* Status Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-2xl">
            {/* All */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('all');
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === 'all'
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>{t('returnsPage.tabs.all', 'All Records')}</span>
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === 'all' ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-300"
              )}>
                {stats.totalCount}
              </span>
            </button>

            {/* In Shop */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('in_shop');
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === 'in_shop'
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>📦 {t('returnsPage.tabs.inShop', 'In Shop')}</span>
              {stats.inShopCount > 0 && (
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === 'in_shop' ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-300"
                )}>
                  {stats.inShopCount}
                </span>
              )}
            </button>

            {/* With Supplier */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('with_supplier');
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === 'with_supplier'
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>🚚 {t('returnsPage.tabs.withSupplier', 'With Supplier')}</span>
              {stats.withSupplierCount > 0 && (
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === 'with_supplier' ? "bg-slate-950 text-amber-400" : "bg-blue-500/20 text-blue-300"
                )}>
                  {stats.withSupplierCount}
                </span>
              )}
            </button>

            {/* Resolved */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('resolved');
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === 'resolved'
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>✅ {t('returnsPage.tabs.resolved', 'Resolved')}</span>
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === 'resolved' ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-300"
              )}>
                {stats.resolvedCount}
              </span>
            </button>

            {/* Cash Refunds & Debt Credits */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('refunds');
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === 'refunds'
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>💵 {t('returnsPage.tabs.refunds', 'Refunds & Credits')}</span>
              {stats.refundsCount > 0 && (
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === 'refunds' ? "bg-slate-950 text-amber-400" : "bg-indigo-500/20 text-indigo-300"
                )}>
                  {stats.refundsCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Count Indicator */}
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            {t('common.showing', 'Showing')}: <strong className="text-white font-bold">{filteredReturns?.length || 0}</strong> / {returns?.length || 0}
          </div>

        </div>

        {/* Filter Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800/80">
          
          {/* Search Box */}
          <div className="md:col-span-5">
            <SearchInput
              value={searchTerm}
              onChangeValue={setSearchTerm}
              placeholder={t('returnsPage.filters.searchPlaceholder', 'Search by Model, IMEI, Brand, Supplier, Customer, RMA #...')}
              size="sm"
            />
          </div>

          {/* Supplier Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedSupplier}
              onChange={(e) => {
                sound.playClick();
                setSelectedSupplier(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">{t('returnsPage.filters.allSuppliers', 'All Suppliers')}</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedItemType}
              onChange={(e) => {
                sound.playClick();
                setSelectedItemType(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">{t('returnsPage.filters.allTypes', 'All Categories')}</option>
              <option value="mobile">{t('returnsPage.filters.typeMobiles', 'Mobile Devices')}</option>
              <option value="accessory">{t('returnsPage.filters.typeAccessories', 'Accessories')}</option>
              <option value="screen_protector">{t('returnsPage.filters.typeScreenProtectors', 'Screen Protectors')}</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <select
              value={selectedPriority}
              onChange={(e) => {
                sound.playClick();
                setSelectedPriority(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">{t('returnsPage.filters.allPriorities', 'All Priorities')}</option>
              <option value="urgent">{t('returnsPage.filters.priorityUrgent', 'Urgent')}</option>
              <option value="high">{t('returnsPage.filters.priorityHigh', 'High Priority')}</option>
              <option value="normal">{t('returnsPage.filters.priorityNormal', 'Normal Priority')}</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title={t('returnsPage.filters.clearFilters', 'Clear Filters')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Return List Area */}
      {(!filteredReturns || (filteredReturns?.length || 0) === 0) ? (
        <div className="p-12 text-center bg-[#121729] border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner shadow-amber-500/15">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {t('returnsPage.empty.title', 'No Return Records Found')}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              {hasActiveFilters 
                ? t('returnsPage.empty.noMatch', 'No records match your search or filter criteria.')
                : activeTab === 'in_shop' 
                  ? t('returnsPage.empty.inShopEmpty', 'No defective items currently pending in the shop.')
                  : activeTab === 'with_supplier'
                    ? t('returnsPage.empty.withSupplierEmpty', 'No items currently with suppliers.')
                    : activeTab === 'refunds'
                      ? t('returnsPage.empty.resolvedEmpty', 'No resolved or refunded items yet.')
                      : t('returnsPage.empty.allEmpty', 'Log defective phones or accessories to easily manage warranty replacements and supplier refunds.')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {t('returnsPage.filters.clearFilters', 'Reset Filters')}
              </button>
            )}
            <button
              onClick={() => {
                sound.playClick();
                setEditingItem(null);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('returnsPage.empty.logButton', 'Log Defective Return')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReturns.map(item => {
            const isInShop = item.status === 'pending_dispatch';
            const isWithSupplier = item.status === 'dispatched';
            const isResolved = ['received_replacement', 'refunded_cash', 'credited_to_account'].includes(item.status);
            const isCopied = copiedImeiId === item.id;
            const isActionLoading = actionLoadingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-[#121729] hover:bg-[#141c33] border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 transition-all space-y-4 shadow-lg hover:shadow-xl"
              >
                {/* Header Row: RMA Badge, Supplier, Dates, Priority & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                  
                  {/* Left: RMA #, Supplier, Date */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedVoucherItem(item);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700/90 text-xs font-mono font-bold text-amber-400 hover:text-white hover:border-amber-500 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                      title={t('returnsPage.actions.slip', 'View Voucher Slip')}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.rmaNumber}</span>
                    </button>

                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.supplierName}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      • {formatDate(item.createdAt)}
                    </span>

                    {/* Priority badge */}
                    {item.priority === 'urgent' && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span>{t('returnsPage.filters.priorityUrgent', 'Urgent')}</span>
                      </span>
                    )}
                    {item.priority === 'high' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {t('returnsPage.filters.priorityHigh', 'High')}
                      </span>
                    )}
                  </div>

                  {/* Right: Status Badge */}
                  <div>
                    {isInShop && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('returnsPage.statuses.pending_dispatch', 'In Shop (Pending)')}</span>
                      </span>
                    )}
                    {isWithSupplier && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 shadow-sm">
                        <Truck className="w-3.5 h-3.5" />
                        <span>{t('returnsPage.statuses.dispatched', 'With Supplier')}</span>
                      </span>
                    )}
                    {item.status === 'received_replacement' && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('returnsPage.statuses.received_replacement', 'Unit Replaced')}</span>
                      </span>
                    )}
                    {item.status === 'refunded_cash' && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                        <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('returnsPage.statuses.refunded_cash', 'Cash Refunded')}</span>
                      </span>
                    )}
                    {item.status === 'credited_to_account' && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{t('returnsPage.statuses.credited_to_account', 'Balance Credited')}</span>
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
                        <X className="w-3.5 h-3.5" />
                        <span>{t('returnsPage.statuses.rejected', 'Warranty Rejected')}</span>
                      </span>
                    )}
                  </div>

                </div>

                {/* Details Row: Item Info (5 cols), Defect (4 cols), Valuation (3 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                  
                  {/* Item & Identification (5 cols) */}
                  <div className="md:col-span-5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                        {renderItemTypeIcon(item.itemType)}
                      </div>
                      <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        {item.itemName}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-amber-300 rounded-md font-mono font-bold">
                          x{item.quantity}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                      <span>{t('returnsPage.cards.brand', 'Brand')}: <strong className="text-slate-200">{item.brand}</strong></span>
                      {item.model && (
                        <span className="text-slate-400">
                          {t('returnsPage.cards.model', 'Model')}: <strong className="text-slate-200">{item.model}</strong>
                        </span>
                      )}
                      {item.color && (
                        <span className="text-slate-400">
                          ({item.color})
                        </span>
                      )}
                    </div>

                    {/* Serial / IMEI with click-to-copy chip */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {item.serialOrImei ? (
                        <button
                          onClick={() => handleCopyImei(item.id, item.serialOrImei!)}
                          className="font-mono text-[11px] text-amber-300 bg-slate-950 hover:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={t('returnsPage.actions.copyImei', 'Click to copy IMEI/SN')}
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                          <span>IMEI: {item.serialOrImei}</span>
                        </button>
                      ) : null}

                      {/* Customer info if logged from customer */}
                      {item.customerName && (
                        <span className="text-[11px] text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.customerName} {item.customerPhone ? `(${item.customerPhone})` : ''}</span>
                        </span>
                      )}

                      {/* Purchase invoice ref */}
                      {item.invoiceRef && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          Ref: #{item.invoiceRef}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Defect Note (4 cols) */}
                  <div className="md:col-span-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
                    <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('returnsPage.cards.defect', 'Reported Defect')}:</span>
                      {item.defectCategory && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded">
                          {t(`returnsPage.categories.${item.defectCategory}`, item.defectCategory)}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed line-clamp-2">
                      "{item.defectDescription}"
                    </p>
                  </div>

                  {/* Valuation & Expected / Settle Resolution (3 cols) */}
                  <div className={cn("md:col-span-3 space-y-1", isKu ? "text-left" : "text-right")}>
                    <div className="text-xs text-slate-400 font-medium">
                      {t('returnsPage.cards.claimValue', 'Claim Value')}:
                    </div>
                    <div className="text-lg font-black font-mono text-amber-400">
                      {formatCurrency(item.totalValue, item.currency)}
                    </div>
                    
                    {/* Expected / Actual Settlement tag */}
                    <div className={cn("flex flex-wrap gap-1 mt-1", isKu ? "justify-start" : "justify-end")}>
                      {!isResolved ? (
                        <span className="text-[11px] font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                          {item.requestedResolution === 'replacement' 
                            ? `🔄 ${t('returnsPage.cards.replacementUnit', 'Replacement Unit')}`
                            : `💵 ${t('returnsPage.cards.cashRefund', 'Cash Refund')}`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                          {item.status === 'received_replacement' && `✓ ${t('returnsPage.cards.replacementUnit', 'Replaced')}`}
                          {item.status === 'refunded_cash' && `✓ ${formatCurrency(item.refundAmount || item.totalValue, item.refundCurrency || item.currency)} ${t('returnsPage.cards.refundCollected', 'Refunded')}`}
                          {item.status === 'credited_to_account' && `✓ ${formatCurrency(item.refundAmount || item.totalValue, item.refundCurrency || item.currency)} ${t('returnsPage.cards.creditDeducted', 'Credited')}`}
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Replacement Serial details if resolved */}
                {isResolved && item.replacementSerialOrImei && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{t('returnsPage.cards.replacementImei', 'Replacement IMEI / S/N')}: <strong>{item.replacementSerialOrImei}</strong></span>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80">
                  
                  {/* Primary Workflow Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isInShop && (
                      <button
                        onClick={() => handleHandOverToSupplier(item)}
                        disabled={isActionLoading}
                        className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <Truck className={cn("w-3.5 h-3.5", isActionLoading && "animate-spin")} />
                        <span>{isActionLoading ? t('returnsPage.actions.handingOver', 'Handing Over...') : t('returnsPage.actions.handOver', 'Hand Over to Supplier')}</span>
                      </button>
                    )}

                    {(isInShop || isWithSupplier) && (
                      <button
                        onClick={() => {
                          sound.playClick();
                          setSelectedResolveItem(item);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t('returnsPage.actions.markResolved', 'Resolve Claim (Replace / Refund)')}</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Quick Utility Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* View Printable Voucher Slip */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedVoucherItem(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={t('returnsPage.actions.slip', 'Print / Share Voucher')}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('returnsPage.actions.slip', 'Slip')}</span>
                    </button>

                    {/* WhatsApp Supplier Direct */}
                    <button
                      onClick={() => handleWhatsAppSupplier(item)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                      title={t('returnsPage.actions.whatsapp', 'WhatsApp Supplier')}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Copy details */}
                    <button
                      onClick={() => handleCopyDetails(item)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all cursor-pointer"
                      title={t('returnsPage.actions.copyDetails', 'Copy Details')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        setEditingItem(item);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('returnsPage.actions.edit', 'Edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteReturn(item.id, item.rmaNumber)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title={t('returnsPage.actions.delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Log / Edit Return */}
      <CreateSupplierReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={(saved) => {
          loadData();
          setSelectedVoucherItem(saved);
        }}
        suppliers={suppliers}
        editingReturn={editingItem}
      />

      {/* Modal 2: Printable / Shareable Slip */}
      <SupplierReturnVoucherModal
        isOpen={!!selectedVoucherItem}
        onClose={() => setSelectedVoucherItem(null)}
        returnItem={selectedVoucherItem}
        supplier={selectedVoucherItem ? suppliers.find(s => s.id === selectedVoucherItem.supplierId) : undefined}
        onOpenResolveModal={(item) => {
          setSelectedVoucherItem(null);
          setSelectedResolveItem(item);
        }}
      />

      {/* Modal 3: Settle / Resolve Claim */}
      <ResolveSupplierReturnModal
        isOpen={!!selectedResolveItem}
        onClose={() => setSelectedResolveItem(null)}
        returnItem={selectedResolveItem}
        onResolved={() => {
          loadData();
        }}
      />

      {/* SQL Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />

    </div>
  );
}
