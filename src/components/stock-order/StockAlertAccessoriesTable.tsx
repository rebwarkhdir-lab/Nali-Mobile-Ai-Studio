import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  PlusCircle, 
  ShoppingCart, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Zap, 
  Package, 
  Sparkles, 
  Boxes, 
  Check, 
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { StockAlert, OrderItem, AlertSeverity } from '../../types/stockOrder';
import { Accessory } from '../../types/accessory';
import { formatNumberWithCommas } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import QuickRestockItemModal from './QuickRestockItemModal';

interface Props {
  alerts: StockAlert[];
  allAccessories?: Accessory[];
  globalThreshold?: number;
  onAddSelected: (items: OrderItem[]) => void;
  onQuickRestock: (
    accessoryId: string, 
    quantityToAdd: number, 
    options?: { newBuyPrice?: number; notes?: string; supplier?: string }
  ) => Promise<{ success: boolean; newQuantity: number }>;
  onUpdateThreshold?: (accessoryId: string, newThreshold: number) => Promise<boolean>;
  onOpenManualModal?: () => void;
}

type TabFilter = 'all_under_stock' | 'out_of_stock' | 'critical' | 'low' | 'all_catalog';
type SortOption = 'urgency' | 'deficit_desc' | 'name_asc' | 'cost_desc';

