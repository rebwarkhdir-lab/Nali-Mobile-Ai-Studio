import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Building2, 
  Check, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  Copy, 
  Send, 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowRight,
  Sparkles,
  FileText,
  Boxes,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { Accessory } from '../../types/accessory';
import { Supplier, InvoiceProductType } from '../../types/supplier';
import { supplierService } from '../../lib/supplierService';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDualPrice, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

export interface RestockItemRow {
  accessoryId: string;
  name: string;
  brand: string;
  category: string;
  company: string;
  currentQty: number;
  threshold: number;
  orderQty: number;
  unitBuyPrice: number;
  currency: 'USD' | 'IQD';
  selected: boolean;
}

interface QuickRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowStockItems: Accessory[];
  globalThreshold: number;
  exchangeRate: number;
  onRestockCompleted?: () => void;
  preSelectedAccessoryId?: string;
}

export default function QuickRestockModal({
  isOpen,
  onClose,
  lowStockItems,
  globalThreshold,
  exchangeRate,
  onRestockCompleted,
  preSelectedAccessoryId
}: QuickRestockModalProps) {
  const { success, error: toastError, info } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [items, setItems] = useState<RestockItemRow[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoUpdateStock, setAutoUpdateStock] = useState(true);
  const [copiedNote, setCopiedNote] = useState(false);

  // Load suppliers and initialize restock rows
  useEffect(() => {
    if (!isOpen) return;

    const loadSuppliers = async () => {
      try {
        const list = await supplierService.getAllSuppliers();
        setSuppliers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Failed to load suppliers:', err);
      }
    };
    loadSuppliers();

    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`RESTOCK-${year}-${random}`);

    // Due in 15 days by default
    const due = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    setDueDate(due);
    setDownPayment('0');

    // Build restock rows
    const rows: RestockItemRow[] = (lowStockItems || []).map(acc => {
      const th = acc.notifyThreshold && acc.notifyThreshold > 0 ? acc.notifyThreshold : globalThreshold;
      // Recommended order qty: bring stock up to threshold + 10 units (or min 10 units)
      const targetStock = Math.max(15, th * 4);
      const recommendedQty = Math.max(5, targetStock - acc.quantity);

      const isInitiallySelected = preSelectedAccessoryId 
        ? acc.id === preSelectedAccessoryId 
        : true;

      return {
        accessoryId: acc.id,
        name: acc.name,
        brand: acc.brand || 'General',
        category: acc.category || 'Accessories',
        company: acc.company || '',
        currentQty: acc.quantity,
        threshold: th,
        orderQty: recommendedQty,
        unitBuyPrice: Number(acc.buyPrice) || 0,
        currency: acc.currency || 'USD',
        selected: isInitiallySelected
      };
    });

    setItems(rows);

    // Auto-select supplier if preselected item has a company matching a supplier
    if (preSelectedAccessoryId) {
      const target = (lowStockItems || []).find(a => a.id === preSelectedAccessoryId);
      if (target?.company) {
        // Will match in next effect when suppliers load
      }
    }
  }, [isOpen, lowStockItems, globalThreshold, preSelectedAccessoryId]);

  // Match supplier once suppliers are loaded
  useEffect(() => {
    if ((suppliers?.length || 0) > 0 && !selectedSupplierId) {
      // Find supplier matching first selected item's company
      const firstSelected = items.find(i => i.selected);
      if (firstSelected?.company) {
        const match = suppliers.find(s => 
          s.name.toLowerCase().includes(firstSelected.company.toLowerCase()) ||
          firstSelected.company.toLowerCase().includes(s.name.toLowerCase())
        );
        if (match) {
          setSelectedSupplierId(match.id);
          return;
        }
      }
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, items, selectedSupplierId]);

  if (!isOpen) return null;

  const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Item adjustments
  const toggleItemSelection = (index: number) => {
    sound.playClick();
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
  };

  const updateOrderQty = (index: number, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, orderQty: validQty } : item));
  };

  const updateUnitPrice = (index: number, price: number) => {
    const validPrice = Math.max(0, price);
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, unitBuyPrice: validPrice } : item));
  };

  const selectAll = (select: boolean) => {
    sound.playClick();
    setItems(prev => prev.map(item => ({ ...item, selected: select })));
  };

  // Calculations
  const selectedItems = (items || []).filter(i => i && i.selected);
  const totalSelectedUnits = selectedItems.reduce((acc, item) => acc + (item.orderQty || 0), 0);
  
  // Total cost in USD
  const totalCostUSD = selectedItems.reduce((acc, item) => {
    const cost = item.currency === 'USD' 
      ? item.unitBuyPrice * item.orderQty 
      : (item.unitBuyPrice * item.orderQty) / exchangeRate;
    return acc + cost;
  }, 0);

  const totalCostIQD = Math.round(totalCostUSD * exchangeRate);
  const parsedDownPayment = parseFormattedNumber(downPayment) || 0;
  const remainingDebt = Math.max(0, totalCostUSD - parsedDownPayment);

  // Generate WhatsApp / Order Text
  const generateOrderText = () => {
    const supName = currentSupplier ? currentSupplier.name : 'Supplier';
    let text = `📦 *RESTOCK PURCHASE ORDER*\n`;
    text += `*Date:* ${new Date().toLocaleDateString()}\n`;
    text += `*Supplier:* ${supName}\n`;
    text += `*Order Ref:* ${invoiceNumber}\n`;
    text += `------------------------------------\n`;
    text += `*ITEMS TO RESTOCK (${totalSelectedUnits} pcs total):*\n`;

    selectedItems.forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}* (${item.brand})\n`;
      text += `   - Quantity: ${item.orderQty} pcs\n`;
      if (item.unitBuyPrice > 0) {
        text += `   - Unit Cost: $${item.unitBuyPrice}\n`;
      }
    });

    text += `------------------------------------\n`;
    text += `*Estimated Total:* $${totalCostUSD.toLocaleString()} (≈ ${totalCostIQD.toLocaleString()} IQD)\n`;
    text += `\n_Generated via Nali POS Smart Inventory Management_`;
    return text;
  };

  const handleCopyOrder = () => {
    sound.playClick();
    const orderText = generateOrderText();
    navigator.clipboard.writeText(orderText);
    setCopiedNote(true);
    success('Restock order summary copied to clipboard!');
    setTimeout(() => setCopiedNote(false), 2500);
  };

  const handleSendWhatsApp = () => {
    sound.playClick();
    const orderText = encodeURIComponent(generateOrderText());
    const phone = currentSupplier?.whatsapp || currentSupplier?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${orderText}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${orderText}`, '_blank');
    }
  };

  // Submit Restock Invoice & Sync Inventory
  const handleCreateRestockInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((selectedItems?.length || 0) === 0) {
      toastError('Please select at least one item to restock.');
      sound.playError();
      return;
    }
    if (!selectedSupplierId) {
      toastError('Please select a supplier for this restock order.');
      sound.playError();
      return;
    }

    setIsSubmitting(true);
    try {
      const supName = currentSupplier ? currentSupplier.name : 'Supplier';

      // Summary string e.g. "10x Anker Charger, 15x Privacy Glass"
      const itemsSummary = selectedItems
        .map(i => `${i.orderQty}x ${i.name}`)
        .join(', ');

      // 1. Create Supplier Purchase Invoice
      await supplierService.saveInvoice({
        supplierId: selectedSupplierId,
        supplierName: supName,
        invoiceNumber: invoiceNumber.trim() || `RESTOCK-${Date.now()}`,
        purchaseDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate || undefined,
        currency: 'USD',
        totalAmount: Math.round(totalCostUSD * 100) / 100,
        downPayment: Math.round(parsedDownPayment * 100) / 100,
        paidAmount: Math.round(parsedDownPayment * 100) / 100,
        remainingDebt: Math.round(remainingDebt * 100) / 100,
        status: remainingDebt === 0 ? 'paid' : parsedDownPayment > 0 ? 'partially_paid' : 'unpaid',
        productType: 'accessories' as InvoiceProductType,
        itemsSummary,
        itemCount: totalSelectedUnits,
        notes: `Automated Low-Stock Restock Order for ${selectedItems?.length || 0} products.`
      });

      // 2. If autoUpdateStock is checked, immediately update the accessory stock
      if (autoUpdateStock) {
        for (const item of selectedItems) {
          const newQty = item.currentQty + item.orderQty;
          // Update in Supabase
          await supabase
            .from('nali_accessories')
            .update({
              quantity: newQty,
              status: newQty > item.threshold ? 'in_stock' : 'low_stock',
              updatedAt: new Date().toISOString()
            })
            .eq('id', item.accessoryId);
        }

        // Also update local cache
        try {
          const cached = localStorage.getItem('nali_accessories_cache');
          if (cached) {
            const parsed = JSON.parse(cached) as Accessory[];
            const updated = parsed.map(acc => {
              const match = selectedItems.find(i => i.accessoryId === acc.id);
              if (match) {
                const newQty = acc.quantity + match.orderQty;
                return {
                  ...acc,
                  quantity: newQty,
                  status: (newQty > (acc.notifyThreshold || globalThreshold) ? 'in_stock' : 'low_stock') as Accessory['status']
                };
              }
              return acc;
            });
            localStorage.setItem('nali_accessories_cache', JSON.stringify(updated));
          }
        } catch {}
      }

      sound.playSuccess();
      success(`Restock order created successfully for ${totalSelectedUnits} units!`);
      onRestockCompleted?.();
      onClose();
    } catch (err) {
      console.error('Failed to create restock invoice:', err);
      toastError('Failed to record restock order. Please try again.');
      sound.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#101524] rounded-3xl border border-slate-700/80 shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0c101d] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg tracking-tight">Quick Restock Order</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedItems?.length || 0} Products Selected
                </span>
              </div>
              <p className="text-xs text-slate-400">Restock products that are below threshold ({globalThreshold} units) and create supplier purchase records.</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form 
          onSubmit={handleCreateRestockInvoice} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          
          {/* Supplier & Invoice Header Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            {/* Supplier Selector */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Target Supplier <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => {
                  sound.playClick();
                  setSelectedSupplierId(e.target.value);
                }}
                className="w-full bg-[#161c2c] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                required
              >
                {(suppliers?.length || 0) === 0 ? (
                  <option value="">No suppliers found</option>
                ) : (
                  (suppliers || []).map(sup => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} {sup.city ? `(${sup.city})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Invoice / Ref Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Order / Invoice Ref #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-[#161c2c] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                placeholder="RESTOCK-2026-XXXX"
                required
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#161c2c] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Low Stock Items List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Low-Stock Items to Reorder</h3>
                <span className="text-xs text-slate-400 font-normal">({items?.length || 0} low stock total)</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => selectAll(false)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(items?.length || 0) === 0 ? (
                <div className="py-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No low stock items detected currently.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.accessoryId}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.selected 
                        ? 'bg-[#151c2e] border-indigo-500/40 shadow-sm' 
                        : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    {/* Item Info & Checkbox */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleItemSelection(idx)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                          item.selected 
                            ? 'bg-indigo-600 text-white' 
                            : 'border border-slate-700 bg-slate-800 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white truncate">{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-400">
                            {item.brand}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Stock: <strong className={item.currentQty === 0 ? 'text-rose-400' : 'text-amber-400'}>{item.currentQty} left</strong></span>
                          <span>•</span>
                          <span>Threshold: {item.threshold}</span>
                          {item.company && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 truncate max-w-[120px]">{item.company}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Cost Inputs */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {/* Unit Buy Cost */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unitBuyPrice}
                          onChange={(e) => updateUnitPrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#0f1422] border border-slate-700 text-white rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:border-indigo-500"
                          title="Unit Buy Price ($)"
                        />
                      </div>

                      {/* Order Quantity Controls */}
                      <div className="flex items-center bg-[#0f1422] border border-slate-700 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => updateOrderQty(idx, item.orderQty - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.orderQty}
                          onChange={(e) => updateOrderQty(idx, parseInt(e.target.value) || 1)}
                          className="w-12 bg-transparent text-center text-xs font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateOrderQty(idx, item.orderQty + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="w-20 text-right">
                        <div className="text-xs font-bold text-emerald-400">
                          ${(item.unitBuyPrice * item.orderQty).toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.orderQty} pcs
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment & Auto-Stock Update Options */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Down Payment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Down Payment Made to Supplier (USD)</span>
                  <span className="text-[10px] text-slate-500">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                  <input
                    type="text"
                    value={downPayment}
                    onChange={(e) => setDownPayment(formatNumberWithCommas(e.target.value))}
                    className="w-full bg-[#161c2c] border border-slate-700 text-white rounded-xl pl-7 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Instant Stock Receipt Toggle */}
              <div className="flex items-center">
                <label className="relative flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoUpdateStock}
                    onChange={(e) => setAutoUpdateStock(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Receive & Update Stock Count Now
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Instantly increases inventory quantity by the reorder amounts.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-300">
                <span>Total Items: <strong className="text-white">{totalSelectedUnits} pcs</strong></span>
                <span>•</span>
                <span>Total Cost: <strong className="text-white">${totalCostUSD.toLocaleString()}</strong> <span className="text-slate-500">({totalCostIQD.toLocaleString()} IQD)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Balance Owed:</span>
                <span className="font-bold text-amber-400">${remainingDebt.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#0c101d] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Quick Share / Copy Note */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOrder}
              disabled={(selectedItems?.length || 0) === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Copy Restock Slip"
            >
              {copiedNote ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNote ? 'Copied!' : 'Copy Order Slip'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={(selectedItems?.length || 0) === 0}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Send to Supplier on WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCreateRestockInvoice}
              disabled={isSubmitting || (selectedItems?.length || 0) === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Creating Restock...</span>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Confirm Restock Order (${totalCostUSD.toFixed(0)})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
