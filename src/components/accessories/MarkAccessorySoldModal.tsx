import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2, ShoppingBag, Calendar, User, DollarSign, Package, AlertCircle } from 'lucide-react';
import { Accessory } from '../../types/accessory';
import { cn, formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import CurrencyPriceInput from '../common/CurrencyPriceInput';

interface MarkAccessorySoldModalProps {
  accessory: Accessory | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSold: (accessoryId: string, soldData: { 
    quantitySold: number; 
    soldPrice: number; 
    soldDate: string; 
    soldToCustomer: string; 
    soldNotes: string 
  }) => void;
}

export default function MarkAccessorySoldModal({
  accessory,
  isOpen,
  onClose,
  onConfirmSold
}: MarkAccessorySoldModalProps) {
  const { t, i18n } = useTranslation();

  if (!isOpen || !accessory) return null;

  const [quantitySold, setQuantitySold] = useState<number>(1);
  const [soldPrice, setSoldPrice] = useState<string>(accessory.sellPrice ? formatNumberWithCommas(accessory.sellPrice) : '');
  const [soldDate, setSoldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [soldToCustomer, setSoldToCustomer] = useState<string>('');
  const [soldNotes, setSoldNotes] = useState<string>('');

  const maxAvailable = Math.max(1, accessory.quantity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmSold(accessory.id, {
      quantitySold: Math.min(Math.max(1, quantitySold), accessory.quantity),
      soldPrice: parseFormattedNumber(soldPrice) || accessory.sellPrice,
      soldDate,
      soldToCustomer: soldToCustomer.trim() || t('accessories.walkInCustomer', 'Direct Walk-in Buyer'),
      soldNotes: soldNotes.trim()
    });
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
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">{t('accessories.markSoldTitle', 'Mark Accessory as Sold')}</h3>
              <p className="text-xs text-slate-400 truncate">{accessory.brand} • {accessory.name}</p>
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          
          {/* Item details banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{t('accessories.availableInStock', 'Available In Stock:')}</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {t('accessories.availableUnitsCount', '{{count}} units', { count: accessory.quantity })}
              </span>
            </div>
            <div className="text-end">
              <span className="text-slate-400 block mb-0.5">{t('accessories.defaultSellPrice', 'Default Sell Price:')}</span>
              <span className="font-mono font-semibold text-slate-200">
                {formatCurrency(accessory.sellPrice, accessory.currency)}
              </span>
            </div>
          </div>

          {/* Quantity to sell */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{t('accessories.quantityToSell', 'Quantity to Sell')}</span>
              <span className="text-slate-400 text-[11px] font-mono">
                {t('accessories.maxUnits', 'Max: {{count}} units', { count: accessory.quantity })}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={accessory.quantity}
                value={quantitySold}
                onChange={(e) => setQuantitySold(Math.max(1, Math.min(accessory.quantity, parseInt(e.target.value) || 1)))}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1">
                {[1, 2, 5].filter(n => n <= accessory.quantity).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantitySold(n)}
                    className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sold Price per unit */}
          <CurrencyPriceInput
            name="soldPrice"
            label={t('accessories.unitSellingPrice', 'Unit Selling Price ({{currency}})', { currency: accessory.currency })}
            required
            value={soldPrice}
            currency={accessory.currency}
            onChange={(e) => setSoldPrice(formatNumberWithCommas(e.target.value))}
            onClear={() => setSoldPrice('')}
            accent="emerald"
          />

          {/* Date Sold */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('accessories.saleDate', 'Sale Date')}</label>
            <input
              type="date"
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
              className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-xs text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('accessories.customerNamePhone', 'Customer Name / Phone')}</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={soldToCustomer}
                onChange={(e) => setSoldToCustomer(e.target.value)}
                placeholder={t('accessories.customerPlaceholder', 'Walk-in Customer / Contact Info')}
                className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 ps-3.5 pe-10 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {soldToCustomer && (
                <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                  <button
                    type="button"
                    onClick={() => setSoldToCustomer('')}
                    className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('accessories.saleNotes', 'Sale Notes')}</label>
            <textarea
              rows={2}
              value={soldNotes}
              onChange={(e) => setSoldNotes(e.target.value)}
              placeholder={t('accessories.saleNotesPlaceholder', 'Invoice #, warranty note, bundle...')}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Submit */}
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
              className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('accessories.confirmSaleWithQty', 'Confirm Sale ({{count}} {{unit}})', { 
                count: quantitySold, 
                unit: quantitySold === 1 ? 'unit' : 'units' 
              })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
