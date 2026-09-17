import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Check, 
  DollarSign, 
  Building2, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Receipt, 
  User, 
  FileText, 
  ArrowRight, 
  Sparkles,
  Printer,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Supplier, SupplierPaymentVoucher, SupplierPaymentMethod, SupplierPurchaseInvoice } from '../../types/supplier';
import { sound } from '../../lib/sound';
import { formatNumberWithCommas, parseFormattedNumber, cn, formatCurrency } from '../../lib/utils';

interface RecordSupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  invoices?: SupplierPurchaseInvoice[];
  initialSupplier?: Supplier | null;
  initialInvoice?: SupplierPurchaseInvoice | null;
  onSavePayment: (payment: Omit<SupplierPaymentVoucher, 'id' | 'createdAt'>) => void;
  onPrintVoucher?: (voucher: SupplierPaymentVoucher) => void;
}

export default function RecordSupplierPaymentModal({
  isOpen,
  onClose,
  suppliers,
  invoices = [],
  initialSupplier,
  initialInvoice,
  onSavePayment,
  onPrintVoucher
}: RecordSupplierPaymentModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const PAYMENT_METHODS: Array<{ id: SupplierPaymentMethod; label: string; icon: any; hint: string }> = [
    { id: 'cash', label: t('suppliers.paymentModal.cash'), icon: Banknote, hint: t('suppliers.paymentModal.cashHint') },
    { id: 'bank_transfer', label: t('suppliers.paymentModal.bankTransfer'), icon: Building2, hint: t('suppliers.paymentModal.bankHint') },
    { id: 'exchange_office', label: t('suppliers.paymentModal.hawala'), icon: Send, hint: t('suppliers.paymentModal.hawalaHint') },
    { id: 'card', label: t('suppliers.paymentModal.card'), icon: CreditCard, hint: t('suppliers.paymentModal.cardHint') },
    { id: 'cheque', label: t('suppliers.paymentModal.cheque'), icon: Receipt, hint: t('suppliers.paymentModal.chequeHint') }
  ];

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('cash');
  const [exchangeOfficeOrBank, setExchangeOfficeOrBank] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>('Store Cashier');
  const [notes, setNotes] = useState<string>('');
  const [voucherNumber, setVoucherNumber] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setVoucherNumber(`SPV-${year}-${randomNum}`);

      if (initialInvoice) {
        setSelectedSupplierId(initialInvoice.supplierId);
        setSelectedInvoiceId(initialInvoice.id);
        setCurrency(initialInvoice.currency);
        setAmount(String(initialInvoice.remainingDebt > 0 ? initialInvoice.remainingDebt : initialInvoice.totalAmount));
      } else if (initialSupplier) {
        setSelectedSupplierId(initialSupplier.id);
        setSelectedInvoiceId('');
        setCurrency(initialSupplier.currency || 'USD');
        const debt = initialSupplier.currency === 'USD' ? initialSupplier.currentDebtUSD : initialSupplier.currentDebtIQD;
        setAmount(debt > 0 ? String(debt) : '');
      } else if ((suppliers?.length || 0) > 0) {
        const safeSuppliers = suppliers || [];
        setSelectedSupplierId(safeSuppliers[0].id);
        setSelectedInvoiceId('');
        setCurrency(safeSuppliers[0].currency || 'USD');
        setAmount('');
      }

      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setExchangeOfficeOrBank('');
      setReceiptNumber('');
      setPaidBy('Store Cashier');
      setNotes('');
    }
  }, [isOpen, initialSupplier, initialInvoice, suppliers]);

  const currentSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Filter invoices for this supplier with unpaid balances
  const supplierInvoices = useMemo(() => {
    return invoices.filter(i => i.supplierId === selectedSupplierId);
  }, [invoices, selectedSupplierId]);

  const currentDebt = useMemo(() => {
    if (!currentSupplier) return 0;
    return currency === 'USD' ? (currentSupplier.currentDebtUSD || 0) : (currentSupplier.currentDebtIQD || 0);
  }, [currentSupplier, currency]);

  const parsedAmount = parseFormattedNumber(amount) || 0;
  const newRemainingDebt = Math.max(0, currentDebt - parsedAmount);

  if (!isOpen) return null;

  const handleSetPresetAmount = (pct: number) => {
    sound.playClick();
    if (selectedInvoiceId) {
      const inv = supplierInvoices.find(i => i.id === selectedInvoiceId);
      if (inv) {
        const val = Math.round(inv.remainingDebt * pct);
        setAmount(formatNumberWithCommas(val));
        return;
      }
    }
    const val = currency === 'USD' 
      ? Math.round(currentDebt * pct * 100) / 100 
      : Math.round(currentDebt * pct);
    setAmount(formatNumberWithCommas(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || parsedAmount <= 0) {
      sound.playError();
      return;
    }

    const supplierName = currentSupplier ? currentSupplier.name : 'Supplier';
    const linkedInvoice = supplierInvoices.find(i => i.id === selectedInvoiceId);

    const paymentData = {
      voucherNumber,
      supplierId: selectedSupplierId,
      supplierName,
      invoiceId: selectedInvoiceId || undefined,
      invoiceNumber: linkedInvoice?.invoiceNumber || undefined,
      amount: parsedAmount,
      currency,
      paymentDate,
      paymentMethod,
      exchangeOfficeOrBank: exchangeOfficeOrBank.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined,
      paidBy: paidBy.trim() || 'Store Cashier',
      notes: notes.trim() || undefined
    };

    sound.playSuccess();
    onSavePayment(paymentData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        dir={isKu ? 'rtl' : 'ltr'} 
        className="bg-[#0f1422] border border-slate-700/80 rounded-3xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {t('suppliers.paymentModal.title')}
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-[11px]">
                  {voucherNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('suppliers.paymentModal.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Supplier Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('suppliers.paymentModal.selectSupplier')} <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                const s = suppliers.find(sup => sup.id === e.target.value);
                if (s) {
                  setCurrency(s.currency || 'USD');
                  setSelectedInvoiceId('');
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city}) • {formatCurrency(s.currentDebtUSD || 0, 'USD')} / {formatCurrency(s.currentDebtIQD || 0, 'IQD')}
                </option>
              ))}
            </select>
          </div>

          {/* Current Debt Highlight Banner */}
          {currentSupplier && (
            <div className="bg-gradient-to-r from-[#172036] to-[#12192c] border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('suppliers.paymentModal.currentDebtOwed')}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-extrabold text-amber-400 font-mono">
                    {formatCurrency(currentDebt, currency)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({currentSupplier.paymentTerms})
                  </span>
                </div>
              </div>

              <div className={isKu ? 'text-left' : 'text-right'}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('suppliers.paymentModal.afterPayment')}
                </span>
                <span className={cn(
                  "text-lg font-bold font-mono",
                  newRemainingDebt === 0 ? "text-emerald-400" : "text-slate-300"
                )}>
                  {formatCurrency(newRemainingDebt, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Link to Specific Bill (Optional) */}
          {(supplierInvoices?.length || 0) > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.paymentModal.linkInvoice')}
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = supplierInvoices.find(i => i.id === e.target.value);
                  if (inv) {
                    setCurrency(inv.currency);
                    setAmount(String(inv.remainingDebt));
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{t('suppliers.paymentModal.generalPayment')}</option>
                {supplierInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {t('suppliers.paymentModal.billOption', {
                      num: inv.invoiceNumber,
                      date: inv.purchaseDate,
                      rem: formatCurrency(inv.remainingDebt, inv.currency),
                      items: inv.itemsSummary
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount & Currency */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                {t('suppliers.paymentModal.paymentAmount')} <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetPresetAmount(0.25)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-700 cursor-pointer font-mono"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetAmount(0.50)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-700 cursor-pointer font-mono"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetAmount(1.0)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 rounded-md border border-indigo-500/40 cursor-pointer font-mono"
                >
                  {t('suppliers.paymentModal.settleAll')}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none select-none">
                  <span className={cn("font-bold font-mono text-sm", currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                    {currency === 'USD' ? '$' : (isKu ? 'د.ع' : 'IQD')}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(formatNumberWithCommas(e.target.value))}
                  placeholder={currency === 'USD' ? '0.00' : '0'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl ps-12 pe-4 py-2.5 h-11 text-lg font-bold font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-normal"
                />
              </div>

              <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-1">
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setCurrency('USD'); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    currency === 'USD' 
                      ? "bg-emerald-600 text-white shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setCurrency('IQD'); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    currency === 'IQD' 
                      ? "bg-amber-600 text-white shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  IQD (د.ع)
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {t('suppliers.paymentModal.paymentMethod')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { sound.playClick(); setPaymentMethod(m.id); }}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer",
                      isKu && "text-right",
                      isSelected
                        ? "bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={cn("w-4 h-4", isSelected ? "text-emerald-400" : "text-slate-500")} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{m.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual Fields: Bank or Exchange Office */}
          {(paymentMethod === 'bank_transfer' || paymentMethod === 'exchange_office') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {paymentMethod === 'bank_transfer' ? t('suppliers.paymentModal.bankDetails') : t('suppliers.paymentModal.hawalaDetails')}
              </label>
              <input
                type="text"
                value={exchangeOfficeOrBank}
                onChange={(e) => setExchangeOfficeOrBank(e.target.value)}
                placeholder={paymentMethod === 'bank_transfer' ? t('suppliers.paymentModal.bankPlaceholder') : t('suppliers.paymentModal.hawalaPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Date & Ref Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.paymentModal.paymentDate')}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.paymentModal.refNumber')}
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder={t('suppliers.paymentModal.refPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Paid By & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.paymentModal.authorizedBy')}
              </label>
              <input
                type="text"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                placeholder={t('suppliers.paymentModal.authorizedPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.paymentModal.notes')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('suppliers.paymentModal.notesPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
          >
            {t('suppliers.paymentModal.cancel')}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={parsedAmount <= 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <Check className="w-4 h-4" />
            <span>{t('suppliers.paymentModal.confirm')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
