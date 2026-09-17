import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Phone, User, Calendar, Receipt, DollarSign, Download, Send } from 'lucide-react';
import { exportElementToPDF } from '../../lib/pdfUtils';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { Debt, DebtPayment } from '../../types/debt';
import { sound } from '../../lib/sound';
import { useTranslation } from 'react-i18next';

interface DebtReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  payment: DebtPayment;
  exchangeRate?: number;
}

export default function DebtReceiptModal({
  isOpen,
  onClose,
  debt,
  payment,
  exchangeRate = 1500
}: DebtReceiptModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    sound.playClick();
    await exportElementToPDF('printable-debt-receipt', `receipt_${payment.receiptNumber}.pdf`);
  };

  const handleWhatsApp = () => {
    sound.playClick();
    if (!debt.customerPhone) {
      alert(t('debts.statementModal.noPhoneAlert'));
      return;
    }
    const cleanPhone = debt.customerPhone.replace(/[^0-9]/g, '');
    const text = `Nali Mobile Shop\nReceipt No: ${payment.receiptNumber}\nAmount Paid: ${formatCurrency(payment.amount, payment.currency)}\nRemaining Balance: ${formatCurrency(debt.remainingAmount, debt.currency)}\nThank you!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121829] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0b0f1a] print:hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>{t('debts.receiptModal.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('debts.receiptModal.whatsApp')}</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('debts.receiptModal.exportPdf')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-debt-receipt" className="p-6 overflow-y-auto space-y-5 bg-white text-slate-900 print:p-0 print:m-0 font-sans">
          {/* Store Logo & Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              NALI <span className="text-indigo-600">MOBILE</span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Mobile Phones • Accessories • Repair & Services</p>
            <p className="text-[11px] text-slate-500">Erbil / Sulaymaniyah, Kurdistan Region, Iraq</p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-300">
              {t('debts.receiptModal.voucherBadge')}
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-3">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('debts.receiptModal.receiptNo')}</span>
              <span className="font-mono font-bold text-slate-900">{payment.receiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('debts.receiptModal.dateTime')}</span>
              <span className="font-medium text-slate-800">
                {new Date(payment.paymentDate).toLocaleString('en-GB', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('debts.receiptModal.customerName')}</span>
              <span className="font-bold text-slate-900">{debt.customerName}</span>
              {debt.customerPhone && (
                <span className="block text-[11px] text-slate-600">{debt.customerPhone}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('debts.receiptModal.paymentMethod')}</span>
              <span className="font-semibold uppercase text-indigo-700">{payment.paymentMethod}</span>
            </div>
          </div>

          {/* Product / Reference */}
          {debt.productSummary && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-slate-500 text-[10px] font-semibold uppercase block">{t('debts.receiptModal.productItem')}</span>
              <p className="font-medium text-slate-800">{debt.productSummary}</p>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div className="space-y-2 border-b border-slate-200 pb-4 text-xs">
            <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
              <span className="text-slate-600">{t('debts.receiptModal.totalOriginalDebt')}</span>
              <span className="font-semibold text-slate-800">{formatCurrency(debt.originalAmount, debt.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-700 bg-emerald-50 px-2 rounded font-semibold text-sm">
              <span>{t('debts.receiptModal.amountPaidNow')}</span>
              <span>{formatCurrency(payment.amount, payment.currency)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-dashed border-slate-200">
              <span className="text-slate-600">{t('debts.receiptModal.totalPaidToDate')}</span>
              <span className="font-semibold text-slate-800">{formatCurrency(debt.paidAmount, debt.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-rose-700 font-bold text-sm bg-rose-50 px-2 rounded">
              <span>{t('debts.receiptModal.remainingBalance')}</span>
              <span>{formatCurrency(debt.remainingAmount, debt.currency)}</span>
            </div>
          </div>

          {/* Dual Currency Reference */}
          <div className="text-center text-[11px] text-slate-500 py-1">
            <span>{t('debts.receiptModal.approxEquivalent')} </span>
            <span className="font-semibold text-slate-700">
              {formatDualPrice(payment.amount, payment.currency, exchangeRate).secondary}
            </span>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="text-xs p-2 bg-slate-50 border border-slate-200 rounded text-slate-700">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">{t('debts.receiptModal.note')}</span>
              {payment.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span className="text-[11px]">{t('debts.receiptModal.customerSignature')}</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span className="text-[11px]">{t('debts.receiptModal.authorizedCashier')}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 pt-2">
            {t('debts.receiptModal.thankYouNote')}
          </div>
        </div>

        {/* Modal footer for screen */}
        <div className="p-3 border-t border-slate-800 bg-[#0b0f1a] flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            {t('debts.receiptModal.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
