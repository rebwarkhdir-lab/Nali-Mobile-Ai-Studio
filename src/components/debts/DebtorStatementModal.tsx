import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Send, 
  Phone, 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  Copy, 
  Check, 
  ShieldCheck, 
  Receipt,
  MessageCircle,
  Plus
} from 'lucide-react';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { exportElementToPDF } from '../../lib/pdfUtils';
import { Download } from 'lucide-react';
import { Debt, DebtPayment } from '../../types/debt';
import { sound } from '../../lib/sound';
import { useTranslation } from 'react-i18next';

interface DebtorStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  exchangeRate?: number;
  onRecordPaymentClick: () => void;
}

export default function DebtorStatementModal({
  isOpen,
  onClose,
  debt,
  exchangeRate = 1500,
  onRecordPaymentClick
}: DebtorStatementModalProps) {
  const { t } = useTranslation();
  const [copiedReminder, setCopiedReminder] = useState(false);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    sound.playClick();
    await exportElementToPDF('printable-debt-statement', `statement_${debt.id}.pdf`);
  };

  const reminderText = t('debts.statementModal.reminderGreeting', {
    customer: debt.customerName,
    amount: formatCurrency(debt.remainingAmount, debt.currency),
    dueDate: debt.dueDate
  });

  const handleCopyReminder = () => {
    sound.playClick();
    navigator.clipboard.writeText(reminderText);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  };

  const handleWhatsAppReminder = () => {
    sound.playClick();
    if (!debt.customerPhone) {
      alert(t('debts.statementModal.noPhoneAlert'));
      return;
    }
    const cleanPhone = debt.customerPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121829] border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1322] print:hidden">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <FileText className="w-5 h-5" />
            <span>{t('debts.statementModal.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppReminder}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('debts.statementModal.whatsApp')}</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('debts.statementModal.exportPdf')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div id="printable-debt-statement" className="p-6 overflow-y-auto space-y-5 bg-[#0b0f1a] print:bg-white print:text-slate-900 font-sans text-xs">
          
          {/* Printable Header */}
          <div className="hidden print:block text-center border-b border-slate-300 pb-4 mb-4">
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              NALI <span className="text-indigo-600">MOBILE</span>
            </h1>
            <p className="text-xs text-slate-500">{t('debts.statementModal.storeSubtitle')}</p>
          </div>

          {/* Profile & KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#13192c] print:bg-slate-50 border border-slate-800 print:border-slate-300">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">{t('debts.statementModal.customerProfile')}</span>
              <p className="text-sm font-bold text-white print:text-slate-900">{debt.customerName}</p>
              {debt.customerPhone && (
                <p className="text-[11px] text-slate-400 print:text-slate-600 mt-0.5">{debt.customerPhone}</p>
              )}
              {debt.customerIdCard && (
                <p className="text-[10px] text-slate-500 mt-1">ID: {debt.customerIdCard}</p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-[#13192c] print:bg-slate-50 border border-slate-800 print:border-slate-300">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">{t('debts.statementModal.totalAndPaid')}</span>
              <p className="text-sm font-bold text-slate-200 print:text-slate-800">
                {formatCurrency(debt.originalAmount, debt.currency)}
              </p>
              <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                {t('debts.statementModal.paid')} {formatCurrency(debt.paidAmount, debt.currency)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/20 print:bg-rose-50 border border-rose-800/40 print:border-rose-300">
              <span className="text-[10px] text-rose-400 uppercase font-semibold block mb-1">{t('debts.statementModal.currentBalance')}</span>
              <p className="text-base font-bold text-rose-400 print:text-rose-700">
                {formatCurrency(debt.remainingAmount, debt.currency)}
              </p>
              <p className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
                {t('debts.statementModal.due')} <strong className="text-slate-200 print:text-slate-800">{debt.dueDate}</strong>
              </p>
            </div>
          </div>

          {/* Reference & Guarantor Info */}
          {(debt.productSummary || debt.guarantorName) && (
            <div className="p-3.5 rounded-xl bg-[#13192c] print:bg-slate-50 border border-slate-800 print:border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {debt.productSummary && (
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">{t('debts.statementModal.productTransaction')}</span>
                  <p className="text-slate-200 print:text-slate-800 font-medium">{debt.productSummary}</p>
                </div>
              )}
              {debt.guarantorName && (
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">{t('debts.statementModal.guarantor')}</span>
                  <p className="text-slate-200 print:text-slate-800 font-medium">
                    {debt.guarantorName} {debt.guarantorPhone && `(${debt.guarantorPhone})`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment History Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 print:text-slate-900 text-xs flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>{t('debts.statementModal.paymentHistory', { count: debt.payments?.length || 0 })}</span>
              </h3>
              {debt.remainingAmount > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onRecordPaymentClick();
                  }}
                  className="print:hidden px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('debts.statementModal.recordPayment')}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#13192c] print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                  <tr>
                    <th className="py-2 px-3">{t('debts.statementModal.date')}</th>
                    <th className="py-2 px-3">{t('debts.statementModal.receiptNo')}</th>
                    <th className="py-2 px-3">{t('debts.statementModal.method')}</th>
                    <th className="py-2 px-3 text-right">{t('debts.statementModal.amount')}</th>
                    <th className="py-2 px-3">{t('debts.statementModal.note')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
                  {Array.isArray(debt.payments) && debt.payments.length > 0 ? (
                    (debt.payments || []).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 print:text-slate-600">
                          {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-indigo-400 print:text-indigo-700">
                          {p.receiptNumber}
                        </td>
                        <td className="py-2.5 px-3 capitalize">
                          {p.paymentMethod.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400 print:text-emerald-700">
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {p.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500">
                        {t('debts.statementModal.noPaymentsRecorded')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* WhatsApp & Reminder Generator (Hidden on print) */}
          <div className="print:hidden p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>{t('debts.statementModal.reminderTool')}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyReminder}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  {copiedReminder ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedReminder ? t('debts.statementModal.copied') : t('debts.statementModal.copyText')}</span>
                </button>
                {debt.customerPhone && (
                  <button
                    onClick={handleWhatsAppReminder}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>{t('debts.statementModal.whatsApp')}</span>
                  </button>
                )}
              </div>
            </div>
            <p className="p-2.5 bg-slate-950/80 rounded-lg text-[11px] text-slate-400 font-mono leading-relaxed border border-slate-800/80">
              {reminderText}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0e1322] flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            {t('debts.statementModal.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
