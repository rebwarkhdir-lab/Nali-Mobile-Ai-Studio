import React, { useState } from 'react';
import { 
  X, 
  Save, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  Coins, 
  ShieldCheck, 
  FileText, 
  Smartphone, 
  MapPin, 
  CreditCard as IdCardIcon,
  Tag
} from 'lucide-react';
import { cn, formatCurrency, formatDualPrice, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import { Debt } from '../../types/debt';
import { debtService } from '../../lib/debtService';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';

interface AddDebtDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDebtCreated: (newDebt: Debt) => void;
  exchangeRate?: number;
}

export default function AddDebtDrawer({
  isOpen,
  onClose,
  onDebtCreated,
  exchangeRate = 1500
}: AddDebtDrawerProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerIdCard, setCustomerIdCard] = useState('');
  
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  
  const [productSummary, setProductSummary] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  
  const [originalAmount, setOriginalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD');
  
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedOriginal = parseFormattedNumber(originalAmount) || 0;
  const parsedDown = parseFormattedNumber(downPayment) || 0;
  const remaining = Math.max(0, parsedOriginal - parsedDown);

  const handleSetDueDays = (days: number) => {
    sound.playClick();
    const d = new Date(startDate || Date.now());
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      sound.playAlert();
      toastError(t('debts.drawer.customerNameRequired'));
      return;
    }
    if (parsedOriginal <= 0) {
      sound.playAlert();
      toastError(t('debts.drawer.validDebtAmountRequired'));
      return;
    }
    if (!dueDate) {
      sound.playAlert();
      toastError(t('debts.drawer.dueDateRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      sound.playClick();
      const newDebt = await debtService.createDebt({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerIdCard: customerIdCard.trim() || undefined,
        guarantorName: guarantorName.trim() || undefined,
        guarantorPhone: guarantorPhone.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        productSummary: productSummary.trim() || undefined,
        originalAmount: parsedOriginal,
        downPayment: parsedDown,
        remainingAmount: remaining,
        paidAmount: parsedDown,
        currency,
        startDate,
        dueDate,
        status: remaining <= 0 ? 'paid' : (parsedDown > 0 ? 'partially_paid' : 'outstanding'),
        notes: notes.trim() || undefined,
        initialPaymentNotes: parsedDown > 0 ? t('debts.drawer.initialDownPaymentNote') : undefined
      });

      sound.playPaymentSuccess();
      success(t('debts.drawer.debtCreatedSuccess', { name: newDebt.customerName }));
      onDebtCreated(newDebt);
      onClose();
    } catch (err) {
      console.error('Failed to create debt:', err);
      sound.playAlert();
      toastError(t('debts.drawer.debtCreateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0e1322] border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0e19]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('debts.drawer.title')}</h2>
              <p className="text-xs text-slate-400">{t('debts.drawer.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans">
          
          {/* Section 1: Customer Information */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold pb-2 border-b border-slate-800">
              <User className="w-4 h-4" />
              <span>{t('debts.drawer.customerInfo')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.customerFullName')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('debts.drawer.customerNamePlaceholder')}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.phoneNumber')}
                </label>
                <input
                  type="text"
                  placeholder="+964 750 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.nationalId')}
                </label>
                <input
                  type="text"
                  placeholder={t('debts.drawer.nationalIdPlaceholder')}
                  value={customerIdCard}
                  onChange={(e) => setCustomerIdCard(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.address')}
                </label>
                <input
                  type="text"
                  placeholder={t('debts.drawer.addressPlaceholder')}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Guarantor (Optional) */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('debts.drawer.guarantor')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('debts.drawer.guarantorName')}</label>
                <input
                  type="text"
                  placeholder={t('debts.drawer.guarantorNamePlaceholder')}
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('debts.drawer.guarantorPhone')}</label>
                <input
                  type="text"
                  placeholder="+964 750 000 0000"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Debt Details */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <DollarSign className="w-4 h-4" />
                <span>{t('debts.drawer.financialSetup')}</span>
              </div>
              <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                    currency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('IQD')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                    currency === 'IQD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  د.ع IQD
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.totalDebtAmount', { currency })} <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none select-none">
                    <span className={cn("font-bold font-mono text-xs", currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                      {currency === 'USD' ? '$' : (isKu ? 'د.ع' : 'IQD')}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder={currency === 'USD' ? '0.00' : '0'}
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(formatNumberWithCommas(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 ps-11 pe-3 text-sm font-bold font-mono text-white placeholder-slate-600 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.initialDownPayment', { currency })}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none select-none">
                    <span className={cn("font-bold font-mono text-xs", currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                      {currency === 'USD' ? '$' : (isKu ? 'د.ع' : 'IQD')}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={currency === 'USD' ? '0.00' : '0'}
                    value={downPayment}
                    onChange={(e) => setDownPayment(formatNumberWithCommas(e.target.value))}
                    className={cn(
                      "w-full bg-slate-900 border border-slate-700 rounded-xl py-2 ps-11 pe-3 text-sm font-bold font-mono placeholder-slate-600 focus:border-indigo-500",
                      currency === 'USD' ? 'text-amber-400' : 'text-sky-400'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Live calculation banner */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">{t('debts.drawer.netRemainingDebt')}</span>
              <div className="text-right">
                <span className="text-base font-bold text-rose-400">
                  {formatCurrency(remaining, currency)}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {formatDualPrice(remaining, currency, exchangeRate).secondary}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Products & Dates */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-semibold pb-2 border-b border-slate-800">
              <Tag className="w-4 h-4" />
              <span>{t('debts.drawer.productsAndDueDates')}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('debts.drawer.productSummary')}
                </label>
                <input
                  type="text"
                  placeholder={t('debts.drawer.productPlaceholder')}
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('debts.drawer.registrationDate')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium">{t('debts.drawer.dueDate')}</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetDueDays(15)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded"
                      >
                        +15d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDueDays(30)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded"
                      >
                        +30d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDueDays(60)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded"
                      >
                        +60d
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('debts.drawer.additionalNotes')}</label>
                <textarea
                  rows={2}
                  placeholder={t('debts.drawer.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              {t('debts.drawer.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !customerName.trim() || parsedOriginal <= 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? t('debts.drawer.registering') : t('debts.drawer.registerButton')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
