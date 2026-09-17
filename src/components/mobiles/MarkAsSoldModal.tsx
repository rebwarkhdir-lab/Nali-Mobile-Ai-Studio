import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Calendar, User, FileText } from 'lucide-react';
import { Mobile } from '../../types/mobile';
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import CurrencyPriceInput from '../common/CurrencyPriceInput';

interface MarkAsSoldModalProps {
  mobile: Mobile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSold: (mobileId: string, soldData: { soldPrice: number; soldDate: string; soldToCustomer: string; soldNotes: string }) => void;
}

export default function MarkAsSoldModal({
  mobile,
  isOpen,
  onClose,
  onConfirmSold
}: MarkAsSoldModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  if (!isOpen || !mobile) return null;

  const [soldPrice, setSoldPrice] = useState<string>(mobile.sellPrice ? formatNumberWithCommas(mobile.sellPrice) : '');
  const [soldDate, setSoldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [soldToCustomer, setSoldToCustomer] = useState<string>('');
  const [soldNotes, setSoldNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmSold(mobile.id, {
      soldPrice: parseFormattedNumber(soldPrice) || mobile.sellPrice,
      soldDate,
      soldToCustomer: soldToCustomer.trim() || (isKu ? 'کڕیاری ناو فرۆشگا' : 'Direct Walk-in Buyer'),
      soldNotes: soldNotes.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0e1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-800/80 bg-[#080b14]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-wide text-sm">{t('markAsSold.title', 'Mark Device as Sold')}</h3>
              <p className="text-xs text-slate-400">{mobile.brand} {mobile.model}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">{t('markAsSold.originalBuyPrice', 'Original Buy Price:')}</span>
            <span className="font-mono font-semibold text-slate-200">{formatCurrency(mobile.buyPrice, mobile.currency)}</span>
          </div>

          <CurrencyPriceInput
            name="soldPrice"
            label={`${t('markAsSold.finalSalePrice', 'Final Sale Price')} (${mobile.currency})`}
            required
            value={soldPrice}
            currency={mobile.currency}
            onChange={(e) => setSoldPrice(formatNumberWithCommas(e.target.value))}
            onClear={() => setSoldPrice('')}
            accent="emerald"
          />

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('markAsSold.soldDate', 'Date Sold')}</label>
            <input
              type="date"
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 px-3 text-sm text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('markAsSold.buyerName', 'Sold to Customer (Name / Phone)')}</label>
            <div className="relative">
              <input
                type="text"
                value={soldToCustomer}
                onChange={(e) => setSoldToCustomer(e.target.value)}
                placeholder={t('markAsSold.buyerPlaceholder', 'e.g. John Doe - 0750XXXXXXX')}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 pl-3 pr-9 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {soldToCustomer && (
                <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                  <button
                    type="button"
                    onClick={() => setSoldToCustomer('')}
                    className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                    title="Clear customer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('markAsSold.notes', 'Sale Notes')}</label>
            <div className="relative">
              <textarea
                rows={2}
                value={soldNotes}
                onChange={(e) => setSoldNotes(e.target.value)}
                placeholder={isKu ? "ماوەی گەرەنتی، ژمارەی پسوولە و تێبینی..." : "Warranty duration, invoice number, etc..."}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-2 pl-3 pr-9 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
              />
              {soldNotes && (
                <button
                  type="button"
                  onClick={() => setSoldNotes('')}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                  title="Clear notes"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-transparent text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {t('markAsSold.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('markAsSold.confirm', 'Confirm Sale')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
