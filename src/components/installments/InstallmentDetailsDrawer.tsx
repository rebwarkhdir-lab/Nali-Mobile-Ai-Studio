import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Phone, 
  User, 
  ShieldCheck, 
  Send, 
  Printer, 
  CreditCard,
  Building,
  Check,
  MessageCircle,
  Copy,
  ChevronRight,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { InstallmentPlan, InstallmentScheduleItem } from '../../types/installment';
import PayScheduleModal from './PayScheduleModal';
import InstallmentContractModal from './InstallmentContractModal';
import InvoiceViewerModal from '../invoice/InvoiceViewerModal';
import { convertInstallmentToInvoiceDoc } from '../../lib/invoiceUtils';
import { InvoiceDocument } from '../../types/invoice';
import { useDesignSystem } from '../../context/DesignContext';
import { sound } from '../../lib/sound';
import { shareInstallmentInvoicePDF } from '../../services/whatsappShareService';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';

interface InstallmentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InstallmentPlan;
  exchangeRate?: number;
  onPlanUpdated: (updatedPlan: InstallmentPlan) => void;
}

export default function InstallmentDetailsDrawer({
  isOpen,
  onClose,
  plan,
  exchangeRate = 1500,
  onPlanUpdated
}: InstallmentDetailsDrawerProps) {
  const { t } = useTranslation();
  const { settings } = useDesignSystem();
  const { success, error: toastError } = useToast();
  const [selectedSchedule, setSelectedSchedule] = useState<InstallmentScheduleItem | null>(null);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [activeInvoiceDoc, setActiveInvoiceDoc] = useState<InvoiceDocument | null>(null);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);

  if (!isOpen) return null;

  const paidSchedulesCount = (plan.schedules || []).filter((s) => s.status === 'paid').length;
  const totalSchedulesCount = plan.schedules?.length || plan.durationMonths || 1;
  
  // Accurate monetary calculation
  const actualPaid = plan.paidAmount !== undefined 
    ? plan.paidAmount 
    : ((plan.downPayment || 0) + plan.schedules.reduce((sum, s) => sum + (s.amountPaid || (s.status === 'paid' ? s.amountDue : 0)), 0));
  
  const progressPercent = plan.totalAmount > 0 
    ? Math.min(100, Math.round((actualPaid / plan.totalAmount) * 100)) 
    : 0;

  const reminderText = t('installments.details.reminderTemplate', {
    customerName: plan.customerName,
    companyName: 'Nali Mobile',
    contractNumber: plan.contractNumber,
    balance: formatCurrency(plan.balanceRemaining, plan.currency),
    monthly: formatCurrency(plan.monthlyPayment, plan.currency)
  });

  const handleCopyReminder = () => {
    sound.playClick();
    navigator.clipboard.writeText(reminderText);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  };

  const handleSharePDFReminder = async (schedule?: InstallmentScheduleItem) => {
    sound.playClick();
    setIsGeneratingPDF(true);
    try {
      const result = await shareInstallmentInvoicePDF(plan, schedule, exchangeRate);
      if (result.success) {
        if (result.mode === 'desktop_download') {
          success(t('installments.pdfDownloadedAndWhatsApp', { filename: result.filename, name: plan.customerName }));
        } else {
          success(t('installments.pdfSharedSuccess', { name: plan.customerName }));
        }
      }
    } catch (err) {
      console.error('Failed to share PDF reminder via WhatsApp:', err);
      toastError(t('installments.pdfShareFailed'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsApp = () => {
    sound.playClick();
    if (!plan.customerPhone) {
      toastError(t('installments.details.noCustomerPhone'));
      return;
    }
    const cleanPhone = plan.customerPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0e1322] border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0e19]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{t('installments.details.title')}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {plan.contractNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('installments.details.customerLabel')} <span className="font-medium text-slate-200">{plan.customerName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setIsContractOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('installments.details.contractBtn')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-sans">
          
          {/* Progress & Financial Overview Card */}
          <div className="p-4 bg-[#13192c] border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t('installments.details.totalAgreementAmount')}</span>
                <span className="text-xl font-black text-white">
                  {formatCurrency(plan.totalAmount, plan.currency)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {formatDualPrice(plan.totalAmount, plan.currency, exchangeRate).secondary}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t('installments.details.remainingBalance')}</span>
                <span className="text-xl font-black text-rose-400">
                  {formatCurrency(plan.balanceRemaining, plan.currency)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-medium">
                  {t('installments.details.percentComplete', { percent: progressPercent })}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>{t('installments.details.downPaymentLabel')} {formatCurrency(plan.downPayment, plan.currency)}</span>
                <span>{t('installments.details.paidTotalLabel')} {formatCurrency(plan.paidAmount, plan.currency)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 bg-slate-900/60 rounded-xl">
                <span className="text-[10px] text-slate-500 block">{t('installments.details.principalCost')}</span>
                <span className="font-semibold text-slate-200">{formatCurrency(plan.principalAmount, plan.currency)}</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-xl">
                <span className="text-[10px] text-slate-500 block">{t('installments.details.markupFee')}</span>
                <span className="font-semibold text-cyan-400">+{formatCurrency(plan.additionalFee, plan.currency)}</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-xl">
                <span className="text-[10px] text-slate-500 block">{t('installments.details.monthlyRate')}</span>
                <span className="font-semibold text-indigo-300">{formatCurrency(plan.monthlyPayment, plan.currency)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Guarantor Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Box */}
            <div className="p-3.5 bg-[#13192c] border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                <User className="w-4 h-4" />
                <span>{t('installments.details.customer')}</span>
              </div>
              <p className="font-bold text-white text-sm">{plan.customerName}</p>
              {plan.customerPhone && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>{plan.customerPhone}</span>
                  <button
                    onClick={handleWhatsApp}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                  >
                    <Send className="w-3 h-3" /> WhatsApp
                  </button>
                </div>
              )}
              {plan.customerIdCard && <p className="text-slate-400 text-[11px]">ID: {plan.customerIdCard}</p>}
              {plan.customerAddress && <p className="text-slate-400 text-[11px]">Addr: {plan.customerAddress}</p>}
            </div>

            {/* Guarantor Box */}
            <div className="p-3.5 bg-[#13192c] border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>{t('installments.details.guarantorEndorser')}</span>
              </div>
              <p className="font-bold text-white text-sm">{plan.guarantorName || t('installments.details.noGuarantor')}</p>
              {plan.guarantorPhone && (
                <p className="text-slate-300 text-[11px]">{plan.guarantorPhone}</p>
              )}
              {plan.guarantorIdCard && <p className="text-slate-400 text-[11px]">ID: {plan.guarantorIdCard}</p>}
              {plan.guarantorAddress && <p className="text-slate-400 text-[11px]">Addr: {plan.guarantorAddress}</p>}
            </div>
          </div>

          {/* Product Reference */}
          {plan.productSummary && (
            <div className="p-3 bg-[#13192c] border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">{t('installments.details.financedProductsLabel')}</span>
              <p className="font-medium text-slate-200">{plan.productSummary}</p>
            </div>
          )}

          {/* Installment Schedules Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>{t('installments.details.monthlyScheduleTitle', { count: plan.schedules?.length || 0 })}</span>
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#13192c] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{t('installments.details.period')}</th>
                    <th className="py-2.5 px-3">{t('installments.details.dueDate')}</th>
                    <th className="py-2.5 px-3 text-right">{t('installments.details.amountDue')}</th>
                    <th className="py-2.5 px-3 text-right">{t('installments.details.paid')}</th>
                    <th className="py-2.5 px-3 text-center">{t('installments.details.status')}</th>
                    <th className="py-2.5 px-3 text-center">{t('installments.details.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {plan.schedules.map((schedule) => {
                    const isPaid = schedule.status === 'paid';
                    const isOverdue = schedule.status === 'overdue';

                    return (
                      <tr key={schedule.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {t('installments.details.monthLabel', { month: schedule.monthNumber })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-medium">
                          {schedule.dueDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                          {formatCurrency(schedule.amountDue, plan.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                          {schedule.amountPaid > 0 ? formatCurrency(schedule.amountPaid, plan.currency) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isOverdue
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {t(`installments.statuses.${schedule.status}`, { defaultValue: schedule.status })}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPaid ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {t('installments.details.paidBadge')}
                              </span>
                              <button
                                onClick={() => {
                                  sound.playClick();
                                  const receiptDoc = convertInstallmentToInvoiceDoc(plan, schedule.id, settings);
                                  setActiveInvoiceDoc(receiptDoc);
                                  setIsInvoiceViewerOpen(true);
                                }}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title={t('installments.details.viewReceiptTooltip')}
                              >
                                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                              </button>
                              <button
                                onClick={() => handleSharePDFReminder(schedule)}
                                className="p-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/30"
                                title={t('installments.details.sendPaidReceiptWhatsApp')}
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  sound.playClick();
                                  setSelectedSchedule(schedule);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm active:scale-95"
                              >
                                {t('installments.details.payNow')}
                              </button>
                              <button
                                onClick={() => handleSharePDFReminder(schedule)}
                                className="p-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/30"
                                title={t('installments.details.sendDueInvoiceWhatsApp')}
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Reminder Tool */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>{t('installments.details.reminderGenerator')}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyReminder}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  {copiedReminder ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedReminder ? t('installments.details.copied') : t('installments.details.copy')}</span>
                </button>
                {plan.customerPhone && (
                  <>
                    <button
                      onClick={() => handleSharePDFReminder()}
                      disabled={isGeneratingPDF}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isGeneratingPDF ? t('installments.details.generating') : t('installments.details.whatsappPdfInvoice')}</span>
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1"
                      title="Send Text Message"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-400" />
                      <span>{t('installments.details.text')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="p-2.5 bg-slate-950/80 rounded-lg text-[11px] text-slate-400 font-mono leading-relaxed border border-slate-800/80">
              {reminderText}
            </p>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0e19] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                const doc = convertInstallmentToInvoiceDoc(plan, undefined, settings);
                setActiveInvoiceDoc(doc);
                setIsInvoiceViewerOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{t('installments.details.officialInvoiceAgreement')}</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setIsContractOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('installments.details.viewContract')}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            {t('installments.details.done')}
          </button>
        </div>

      </div>

      {/* Pay Modal Child */}
      {selectedSchedule && (
        <PayScheduleModal
          isOpen={true}
          onClose={() => setSelectedSchedule(null)}
          plan={plan}
          schedule={selectedSchedule}
          exchangeRate={exchangeRate}
          onPaymentSuccess={(updated) => {
            onPlanUpdated(updated);
            const schedId = selectedSchedule.id;
            setSelectedSchedule(null);
            // Open official receipt in new unified invoice viewer
            const receiptDoc = convertInstallmentToInvoiceDoc(updated, schedId, settings);
            setActiveInvoiceDoc(receiptDoc);
            setIsInvoiceViewerOpen(true);
          }}
        />
      )}

      {/* Legacy Contract Modal Child */}
      {isContractOpen && !isInvoiceViewerOpen && (
        <InstallmentContractModal
          isOpen={true}
          onClose={() => setIsContractOpen(false)}
          plan={plan}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Master Invoice & Contract Viewer Modal */}
      {isInvoiceViewerOpen && activeInvoiceDoc && (
        <InvoiceViewerModal
          isOpen={isInvoiceViewerOpen}
          onClose={() => {
            setIsInvoiceViewerOpen(false);
            setActiveInvoiceDoc(null);
          }}
          document={activeInvoiceDoc}
          initialFormat="a4"
        />
      )}
    </div>
  );
}
