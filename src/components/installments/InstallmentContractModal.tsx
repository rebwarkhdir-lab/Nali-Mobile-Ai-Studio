import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  Calendar, 
  Download, 
  Send, 
  Phone, 
  MapPin, 
  Clock, 
  AlertCircle,
  Sparkles,
  Receipt
} from 'lucide-react';
import { exportElementToPDF } from '../../lib/pdfUtils';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { InstallmentPlan } from '../../types/installment';
import { sound } from '../../lib/sound';
import { useTranslation } from 'react-i18next';

interface InstallmentContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InstallmentPlan;
  exchangeRate?: number;
}

export default function InstallmentContractModal({
  isOpen,
  onClose,
  plan,
  exchangeRate = 1500
}: InstallmentContractModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ku';
  const [activeTab, setActiveTab] = useState<'invoice' | 'contract'>('invoice');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const paidSchedulesCount = (plan.schedules || []).filter((s) => s.status === 'paid').length;
  const totalSchedulesCount = plan.schedules?.length || plan.durationMonths || 1;
  
  // Accurate monetary progress calculation
  const actualPaid = plan.paidAmount !== undefined 
    ? plan.paidAmount 
    : ((plan.downPayment || 0) + plan.schedules.reduce((sum, s) => sum + (s.amountPaid || (s.status === 'paid' ? s.amountDue : 0)), 0));
  const progressPercent = plan.totalAmount > 0 
    ? Math.min(100, Math.round((actualPaid / plan.totalAmount) * 100)) 
    : 0;

  const handleExportPDF = async () => {
    sound.playClick();
    setIsExporting(true);
    try {
      const filename = activeTab === 'invoice' 
        ? `Invoice_${plan.contractNumber}_${plan.customerName.replace(/\s+/g, '_')}.pdf`
        : `Contract_${plan.contractNumber}_${plan.customerName.replace(/\s+/g, '_')}.pdf`;
      await exportElementToPDF('printable-installment-document', filename);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const handleWhatsApp = () => {
    sound.playClick();
    if (!plan.customerPhone) {
      alert(t('installments.contractModal.noPhoneAlert'));
      return;
    }
    const cleanPhone = plan.customerPhone.replace(/[^0-9]/g, '');
    
    const whatsappMsg = `*NALI MOBILE - ${isRtl ? 'وەسڵی فەرمی قیست' : 'Official Installment Invoice'}*
━━━━━━━━━━━━━━━━━━━━
📄 *${isRtl ? 'ژمارەی مامەڵە' : 'Contract No'}:* ${plan.contractNumber}
👤 *${isRtl ? 'بەڕێز' : 'Customer'}:* ${plan.customerName}
📱 *${isRtl ? 'ئامێر' : 'Product'}:* ${plan.productSummary || (isRtl ? 'مۆبایل / ئامێر' : 'Mobile / Device')}
━━━━━━━━━━━━━━━━━━━━
💰 *${isRtl ? 'کۆی گشتی' : 'Total'}:* ${formatCurrency(plan.totalAmount, plan.currency)}
💵 *${isRtl ? 'پێشەکی' : 'Down Payment'}:* ${formatCurrency(plan.downPayment, plan.currency)}
💳 *${isRtl ? 'قیستی مانگانە' : 'Monthly Rate'}:* ${formatCurrency(plan.monthlyPayment, plan.currency)}
📅 *${isRtl ? 'ماوەی قیست' : 'Duration'}:* ${plan.durationMonths} ${isRtl ? 'مانگ' : 'Months'}
📊 *${isRtl ? 'قیستی دراو' : 'Paid'}:* ${paidSchedulesCount} / ${totalSchedulesCount} (${progressPercent}%)
🔴 *${isRtl ? 'بڕی ماوە' : 'Remaining Balance'}:* ${formatCurrency(plan.balanceRemaining, plan.currency)}
━━━━━━━━━━━━━━━━━━━━
${isRtl ? 'سوپاس بۆ متمانەتان بە نالی مۆبایل' : 'Thank you for choosing Nali Mobile'}
📞 ${isRtl ? 'پەیوەندی' : 'Phone'}: +964 750 000 0000
📍 ${isRtl ? 'هەولێر - سلێمانی' : 'Erbil & Sulaymaniyah'}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#121829] border border-slate-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] my-auto">
        
        {/* Modal Top Bar (Toolbar) */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0a0e19] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">{t('installments.contractModal.title')}</h3>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {plan.contractNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('installments.contractModal.customerLabel')} <span className="text-slate-200 font-medium">{plan.customerName}</span>
              </p>
            </div>
          </div>

          {/* Action buttons & tabs */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => { sound.playClick(); setActiveTab('invoice'); }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'invoice' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('installments.contractModal.modernInvoiceTab')}
              </button>
              <button
                type="button"
                onClick={() => { sound.playClick(); setActiveTab('contract'); }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'contract' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('installments.contractModal.legalContractTab')}
              </button>
            </div>

            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              title="Send to WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              title="Export as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExporting ? t('installments.contractModal.exporting') : 'PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/60 flex justify-center">
          <div 
            id="printable-installment-document" 
            dir={isRtl ? 'rtl' : 'ltr'}
            className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-xl overflow-hidden print:shadow-none print:m-0 font-sans"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {activeTab === 'invoice' ? (
              /* ================= MODERN PREMIUM INVOICE VIEW ================= */
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Modern Brand Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                        N
                      </div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        NALI <span style={{ color: '#4f46e5' }}>MOBILE</span>
                      </h1>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {t('installments.contractModal.brandSubtitle')}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {t('installments.contractModal.brandAddress')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> +964 750 000 0000</span>
                    </div>
                  </div>

                  <div className={`space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200 ${isRtl ? 'sm:text-left' : 'sm:text-right'}`}>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {t('installments.contractModal.invoiceBadge')}
                    </div>
                    <div className="text-xs text-slate-500 pt-1">
                      {t('installments.contractModal.invoiceNo')} <span className="font-mono font-bold text-slate-900">{plan.contractNumber}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {t('installments.contractModal.date')} <span className="font-medium text-slate-800">{plan.startDate}</span>
                    </div>
                  </div>
                </div>

                {/* Customer & Guarantor Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      {t('installments.contractModal.customerInfo')}
                    </span>
                    <p className="text-base font-bold text-slate-900">{plan.customerName}</p>
                    {plan.customerPhone && (
                      <p className="text-xs text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{plan.customerPhone}</span>
                      </p>
                    )}
                    {plan.customerIdCard && (
                      <p className="text-xs text-slate-600">
                        {t('installments.contractModal.nationalId')} <span className="font-mono font-semibold text-slate-800">{plan.customerIdCard}</span>
                      </p>
                    )}
                  </div>

                  <div className={`space-y-1 ${isRtl ? 'sm:border-r sm:border-slate-200 sm:pr-4' : 'sm:border-l sm:border-slate-200 sm:pl-4'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {t('installments.contractModal.guarantor')}
                    </span>
                    <p className="text-base font-bold text-slate-900">{plan.guarantorName || t('installments.contractModal.noGuarantor')}</p>
                    {plan.guarantorPhone && (
                      <p className="text-xs text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{plan.guarantorPhone}</span>
                      </p>
                    )}
                    {plan.guarantorIdCard && (
                      <p className="text-xs text-slate-600">
                        {t('installments.contractModal.idLabel')} <span className="font-mono">{plan.guarantorIdCard}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Purchased Items & Agreement Financials */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 pb-1">
                    <span>{t('installments.contractModal.purchasedDevice')}</span>
                    <span>{t('installments.contractModal.agreementTotal')}</span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ backgroundColor: '#ffffff' }}>
                    <div className="space-y-1">
                      <div className="text-base font-bold text-slate-900">
                        {plan.productSummary || t('installments.contractModal.defaultPackage')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t('installments.contractModal.paymentTerm')}{' '}
                        <span className="font-semibold text-slate-700">
                          {t('installments.contractModal.monthlyInstallmentsCount', { count: plan.durationMonths })}
                        </span>
                      </div>
                    </div>
                    <div className={isRtl ? 'sm:text-left' : 'sm:text-right'}>
                      <div className="text-xl font-black text-indigo-700 font-mono">
                        {formatCurrency(plan.totalAmount, plan.currency)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t('installments.contractModal.totalAgreementValue')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Overview Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc' }}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{t('installments.contractModal.downPayment')}</span>
                    <span className="text-sm font-bold text-emerald-700 font-mono block mt-0.5">
                      {formatCurrency(plan.downPayment, plan.currency)}
                    </span>
                    <span className="text-[9px] text-slate-500">{t('installments.contractModal.downPaymentKu')}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc' }}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{t('installments.contractModal.monthlyRate')}</span>
                    <span className="text-sm font-bold text-indigo-700 font-mono block mt-0.5">
                      {formatCurrency(plan.monthlyPayment, plan.currency)}
                    </span>
                    <span className="text-[9px] text-slate-500">{t('installments.contractModal.monthlyRateKu')}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc' }}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{t('installments.contractModal.paidInstallments')}</span>
                    <span className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                      {t('installments.contractModal.paidOfTotal', { paid: paidSchedulesCount, total: totalSchedulesCount })}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold">{t('installments.contractModal.percentPaid', { percent: progressPercent })}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 text-center" style={{ backgroundColor: '#f8fafc' }}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{t('installments.contractModal.remainingBalance')}</span>
                    <span className="text-sm font-black text-rose-700 font-mono block mt-0.5">
                      {formatCurrency(plan.balanceRemaining, plan.currency)}
                    </span>
                    <span className="text-[9px] text-slate-500">{t('installments.contractModal.remainingBalanceKu')}</span>
                  </div>
                </div>

                {/* Accurate Progress Meter */}
                <div className="space-y-1.5 p-3 rounded-xl border border-slate-200" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{t('installments.contractModal.repaymentProgress')}</span>
                    <span className="font-mono font-bold text-indigo-700">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Monthly Installment Schedule Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 pb-1">
                    <span>{t('installments.contractModal.repaymentSchedule', { months: plan.durationMonths })}</span>
                    <span className="text-indigo-700 font-mono">
                      {t('installments.contractModal.paidRemainingSummary', { paid: paidSchedulesCount, remaining: totalSchedulesCount - paidSchedulesCount })}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-2.5">{t('installments.contractModal.numCol')}</th>
                          <th className="p-2.5">{t('installments.contractModal.dueDateCol')}</th>
                          <th className="p-2.5 text-right">{t('installments.contractModal.amountDueCol')}</th>
                          <th className="p-2.5 text-center">{t('installments.contractModal.statusCol')}</th>
                          <th className="p-2.5 text-right">{t('installments.contractModal.paidDateCol')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {plan.schedules.map((sch) => {
                          const isPaid = sch.status === 'paid';
                          const isOverdue = sch.status === 'overdue';
                          return (
                            <tr key={sch.id} style={{ backgroundColor: isPaid ? '#f0fdf4' : isOverdue ? '#fff1f2' : '#ffffff' }}>
                              <td className="p-2.5 font-bold font-mono text-slate-800">
                                {t('installments.contractModal.monthNum', { month: sch.monthNumber })}
                              </td>
                              <td className="p-2.5 font-medium text-slate-700">
                                {sch.dueDate}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(sch.amountDue, plan.currency)}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isPaid 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : isOverdue 
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}>
                                  {isPaid 
                                    ? t('installments.contractModal.paidStatus') 
                                    : isOverdue 
                                    ? t('installments.contractModal.overdueStatus') 
                                    : t('installments.contractModal.pendingStatus')}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono text-[11px] text-slate-600">
                                {sch.paidDate ? `${sch.paidDate} (${sch.receiptNumber || 'POS'})` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Notes & Signatures */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="text-center text-[11px] text-slate-500 font-medium">
                    {t('installments.contractModal.thankYouNote')}
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-2">
                    <div className="text-center">
                      <div className="border-b border-slate-300 h-10 mb-1"></div>
                      <span className="text-xs font-bold text-slate-800 block">{t('installments.contractModal.companyAuth')}</span>
                      <span className="text-[10px] text-slate-500">{t('installments.contractModal.officialStamp')}</span>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-slate-300 h-10 mb-1"></div>
                      <span className="text-xs font-bold text-slate-800 block">{t('installments.contractModal.customerSign')}</span>
                      <span className="text-[10px] text-slate-500">{plan.customerName}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* ================= OFFICIAL LEGAL CONTRACT VIEW ================= */
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                    NALI <span style={{ color: '#4f46e5' }}>MOBILE</span>
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">{t('installments.contractModal.contractSubtitle')}</p>
                  <p className="text-[10px] text-slate-500">{t('installments.contractModal.contractHeaderRegion')}</p>
                  <div className="mt-2 inline-block px-4 py-1 bg-slate-100 border border-slate-300 rounded-full text-xs font-extrabold tracking-wider uppercase text-slate-800">
                    {t('installments.contractModal.contractTitle')}
                  </div>
                </div>

                {/* Contract Parties */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase">{t('installments.contractModal.firstParty')}</div>
                    <p className="font-bold text-slate-900 text-sm">{t('installments.contractModal.storeName')}</p>
                    <p className="text-slate-600 text-xs">{t('installments.contractModal.storeLicense')}</p>
                  </div>
                  <div className={`space-y-1 ${isRtl ? 'text-left' : 'text-right'}`}>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">{t('installments.contractModal.contractAndDate')}</div>
                    <p className="font-mono font-bold text-indigo-700 text-sm">{plan.contractNumber}</p>
                    <p className="text-slate-600 text-xs">{t('installments.contractModal.date')} {plan.startDate}</p>
                  </div>
                </div>

                {/* Customer and Guarantor Box */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">{t('installments.contractModal.secondParty')}</span>
                    <p className="font-bold text-slate-900 text-sm">{plan.customerName}</p>
                    {plan.customerPhone && <p className="text-slate-700 text-xs">{t('installments.contractModal.phone')} {plan.customerPhone}</p>}
                    {plan.customerIdCard && <p className="text-slate-700 text-xs">{t('installments.contractModal.nationalId')} {plan.customerIdCard}</p>}
                    {plan.customerAddress && <p className="text-slate-700 text-xs">{t('installments.contractModal.address')} {plan.customerAddress}</p>}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">{t('installments.contractModal.guarantorEndorser')}</span>
                    <p className="font-bold text-slate-900 text-sm">{plan.guarantorName || 'N/A'}</p>
                    {plan.guarantorPhone && <p className="text-slate-700 text-xs">{t('installments.contractModal.phone')} {plan.guarantorPhone}</p>}
                    {plan.guarantorIdCard && <p className="text-slate-700 text-xs">{t('installments.contractModal.idLabel')} {plan.guarantorIdCard}</p>}
                    {plan.guarantorAddress && <p className="text-slate-700 text-xs">{t('installments.contractModal.address')} {plan.guarantorAddress}</p>}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-2">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-slate-700">{t('installments.contractModal.sec1Title')}</h3>
                  <table className="w-full border border-slate-200 text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">{t('installments.contractModal.itemDesc')}</th>
                        <th className="p-2 text-right">{t('installments.contractModal.downPayment')}</th>
                        <th className="p-2 text-right">{t('installments.contractModal.duration')}</th>
                        <th className="p-2 text-right">{t('installments.contractModal.agreementTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-medium">{plan.productSummary || t('installments.contractModal.defaultPackage')}</td>
                        <td className="p-2 text-right text-emerald-700 font-bold">{formatCurrency(plan.downPayment, plan.currency)}</td>
                        <td className="p-2 text-right">{t('installments.contractModal.months', { months: plan.durationMonths })}</td>
                        <td className="p-2 text-right font-bold text-indigo-700 font-mono">{formatCurrency(plan.totalAmount, plan.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Repayment Schedule */}
                <div className="space-y-2">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-slate-700">
                    {t('installments.contractModal.sec2Title', { months: plan.durationMonths })}
                  </h3>
                  <table className="w-full border border-slate-200 text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-1.5">{t('installments.contractModal.numCol')}</th>
                        <th className="p-1.5">{t('installments.contractModal.dueDateCol')}</th>
                        <th className="p-1.5 text-right">{t('installments.contractModal.amountDueCol')}</th>
                        <th className="p-1.5 text-center">{t('installments.contractModal.statusCol')}</th>
                        <th className="p-1.5 text-right">{t('installments.contractModal.paidDateCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {plan.schedules.map((s) => (
                        <tr key={s.id} className={s.status === 'paid' ? 'bg-emerald-50/50' : ''}>
                          <td className="p-1.5 font-bold">{t('installments.contractModal.monthNum', { month: s.monthNumber })}</td>
                          <td className="p-1.5">{s.dueDate}</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">{formatCurrency(s.amountDue, plan.currency)}</td>
                          <td className="p-1.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {t(`installments.statuses.${s.status}`, { defaultValue: s.status })}
                            </span>
                          </td>
                          <td className="p-1.5 text-right text-slate-600 text-[11px] font-mono">
                            {s.paidDate || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legal Terms */}
                <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-200 pt-3">
                  <h4 className="font-bold text-slate-800 uppercase">{t('installments.contractModal.sec3Title')}</h4>
                  <p>{t('installments.contractModal.legalTerm1')}</p>
                  <p>{t('installments.contractModal.legalTerm2')}</p>
                  <p>{t('installments.contractModal.legalTerm3')}</p>
                </div>

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
                  <div>
                    <div className="border-b border-slate-400 h-12 mb-1"></div>
                    <span className="font-bold block">{t('installments.contractModal.firstPartySign')}</span>
                    <span className="text-[10px] text-slate-500">{t('installments.contractModal.officialStamp')}</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-12 mb-1"></div>
                    <span className="font-bold block">{t('installments.contractModal.secondPartySign')}</span>
                    <span className="text-[10px] text-slate-500">{plan.customerName}</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-12 mb-1"></div>
                    <span className="font-bold block">{t('installments.contractModal.guarantorSign')}</span>
                    <span className="text-[10px] text-slate-500">{plan.guarantorName || 'Guarantor'}</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0e19] flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-400">
            {t('installments.contractModal.bottomNote')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            {t('installments.contractModal.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
