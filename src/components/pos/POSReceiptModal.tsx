import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Printer, 
  CheckCircle2, 
  X, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Clock, 
  Layers,
  Send,
  Download
} from 'lucide-react';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { exportElementToPDF } from '../../lib/pdfUtils';
import { sound } from '../../lib/sound';

export interface POSReceiptData {
  invoiceNo: string;
  date: string;
  time: string;
  sellType: 'cash' | 'card' | 'debt' | 'installment';
  customer?: {
    name: string;
    phone?: string;
    idCard?: string;
    address?: string;
    guarantorName?: string;
    guarantorPhone?: string;
  };
  items: Array<{
    id: string;
    name: string;
    type: 'mobile' | 'accessory';
    detail?: string;
    barcode?: string;
    quantity: number;
    price: number;
    currency: 'USD' | 'IQD';
    discount?: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  checkoutCurrency: 'USD' | 'IQD';
  exchangeRate: number;
  
  // Payment specifics
  cashTendered?: number;
  cashChange?: number;
  cardProvider?: string;
  cardRef?: string;
  
  // Debt specifics
  debtDownPayment?: number;
  debtRemaining?: number;
  debtDueDate?: string;
  
  // Installment specifics
  installmentMonths?: number;
  installmentDownPayment?: number;
  installmentAdditionalFee?: number; // additional money / interest / fee
  installmentMonthlyPayment?: number;
  installmentFirstDueDate?: string;
  installmentSchedule?: Array<{
    month: number;
    dueDate: string;
    amount: number;
  }>;
  
  notes?: string;
}

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
  receiptData: POSReceiptData | null;
}

