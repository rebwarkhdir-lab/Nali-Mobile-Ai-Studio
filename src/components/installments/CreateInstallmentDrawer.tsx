import React, { useState } from 'react';
import { 
  X, 
  Save, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Calculator, 
  Smartphone,
  Check,
  Percent
} from 'lucide-react';
import { cn, formatCurrency, formatDualPrice, formatNumberWithCommas, parseFormattedNumber } from '../../lib/utils';
import { InstallmentPlan } from '../../types/installment';
import { installmentService, generateScheduleItems } from '../../lib/installmentService';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';

interface CreateInstallmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (newPlan: InstallmentPlan) => void;
  exchangeRate?: number;
}

export default function CreateInstallmentDrawer({
  isOpen,
  onClose,
  onPlanCreated,
  exchangeRate = 1500
}: CreateInstallmentDrawerProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();

  const [contractNumber, setContractNumber] = useState(`INS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdCard, setCustomerIdCard] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Guarantor info
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorIdCard, setGuarantorIdCard] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  
  // Products & Invoice
  const [productSummary, setProductSummary] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-5)}`);
  
  // Financial numbers
  const [principalAmount, setPrincipalAmount] = useState('');
  const [additionalFee, setAdditionalFee] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD');
  
  // Installment timing & duration
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedPrincipal = parseFormattedNumber(principalAmount) || 0;
  const parsedFee = parseFormattedNumber(additionalFee) || 0;
  const totalAmount = parsedPrincipal + parsedFee;
  const parsedDown = parseFormattedNumber(downPayment) || 0;
  const remainingToFinance = Math.max(0, totalAmount - parsedDown);
  const monthlyPayment = durationMonths > 0 ? Math.round((remainingToFinance / durationMonths) * 100) / 100 : 0;

  // Quick fee percentage calculator helper
  const handleQuickMarkup = (percent: number) => {
    sound.playClick();
    if (parsedPrincipal > 0) {
      const fee = Math.round((parsedPrincipal * (percent / 100)) * 100) / 100;
      setAdditionalFee(formatNumberWithCommas(fee));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      sound.playAlert();
      toastError(t('installments.drawer.nameRequired'));
      return;
    }
    if (parsedPrincipal <= 0) {
      sound.playAlert();
      toastError(t('installments.drawer.principalRequired'));
      return;
    }
    if (durationMonths <= 0) {
      sound.playAlert();
      toastError(t('installments.drawer.durationRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      sound.playClick();
      const newPlan = await installmentService.createInstallmentPlan({
        contractNumber: contractNumber.trim() || `INS-${Date.now()}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerIdCard: customerIdCard.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        guarantorName: guarantorName.trim() || undefined,
        guarantorPhone: guarantorPhone.trim() || undefined,
        guarantorIdCard: guarantorIdCard.trim() || undefined,
        guarantorAddress: guarantorAddress.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        productSummary: productSummary.trim() || undefined,
        principalAmount: parsedPrincipal,
        additionalFee: parsedFee,
        totalAmount,
        downPayment: parsedDown,
        remainingAmount: remainingToFinance,
        currency,
        durationMonths,
        monthlyPayment,
        startDate,
        firstDueDate,
        frequency,
        notes: notes.trim() || undefined
      });

      sound.playPaymentSuccess();
      success(t('installments.drawer.createdSuccess', { contractNumber: newPlan.contractNumber }));
      onPlanCreated(newPlan);
      onClose();
    } catch (err) {
      console.error('Failed to create installment plan:', err);
      sound.playAlert();
      toastError(t('installments.drawer.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0e1322] border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0e19]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('installments.drawer.title')}</h2>
              <p className="text-xs text-slate-400">{t('installments.drawer.subtitle')}</p>
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
          
          {/* Section: Contract & Financial Calculator */}
          <div className="space-y-4 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <DollarSign className="w-4 h-4" />
                <span>{t('installments.drawer.pricingCalculator')}</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('installments.drawer.itemBasePrice', { currency })} <span className="text-rose-400">*</span>
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
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(formatNumberWithCommas(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 ps-11 pe-3 text-sm font-bold font-mono text-white placeholder-slate-600 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">{t('installments.drawer.markupProfit', { currency })}</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickMarkup(10)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMarkup(15)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                    >
                      +15%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMarkup(20)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                    >
                      +20%
                    </button>
                  </div>
                </div>
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
                    value={additionalFee}
                    onChange={(e) => setAdditionalFee(formatNumberWithCommas(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 ps-11 pe-3 text-sm font-bold font-mono text-cyan-400 placeholder-slate-600 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('installments.drawer.downPayment', { currency })}
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

            {/* Duration Selector */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">{t('installments.drawer.durationMonths')}</label>
              <div className="grid grid-cols-6 gap-2">
                {[3, 6, 9, 12, 18, 24].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setDurationMonths(m);
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all text-xs ${
                      durationMonths === m
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {t('installments.drawer.monthsSuffix', { m })}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Result Card */}
            <div className="p-4 bg-slate-950/90 border border-indigo-950/80 rounded-xl grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">{t('installments.drawer.totalAgreement')}</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{formatCurrency(totalAmount, currency)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">{t('installments.drawer.netFinanced')}</span>
                <span className="text-sm font-bold text-rose-400 mt-0.5 block">{formatCurrency(remainingToFinance, currency)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">{t('installments.drawer.monthlyPayment')}</span>
                <span className="text-base font-black text-indigo-400 mt-0.5 block">{formatCurrency(monthlyPayment, currency)} {t('installments.drawer.perMonthSuffix')}</span>
              </div>
            </div>
          </div>

          {/* Section: Customer Information */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold pb-2 border-b border-slate-800">
              <User className="w-4 h-4" />
              <span>{t('installments.drawer.customerInfo')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('installments.drawer.customerFullName')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('installments.drawer.customerNamePlaceholder')}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.customerPhone')}</label>
                <input
                  type="text"
                  placeholder="+964 750 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.nationalId')}</label>
                <input
                  type="text"
                  placeholder={t('installments.drawer.nationalIdPlaceholder')}
                  value={customerIdCard}
                  onChange={(e) => setCustomerIdCard(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.residenceAddress')}</label>
                <input
                  type="text"
                  placeholder={t('installments.drawer.addressPlaceholder')}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Guarantor Information */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-semibold pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('installments.drawer.guarantorDetails')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.guarantorFullName')}</label>
                <input
                  type="text"
                  placeholder={t('installments.drawer.guarantorNamePlaceholder')}
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.guarantorPhone')}</label>
                <input
                  type="text"
                  placeholder="+964 750 000 0000"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.guarantorIdNumber')}</label>
                <input
                  type="text"
                  placeholder="e.g. IQ-NAT-55102"
                  value={guarantorIdCard}
                  onChange={(e) => setGuarantorIdCard(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.guarantorAddress')}</label>
                <input
                  type="text"
                  placeholder={t('installments.drawer.addressPlaceholder')}
                  value={guarantorAddress}
                  onChange={(e) => setGuarantorAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Dates & Products */}
          <div className="space-y-3 bg-[#13192c] border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold pb-2 border-b border-slate-800">
              <Calendar className="w-4 h-4" />
              <span>{t('installments.drawer.contractDetails')}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.productSummary')}</label>
                <input
                  type="text"
                  placeholder={t('installments.drawer.productSummaryPlaceholder')}
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.contractNumber')}</label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs font-mono text-indigo-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.startDate')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.firstDueDate')}</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 font-medium text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('installments.drawer.specialTerms')}</label>
                <textarea
                  rows={2}
                  placeholder={t('installments.drawer.termsPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              {t('installments.drawer.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !customerName.trim() || parsedPrincipal <= 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? t('installments.drawer.submitting') : t('installments.drawer.submitButton')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
