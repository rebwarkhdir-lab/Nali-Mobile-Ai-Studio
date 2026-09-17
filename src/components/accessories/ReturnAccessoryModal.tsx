import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RotateCcw, AlertCircle, Package, Building2, Tag, CheckCircle2 } from 'lucide-react';
import { Accessory } from '../../types/accessory';
import { formatCurrency, formatNumberWithCommas } from '../../lib/utils';

interface ReturnAccessoryModalProps {
  accessory: Accessory | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReturn: (accessoryId: string, returnQty: number, reason?: string) => void;
}

export default function ReturnAccessoryModal({
  accessory,
  isOpen,
  onClose,
  onConfirmReturn
}: ReturnAccessoryModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !accessory) return null;

  const totalSold = accessory.totalSold || 0;
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>(
    t('accessories.returnReasonDefault', 'Customer returned item / Canceled sale')
  );

  const maxReturnable = Math.max(1, totalSold);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.min(Math.max(1, returnQuantity), maxReturnable);
    onConfirmReturn(accessory.id, qty, returnReason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans overflow-y-auto">
      <div 
        className="w-full max-w-md bg-[#0e1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800/80 bg-[#080b14]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">{t('accessories.returnTitle', 'Return Accessory to Stock')}</h3>
              <p className="text-xs text-slate-400 truncate">{t('accessories.returnSubtitle', 'Restock sold accessory units')}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          
          {/* Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-indigo-400">{accessory.brand}</span>
              <span className="font-mono text-xs text-slate-400">{accessory.barcode}</span>
            </div>
            <div className="text-base font-bold text-white">
              {accessory.name}
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block">{t('accessories.totalSoldUnits', 'Total Sold Units:')}</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {t('accessories.unitsSoldTag', '{{count}} units sold', { count: totalSold })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{t('accessories.currentlyInStock', 'Currently in Stock:')}</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {t('accessories.availableUnitsCount', '{{count}} units', { count: accessory.quantity })}
                </span>
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t('accessories.returnNotice', 'Returning these units will increment the available inventory in stock and deduct from recorded sold count.')}
            </p>
          </div>

          {/* Quantity to Return */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{t('accessories.quantityToReturn', 'Quantity to Return & Restock')}</span>
              <span className="text-slate-400 text-[11px] font-mono">
                {t('accessories.maxReturnable', 'Max returnable: {{count}} units', { count: maxReturnable })}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={maxReturnable}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Math.max(1, Math.min(maxReturnable, parseInt(e.target.value) || 1)))}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 px-3 text-sm text-white font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex items-center gap-1">
                {[1, 2, 5, totalSold].filter((n, idx, arr) => n > 0 && n <= maxReturnable && arr.indexOf(n) === idx).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReturnQuantity(n)}
                    className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {n === totalSold && totalSold > 1 ? t('accessories.allCount', 'All ({{count}})', { count: n }) : n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('accessories.returnReason', 'Reason for Return / Restock')}
            </label>
            <input
              type="text"
              required
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder={t('accessories.returnReasonPlaceholder', 'e.g. Customer return, restock, or order cancel')}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 px-3 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Result preview */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
            <span>{t('accessories.newStockLevel', 'New Stock Level:')}</span>
            <span className="font-mono font-bold text-emerald-400">
              {accessory.quantity} + {returnQuantity} = {accessory.quantity + returnQuantity} {t('accessories.inStock', 'in stock')}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full xs:w-auto px-4 py-2 rounded-xl border border-slate-700 bg-transparent text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors text-center cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('accessories.confirmReturnWithQty', 'Confirm Return ({{count}} {{unit}})', { 
                count: returnQuantity, 
                unit: returnQuantity === 1 ? 'unit' : 'units' 
              })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
