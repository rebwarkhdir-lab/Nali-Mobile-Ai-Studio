import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PackageSearch, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  PackageX, 
  Boxes, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  SlidersHorizontal,
  CloudCheck
} from 'lucide-react';
import StockAlertAccessoriesTable from '../components/stock-order/StockAlertAccessoriesTable';
import ActiveOrderSummary from '../components/stock-order/ActiveOrderSummary';
import ManualOrderModal from '../components/stock-order/ManualOrderModal';
import { useStockOrderManager } from '../hooks/useStockOrderManager';
import { Accessory } from '../types/accessory';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/common/Toast';
import { idb } from '../lib/idbService';
import { useDesignSystem } from '../context/DesignContext';
import { formatNumberWithCommas } from '../lib/utils';
import { sound } from '../lib/sound';

import { useNavigate } from 'react-router';

export default function RestockAlerts() {
  const navigate = useNavigate();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { success, error: toastError } = useToast();
  const { settings } = useDesignSystem();
  
  const globalThreshold = settings?.lowStockThreshold && settings.lowStockThreshold > 0 
    ? settings.lowStockThreshold 
    : 3;

  // Load accessories from local cache and Supabase
  const fetchAccessories = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    try {
      // 1. Fast load from local IndexedDB first
      const idbData = await idb.getAll<Accessory>('accessories');
      if (Array.isArray(idbData) && idbData.length > 0) {
        setAccessories(idbData);
      }

      // Also check localStorage cache fallback
      const cached = localStorage.getItem('nali_accessories_cache');
      if (cached && (!idbData || (idbData?.length || 0) === 0)) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAccessories(parsed);
          }
        } catch {}
      }

      // 2. Fetch fresh data from Supabase
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('nali_accessories')
          .select('id, name, brand, category, subCategory, quantity, alertThreshold, buyPrice, sellPrice, currency, barcode, supplier, sku, status, createdAt, updatedAt')
          .order('quantity', { ascending: true });

        if (error) {
          if (error.code !== 'PGRST205') {
            console.warn('Supabase fetch error:', error);
          }
        } else if (data && Array.isArray(data)) {
          setAccessories(data as unknown as Accessory[]);
          // Safely merge with IDB to preserve existing images
          try {
            const existingList = (await idb.getAll<Accessory>('accessories')) || [];
            const existingMap = new Map(existingList.map(a => [a.id, a]));
            const merged = data.map(item => {
              const existing = existingMap.get(item.id);
              return existing ? { ...existing, ...item } : item;
            });
            await idb.bulkPut('accessories', merged);
            localStorage.setItem('nali_accessories_cache', JSON.stringify(merged));
          } catch (storageErr) {
            console.warn('RestockAlerts storage merge error:', storageErr);
          }

          if (isManualRefresh) {
            sound.playSuccess();
            success('Inventory refreshed from Supabase Cloud');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load accessories:', err);
      if (isManualRefresh) {
        toastError('Failed to refresh from database');
      }
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [success, toastError]);

  useEffect(() => {
    fetchAccessories(false);

    // Subscribe to internal update events
    const handleUpdate = () => fetchAccessories(false);
    window.addEventListener('accessories_updated', handleUpdate);
    window.addEventListener('supabase_data_reload', handleUpdate);

    return () => {
      window.removeEventListener('accessories_updated', handleUpdate);
      window.removeEventListener('supabase_data_reload', handleUpdate);
    };
  }, [fetchAccessories]);

  const manager = useStockOrderManager(accessories, globalThreshold);

  // Quick Action: Add all under-stock items to order draft
  const handleAddAllUnderStockToOrder = () => {
    if ((manager.alertItems?.length || 0) === 0) return;
    sound.playClick();
    
    const itemsToAdd = (manager.alertItems || []).map(item => ({
      id: item.id,
      accessoryId: item.accessoryId,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      brand: item.brand,
      category: item.category,
      quantity: item.suggestedRestock,
      unitCost: item.estimatedCost,
      currency: item.currency,
      supplier: item.supplier,
      currentStock: item.currentStock,
      alertThreshold: item.alertThreshold,
      image: item.image,
      isCustom: false
    }));

    manager.addMultipleToOrder(itemsToAdd);
    success(`Added all ${(itemsToAdd?.length || 0)} under-stock products to purchase order`);
  };

  const handleQuickRestock = async (accessoryId: string, quantityToAdd: number, options?: any) => {
    const result = await manager.quickRestockItem(accessoryId, quantityToAdd, options);
    if (result.success) {
      setTimeout(() => {
        navigate(`/accessories`, { state: { editAccessoryId: accessoryId } });
      }, 300);
    }
    return result;
  };

  const combinedAlerts = useMemo(() => {
    const list = [...manager.alertItems];
    manager.activeOrderItems.forEach(item => {
      const exists = list.find(i => i.accessoryId === item.accessoryId || i.id === item.id);
      if (!exists) {
        list.push({
          id: item.id,
          accessoryId: item.accessoryId || item.id,
          name: item.name,
          brand: item.brand || '',
          sku: item.sku || '',
          barcode: item.barcode || '',
          category: item.category || '',
          currentStock: item.currentStock || 0,
          alertThreshold: item.alertThreshold || globalThreshold,
          deficit: 0,
          suggestedRestock: item.quantity,
          supplier: item.supplier || '',
          estimatedCost: item.unitCost || 0,
          currency: item.currency || 'USD',
          severity: 'healthy',
          image: item.image,
          isDefectiveFlag: false
        });
      }
    });
    return list;
  }, [manager.alertItems, manager.activeOrderItems, globalThreshold]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Restock & Stock Alerts
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Supabase Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor low stock quantities, deficit levels, and instantly restock or build purchase orders.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchAccessories(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-colors shadow-sm disabled:opacity-50"
            title="Sync latest inventory from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Quick Add All Under Stock */}
          {(manager.alertItems?.length || 0) > 0 && (
            <button
              onClick={handleAddAllUnderStockToOrder}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              title="Add all under stock items to order at once"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Order All Under Stock ({manager.alertItems?.length || 0})</span>
            </button>
          )}

          {/* Add Order Item Manually */}
          <button
            onClick={() => { sound.playClick(); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item Manually</span>
          </button>
        </div>
      </div>

      {/* Smart Metrics Dashboard Banner (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Total Under Stock */}
        <div className="bg-[#101524] p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Under Stock</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {manager.stats.totalUnderStock}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Items at or below safety threshold ({globalThreshold} units)
            </p>
          </div>
        </div>

        {/* Metric 2: Zero Stock / Out of Stock */}
        <div className="bg-[#101524] p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Out of Stock</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black font-mono tracking-tight ${
              manager.stats.outOfStockCount > 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {manager.stats.outOfStockCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Items with 0 units requiring urgent replenishment
            </p>
          </div>
        </div>

        {/* Metric 3: Total Deficit Shortage Units */}
        <div className="bg-[#101524] p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inventory Shortage Deficit</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-indigo-300 font-mono tracking-tight">
              -{manager.stats.totalDeficitUnits} <span className="text-xs font-normal text-slate-400">units</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Physical deficit to reach safe threshold levels
            </p>
          </div>
        </div>

        {/* Metric 4: Estimated Restock Capital */}
        <div className="bg-[#101524] p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Est. Restock Capital</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-400 font-mono tracking-tight truncate">
              {manager.stats.estCostUSD > 0 && `$${formatNumberWithCommas(Math.round(manager.stats.estCostUSD))}`}
              {manager.stats.estCostUSD > 0 && manager.stats.estCostIQD > 0 && ' + '}
              {manager.stats.estCostIQD > 0 && `${formatNumberWithCommas(Math.round(manager.stats.estCostIQD))} د.ع`}
              {manager.stats.estCostUSD === 0 && manager.stats.estCostIQD === 0 && '$0'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Capital needed to replenish all suggested quantities
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Table Only */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Full Width: Under Stock Table */}
        <div className="lg:col-span-12 space-y-6">
          <StockAlertAccessoriesTable 
            alerts={combinedAlerts} 
            allAccessories={accessories}
            globalThreshold={globalThreshold}
            onAddSelected={manager.addMultipleToOrder}
            onQuickRestock={handleQuickRestock}
            onUpdateThreshold={manager.updateThreshold}
            onOpenManualModal={() => setIsModalOpen(true)}
          />
        </div>
      </div>

      {/* Manual Order & Restock Modal */}
      <ManualOrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={manager.addToOrder}
        onDirectRestock={manager.quickRestockItem}
        catalog={accessories}
        globalThreshold={globalThreshold}
      />
    </div>
  );
}
