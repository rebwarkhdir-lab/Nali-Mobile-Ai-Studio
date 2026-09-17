import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  CheckCircle2, 
  RefreshCw, 
  DollarSign, 
  Building2, 
  PackageCheck,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupplierReturnItem } from '../../types/supplierReturn';
import { supplierService } from '../../lib/supplierService';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface ResolveSupplierReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnItem: SupplierReturnItem | null;
  onResolved: (updatedReturn: SupplierReturnItem) => void;
}

type ResolutionOption = 'replacement' | 'refund' | 'credit';

export default function ResolveSupplierReturnModal({
  isOpen,
  onClose,
  returnItem,
  onResolved
}: ResolveSupplierReturnModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();

  const [resType, setResType] = useState<ResolutionOption>(() => {
    if (returnItem?.requestedResolution === 'cash_refund') return 'refund';
    if (returnItem?.requestedResolution === 'account_credit') return 'credit';
    return 'replacement';
  });

  const [newSerialOrImei, setNewSerialOrImei] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(returnItem ? returnItem.totalValue : 0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !returnItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sound.playSuccess();

    try {
      let settlementType: 'replacement_restocked' | 'cash_collected' | 'debt_deducted' = 'replacement_restocked';
      if (resType === 'refund') settlementType = 'cash_collected';
      if (resType === 'credit') settlementType = 'debt_deducted';

      const updated = await supplierService.resolveReturn(returnItem.id, {
        settlementType,
        notes: notes.trim() || undefined,
        replacementSerialOrImei: newSerialOrImei.trim() || undefined,
        refundAmount: Number(refundAmount) || returnItem.totalValue,
        refundCurrency: returnItem.currency,
        autoDeductDebt: resType === 'credit'
      });

      success(t('suppliers.resolveReturnModal.successResolved', { rma: returnItem.rmaNumber }));
      onResolved(updated);
      onClose();
    } catch (err) {
      console.error(err);
      toastError(t('suppliers.resolveReturnModal.errorResolve', 'Failed to resolve return'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          dir={isKu ? 'rtl' : 'ltr'}
          className="w-full max-w-md bg-[#141a2e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f1424]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {t('suppliers.resolveReturnModal.title')}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('suppliers.resolveReturnModal.rmaSubtitle', { rma: returnItem.rmaNumber, supplier: returnItem.supplierName })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            {/* Item Info Summary */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white flex justify-between">
                <span>{returnItem.itemName}</span>
                <span className="font-mono text-amber-400">
                  {returnItem.currency === 'USD' ? `$${returnItem.totalValue}` : `${returnItem.totalValue} IQD`}
                </span>
              </div>
              {returnItem.serialOrImei && (
                <div className="text-[11px] font-mono text-slate-400">
                  {t('suppliers.resolveReturnModal.originalImei', { imei: returnItem.serialOrImei })}
                </div>
              )}
              <div className="text-[11px] text-slate-500">
                {t('suppliers.resolveReturnModal.defect', { defect: returnItem.defectDescription })}
              </div>
            </div>

            {/* Resolution Type Options */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 block">
                {t('suppliers.resolveReturnModal.settleQuestion')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResType('replacement')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    resType === 'replacement'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PackageCheck className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">{t('suppliers.resolveReturnModal.newUnit')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResType('refund')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    resType === 'refund'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">{t('suppliers.resolveReturnModal.cashRefund')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResType('credit')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    resType === 'credit'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tag className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">{t('suppliers.resolveReturnModal.debtCredit')}</span>
                </button>
              </div>
            </div>

            {/* Condition Fields */}
            {resType === 'replacement' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.resolveReturnModal.newImei')}
                </label>
                <input
                  type="text"
                  placeholder={t('suppliers.resolveReturnModal.newImeiPlaceholder')}
                  value={newSerialOrImei}
                  onChange={(e) => setNewSerialOrImei(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {(resType === 'refund' || resType === 'credit') && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {resType === 'refund'
                    ? t('suppliers.resolveReturnModal.amountRefunded', { currency: returnItem.currency })
                    : t('suppliers.resolveReturnModal.amountCredited', { currency: returnItem.currency })
                  }
                </label>
                <input
                  type="number"
                  step="any"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
                {resType === 'credit' && (
                  <p className="text-[11px] text-indigo-400 mt-1">
                    {t('suppliers.resolveReturnModal.creditNote', { supplier: returnItem.supplierName })}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                {t('suppliers.resolveReturnModal.notes')}
              </label>
              <input
                type="text"
                placeholder={t('suppliers.resolveReturnModal.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t('suppliers.resolveReturnModal.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? t('suppliers.resolveReturnModal.resolving') 
                    : t('suppliers.resolveReturnModal.confirmResolution')
                  }
                </span>
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
