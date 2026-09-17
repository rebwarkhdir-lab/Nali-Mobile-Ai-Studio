import React, { useState } from 'react';
import { X, Check, Banknote, CreditCard, Building, Calendar, DollarSign, Receipt } from 'lucide-react';
import { formatCurrency, formatDualPrice, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import { InstallmentPlan, InstallmentScheduleItem } from '../../types/installment';
import { installmentService } from '../../lib/installmentService';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';

interface PayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InstallmentPlan;
  schedule: InstallmentScheduleItem;
  exchangeRate?: number;
  onPaymentSuccess: (updatedPlan: InstallmentPlan) => void;
}

export default function PayScheduleModal({
  isOpen,
  onClose,
  plan,
  schedule,
  exchangeRate = 1500,
  onPaymentSuccess
}: PayScheduleModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();
  
  const remainingForMonth = Math.max(0, schedule.amountDue - schedule.amountPaid);
  const [amount, setAmount] = useState<string>(remainingForMonth > 0 ? formatNumberWithCommas(remainingForMonth) : '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'other'>('cash');
  const [receiptNumber, setReceiptNumber] = useState<string>(`REC-INS-${Date.now().toString().slice(-4)}`);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedAmount = parseFormattedNumber(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      sound.playAlert();
      toastError(t('installments.payModal.errorValidAmount'));
      return;
    }

    setIsSubmitting(true);
    try {
      sound.playClick();
      const updatedPlan = await installmentService.paySchedule(plan.id, schedule.id, {
        amount: parsedAmount,
        paymentMethod,
        receiptNumber,
        notes: notes.trim() || undefined
      });

      sound.playPaymentSuccess();
      success(t('installments.payModal.successToast', { month: schedule.monthNumber }));
      onPaymentSuccess(updatedPlan);
      onClose();
    } catch (err) {
      console.error('Failed to pay installment schedule:', err);
      sound.playAlert();
      toastError(t('installments.payModal.errorFailed'));
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
              <Receipt className="w-5 h-5 text-indigo-400" />
              <span>{t('installments.payModal.title', { month: schedule.monthNumber, monthNumber: schedule.monthNumber })}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('installments.payModal.contractLabel')}{' '}
              <span className="font-mono text-indigo-300 font-semibold">{plan.contractNumber}</span> • {plan.customerName}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          
          {/* Month Meta Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">{t('installments.payModal.dueDate')}</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{schedule.dueDate}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">{t('installments.payModal.amountDueThisMonth')}</span>
              <span className="text-base font-bold text-emerald-400">
                {formatCurrency(schedule.amountDue, plan.currency)}
              </span>
              {schedule.amountPaid > 0 && (
                <span className="block text-[10px] text-slate-400">
                  {t('installments.payModal.alreadyPaid', { amount: formatCurrency(schedule.amountPaid, plan.currency) })}
                </span>
              )}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">
              {t('installments.payModal.paymentAmount', { currency: plan.currency })}
            </label>
            <div className="relative flex items-center">
              {/* Currency Sign prefix (e.g. $ or IQD/د.ع) positioned on the start */}
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none select-none">
                <span className="text-slate-400 font-bold font-mono text-sm">
                  {plan.currency === 'USD' ? '$' : (isKu ? 'د.ع' : 'IQD')}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatNumberWithCommas(e.target.value))}
                placeholder={plan.currency === 'USD' ? '0.00' : '0'}
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl h-11 ps-12 pe-16 text-base font-bold font-mono text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 leading-normal"
                autoFocus
              />
              {/* Currency badge positioned on the end */}
              <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none select-none">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {plan.currency}
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
              <span>{t('installments.payModal.approx', { amount: formatDualPrice(parsedAmount, plan.currency, exchangeRate).secondary })}</span>
              <button
                type="button"
                onClick={() => setAmount(formatNumberWithCommas(remainingForMonth))}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                {t('installments.payModal.setExactAmount', { amount: formatCurrency(remainingForMonth, plan.currency) })}
              </button>
            </div>
          </div>

          {/* Method selector */}
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">{t('installments.payModal.paymentMethod')}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: t('installments.payModal.methods.cash'), icon: Banknote },
                { id: 'card', label: t('installments.payModal.methods.card'), icon: CreditCard },
                { id: 'bank_transfer', label: t('installments.payModal.methods.bank_transfer'), icon: Building }
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
                    className={`py-2 px-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
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

          {/* Receipt & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">{t('installments.payModal.receiptNum')}</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono h-9"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">{t('installments.payModal.notes')}</label>
              <input
                type="text"
                placeholder={t('installments.payModal.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 h-9"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
            >
              {t('installments.payModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount <= 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? t('installments.payModal.recording') : t('installments.payModal.confirmPayment')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
