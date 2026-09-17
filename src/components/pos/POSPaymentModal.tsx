import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Banknote, 
  CreditCard, 
  Clock, 
  Layers, 
  DollarSign, 
  Calendar, 
  Check, 
  ShieldCheck,
  FileText,
  User,
  Phone,
  CreditCard as IdCardIcon,
  Percent,
  Plus,
  Coins,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency, formatDualPrice, formatNumberWithCommas, parseFormattedNumber, convertCurrency, cn, getCurrencyColor, getCurrencyBadgeClass } from '../../lib/utils';
import { POSReceiptData } from './POSReceiptModal';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { useModalScrollLock } from '../../lib/modalLock';

export type SellType = 'cash' | 'card' | 'debt' | 'installment';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalUSD: number;
  totalIQD: number;
  exchangeRate: number;
  cartCurrency: 'USD' | 'IQD';
  customer: { name: string; type: string; phone?: string } | null;
  initialSellType?: SellType;
  isInstallmentEligible?: boolean;
  onCompleteSale: (receiptData: POSReceiptData) => void;
}

export default function POSPaymentModal({
  isOpen,
  onClose,
  cart,
  subtotal,
  discount,
  taxAmount,
  totalUSD,
  totalIQD,
  exchangeRate,
  cartCurrency,
  customer,
  initialSellType = 'cash',
  isInstallmentEligible = true,
  onCompleteSale
}: POSPaymentModalProps) {
  const { t } = useTranslation();
  const { error: toastError, success } = useToast();

  // Active Sell Type
  const [sellType, setSellType] = useState<SellType>(initialSellType || 'cash');
  
  // Checkout Currency selection ($ USD vs IQD د.ع) is fixed to the cart's base currency
  const currency = cartCurrency;

  // Mobile toggle for cart item details
  const [showMobileItems, setShowMobileItems] = useState<boolean>(false);

  // Computed total in selected checkout currency
  const totalInSelectedCurrency = currency === 'USD' ? totalUSD : totalIQD;

  // Cash State
  const [cashReceived, setCashReceived] = useState<string>('');
  
  // Card / Electronic State
  const [cardProvider, setCardProvider] = useState<string>('POS Terminal');
  const [cardRef, setCardRef] = useState<string>('');

  // Debt State (Requires Name; phone is optional)
  const [debtCustomerName, setDebtCustomerName] = useState<string>(
    customer?.name && customer.name !== 'Walk-in Customer' ? customer.name : ''
  );
  const [debtCustomerPhone, setDebtCustomerPhone] = useState<string>(customer?.phone || '');
  const [debtCustomerIdCard, setDebtCustomerIdCard] = useState<string>('');
  const [debtCustomerAddress, setDebtCustomerAddress] = useState<string>('');
  const [debtDownPayment, setDebtDownPayment] = useState<string>('');
  const [debtDueDate, setDebtDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // default 30 days
    return d.toISOString().split('T')[0];
  });
  const [debtGuarantor, setDebtGuarantor] = useState<string>('');
  const [debtNotes, setDebtNotes] = useState<string>('');

  // Installment State (Requires Name; phone & ID Card optional)
  const [instCustomerName, setInstCustomerName] = useState<string>(
    customer?.name && customer.name !== 'Walk-in Customer' ? customer.name : ''
  );
  const [instCustomerPhone, setInstCustomerPhone] = useState<string>(customer?.phone || '');
  const [instCustomerIdCard, setInstCustomerIdCard] = useState<string>('');
  const [instCustomerAddress, setInstCustomerAddress] = useState<string>('');
  const [instGuarantorName, setInstGuarantorName] = useState<string>('');
  const [instGuarantorPhone, setInstGuarantorPhone] = useState<string>('');
  const [instGuarantorIdCard, setInstGuarantorIdCard] = useState<string>('');
  const [instGuarantorAddress, setInstGuarantorAddress] = useState<string>('');
  
  // Prepaid / Down Payment
  const [instDownPayment, setInstDownPayment] = useState<string>('');
  
  // Additional Money / Profit / Fee
  const [instAdditionalFee, setInstAdditionalFee] = useState<string>('');
  
  // Installment Months & Monthly Calculation Mode
  const [instCalcMode, setInstCalcMode] = useState<'months' | 'monthly_amount'>('months');
  const [instMonths, setInstMonths] = useState<number>(6);
  const [instMonthlyPaymentInput, setInstMonthlyPaymentInput] = useState<string>('');
  const [instFirstDueDate, setInstFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(true);
  const [instNotes, setInstNotes] = useState<string>('');

  // General sale note
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Sync customer details when selected in POS
  useEffect(() => {
    if (customer && customer.name && customer.name !== 'Walk-in Customer') {
      setInstCustomerName(customer.name);
      if (customer.phone) setInstCustomerPhone(customer.phone);
      setDebtCustomerName(customer.name);
      if (customer.phone) setDebtCustomerPhone(customer.phone);
    }
  }, [customer?.name, customer?.phone]);

  // Reset or update sellType whenever modal opens or initialSellType changes
  useEffect(() => {
    if (isOpen) {
      setSellType(initialSellType || 'cash');
    }
  }, [isOpen, initialSellType]);

  // Clear cash/downpayment when switching currency
  useEffect(() => {
    setCashReceived('');
    setDebtDownPayment('');
    setInstDownPayment('');
    setInstAdditionalFee('');
  }, [currency]);

  // Cash Calculations
  const parsedCash = cashReceived === '' ? totalInSelectedCurrency : parseFormattedNumber(cashReceived);
  const cashChange = Math.max(0, parsedCash - totalInSelectedCurrency);
  const cashShortage = Math.max(0, totalInSelectedCurrency - parsedCash);

  // Quick cash options
  const getQuickCashOptions = () => {
    if (currency === 'USD') {
      const exact = Math.ceil(totalUSD);
      return [
        exact,
        Math.ceil(exact / 5) * 5,
        Math.ceil(exact / 10) * 10,
        Math.ceil(exact / 50) * 50,
        Math.ceil(exact / 100) * 100
      ].filter((v, i, a) => v >= totalUSD && a.indexOf(v) === i).slice(0, 4);
    } else {
      const exact = Math.ceil(totalIQD / 1000) * 1000;
      return [
        exact,
        Math.ceil(exact / 10000) * 10000,
        Math.ceil(exact / 25000) * 25000,
        Math.ceil(exact / 50000) * 50000,
        Math.ceil(exact / 100000) * 100000
      ].filter((v, i, a) => v >= totalIQD && a.indexOf(v) === i).slice(0, 4);
    }
  };

  // Debt Calculations
  const parsedDebtDown = parseFormattedNumber(debtDownPayment);
  const debtRemainingBalance = Math.max(0, totalInSelectedCurrency - parsedDebtDown);

  // Installment Calculations
  const parsedInstDown = parseFormattedNumber(instDownPayment);
  const parsedAdditionalFee = parseFormattedNumber(instAdditionalFee);
  
  // Total Agreement = Principal Total + Additional Money
  const instTotalWithFee = totalInSelectedCurrency + parsedAdditionalFee;
  // Financed Balance = Total Agreement - Down Payment
  const instFinancedAmount = Math.max(0, instTotalWithFee - parsedInstDown);

  // Sync Monthly Payment input and duration months when parameters change
  const handleMonthlyPaymentInputChange = (val: string) => {
    if (!val || val.trim() === '') {
      setInstMonthlyPaymentInput('');
      return;
    }
    const formatted = formatNumberWithCommas(val);
    setInstMonthlyPaymentInput(formatted);
    const parsedMonthly = parseFormattedNumber(formatted);
    if (parsedMonthly > 0 && instFinancedAmount > 0) {
      const calculatedMonths = Math.max(1, Math.ceil(instFinancedAmount / parsedMonthly));
      setInstMonths(calculatedMonths);
    }
  };

  const handleClearMonthlyPaymentInput = () => {
    sound.playClick();
    setInstMonthlyPaymentInput('');
  };

  const handleMonthsChange = (months: number) => {
    const validMonths = Math.max(1, months);
    setInstMonths(validMonths);
    setInstMonthlyPaymentInput('');
  };

  const defaultMonthlyPayment = useMemo(() => {
    if (instMonths <= 0 || instFinancedAmount <= 0) return 0;
    return currency === 'USD' 
      ? parseFloat((instFinancedAmount / instMonths).toFixed(2)) 
      : Math.ceil(instFinancedAmount / instMonths);
  }, [instMonths, instFinancedAmount, currency]);

  const instMonthlyPayment = useMemo(() => {
    if (instMonths <= 0 || instFinancedAmount <= 0) return 0;
    if (instCalcMode === 'monthly_amount' && instMonthlyPaymentInput) {
      const parsed = parseFormattedNumber(instMonthlyPaymentInput);
      if (parsed > 0) return parsed;
    }
    return defaultMonthlyPayment;
  }, [instMonths, instFinancedAmount, instCalcMode, instMonthlyPaymentInput, defaultMonthlyPayment]);

  // Generate Month-by-Month Schedule
  const installmentSchedule = useMemo(() => {
    if (instMonths <= 0 || instFinancedAmount <= 0) return [];
    const schedule = [];
    const startDate = new Date(instFirstDueDate || new Date());
    
    const basePayment = currency === 'USD' ? parseFloat((instFinancedAmount / instMonths).toFixed(2)) : Math.floor(instFinancedAmount / instMonths);
    let accumulated = 0;

    for (let i = 1; i <= instMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + (i - 1));
      const dateStr = dueDate.toISOString().split('T')[0];

      let monthAmount = basePayment;
      if (i === instMonths) {
        monthAmount = Math.max(0, currency === 'USD' ? parseFloat((instFinancedAmount - accumulated).toFixed(2)) : (instFinancedAmount - accumulated));
      } else {
        accumulated += basePayment;
      }

      schedule.push({
        month: i,
        dueDate: dateStr,
        amount: monthAmount
      });
    }
    return schedule;
  }, [instMonths, instFinancedAmount, instFirstDueDate, currency]);

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();

    if ((cart?.length || 0) === 0) {
      sound.playAlert();
      toastError(t('pos.emptyCartPrompt', 'Please select at least one mobile, tablet, or item first'));
      return;
    }

    if (sellType === 'debt' && !debtCustomerName.trim()) {
      sound.playAlert();
      toastError(t('payment.nameRequiredDebt', 'Customer Name is required for Debt sales'));
      return;
    }

    if (sellType === 'installment' && !instCustomerName.trim()) {
      sound.playAlert();
      toastError(t('payment.nameRequiredInst', 'Customer Name is required for Installment contracts'));
      return;
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let finalCustomer: any = {
      name: customer?.name || 'Walk-in Customer',
      phone: ''
    };

    if (sellType === 'debt') {
      finalCustomer = {
        name: debtCustomerName.trim(),
        phone: debtCustomerPhone.trim() || undefined,
        idCard: debtCustomerIdCard.trim() || undefined,
        address: debtCustomerAddress.trim() || undefined,
        guarantorName: debtGuarantor.trim() || undefined
      };
    } else if (sellType === 'installment') {
      finalCustomer = {
        name: instCustomerName.trim(),
        phone: instCustomerPhone.trim() || undefined,
        idCard: instCustomerIdCard.trim() || undefined,
        address: instCustomerAddress.trim() || undefined,
        guarantorName: instGuarantorName.trim() || undefined,
        guarantorPhone: instGuarantorPhone.trim() || undefined,
        guarantorIdCard: instGuarantorIdCard.trim() || undefined,
        guarantorAddress: instGuarantorAddress.trim() || undefined
      };
    }

    const itemsSummary = (cart || []).map(item => {
      const activePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
      return {
        id: item.product.id,
        name: item.product.name,
        type: item.product.type,
        detail: item.product.detail,
        barcode: item.product.barcode,
        quantity: item.quantity,
        price: activePrice,
        currency: item.product.currency,
        discount: item.discount
      };
    });

    const finalTotal = sellType === 'installment' ? instTotalWithFee : totalInSelectedCurrency;
    const finalSubtotal = sellType === 'installment' ? (instTotalWithFee + (discount || 0) - (taxAmount || 0)) : subtotal;

    const receipt: POSReceiptData = {
      invoiceNo,
      date: dateStr,
      time: timeStr,
      sellType,
      customer: finalCustomer,
      items: itemsSummary,
      subtotal: finalSubtotal,
      discount: discount,
      tax: taxAmount,
      total: finalTotal,
      checkoutCurrency: currency,
      exchangeRate,

      // Sell specifics
      cashTendered: sellType === 'cash' ? parsedCash : undefined,
      cashChange: sellType === 'cash' ? cashChange : undefined,
      cardProvider: sellType === 'card' ? cardProvider : undefined,
      cardRef: sellType === 'card' ? cardRef : undefined,

      debtDownPayment: sellType === 'debt' ? parsedDebtDown : undefined,
      debtRemaining: sellType === 'debt' ? debtRemainingBalance : undefined,
      debtDueDate: sellType === 'debt' ? debtDueDate : undefined,

      installmentMonths: sellType === 'installment' ? instMonths : undefined,
      installmentDownPayment: sellType === 'installment' ? parsedInstDown : undefined,
      installmentAdditionalFee: sellType === 'installment' && parsedAdditionalFee > 0 ? parsedAdditionalFee : undefined,
      installmentMonthlyPayment: sellType === 'installment' ? instMonthlyPayment : undefined,
      installmentFirstDueDate: sellType === 'installment' ? instFirstDueDate : undefined,
      installmentSchedule: sellType === 'installment' ? installmentSchedule : undefined,

      notes: (sellType === 'debt' ? debtNotes : sellType === 'installment' ? instNotes : generalNotes) || undefined
    };

    sound.playPaymentSuccess();
    onCompleteSale(receipt);
  };

  const dualTotal = formatDualPrice(totalUSD, 'USD', exchangeRate);

  // Lock background scroll when payment modal is open
  useModalScrollLock(isOpen, 'pos-payment-modal');

  if (!isOpen) return null;

  return (
    <div 
      data-modal="true"
      data-modal-backdrop="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 touch-none overscroll-contain"
    >
      <div 
        className="w-full max-w-5xl bg-[#0c111d] border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[96vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Left Side (Desktop) & Top Summary Header (Mobile) */}
        <div className="w-full md:w-[320px] lg:w-[340px] bg-[#111728] p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
          
          {/* Top Bar with Dismiss and Currency */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">{t('pos.summary')}</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(cart || []).reduce((a, b) => a + b.quantity, 0)} Items
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={onClose}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Total Amount Due Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{t('payment.totalAmount')}</span>
              <span className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono",
                getCurrencyBadgeClass(currency)
              )}>
                {currency === 'USD' ? t('payment.currencyUSD') : t('payment.currencyIQD')}
              </span>
            </div>
            
            <div className={cn(
              "text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1",
              getCurrencyColor(currency)
            )}>
              {formatCurrency(sellType === 'installment' ? instTotalWithFee : totalInSelectedCurrency, currency)}
            </div>
            
            <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center justify-between">
              <span className={cn(currency === 'USD' ? 'text-sky-400/90' : 'text-amber-400/90')}>
                ≈ {currency === 'USD' ? dualTotal.secondary : dualTotal.primary}
              </span>
              {discount > 0 && (
                <span className="text-amber-400 text-[11px]">Disc: -{formatCurrency(discount, currency)}</span>
              )}
            </div>
          </div>

          {/* Mobile Item Expand/Collapse Toggle */}
          <div className="md:hidden mt-2">
            <button
              type="button"
              onClick={() => setShowMobileItems(prev => !prev)}
              className="w-full py-1.5 px-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs flex items-center justify-between cursor-pointer"
            >
              <span className="font-medium">View Item Details ({cart?.length || 0})</span>
              {showMobileItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Mini Item List (Always visible on Desktop, collapsible on Mobile) */}
          <div data-modal-scrollable="true" className={cn(
            "mt-3 space-y-1.5 text-xs overflow-y-auto max-h-36 md:max-h-56 pr-1 flex-1 overscroll-contain",
            showMobileItems ? "block" : "hidden md:block"
          )}>
            {(cart || []).map((item) => {
              const activePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
              const isOverridden = item.customPrice !== undefined && item.customPrice !== item.product.price;

              return (
                <div key={item.cartId} className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-slate-300 font-medium truncate">{item.product.name}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      {item.product.type === 'accessory' ? (
                        <span>Qty: {item.quantity}</span>
                      ) : (
                        <span className="text-indigo-400 font-medium">{t('pos.singleDevice', 'Single Device')}</span>
                      )}
                      {isOverridden && (
                        <span className="text-amber-400 bg-amber-500/10 px-1 rounded text-[9px]">Custom</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-mono font-semibold text-slate-200 text-xs">
                    {formatCurrency(
                      currency === 'USD' 
                        ? (item.product.currency === 'USD' ? activePrice * item.quantity : convertCurrency(activePrice * item.quantity, 'IQD', 'USD', exchangeRate))
                        : (item.product.currency === 'IQD' ? activePrice * item.quantity : convertCurrency(activePrice * item.quantity, 'USD', 'IQD', exchangeRate)),
                      currency
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Subtotal & Discount row */}
          <div className="hidden md:block mt-auto pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>{t('pos.subtotal')}:</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>{t('pos.discount')}:</span>
                <span>-{formatCurrency(discount, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sell Type Selection & Form */}
        <div className="flex-1 flex flex-col bg-[#080b14]/70 overflow-hidden">
          
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0e19] shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">{t('payment.title')}</h2>
              <p className="text-xs text-slate-400">{t('payment.method')}</p>
            </div>
            <button 
              onClick={onClose}
              className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content Area */}
          <form 
            onSubmit={handleFinish} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            data-modal-scrollable="true"
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 flex flex-col justify-between overscroll-contain"
          >
            
            <div className="space-y-4">
              {/* 4 Sell Type Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                
                {/* 1. Cash */}
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setSellType('cash'); }}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer relative",
                    sellType === 'cash'
                      ? "bg-emerald-600/15 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10 font-bold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs">{t('pos.cash')}</span>
                  {sellType === 'cash' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 shadow-sm" />
                  )}
                </button>

                {/* 2. Card */}
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setSellType('card'); }}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer relative",
                    sellType === 'card'
                      ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10 font-bold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">{t('pos.card')}</span>
                  {sellType === 'card' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 absolute top-2 right-2 shadow-sm" />
                  )}
                </button>

                {/* 3. Debt (قەرز) */}
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setSellType('debt'); }}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer relative",
                    sellType === 'debt'
                      ? "bg-amber-600/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10 font-bold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <Clock className="w-5 h-5" />
                  <span className="text-xs">{t('pos.debt')}</span>
                  {sellType === 'debt' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2 shadow-sm" />
                  )}
                </button>

                {/* 4. Installment (قیست) */}
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setSellType('installment'); }}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer relative",
                    sellType === 'installment'
                      ? "bg-cyan-600/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10 font-bold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <Layers className="w-5 h-5" />
                  <span className="text-xs">{t('pos.installment')}</span>
                  {sellType === 'installment' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2 right-2 shadow-sm" />
                  )}
                </button>

              </div>

              {/* --- 1. CASH FORM --- */}
              {sellType === 'cash' && (
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>{t('payment.cashReceived', { currency })}</span>
                      <span className="text-[11px] text-slate-400">{t('payment.totalAmount')}: {formatCurrency(totalInSelectedCurrency, currency)}</span>
                    </label>
                    <div className="relative">
                      <span className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm", currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                        {currency === 'USD' ? '$' : 'IQD'}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(formatNumberWithCommas(e.target.value))}
                        placeholder={formatNumberWithCommas(totalInSelectedCurrency)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/90 py-3 pl-12 pr-11 text-white text-lg font-mono font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                      {cashReceived && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setCashReceived('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                          title="Clear"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Cash Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => { sound.playClick(); setCashReceived(formatNumberWithCommas(totalInSelectedCurrency)); }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/20 transition-colors cursor-pointer"
                    >
                      {t('payment.exactAmount')} ({formatCurrency(totalInSelectedCurrency, currency)})
                    </button>
                    {getQuickCashOptions().map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { sound.playClick(); setCashReceived(formatNumberWithCommas(opt)); }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-700 transition-colors cursor-pointer"
                      >
                        {formatCurrency(opt, currency)}
                      </button>
                    ))}
                  </div>

                  {/* Change / Due Output */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">{t('payment.changeToReturn')}:</span>
                      <span className={cn(
                        "text-xl font-mono font-bold block mt-0.5",
                        cashChange > 0 ? "text-emerald-400" : "text-slate-400"
                      )}>
                        {formatCurrency(cashChange, currency)}
                      </span>
                    </div>
                    {cashShortage > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] text-rose-400 block font-medium">{t('payment.cashShortage')}:</span>
                        <span className="text-xl font-mono font-bold text-rose-400 block mt-0.5">
                          {formatCurrency(cashShortage, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- 2. CARD FORM --- */}
              {sellType === 'card' && (
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t('payment.cardTerminal')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['POS Terminal', 'FIB / FastPay', 'ZainCash', 'MasterCard / Visa'].map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => { sound.playClick(); setCardProvider(prov); }}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-xs text-center transition-all cursor-pointer",
                            cardProvider === prov
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold"
                              : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {prov}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t('payment.terminalRef')}
                    </label>
                    <input
                      type="text"
                      value={cardRef}
                      onChange={(e) => setCardRef(e.target.value)}
                      placeholder={t('payment.terminalRefPlaceholder')}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 px-3.5 text-slate-200 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* --- 3. DEBT / CREDIT FORM --- */}
              {sellType === 'debt' && (
                <div className="p-4 sm:p-5 bg-slate-900/80 border border-amber-500/40 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  
                  {/* Header alert */}
                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{t('payment.debtCustomerRequired')}</span>
                    </span>
                    <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {t('payment.debtCustomerRequiredBadge')}
                    </span>
                  </div>

                  {/* Customer Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                        <span>{t('payment.customerName')} <span className="text-rose-500">*</span></span>
                        <User className="w-3.5 h-3.5 text-amber-400" />
                      </label>
                      <input
                        type="text"
                        required
                        value={debtCustomerName}
                        onChange={(e) => setDebtCustomerName(e.target.value)}
                        placeholder={t('payment.customerNamePlaceholder', 'Customer Full Name *')}
                        className="w-full rounded-xl border border-amber-500/60 bg-slate-950 py-2.5 px-3.5 text-slate-100 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <span>{t('payment.customerPhone')}</span>
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                      </label>
                      <input
                        type="tel"
                        value={debtCustomerPhone}
                        onChange={(e) => setDebtCustomerPhone(e.target.value)}
                        placeholder="0750 000 0000"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-slate-200 text-sm font-mono focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Down Payment & Due Date Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          {t('payment.downPayment', { currency })}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            const half = Math.round(totalInSelectedCurrency / 2);
                            setDebtDownPayment(formatNumberWithCommas(half));
                          }}
                          className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded hover:bg-amber-500/20 cursor-pointer"
                        >
                          50% ({formatCurrency(Math.round(totalInSelectedCurrency / 2), currency)})
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={debtDownPayment}
                        onChange={(e) => setDebtDownPayment(formatNumberWithCommas(e.target.value))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-slate-200 text-sm font-mono focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('payment.dueDate')}
                      </label>
                      <input
                        type="date"
                        value={debtDueDate}
                        onChange={(e) => setDebtDueDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-slate-200 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
                      />
                      {/* Quick Due Days shortcuts */}
                      <div className="flex gap-1.5 mt-1.5">
                        {[7, 15, 30, 60].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              const d = new Date();
                              d.setDate(d.getDate() + days);
                              setDebtDueDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            +{days}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Remaining Debt Balance Display */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-amber-300 font-semibold block">{t('payment.remainingDebt')}:</span>
                      <span className="text-[11px] text-slate-400">{t('payment.totalAmount')} - {t('payment.downPayment', { currency })}</span>
                    </div>
                    <span className="font-mono font-black text-amber-400 text-lg sm:text-xl">
                      {formatCurrency(debtRemainingBalance, currency)}
                    </span>
                  </div>

                  {/* Additional Optional Info (Guarantor, ID, Address) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('payment.guarantorNotes')}</label>
                      <input
                        type="text"
                        value={debtGuarantor}
                        onChange={(e) => setDebtGuarantor(e.target.value)}
                        placeholder={t('payment.guarantorPlaceholder')}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-slate-300 text-xs focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('payment.addressNotes')}</label>
                      <input
                        type="text"
                        value={debtCustomerAddress}
                        onChange={(e) => setDebtCustomerAddress(e.target.value)}
                        placeholder={t('payment.customerAddressPlaceholder')}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-slate-300 text-xs focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --- 4. INSTALLMENT FORM --- */}
              {sellType === 'installment' && (
                <div className="p-4 sm:p-5 bg-slate-900/80 border border-cyan-500/40 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  
                  {/* Customer Information Box */}
                  <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{t('payment.customerDetails')}</span>
                      </span>
                      <span className="text-[10px] text-cyan-300/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {t('payment.debtCustomerRequiredBadge')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-200 mb-1">
                          {t('payment.customerName')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={instCustomerName}
                          onChange={(e) => setInstCustomerName(e.target.value)}
                          placeholder={t('payment.customerNamePlaceholder', 'Customer Full Name *')}
                          className="w-full rounded-xl border border-cyan-500/60 bg-slate-900 py-2.5 px-3 text-slate-100 text-xs focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          {t('payment.customerPhone')}
                        </label>
                        <input
                          type="tel"
                          value={instCustomerPhone}
                          onChange={(e) => setInstCustomerPhone(e.target.value)}
                          placeholder={t('payment.guarantorPhonePlaceholder', '0750 000 0000')}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-slate-200 text-xs font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          {t('payment.idCardNumber')}
                        </label>
                        <input
                          type="text"
                          value={instCustomerIdCard}
                          onChange={(e) => setInstCustomerIdCard(e.target.value)}
                          placeholder={t('payment.idCardPlaceholder', 'National ID or Passport')}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-slate-200 text-xs font-mono focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          {t('payment.customerAddress')}
                        </label>
                        <input
                          type="text"
                          value={instCustomerAddress}
                          onChange={(e) => setInstCustomerAddress(e.target.value)}
                          placeholder={t('payment.customerAddressPlaceholder', 'City, District, Address')}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-slate-200 text-xs focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Fields: Profit Fee, Down Payment, First Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* Profit Fee / Markup */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-amber-300">
                          {t('payment.additionalFee', { currency })}
                        </label>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={instAdditionalFee}
                        onChange={(e) => setInstAdditionalFee(formatNumberWithCommas(e.target.value))}
                        className="w-full rounded-xl border border-amber-500/40 bg-slate-950 py-2.5 px-3 text-amber-300 text-xs font-mono font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        placeholder="0"
                      />
                    </div>

                    {/* Down Payment */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          {t('payment.downPayment', { currency })}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            const quarter = Math.round(instTotalWithFee * 0.25);
                            setInstDownPayment(formatNumberWithCommas(quarter));
                          }}
                          className="text-[10px] text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded hover:bg-cyan-500/20 cursor-pointer"
                        >
                          25%
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={instDownPayment}
                        onChange={(e) => setInstDownPayment(formatNumberWithCommas(e.target.value))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-slate-200 text-xs font-mono font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        placeholder="0"
                      />
                    </div>

                    {/* First Due Date */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        {t('payment.firstDueDate')}
                      </label>
                      <input
                        type="date"
                        value={instFirstDueDate}
                        onChange={(e) => setInstFirstDueDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-slate-200 text-xs focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Calculation Mode: By Months vs By Monthly Target Amount */}
                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{t('payment.calcMethod')}</span>
                      <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setInstCalcMode('months');
                            setInstMonthlyPaymentInput('');
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer",
                            instCalcMode === 'months' 
                              ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" 
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {t('payment.byDuration')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setInstCalcMode('monthly_amount');
                            setInstMonthlyPaymentInput('');
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer",
                            instCalcMode === 'monthly_amount' 
                              ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" 
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {t('payment.byMonthlyAmount')}
                        </button>
                      </div>
                    </div>

                    {instCalcMode === 'months' ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-slate-400">{t('payment.installmentSchedule')}</label>
                          <span className="text-xs font-bold text-cyan-400 font-mono">{instMonths} {t('payment.months')}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {[3, 6, 9, 12, 18, 24].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                handleMonthsChange(m);
                              }}
                              className={cn(
                                "py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                instMonths === m
                                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-black"
                                  : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white"
                              )}
                            >
                              {m}m
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-slate-300">
                            {t('payment.targetMonthlyPayment', { currency })}
                          </label>
                          {instMonthlyPaymentInput && (
                            <button
                              type="button"
                              onClick={handleClearMonthlyPaymentInput}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>{t('payment.clear')}</span>
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs pointer-events-none select-none", currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                            {currency === 'USD' ? '$' : 'IQD'}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={instMonthlyPaymentInput}
                            onChange={(e) => handleMonthlyPaymentInputChange(e.target.value)}
                            onFocus={(e) => {
                              if (e.target.value) e.target.select();
                            }}
                            placeholder={defaultMonthlyPayment > 0 ? formatNumberWithCommas(defaultMonthlyPayment) : (currency === 'USD' ? '0.00' : '0')}
                            className="w-full rounded-xl border border-cyan-500/60 bg-slate-900 py-2.5 pl-12 pr-10 text-cyan-300 placeholder:text-slate-500 placeholder:font-normal text-sm font-mono font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                          />
                          {instMonthlyPaymentInput && (
                            <button
                              type="button"
                              onClick={handleClearMonthlyPaymentInput}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title={t('payment.clear')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>{t('payment.calculatedDuration')}:</span>
                          <span className="font-bold text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {instMonths} {instMonths === 1 ? t('payment.month') : t('payment.months')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculated Breakdown Card */}
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">{t('payment.totalAgreement')}</span>
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {formatCurrency(instTotalWithFee, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">{t('payment.financedBalance')}</span>
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {formatCurrency(instFinancedAmount, currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-cyan-300 block text-[11px] font-semibold">{t('payment.monthlyPayment')} ({instMonths} {instMonths === 1 ? t('payment.month') : t('payment.months')})</span>
                        <span className="font-mono font-black text-cyan-400 text-base sm:text-lg">
                          {formatCurrency(instMonthlyPayment, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Month-by-Month Schedule */}
                    <div className="pt-2 border-t border-cyan-500/20">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{t('payment.installmentSchedule')} ({installmentSchedule?.length || 0} {t('payment.months')})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFullSchedule(!showFullSchedule)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showFullSchedule ? t('payment.collapse') : t('payment.expand')}</span>
                          {showFullSchedule ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {showFullSchedule && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {installmentSchedule.map((sch) => (
                            <div 
                              key={sch.month}
                              className="p-2 rounded-lg bg-slate-950/90 border border-slate-800/90 flex items-center justify-between text-xs font-mono"
                            >
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-[10px] border border-cyan-500/20">
                                  {sch.month}
                                </span>
                                <span className="text-[11px] text-slate-400">{sch.dueDate}</span>
                              </div>
                              <span className="font-bold text-cyan-300">
                                {formatCurrency(sch.amount, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guarantor Details (Optional) */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{t('payment.guarantorDetails')}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('payment.guarantorName')}</label>
                        <input
                          type="text"
                          value={instGuarantorName}
                          onChange={(e) => setInstGuarantorName(e.target.value)}
                          placeholder={t('payment.guarantorPlaceholder')}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-slate-200 text-xs focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('payment.guarantorPhone')}</label>
                        <input
                          type="tel"
                          value={instGuarantorPhone}
                          onChange={(e) => setInstGuarantorPhone(e.target.value)}
                          placeholder="0750 000 0000"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-slate-200 text-xs font-mono focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* General Order Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('payment.generalNotes')}</label>
                <input
                  type="text"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder={t('payment.notesPlaceholder')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-3 shrink-0">
              <button
                type="button"
                id="btn-modal-cancel-sale"
                onClick={onClose}
                className="py-3 px-4 sm:px-5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-sm transition-colors cursor-pointer"
              >
                {t('payment.cancel')}
              </button>
              <button
                type="submit"
                id="btn-modal-complete-sale"
                className="flex-1 py-3.5 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Check className="w-5 h-5" />
                <span>{t('payment.confirm')} ({formatCurrency(sellType === 'installment' ? instTotalWithFee : totalInSelectedCurrency, currency)})</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