export default function POSReceiptModal({
  isOpen,
  onClose,
  onNewSale,
  receiptData
}: POSReceiptModalProps) {
  const { t, i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const handleExportPDF = async () => {
    sound.playClick();
    setIsExporting(true);
    try {
      await exportElementToPDF('printable-receipt', `Receipt_${receiptData.invoiceNo}.pdf`);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsApp = () => {
    sound.playClick();
    const phone = receiptData.customer?.phone ? receiptData.customer.phone.replace(/[^0-9]/g, '') : '';
    const itemsList = receiptData.items.map((i) => {
      const isAccessory = i.type === 'accessory';
      const prefix = isAccessory ? `• ${i.quantity}x ` : `• `;
      return `${prefix}${i.name} (${formatCurrency(i.price * i.quantity, i.currency)})`;
    }).join('\n');
    const msg = isKurdish
      ? `*NALI MOBILE - پسوولەی کڕین*
━━━━━━━━━━━━━━━━━━━━
📄 *پسوولە:* ${receiptData.invoiceNo}
📅 *بەروار:* ${receiptData.date} ${receiptData.time}
👤 *کڕیار:* ${receiptData.customer?.name || 'کڕیار'}
━━━━━━━━━━━━━━━━━━━━
🛒 *کاڵاکان:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💰 *کۆی گشتی:* ${formatCurrency(receiptData.total, receiptData.checkoutCurrency)}
💳 *جۆری پارەدان:* ${receiptData.sellType === 'cash' ? 'نەخت' : receiptData.sellType === 'debt' ? 'قەرز' : receiptData.sellType === 'installment' ? 'قیست' : 'کارت'}
${receiptData.sellType === 'debt' ? `🔴 *بڕی قەرز:* ${formatCurrency(receiptData.debtRemaining || 0, receiptData.checkoutCurrency)}` : ''}
${receiptData.sellType === 'installment' ? `📊 *قیستی مانگانە:* ${formatCurrency(receiptData.installmentMonthlyPayment || 0, receiptData.checkoutCurrency)} (${receiptData.installmentMonths} مانگ)` : ''}
━━━━━━━━━━━━━━━━━━━━
سوپاس بۆ متمانەتان بە نالی مۆبایل 
📞 پەیوەندی: +964 750 000 0000`
      : `*NALI MOBILE - Sales Receipt*
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice:* ${receiptData.invoiceNo}
📅 *Date:* ${receiptData.date} ${receiptData.time}
👤 *Customer:* ${receiptData.customer?.name || 'Customer'}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💰 *Total:* ${formatCurrency(receiptData.total, receiptData.checkoutCurrency)}
💳 *Payment Method:* ${receiptData.sellType.toUpperCase()}
${receiptData.sellType === 'debt' ? `🔴 *Debt Balance:* ${formatCurrency(receiptData.debtRemaining || 0, receiptData.checkoutCurrency)}` : ''}
${receiptData.sellType === 'installment' ? `📊 *Monthly Payment:* ${formatCurrency(receiptData.installmentMonthlyPayment || 0, receiptData.checkoutCurrency)} (${receiptData.installmentMonths} Months)` : ''}
━━━━━━━━━━━━━━━━━━━━
Thank you for choosing Nali Mobile!
📞 Contact: +964 750 000 0000`;

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const getSellTypeBadge = () => {
    switch (receiptData.sellType) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Banknote className="w-3.5 h-3.5" />
            {t('posReceipt.cashBadge')}
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <CreditCard className="w-3.5 h-3.5" />
            {t('posReceipt.cardBadge')} ({receiptData.cardProvider || 'POS'})
          </span>
        );
      case 'debt':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            {t('posReceipt.debtBadge')}
          </span>
        );
      case 'installment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-3.5 h-3.5" />
            {t('posReceipt.installmentBadge', { months: receiptData.installmentMonths })}
          </span>
        );
      default:
        return null;
    }
  };

  const dualTotal = formatDualPrice(receiptData.total, receiptData.checkoutCurrency, receiptData.exchangeRate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#0e1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#080b14]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Transaction Completed</h3>
              <p className="text-xs text-slate-400">Invoice #{receiptData.invoiceNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Share via WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div 
            ref={receiptRef}
            id="printable-receipt"
            className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 text-slate-200 shadow-inner space-y-5"
          >
            {/* Store Branding */}
            <div className="text-center pb-4 border-b border-slate-800/80 space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-white">
                NALI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">MOBILE</span>
              </h2>
              <p className="text-xs text-slate-400">Smartphones, Accessories & Tech Services</p>
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span>Erbil / Sulaymaniyah, Kurdistan</span>
                <span>•</span>
                <span>+964 750 000 0000</span>
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[11px]">{t('posReceipt.invoiceNo')}</span>
                <span className="font-mono font-semibold text-slate-200">{receiptData.invoiceNo}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">{t('posReceipt.dateTime')}</span>
                <span className="font-mono text-slate-200">{receiptData.date} {receiptData.time}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{t('posReceipt.paymentMode')}</span>
                <div className="mt-0.5">{getSellTypeBadge()}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">{t('posReceipt.exchangeRate')}</span>
                <span className="font-mono text-slate-300">$1 = {receiptData.exchangeRate.toLocaleString()} IQD</span>
              </div>
            </div>

            {/* Customer Details if any */}
            {receiptData.customer?.name && receiptData.customer.name !== 'Walk-in Customer' && (
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('posReceipt.customer')}:</span>
                  <span className="font-semibold text-white">{receiptData.customer.name}</span>
                </div>
                {receiptData.customer.phone && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t('posReceipt.phone')}:</span>
                    <span className="font-mono text-slate-300">{receiptData.customer.phone}</span>
                  </div>
                )}
                {receiptData.customer.idCard && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t('posReceipt.idCard')}:</span>
                    <span className="font-mono text-cyan-300">{receiptData.customer.idCard}</span>
                  </div>
                )}
                {receiptData.customer.guarantorName && (
                  <div className="flex justify-between text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-slate-500">{t('posReceipt.guarantor')}:</span>
                    <span className="text-slate-300">{receiptData.customer.guarantorName} ({receiptData.customer.guarantorPhone || 'N/A'})</span>
                  </div>
                )}
              </div>
            )}

            {/* Itemized list */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('posReceipt.purchasedItems')}</div>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                {receiptData.items.map((item, idx) => {
                  const itemDual = formatDualPrice(item.price * item.quantity, item.currency, receiptData.exchangeRate);
                  return (
                    <div key={idx} className="p-3 bg-slate-950/30 flex items-start justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-100 flex items-center gap-2">
                          {item.type === 'accessory' && (
                            <span className="text-indigo-400 font-mono font-bold">{item.quantity}x</span>
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.detail && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.detail}</div>
                        )}
                        {item.barcode && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">IMEI/SN: {item.barcode}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-white font-mono">{itemDual.primary}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{itemDual.secondary}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals Section */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{t('posReceipt.subtotal')}</span>
                <span className="font-mono text-slate-200">{formatCurrency(receiptData.subtotal, receiptData.checkoutCurrency)}</span>
              </div>
              {receiptData.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>{t('posReceipt.discount')}</span>
                  <span className="font-mono">-{formatCurrency(receiptData.discount, receiptData.checkoutCurrency)}</span>
                </div>
              )}
              {receiptData.tax > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>{t('posReceipt.tax')}</span>
                  <span className="font-mono">{formatCurrency(receiptData.tax, receiptData.checkoutCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/80 text-sm font-bold text-white">
                <span>{t('posReceipt.totalAmountDue')}</span>
                <div className="text-right">
                  <span className="text-lg text-emerald-400 font-mono block">{dualTotal.primary}</span>
                  <span className="text-xs text-slate-400 font-mono font-normal">≈ {dualTotal.secondary}</span>
                </div>
              </div>
            </div>

            {/* Sell Type Breakdown specifics */}
            {receiptData.sellType === 'cash' && receiptData.cashTendered !== undefined && (
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('posReceipt.cashTendered')}:</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    {formatCurrency(receiptData.cashTendered, receiptData.checkoutCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('posReceipt.changeReturned')}:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {formatCurrency(receiptData.cashChange || 0, receiptData.checkoutCurrency)}
                  </span>
                </div>
              </div>
            )}

            {receiptData.sellType === 'debt' && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('posReceipt.initialDownPayment')}:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatCurrency(receiptData.debtDownPayment || 0, receiptData.checkoutCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400 font-semibold">{t('posReceipt.remainingDebt')}:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatCurrency(receiptData.debtRemaining || 0, receiptData.checkoutCurrency)}
                  </span>
                </div>
                {receiptData.debtDueDate && (
                  <div className="flex justify-between pt-1 border-t border-amber-500/20 text-[11px]">
                    <span className="text-slate-400">{t('posReceipt.dueDate')}:</span>
                    <span className="font-mono text-amber-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {receiptData.debtDueDate}
                    </span>
                  </div>
                )}
              </div>
            )}

            {receiptData.sellType === 'installment' && (
              <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">{t('posReceipt.prepaidDownPayment')}</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {formatCurrency(receiptData.installmentDownPayment || 0, receiptData.checkoutCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">{t('posReceipt.duration')}</span>
                    <span className="font-semibold text-cyan-300">{receiptData.installmentMonths} {t('posReceipt.months')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-cyan-500/20 flex justify-between items-center">
                  <span className="text-cyan-300 font-semibold">{t('posReceipt.monthlyPayment')}:</span>
                  <span className="font-mono font-black text-cyan-400 text-base">
                    {formatCurrency(receiptData.installmentMonthlyPayment || 0, receiptData.checkoutCurrency)} / mo
                  </span>
                </div>

                {/* Full Monthly Schedule */}
                {Array.isArray(receiptData.installmentSchedule) && receiptData.installmentSchedule.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                      <span>{t('posReceipt.monthlySchedule')}</span>
                      <span className="font-mono text-cyan-400">{t('posReceipt.paymentsCount', { count: (receiptData.installmentSchedule || []).length })}</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                      {(receiptData.installmentSchedule || []).map((sch) => (
                        <div key={sch.month} className="flex justify-between items-center bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
                          <span className="text-slate-300 font-medium">{t('posReceipt.month')} {sch.month} ({sch.dueDate})</span>
                          <span className="font-bold text-cyan-300">{formatCurrency(sch.amount, receiptData.checkoutCurrency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {receiptData.installmentFirstDueDate && !receiptData.installmentSchedule && (
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>{t('posReceipt.firstPaymentDue')}:</span>
                    <span className="font-mono text-slate-300">{receiptData.installmentFirstDueDate}</span>
                  </div>
                )}
              </div>
            )}

            {receiptData.notes && (
              <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">{t('posReceipt.notes')}:</span>
                {receiptData.notes}
              </div>
            )}

            <div className="text-center pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-0.5">
              <p>{t('posReceipt.thankYou')}</p>
              <p>{t('posReceipt.warrantyNote')}</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-5 border-t border-slate-800/80 bg-[#080b14]/80 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-slate-700 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>{t('posReceipt.printReceipt')}</span>
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('posReceipt.newSale')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