export default function StockAlertAccessoriesTable({
  alerts,
  allAccessories = [],
  globalThreshold = 3,
  onAddSelected,
  onQuickRestock,
  onUpdateThreshold,
  onOpenManualModal
}: Props) {
  const { success, info } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabFilter>('all_under_stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('urgency');

  // Modal for individual quick restock
  const [quickRestockItem, setQuickRestockItem] = useState<StockAlert | null>(null);

  // Modal or prompt for threshold editing
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [tempThreshold, setTempThreshold] = useState<number>(3);

  // Convert all accessories to StockAlert format when "all_catalog" is selected
  const fullCatalogAlerts = useMemo(() => {
    if (activeTab !== 'all_catalog') return [];

    return allAccessories.map(acc => {
      const threshold = acc.notifyThreshold && acc.notifyThreshold > 0 
        ? acc.notifyThreshold 
        : globalThreshold;
      const currentStock = Number(acc.quantity) || 0;
      let severity: AlertSeverity = 'healthy';
      if (currentStock === 0) severity = 'out_of_stock';
      else if (currentStock <= Math.max(1, Math.floor(threshold / 2))) severity = 'critical';
      else if (currentStock <= threshold) severity = 'low';

      const deficit = Math.max(0, threshold - currentStock);
      const suggestedRestock = Math.max(5, (threshold * 3) - currentStock);

      return {
        id: acc.id,
        accessoryId: acc.id,
        name: acc.name,
        brand: acc.brand || '',
        sku: acc.barcode || acc.sku || '',
        barcode: acc.barcode || '',
        category: acc.category || 'General',
        currentStock,
        alertThreshold: threshold,
        deficit,
        suggestedRestock,
        supplier: acc.company || 'Thomas Walkers',
        estimatedCost: Number(acc.buyPrice) || 0,
        currency: acc.currency || 'USD',
        severity,
        image: acc.image,
        isDefectiveFlag: false
      } as StockAlert;
    });
  }, [allAccessories, activeTab, globalThreshold]);

  // Base list depending on tab
  const baseItems = (activeTab === 'all_catalog' ? fullCatalogAlerts : alerts) || [];

  // Compute counts for tabs
  const tabCounts = useMemo(() => {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const safeAllAccessories = Array.isArray(allAccessories) ? allAccessories : [];
    const outOfStock = safeAlerts.filter(i => i.severity === 'out_of_stock').length;
    const critical = safeAlerts.filter(i => i.severity === 'critical').length;
    const low = safeAlerts.filter(i => i.severity === 'low').length;
    const totalUnder = safeAlerts?.length || 0;
    const totalCatalog = safeAllAccessories?.length || 0;

    return { totalUnder, outOfStock, critical, low, totalCatalog };
  }, [alerts, allAccessories]);

  // Unique categories and suppliers for dropdowns
  const categories = useMemo(() => {
    const set = new Set<string>();
    (baseItems || []).forEach(i => { if (i?.category) set.add(i.category); });
    return Array.from(set).sort();
  }, [baseItems]);

  const suppliers = useMemo(() => {
    const set = new Set<string>();
    (baseItems || []).forEach(i => { if (i?.supplier) set.add(i.supplier); });
    return Array.from(set).sort();
  }, [baseItems]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return baseItems.filter(item => {
      // Tab filter
      if (activeTab === 'out_of_stock' && item.severity !== 'out_of_stock') return false;
      if (activeTab === 'critical' && item.severity !== 'critical') return false;
      if (activeTab === 'low' && item.severity !== 'low') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchSupplier = item.supplier.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBrand && !matchCategory && !matchSupplier) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Supplier filter
      if (supplierFilter !== 'all' && item.supplier !== supplierFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') {
        const order: Record<AlertSeverity, number> = { out_of_stock: 0, critical: 1, low: 2, healthy: 3 };
        if (order[a.severity] !== order[b.severity]) {
          return order[a.severity] - order[b.severity];
        }
        return a.currentStock - b.currentStock;
      }
      if (sortBy === 'deficit_desc') {
        return b.deficit - a.deficit;
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'cost_desc') {
        return (b.suggestedRestock * b.estimatedCost) - (a.suggestedRestock * a.estimatedCost);
      }
      return 0;
    });
  }, [baseItems, activeTab, searchQuery, categoryFilter, supplierFilter, sortBy]);

  // Checkbox handlers
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === (filteredItems?.length || 0)) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((filteredItems || []).map(i => i.id)));
    }
  };

  // Add selected to active order
  const handleAddSelectedToOrder = () => {
    if (selectedIds.size === 0) return;
    sound.playClick();

    const selectedList = (filteredItems || []).filter(i => selectedIds.has(i.id));
    const itemsToAdd: OrderItem[] = selectedList.map(item => ({
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

    onAddSelected(itemsToAdd);
    success(`Added ${itemsToAdd?.length || 0} products to active purchase order`);
    setSelectedIds(new Set());
  };

  const handleSaveThreshold = async (accessoryId: string) => {
    if (!onUpdateThreshold) return;
    await onUpdateThreshold(accessoryId, tempThreshold);
    setEditingThresholdId(null);
  };

  return (
    <div className="bg-[#101524] rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden">
      
      {/* 1. Filter Tabs Bar */}
      <div className="p-3 sm:p-4 bg-[#0d121f] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => { sound.playClick(); setActiveTab('all_under_stock'); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'all_under_stock'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <span>All Under Stock</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200">
              {tabCounts.totalUnder}
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('out_of_stock'); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Out of Stock</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300">
              {tabCounts.outOfStock}
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('critical'); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'critical'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <span>Critical</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200">
              {tabCounts.critical}
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('low'); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'low'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <span>Low Stock</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-yellow-500/30 text-yellow-200">
              {tabCounts.low}
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('all_catalog'); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'all_catalog'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <Boxes className="w-3 h-3" />
            <span>All Catalog</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {tabCounts.totalCatalog}
            </span>
          </button>
        </div>

        {/* Global Action: Add Order Manually button */}
        {onOpenManualModal && (
          <button
            onClick={onOpenManualModal}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Item Manually</span>
          </button>
        )}
      </div>

      {/* 2. Controls: Search, Dropdowns, Sort & Bulk Actions */}
      <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, brand, supplier..."
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & Sorters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          {(categories?.length || 0) > 0 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Categories ({categories?.length || 0})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {/* Supplier Filter */}
          {(suppliers?.length || 0) > 0 && (
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Suppliers ({suppliers?.length || 0})</option>
              {suppliers.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="urgency">Sort: Most Urgent (Stock Low)</option>
            <option value="deficit_desc">Sort: Highest Deficit</option>
            <option value="name_asc">Sort: Product Name A-Z</option>
            <option value="cost_desc">Sort: Highest Estimated Cost</option>
          </select>
        </div>
      </div>

      {/* 3. Bulk Selection Floating Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-950/80 border-b border-indigo-500/30 px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs text-indigo-200">
            <span className="font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-md">
              {selectedIds.size}
            </span>
            <span>products selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Deselect All
            </button>
            {/* Removed bulk add to active order as it's no longer used */}
          </div>
        </div>
      )}

      {/* 4. Products Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <th className="px-3.5 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size === (filteredItems?.length || 0) && (filteredItems?.length || 0) > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                />
              </th>
              <th className="px-3 py-3">Product Name & Category</th>
              <th className="px-3 py-3">SKU / Barcode</th>
              <th className="px-3 py-3">Stock & Alert Level</th>
              <th className="px-3 py-3 text-center">Deficit</th>
              <th className="px-3 py-3">Suggested Restock</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Unit Cost</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {(filteredItems?.length || 0) === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">No matching under-stock products</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery || categoryFilter !== 'all' || supplierFilter !== 'all'
                        ? 'Try clearing your search or filters to see more results.'
                        : 'Your inventory levels are healthy! You can view all catalog items or add new products manually.'}
                    </p>
                    {activeTab !== 'all_catalog' && (
                      <button
                        onClick={() => setActiveTab('all_catalog')}
                        className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
                      >
                        Browse All Catalog Items
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                const isOutOfStock = item.currentStock === 0;
                const isCritical = item.severity === 'critical';
                const isLow = item.severity === 'low';

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-950/20' : ''
                    } ${isOutOfStock ? 'bg-rose-950/10' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3.5 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </td>

                    {/* Product Name & Category */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100 truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            {item.brand && <span className="text-slate-300">{item.brand}</span>}
                            {item.brand && <span>•</span>}
                            <span>{item.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU / Barcode */}
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                      {item.barcode || item.sku || <span className="text-slate-600">-</span>}
                    </td>

                    {/* Stock Status & Level Gauge */}
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              0 Out of Stock
                            </span>
                          ) : isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              {item.currentStock} Critical
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              {item.currentStock} Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {item.currentStock} In Stock
                            </span>
                          )}

                          {/* Threshold click/edit */}
                          {editingThresholdId === item.accessoryId ? (
                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md p-0.5">
                              <input
                                type="number"
                                min="0"
                                value={tempThreshold}
                                onChange={e => setTempThreshold(parseInt(e.target.value) || 0)}
                                className="w-10 bg-transparent text-center font-mono text-[11px] text-white focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveThreshold(item.accessoryId)}
                                className="text-emerald-400 hover:text-emerald-300 p-0.5"
                                title="Save"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingThresholdId(null)}
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingThresholdId(item.accessoryId);
                                setTempThreshold(item.alertThreshold);
                              }}
                              className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                              title="Click to adjust threshold in Supabase"
                            >
                              <span>(Min: {item.alertThreshold})</span>
                            </button>
                          )}
                        </div>

                        {/* Visual stock progress bar */}
                        <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              isOutOfStock ? 'bg-rose-500' : isCritical ? 'bg-amber-500' : isLow ? 'bg-yellow-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.round((item.currentStock / Math.max(1, item.alertThreshold * 2)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Deficit units */}
                    <td className="px-3 py-3 text-center">
                      {item.deficit > 0 ? (
                        <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          -{item.deficit}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>

                    {/* Suggested Restock */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-mono font-bold text-indigo-300 text-sm">
                          +{item.suggestedRestock}
                        </span>
                        <span className="text-[10px] text-slate-500">units</span>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="px-3 py-3">
                      <span className="text-slate-300 truncate max-w-[120px] block" title={item.supplier}>
                        {item.supplier || 'Direct'}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="px-3 py-3 font-mono text-slate-300">
                      {item.currency === 'USD' ? '$' : ''}{formatNumberWithCommas(item.estimatedCost)}{item.currency === 'IQD' ? ' د.ع' : ''}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Instant Quick Restock to Supabase */}
                        <button
                          onClick={() => {
                            sound.playClick();
                            setQuickRestockItem(item);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1 shadow-sm"
                          title="Instant Direct Restock to Supabase"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden sm:inline">Receive / Quick Restock</span>
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

      {/* 5. Table Footer: summary of current view */}
      <div className="p-3 bg-slate-900/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <span className="font-bold text-white">{filteredItems?.length || 0}</span> of {baseItems?.length || 0} products
        </div>
        <div className="flex items-center gap-3">
          <span>Global Threshold: <strong className="text-slate-200">{globalThreshold} units</strong></span>
        </div>
      </div>

      {/* Quick Restock Modal */}
      <QuickRestockItemModal
        isOpen={Boolean(quickRestockItem)}
        onClose={() => setQuickRestockItem(null)}
        item={quickRestockItem}
        onRestock={onQuickRestock}
      />
    </div>
  );
}
