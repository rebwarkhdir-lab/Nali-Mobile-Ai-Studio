import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Building2, 
  CheckCircle2, 
  Banknote, 
  Calendar, 
  Receipt, 
  User, 
  FileText, 
  ShieldCheck 
} from 'lucide-react';
import { SupplierPaymentVoucher, Supplier } from '../../types/supplier';
import { formatCurrency, formatDualPrice, cn } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface SupplierPaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: SupplierPaymentVoucher | null;
  supplier?: Supplier | null;
}

export default function SupplierPaymentVoucherModal({
  isOpen,
  onClose,
  voucher,
  supplier
}: SupplierPaymentVoucherModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  if (!isOpen || !voucher) return null;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        dir={isKu ? 'rtl' : 'ltr'} 
        className="bg-[#0f1422] border border-slate-700/80 rounded-3xl w-full max-w-lg text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {t('suppliers.paymentVoucherModal.title')}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {voucher.voucherNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('suppliers.paymentVoucherModal.print')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div className="p-6 space-y-5 bg-[#0f1422]">
          {/* Shop & Status Banner */}
          <div className="text-center pb-4 border-b border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
              {t('suppliers.paymentVoucherModal.shopSystem')}
            </div>
            <div className="text-xl font-extrabold text-white">
              {t('suppliers.paymentVoucherModal.officialVoucher')}
            </div>
            <div className="text-xs text-slate-400">
              {t('suppliers.paymentVoucherModal.voucherSubtitle')}
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-[#141d2e] to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              {t('suppliers.paymentVoucherModal.totalAmountPaid')}
            </div>
            <div className="text-3xl font-extrabold text-white font-mono mt-1">
              {formatCurrency(voucher.amount, voucher.currency)}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              {t('suppliers.paymentVoucherModal.paidVia', { method: voucher.paymentMethod.replace('_', ' ').toUpperCase() })}
            </div>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="bg-[#141b2d] border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">{t('suppliers.paymentVoucherModal.paidTo')}</span>
              <strong className="text-white text-sm font-semibold">{voucher.supplierName}</strong>
            </div>

            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">{t('suppliers.paymentVoucherModal.paymentDate')}</span>
              <span className="text-slate-200 font-mono">{voucher.paymentDate}</span>
            </div>

            {voucher.invoiceNumber && (
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">{t('suppliers.paymentVoucherModal.againstBill')}</span>
                <span className="text-indigo-300 font-mono font-semibold">#{voucher.invoiceNumber}</span>
              </div>
            )}

            {voucher.exchangeOfficeOrBank && (
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">{t('suppliers.paymentVoucherModal.bankAgent')}</span>
                <span className="text-slate-200">{voucher.exchangeOfficeOrBank}</span>
              </div>
            )}

            {voucher.receiptNumber && (
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">{t('suppliers.paymentVoucherModal.bankSlip')}</span>
                <span className="text-slate-200 font-mono">{voucher.receiptNumber}</span>
              </div>
            )}

            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">{t('suppliers.paymentVoucherModal.authorizedBy')}</span>
              <span className="text-slate-200">{voucher.paidBy || 'Store Cashier'}</span>
            </div>

            {voucher.notes && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">{t('suppliers.paymentVoucherModal.notes')}</span>
                <span className={cn("text-slate-300 max-w-xs", isKu ? "text-left" : "text-right")}>{voucher.notes}</span>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-4 grid grid-cols-2 gap-6 text-center text-[11px] text-slate-400">
            <div>
              <div className="h-10 border-b border-dashed border-slate-700 mb-1"></div>
              <span>{t('suppliers.paymentVoucherModal.cashierStamp')}</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-700 mb-1"></div>
              <span>{t('suppliers.paymentVoucherModal.recipientSignature')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0b0f1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            {t('suppliers.paymentVoucherModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
