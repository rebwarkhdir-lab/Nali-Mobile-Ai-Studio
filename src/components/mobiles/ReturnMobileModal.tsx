import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, Smartphone, Calendar, User, DollarSign, CheckCircle2 } from 'lucide-react';
import { Mobile } from '../../types/mobile';
import { formatCurrency } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ReturnMobileModalProps {
  mobile: Mobile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReturn: (mobileId: string, returnReason?: string) => void;
}

export default function ReturnMobileModal({
  mobile,
  isOpen,
  onClose,
  onConfirmReturn
}: ReturnMobileModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [returnReason, setReturnReason] = useState<string>(isKu ? 'گەڕاندنەوەی کڕیار / هەڵوەشاندنەوەی فرۆشتن' : 'Customer return / Canceled sale');
  const [restockCondition, setRestockCondition] = useState<string>('Pre-owned');

  useEffect(() => {
    if (mobile?.condition) {
      setRestockCondition(mobile.condition);
    }
  }, [mobile]);

  if (!isOpen || !mobile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReturn(mobile.id, returnReason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#0e1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-[#080b14]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{t('returnMobile.title', 'Return Mobile to Stock')}</h3>
              <p className="text-xs text-slate-400">{t('returnMobile.subtitle', 'Revert sale & return device to inventory')}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Mobile Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-indigo-400">{mobile.brand}</span>
              <span className="font-mono text-xs text-slate-400">IMEI: {mobile.imei}</span>
            </div>
            <div className="text-base font-bold text-white">
              {mobile.brand} {mobile.model}
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block">{isKu ? 'نرخی فرۆشراو:' : 'Sold Price:'}</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {formatCurrency(mobile.soldPrice || mobile.sellPrice, mobile.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isKu ? 'فرۆشراوە بە:' : 'Sold To:'}</span>
                <span className="font-medium text-slate-200 truncate block">
                  {mobile.soldToCustomer || (isKu ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer')}
                </span>
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t('returnMobile.notice', 'Device IMEI will be marked back as Available in inventory.')}
            </p>
          </div>

          {/* Return Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('returnMobile.reason', 'Reason for Return')}
            </label>
            <input
              type="text"
              required
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder={isKu ? "بۆ نموونە: کڕیار گەڕاندیەوە، یان مامەڵە هەڵوەشایەوە" : "e.g. Customer returned, exchange, or canceled sale"}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 px-3 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Restock Condition */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('returnMobile.condition', 'Restock Condition')}
            </label>
            <select
              value={restockCondition}
              onChange={(e) => setRestockCondition(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 px-3 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Brand New">{isKu ? 'تازە و ئۆرجیناڵ (نەکراوەتەوە)' : 'Brand New (Unopened)'}</option>
              <option value="Like New">{isKu ? 'هاوشێوەی تازە (زۆر پاک)' : 'Like New (Mint condition)'}</option>
              <option value="Pre-owned">{isKu ? 'بەکارهاتوو (پاک و کارا)' : 'Pre-owned (Used/Good)'}</option>
              <option value="Fair">{isKu ? 'دۆخی مامناوەند' : 'Fair Condition'}</option>
              <option value="Open Box">{isKu ? 'کارتۆن کراوە' : 'Open Box'}</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-transparent text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {t('returnMobile.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('returnMobile.confirm', 'Confirm Return to Stock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
