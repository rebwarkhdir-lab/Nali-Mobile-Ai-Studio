import React, { useState } from 'react';
import { X, Check, DollarSign, CreditCard, Banknote, Building, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { cn, formatCurrency, formatDualPrice, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import { Debt, DebtPayment } from '../../types/debt';
import { debtService } from '../../lib/debtService';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';

interface RecordDebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  exchangeRate?: number;
  onPaymentSuccess: (updatedDebt: Debt, payment: DebtPayment) => void;
}

export default function RecordDebtPaymentModal({
  isOpen,
  onClose,
  debt,
  exchangeRate = 1500,
  onPaymentSuccess
}: RecordDebtPaymentModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();
  const [amount, setAmount] = useState<string>(debt.remainingAmount > 0 ? formatNumberWithCommas(debt.remainingAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'other'>('cash');
  const [receiptNumber, setReceiptNumber] = useState<string>(`REC-DEBT-${Date.now().toString().slice(-4)}`);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedAmount = parseFormattedNumber(amount) || 0;
  const newRemaining = Math.max(0, debt.remainingAmount - parsedAmount);
  const isFullSettlement = parsedAmount >= debt.remainingAmount - 0.01;

  const handleQuickPreset = (fraction: number) => {
    sound.playClick();
    const val = Math.round(debt.remainingAmount * fraction * 100) / 100;
    setAmount(formatNumberWithCommas(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      sound.playAlert();
      toastError(t('debts.paymentModal.validAmountWarning'));
      return;
    }

    if (parsedAmount > debt.remainingAmount + 0.01) {
      if (!confirm(t('debts.paymentModal.exceedsDebtWarning', { 
        amount: formatCurrency(parsedAmount, debt.currency), 
        remaining: formatCurrency(debt.remainingAmount, debt.currency) 
      }))) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      sound.playClick();
      const result = await debtService.recordPayment(debt.id, {
        amount: parsedAmount,
        paymentMethod,
        receiptNumber,
        notes: notes.trim() || undefined,
        receivedBy: 'Store Cashier'
      });

      sound.playPaymentSuccess();
      success(t('debts.paymentModal.paymentSuccess', { amount: formatCurrency(parsedAmount, debt.currency) }));
      onPaymentSuccess(result.updatedDebt, result.payment);
    } catch (err) {
      console.error('Failed to record payment:', err);
      sound.playAlert();
      toastError(t('debts.paymentModal.paymentFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121829] border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e1322]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span>{t('debts.paymentModal.title')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('debts.paymentModal.customer')} <span className="font-semibold text-slate-200">{debt.customerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Debt Summary Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">{t('debts.paymentModal.remainingDebt')}</span>
              <span className="text-lg font-bold text-rose-400">
                {formatCurrency(debt.remainingAmount, debt.currency)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {formatDualPrice(debt.remainingAmount, debt.currency, exchangeRate).secondary}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">{t('debts.paymentModal.originalAmount')}</span>
              <span className="text-sm font-semibold text-slate-300">
                {formatCurrency(debt.originalAmount, debt.currency)}
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium">
                {t('debts.paymentModal.paid')} {formatCurrency(debt.paidAmount, debt.currency)}
              </span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium">
                {t('debts.paymentModal.paymentAmount', { currency: debt.currency })}
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset(0.5)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                >
                  {t('debts.paymentModal.quick50')}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(1)}
                  className="px-2 py-0.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold"
                >
                  {t('debts.paymentModal.quickFull', { amount: formatCurrency(debt.remainingAmount, debt.currency) })}
                </button>
              </div>
            </div>
            <div className="relative flex items-center">
              {/* Currency sign / prefix at start */}
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none select-none">
                <span className={cn("font-bold font-mono text-sm", debt.currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                  {debt.currency === 'USD' ? '$' : (isKu ? 'د.ع' : 'IQD')}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatNumberWithCommas(e.target.value))}
                placeholder={debt.currency === 'USD' ? '0.00' : '0'}
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-indigo-500 rounded-xl h-11 ps-12 pe-16 text-base font-bold font-mono text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 transition-colors leading-normal"
                autoFocus
              />
              {/* Currency badge at end */}
              <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none select-none">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {debt.currency}
                </span>
              </div>
            </div>
            {parsedAmount > 0 && (
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {t('debts.paymentModal.newRemaining')}{' '}
                  <strong className={newRemaining === 0 ? "text-emerald-400" : "text-amber-400"}>
                    {formatCurrency(newRemaining, debt.currency)}
                  </strong>
                </span>
                {isFullSettlement && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> {t('debts.paymentModal.markAsPaidNotice')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">{t('debts.paymentModal.paymentMethod')}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: t('debts.paymentModal.cash'), icon: Banknote },
                { id: 'card', label: t('debts.paymentModal.card'), icon: CreditCard },
                { id: 'bank_transfer', label: t('debts.paymentModal.transfer'), icon: Building }
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setPaymentMethod(m.id as any);
                    }}
                    className={`py-2 px-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-[11px] font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receipt Number & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">{t('debts.paymentModal.voucherNo')}</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono h-9"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">{t('debts.paymentModal.notesOptional')}</label>
              <input
                type="text"
                placeholder={t('debts.paymentModal.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 h-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              {t('debts.paymentModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount <= 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? t('debts.paymentModal.recording') 
                  : t('debts.paymentModal.confirmButton', { amount: formatCurrency(parsedAmount, debt.currency) })}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
