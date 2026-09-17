import React, { useState, useMemo } from 'react';
import { 
  X, 
  Package, 
  Plus, 
  Search, 
  Zap, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { OrderItem } from '../../types/stockOrder';
import { Accessory } from '../../types/accessory';
import { RestockOptions } from '../../lib/stockOrderService';
import { formatNumberWithCommas } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: OrderItem) => void;
  onDirectRestock?: (
    accessoryId: string, 
    quantityToAdd: number, 
    options?: RestockOptions
  ) => Promise<{ success: boolean; newQuantity: number }>;
  catalog: Accessory[];
  globalThreshold?: number;
}

export default function ManualOrderModal({
  isOpen,
  onClose,
  onAdd,
  onDirectRestock,
  catalog,
  globalThreshold = 3
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null);
  const [showOnlyUnderStock, setShowOnlyUnderStock] = useState(false);
  
  // Custom item state
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  
  // Shared inputs
  const [quantityStr, setQuantityStr] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isDirectRestocking, setIsDirectRestocking] = useState(false);

  const availableCategories = useMemo(() => {
    // 1. Try to load from the same localStorage options as AddAccessoryDrawer
    try {
      const saved = localStorage.getItem('nali_accessory_options_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.category) && parsed.category.length > 0) {
          // Combine local storage options with dynamic catalog categories just in case
          const cats = new Set<string>(parsed.category);
          catalog.forEach(item => {
            if (item.category && item.category.trim() !== '') {
              cats.add(item.category.trim());
            }
          });
          return Array.from(cats).sort();
        }
      }
    } catch (e) {
      console.warn('Could not load categories from localStorage:', e);
    }

    // 2. Fallback to extracting just from the catalog
    const cats = new Set<string>();
    catalog.forEach(item => {
      if (item.category && item.category.trim() !== '') {
        cats.add(item.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [catalog]);

  // Filter catalog items with current stock info
  const filteredCatalog = useMemo(() => {
    if (!isOpen) return [];
    let list = catalog;

    if (showOnlyUnderStock) {
      list = list.filter(acc => {
        const th = acc.notifyThreshold && acc.notifyThreshold > 0 ? acc.notifyThreshold : globalThreshold;
        return (Number(acc.quantity) || 0) <= th;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(a => 
        a.name.toLowerCase().includes(q) || 
        (a.barcode && a.barcode.toLowerCase().includes(q)) || 
        (a.sku && a.sku.toLowerCase().includes(q)) ||
        (a.brand && a.brand.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))
      );
    }

    return list.slice(0, 10);
  }, [catalog, searchTerm, showOnlyUnderStock, globalThreshold, isOpen]);

  const underStockCatalogCount = useMemo(() => {
    return catalog.filter(acc => {
      const th = acc.notifyThreshold && acc.notifyThreshold > 0 ? acc.notifyThreshold : globalThreshold;
      return (Number(acc.quantity) || 0) <= th;
    }).length;
  }, [catalog, globalThreshold]);

  const handleSelectCatalogItem = (item: Accessory) => {
    sound.playClick();
    setSelectedAccessory(item);
    setIsCustom(false);

    const th = item.notifyThreshold && item.notifyThreshold > 0 ? item.notifyThreshold : globalThreshold;
    const currentQty = Number(item.quantity) || 0;
    // Smart suggested restock
    const suggested = Math.max(5, (th * 3) - currentQty);

    // Let it be empty as requested, so the user types the quantity themselves
    setQuantityStr('');
    setSearchTerm('');
  };

  const handleAddToOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = parseInt(quantityStr) || 0;
    if (quantity <= 0) return;
    sound.playClick();
    
    if (isCustom) {
      if (!customName.trim() || !customCategory) return;
      onAdd({
        id: crypto.randomUUID(),
        sku: '',
        name: customName,
        category: customCategory || 'Custom Order',
        quantity,
        unitCost: 0,
        currency: 'USD',
        supplier: '',
        notes,
        isCustom: true
      });
    } else {
      if (!selectedAccessory) return;
      onAdd({
        id: selectedAccessory.id,
        accessoryId: selectedAccessory.id,
        sku: selectedAccessory.barcode || selectedAccessory.sku || '',
        barcode: selectedAccessory.barcode || '',
        name: selectedAccessory.name,
        brand: selectedAccessory.brand,
        category: selectedAccessory.category,
        quantity,
        unitCost: Number(selectedAccessory.buyPrice) || 0,
        currency: selectedAccessory.currency || 'USD',
        supplier: selectedAccessory.company || '',
        notes,
        currentStock: selectedAccessory.quantity,
        alertThreshold: selectedAccessory.notifyThreshold || globalThreshold,
        image: selectedAccessory.image,
        isCustom: false
      });
    }
    
    handleReset();
    onClose();
  };

  const handleDirectRestockSubmit = async () => {
    const quantity = parseInt(quantityStr) || 0;
    if (!onDirectRestock || quantity <= 0) return;
    if (!isCustom && !selectedAccessory) return;
    if (isCustom && (!customName.trim() || !customCategory)) return;

    setIsDirectRestocking(true);
    sound.playClick();

    try {
      const targetId = selectedAccessory ? selectedAccessory.id : crypto.randomUUID();
      const res = await onDirectRestock(targetId, quantity, {
        newBuyPrice: undefined,
        supplier: selectedAccessory ? selectedAccessory.company || '' : '',
        notes,
        name: selectedAccessory ? selectedAccessory.name : customName.trim(),
        brand: selectedAccessory ? selectedAccessory.brand : '',
        category: selectedAccessory ? selectedAccessory.category : (customCategory || 'Accessories'),
        sku: selectedAccessory ? selectedAccessory.sku : '',
        barcode: selectedAccessory ? selectedAccessory.barcode : '',
        currency: selectedAccessory ? selectedAccessory.currency || 'USD' : 'USD',
        image: selectedAccessory?.image
      });
      if (res.success) {
        handleReset();
        onClose();
      }
    } finally {
      setIsDirectRestocking(false);
    }
  };

  const handleReset = () => {
    setSelectedAccessory(null);
    setCustomName('');
    setCustomCategory('');
    setQuantityStr('');
    setNotes('');
  };

  const selectedStock = selectedAccessory ? Number(selectedAccessory.quantity) || 0 : 0;
  const selectedThreshold = selectedAccessory 
    ? (selectedAccessory.notifyThreshold && selectedAccessory.notifyThreshold > 0 ? selectedAccessory.notifyThreshold : globalThreshold)
    : globalThreshold;
  const isSelectedUnderStock = selectedAccessory ? selectedStock <= selectedThreshold : false;
  const projectedStock = selectedStock + (Number(quantityStr) || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#0b0f1a] w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#121727]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Restock / Order Item</h2>
              <p className="text-xs text-slate-400">Select an item to restock directly or add to purchase order</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { sound.playClick(); setIsCustom(false); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isCustom ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>From Inventory Catalog</span>
            </button>
            <button
              onClick={() => { sound.playClick(); setIsCustom(true); setSelectedAccessory(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isCustom ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Custom / New Product</span>
            </button>
          </div>

          <form id="manual-order-form" onSubmit={handleAddToOrder} className="space-y-4">
            
            {/* 1. Catalog Search & Selection Mode */}
            {!isCustom && !selectedAccessory && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Search Inventory Catalog
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnderStock(!showOnlyUnderStock)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border ${
                      showOnlyUnderStock
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Show Under Stock Only ({underStockCatalogCount})</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search product name, SKU, barcode, supplier..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Catalog Results List showing ALL under-stock quantities clearly */}
                <div className="border border-slate-800 rounded-xl bg-slate-900/60 divide-y divide-slate-800 max-h-[260px] overflow-y-auto shadow-inner">
                  {(filteredCatalog?.length || 0) === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No products found matching your search.
                    </div>
                  ) : (
                    filteredCatalog.map(item => {
                      const th = item.notifyThreshold && item.notifyThreshold > 0 ? item.notifyThreshold : globalThreshold;
                      const cur = Number(item.quantity) || 0;
                      const isZero = cur === 0;
                      const isUnder = cur <= th;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectCatalogItem(item)}
                          className="p-3 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{item.category}</span>
                                {item.company && <span>• {item.company}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Prominent Current Stock Quantity Badge */}
                          <div className="text-right shrink-0 flex items-center gap-2">
                            {isZero ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                0 Stock (Out)
                              </span>
                            ) : isUnder ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {cur} Stock (Under Min {th})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {cur} in stock
                              </span>
                            )}
                            <button
                              type="button"
                              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Selected Catalog Item Card */}
            {!isCustom && selectedAccessory && (
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {selectedAccessory.image ? (
                      <img src={selectedAccessory.image} alt={selectedAccessory.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{selectedAccessory.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] mt-0.5">
                      <span className="text-slate-400">Current Stock:</span>
                      <strong className={isSelectedUnderStock ? 'text-rose-400' : 'text-emerald-400'}>
                        {selectedStock} units
                      </strong>
                      <span className="text-slate-500">• Min Threshold: {selectedThreshold}</span>
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedAccessory(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-500/20 transition-colors shrink-0"
                >
                  Change Item
                </button>
              </div>
            )}

            {/* 2. Custom Item Inputs */}
            {isCustom && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Custom Item Name *</label>
                  <input
                    required
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="e.g. Type-C Braided Cable 2M"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Category *</label>
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                  >
                    <option value="" disabled>Select Category...</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 3. Common Quantity & Financial Inputs */}
            {(isCustom || selectedAccessory) && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Quantity to Restock/Order *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={quantityStr}
                      onChange={e => setQuantityStr(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 mt-1"
                    />
                  </div>

                  {/* Stock projection preview */}
                  {!isCustom && selectedAccessory && (
                    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2 flex flex-col justify-center mt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">After Restock</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono font-bold text-slate-400">{selectedStock}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-mono font-bold text-emerald-400">{projectedStock} units</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Order Notes (Optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Requested urgent shipment by Friday"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#121727] flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>

          {/* Direct Restock to Supabase option */}
          {((!isCustom && selectedAccessory) || (isCustom && customName.trim() && customCategory)) && onDirectRestock && (
            <button
              type="button"
              onClick={handleDirectRestockSubmit}
              disabled={isDirectRestocking || (parseInt(quantityStr) || 0) <= 0}
              className="px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Add stock units directly to Supabase now"
            >
              {isDirectRestocking ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Direct Restock Now (+{parseInt(quantityStr) || 0})</span>
            </button>
          )}

          {/* Standard Add to Purchase Order Draft */}
          <button
            type="submit"
            form="manual-order-form"
            disabled={!isCustom && !selectedAccessory}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Order Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}
