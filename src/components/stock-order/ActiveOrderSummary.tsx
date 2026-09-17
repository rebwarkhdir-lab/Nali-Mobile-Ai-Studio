import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Save, 
  Send, 
  Trash2, 
  Minus, 
  Plus, 
  FileText, 
  Zap, 
  CheckCircle2, 
  Clock, 
  History, 
  RotateCcw,
  RefreshCw,
  Package,
  Boxes
} from 'lucide-react';
import { OrderItem, PurchaseOrder } from '../../types/stockOrder';
import { formatNumberWithCommas } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import PurchaseOrderPrintModal from './PurchaseOrderPrintModal';

interface Props {
  items: OrderItem[];
  onUpdateQty: (sku: string, id: string, qty: number) => void;
  onRemove: (sku: string, id: string) => void;
  onSaveDraft: (notes?: string) => void;
  onSubmit: (notes?: string) => void;
  onRestockAll?: (notes?: string) => Promise<boolean>;
  onClearOrder: () => void;
  orderHistory?: PurchaseOrder[];
  onLoadOrderToActive?: (order: PurchaseOrder) => void;
}

export default function ActiveOrderSummary({
  items,
  onUpdateQty,
  onRemove,
  onSaveDraft,
  onSubmit,
  onRestockAll,
  onClearOrder,
  orderHistory = [],
  onLoadOrderToActive
}: Props) {
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isRestocking, setIsRestocking] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<any>(null);

  const safeItems = Array.isArray(items) ? items : [];
  const safeOrderHistory = Array.isArray(orderHistory) ? orderHistory : [];

  const totalUSD = safeItems.filter(i => i.currency === 'USD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
  const totalIQD = safeItems.filter(i => i.currency === 'IQD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
  const totalItems = safeItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleRestockSubmit = async () => {
    if (!onRestockAll || (safeItems?.length || 0) === 0) return;
    setIsRestocking(true);
    try {
      await onRestockAll();
    } finally {
      setIsRestocking(false);
    }
  };

  const handleOpenPrintCurrent = () => {
    sound.playClick();
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setSelectedPrintOrder({
      orderNumber: `PO-${year}-${random}`,
      items: [...safeItems],
      totalAmountUSD: totalUSD,
      totalAmountIQD: totalIQD,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="bg-[#101524] rounded-2xl border border-slate-800 shadow-xl flex flex-col h-full max-h-[850px] overflow-hidden">
      
      {/* Tab Switcher Header */}
      <div className="p-3 bg-[#0d121f] border-b border-slate-800 flex items-center justify-between">
        <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => { sound.playClick(); setActiveTab('active'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Active Order ({safeItems?.length || 0})</span>
          </button>
          <button
            onClick={() => { sound.playClick(); setActiveTab('history'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({safeOrderHistory?.length || 0})</span>
          </button>
        </div>

        {activeTab === 'active' && (safeItems?.length || 0) > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Clear all items from active order?')) {
                onClearOrder();
              }
            }}
            className="text-[11px] text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
            title="Clear active order"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Mode 1: Active Order Items */}
      {activeTab === 'active' && (
        <>
          {(safeItems?.length || 0) === 0 ? (
            <div className="flex-1 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-center mb-3 text-slate-500">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Active Order is Empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Select items from low stock alerts or click "Add Item Manually" to build your purchase order.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {items.map((item, idx) => (
                <div 
                  key={item.sku || item.id || idx} 
                  className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-100 truncate">{item.name}</h4>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {item.isCustom ? (
                          <span className="text-amber-400 font-semibold">Custom Item</span>
                        ) : (
                          <span className="font-mono">{item.sku || 'No SKU'}</span>
                        )}
                        {item.supplier && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[100px]">{item.supplier}</span>
                          </>
                        )}
                        {item.currentStock !== undefined && (
                          <>
                            <span>•</span>
                            <span className={item.currentStock === 0 ? 'text-rose-400' : 'text-amber-400'}>
                              Stock: {item.currentStock}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.sku, item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Cost */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 bg-slate-950/80 rounded-lg border border-slate-800 p-0.5">
                      <button
                        onClick={() => onUpdateQty(item.sku, item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onUpdateQty(item.sku, item.id, parseInt(e.target.value) || 1)}
                        className="w-10 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                      />
                      <button
                        onClick={() => onUpdateQty(item.sku, item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">
                        {item.currency === 'USD' ? '$' : ''}{formatNumberWithCommas(item.unitCost)}{item.currency === 'IQD' ? ' د.ع' : ''} / unit
                      </div>
                      <div className="text-xs font-bold text-indigo-300 font-mono mt-0.5">
                        {item.currency === 'USD' ? '$' : ''}{formatNumberWithCommas(item.unitCost * item.quantity)}{item.currency === 'IQD' ? ' د.ع' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Order Action Footer */}
          {(safeItems?.length || 0) > 0 && (
            <div className="p-3.5 border-t border-slate-800 bg-[#0d121f] space-y-3">
              {/* Financial Totals */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Total Units:</span>
                  <span className="text-white font-mono font-bold">{totalItems} units</span>
                </div>
                {totalUSD > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal (USD):</span>
                    <span className="text-emerald-400 font-mono font-bold">${formatNumberWithCommas(totalUSD)}</span>
                  </div>
                )}
                {totalIQD > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal (IQD):</span>
                    <span className="text-emerald-400 font-mono font-bold">{formatNumberWithCommas(totalIQD)} د.ع</span>
                  </div>
                )}
              </div>

              {/* Instant Restock to Supabase Action Button */}
              {onRestockAll && (
                <button
                  onClick={handleRestockSubmit}
                  disabled={isRestocking}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title="Increments stock quantities in Supabase inventory immediately"
                >
                  {isRestocking ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Receive & Restock to Supabase (+{totalItems} units)</span>
                </button>
              )}

              {/* Order management actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSaveDraft()}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={() => onSubmit()}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Order</span>
                </button>
              </div>

              {/* Print / Share Action */}
              <button
                onClick={handleOpenPrintCurrent}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/80 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export / Print PO & Share</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Mode 2: Saved Purchase Orders History */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {(safeOrderHistory?.length || 0) === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
              <History className="w-8 h-8 text-slate-600 mb-2" />
              <span>No past purchase orders found.</span>
            </div>
          ) : (
            safeOrderHistory.map(order => {
              const units = order.totalUnits || (order.items || []).reduce((s, i) => s + i.quantity, 0);
              const isReceived = order.status === 'received';
              const isDraft = order.status === 'draft';

              return (
                <div 
                  key={order.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-white">{order.orderNumber}</span>
                      <div className="text-[10px] text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isReceived 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isDraft
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{units} units ({(order.items || []).length} items)</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {order.totalAmountUSD > 0 && `$${formatNumberWithCommas(order.totalAmountUSD)}`}
                      {order.totalAmountIQD > 0 && ` ${formatNumberWithCommas(order.totalAmountIQD)} IQD`}
                    </span>
                  </div>

                  {/* Actions for this saved PO */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedPrintOrder(order)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                    >
                      View / Print
                    </button>

                    {/* If draft or submitted, can load or receive */}
                    {!isReceived && (
                      <button
                        onClick={() => {
                          if (onLoadOrderToActive) {
                            sound.playClick();
                            onLoadOrderToActive(order);
                            setActiveTab('active');
                            info(`Loaded ${order.orderNumber} into active editor`);
                          }
                        }}
                        className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Print / Export Modal */}
      {selectedPrintOrder && (
        <PurchaseOrderPrintModal
          isOpen={Boolean(selectedPrintOrder)}
          onClose={() => setSelectedPrintOrder(null)}
          order={selectedPrintOrder}
        />
      )}
    </div>
  );
}
