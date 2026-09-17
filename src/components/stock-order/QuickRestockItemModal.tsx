import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Package, 
  Plus, 
  Check, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  ChevronDown,
  Search,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { StockAlert } from '../../types/stockOrder';
import { RestockOptions } from '../../lib/stockOrderService';
import { sound } from '../../lib/sound';
import { 
  getSyncAccessorySuppliers, 
  fetchAllAccessorySuppliers, 
  addSupplierToAccessoryOptions, 
  subscribeToSupplierChanges 
} from '../../lib/accessorySuppliers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: StockAlert | null;
  onRestock: (
    accessoryId: string, 
    quantityToAdd: number, 
    options?: RestockOptions
  ) => Promise<{ success: boolean; newQuantity: number }>;
}

export default function QuickRestockItemModal({ isOpen, onClose, item, onRestock }: Props) {
  // Input fields default to empty string so the requested numbers sit cleanly in the background (as placeholders)
  const [quantity, setQuantity] = useState<string>('');
  const [unitBuyPrice, setUnitBuyPrice] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('Thomas Walkers');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Supplier selection and synchronization states
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>(() => getSyncAccessorySuppliers());
  const [isAddingCustomSupplier, setIsAddingCustomSupplier] = useState<boolean>(false);
  const [newSupplierInput, setNewSupplierInput] = useState<string>('');

  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Suggested quantity and previous cost calculations for watermark/background placeholders
  const suggestedQuantity = item?.suggestedRestock && item.suggestedRestock > 0 ? item.suggestedRestock : 1;
  const effectiveQuantity = quantity.trim() !== '' ? Math.max(1, parseInt(quantity, 10) || 1) : suggestedQuantity;

  const previousCost = item?.estimatedCost !== undefined && item.estimatedCost > 0 ? item.estimatedCost : 0;
  const placeholderCost = previousCost > 0 
    ? (previousCost % 1 === 0 ? String(previousCost) : previousCost.toFixed(2)) 
    : (item?.currency === 'USD' ? '0.00' : '0');

  const currentStock = item?.currentStock ?? 0;
  const newStock = Math.max(0, currentStock + effectiveQuantity);
  const isHealthyAfter = newStock > (item?.alertThreshold ?? 0);

  // Real-time synchronization with Add Accessory suppliers (from localStorage, Supabase, and cache)
  useEffect(() => {
    if (!isOpen) return;

    // 1. Immediately read latest local store from Add Accessory
    const initialList = getSyncAccessorySuppliers();
    setAvailableSuppliers(initialList);

    // 2. Fetch any missing suppliers from Supabase or remote db and merge
    fetchAllAccessorySuppliers().then(merged => {
      if (merged && merged.length > 0) {
        setAvailableSuppliers(merged);
      }
    });

    // 3. Listen to live updates from Add Accessory Drawer
    const unsubscribe = subscribeToSupplierChanges((updatedList) => {
      setAvailableSuppliers(updatedList);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Sync state whenever selected item changes or modal opens
  useEffect(() => {
    if (item && isOpen) {
      setQuantity('');
      setUnitBuyPrice('');
      setNotes('');
      setIsSupplierDropdownOpen(false);
      setSupplierSearch('');
      setIsAddingCustomSupplier(false);
      setNewSupplierInput('');

      // Default supplier priority:
      // If item has a specific known supplier, use it; otherwise default to "Thomas Walkers"
      const itemSupplier = item.supplier?.trim();
      const initialSupplier = (itemSupplier && itemSupplier !== 'Direct Supplier' && itemSupplier !== 'General Supplier')
        ? itemSupplier
        : 'Thomas Walkers';
      setSupplier(initialSupplier);
    }
  }, [item, isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isSupplierDropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSupplierSearch('');
      setIsAddingCustomSupplier(false);
    }
  }, [isSupplierDropdownOpen]);

  // Click outside to close supplier dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suppliers solely based on user search query inside the dropdown (showing all by default!)
  const displayedSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return availableSuppliers;
    return availableSuppliers.filter(s => s.toLowerCase().includes(q));
  }, [availableSuppliers, supplierSearch]);

  const handleSelectSupplier = (selectedName: string) => {
    sound.playClick();
    setSupplier(selectedName);
    setIsSupplierDropdownOpen(false);
    setSupplierSearch('');
  };

  const handleAddAndSelectSupplier = (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    sound.playSuccess();
    const updated = addSupplierToAccessoryOptions(trimmed);
    setAvailableSuppliers(updated);
    setSupplier(trimmed);
    setIsSupplierDropdownOpen(false);
    setSupplierSearch('');
    setIsAddingCustomSupplier(false);
    setNewSupplierInput('');
  };

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveQuantity <= 0) return;
    setIsSubmitting(true);
    sound.playClick();

    // Use typed price or fallback to previous unit cost in the background
    const finalBuyPrice = unitBuyPrice.trim() !== '' ? parseFloat(unitBuyPrice) : (previousCost > 0 ? previousCost : undefined);

    try {
      const res = await onRestock(item.accessoryId, effectiveQuantity, {
        newBuyPrice: finalBuyPrice && finalBuyPrice > 0 ? finalBuyPrice : undefined,
        supplier: supplier.trim() || 'Thomas Walkers',
        notes,
        name: item.name,
        brand: item.brand,
        category: item.category,
        sku: item.sku,
        barcode: item.barcode,
        currency: item.currency,
        image: item.image
      });
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetIncrements = [
    { label: `+${suggestedQuantity} (AI Suggested)`, value: suggestedQuantity, highlight: true },
    { label: '+5', value: 5 },
    { label: '+10', value: 10 },
    { label: '+25', value: 25 },
    { label: '+50', value: 50 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0f1523] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Quick Direct Restock
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Instant Update
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Add physical units directly to Supabase inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accessory Information Preview Card */}
        <div className="px-6 py-3 bg-slate-900/30 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0">
            {item.image ? (
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <Package className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                item.severity === 'out_of_stock'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {item.severity === 'out_of_stock' ? 'Out of Stock' : 'Under Stock'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{item.category || 'General'}</span>
              {item.barcode && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-400">{item.barcode}</span>
                </>
              )}
              {item.sku && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-500">{item.sku}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick preset buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Quick Increment Shortcuts
            </label>
            <div className="flex flex-wrap gap-2">
              {presetIncrements.map((preset, idx) => {
                const isSelected = quantity === String(preset.value) || (quantity === '' && preset.value === suggestedQuantity && preset.highlight);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setQuantity(String(preset.value));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                        : preset.highlight
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {preset.highlight && <Sparkles className="w-3 h-3 inline mr-1 text-indigo-400" />}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Restock Quantity Input & Stock Preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Quantity to Add *</label>
                {quantity.trim() === '' && (
                  <span className="text-[10px] text-indigo-400 font-mono font-medium">
                    Suggested: +{suggestedQuantity}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder={String(suggestedQuantity)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white placeholder:text-slate-500 placeholder:font-normal focus:border-indigo-500 focus:outline-none transition-colors"
                />
                {quantity.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setQuantity('')}
                    className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Clear to suggested background quantity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Projected Stock Level Card */}
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Stock Projected</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-mono font-bold ${currentStock === 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {currentStock}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className={`text-base font-mono font-bold ${isHealthyAfter ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {newStock} units
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">Threshold: {item.alertThreshold}</span>
            </div>
          </div>

          {/* Unit Buy Cost & Supplier Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Unit Buy Cost with background watermark of previous cost */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Unit Cost ({item.currency || 'USD'})
                </label>
                {previousCost > 0 && unitBuyPrice.trim() === '' && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Prior: {item.currency === 'USD' ? '$' : ''}{placeholderCost}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-500 text-xs font-mono">
                  {item.currency === 'USD' ? '$' : 'IQD'}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={unitBuyPrice}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setUnitBuyPrice(val);
                  }}
                  placeholder={placeholderCost}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-8 py-2 text-sm font-mono text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                />
                {unitBuyPrice.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setUnitBuyPrice('')}
                    className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Reset to background prior cost"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Supplier Selector - Synchronized with Add Accessory */}
            <div className="space-y-1 relative" ref={supplierDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Supplier
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomSupplier(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer font-medium"
                  title="Add new supplier to catalog"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              {/* Selector Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsSupplierDropdownOpen(prev => !prev);
                  }}
                  className="w-full h-[38px] bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-3 text-sm text-white flex items-center justify-between text-left focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
                >
                  <span className="truncate font-medium text-slate-100">
                    {supplier === 'Thomas Walkers' ? '★ Thomas Walkers' : supplier || 'Select Supplier...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isSupplierDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                </button>
              </div>

              {/* Floating Dropdown - Shows ALL Suppliers from Add Accessory */}
              {isSupplierDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#121829] border border-slate-700/95 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-60">
                  {/* Search Bar inside Dropdown */}
                  <div className="p-2 border-b border-slate-800 bg-slate-900/90 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={supplierSearch}
                      onChange={e => setSupplierSearch(e.target.value)}
                      placeholder="Search suppliers..."
                      className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none py-0.5"
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => setSupplierSearch('')}
                        className="p-0.5 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Add New Supplier Inline Button if not found or typing new */}
                  {supplierSearch.trim() !== '' && !availableSuppliers.some(s => s.toLowerCase() === supplierSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleAddAndSelectSupplier(supplierSearch)}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold border-b border-slate-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Add &quot;{supplierSearch.trim()}&quot; to Add Accessory catalog</span>
                    </button>
                  )}

                  {/* Supplier Items List */}
                  <div className="overflow-y-auto py-1 custom-scrollbar">
                    {(displayedSuppliers?.length || 0) === 0 ? (
                      <div className="px-3 py-3 text-xs text-slate-400 text-center">
                        No matching suppliers found
                      </div>
                    ) : (
                      (displayedSuppliers || []).map(s => {
                        const isSelected = supplier.toLowerCase() === s.toLowerCase();
                        const isThomasWalkers = s === 'Thomas Walkers';
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSelectSupplier(s)}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800/90 transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-200'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              {isThomasWalkers && <span className="text-amber-400 font-bold">★</span>}
                              {s}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Add New Trigger at Bottom of Dropdown */}
                  <div className="border-t border-slate-800 p-1.5 bg-slate-900/60 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 pl-2">
                      {availableSuppliers?.length || 0} suppliers in catalog
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSupplierDropdownOpen(false);
                        setIsAddingCustomSupplier(true);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Supplier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick 1-click supplier badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[10px] text-slate-500 shrink-0">Quick Select:</span>
            {['Thomas Walkers', 'Anker Official Regional Hub', 'Dubai Wholesale Trading', 'Erbil Mobile Distribution']
              .map(name => {
                const isSelected = supplier === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSupplier(name);
                      setIsSupplierDropdownOpen(false);
                    }}
                    className={`px-2 py-0.5 text-[10px] rounded-md transition-colors shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 font-semibold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {name === 'Thomas Walkers' ? '★ Thomas Walkers' : name.split(' ')[0]}
                  </button>
                );
              })}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Restock Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Urgent restock for VIP customer"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || effectiveQuantity <= 0}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Stock...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Restock +{effectiveQuantity} Units</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal to Add New Supplier & Sync with Add Accessory */}
        {isAddingCustomSupplier && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#121829] border border-slate-700 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-white">Add New Supplier</h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustomSupplier(false);
                    setNewSupplierInput('');
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                This supplier will be saved and immediately available in both Quick Restock and the Add Accessory drawer.
              </p>
              <input
                type="text"
                autoFocus
                value={newSupplierInput}
                onChange={e => setNewSupplierInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAndSelectSupplier(newSupplierInput);
                  }
                }}
                placeholder="e.g., Tokyo Electronics Hub"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustomSupplier(false);
                    setNewSupplierInput('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newSupplierInput.trim()}
                  onClick={() => handleAddAndSelectSupplier(newSupplierInput)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add & Select
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
