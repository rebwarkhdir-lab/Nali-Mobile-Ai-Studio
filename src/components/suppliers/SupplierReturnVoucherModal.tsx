import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Send, 
  Copy, 
  Check, 
  ShieldAlert, 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupplierReturnItem } from '../../types/supplierReturn';
import { Supplier } from '../../types/supplier';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface SupplierReturnVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnItem: SupplierReturnItem | null;
  supplier?: Supplier;
  onStatusUpdated?: (updated: SupplierReturnItem) => void;
  onOpenResolveModal?: (item: SupplierReturnItem) => void;
}

export default function SupplierReturnVoucherModal({
  isOpen,
  onClose,
  returnItem,
  supplier,
  onOpenResolveModal
}: SupplierReturnVoucherModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !returnItem) return null;

  const formattedDate = new Date(returnItem.createdAt).toLocaleDateString(isKu ? 'ku' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const handleCopySlip = () => {
    sound.playClick();
    const text = [
      `⚠️ ${t('suppliers.returnVoucherModal.company')} - ${t('suppliers.returnVoucherModal.subtitle')}`,
      `RMA No: ${returnItem.rmaNumber}`,
      `${t('suppliers.returnVoucherModal.date')} ${formattedDate}`,
      `${t('suppliers.returnVoucherModal.supplier')} ${returnItem.supplierName}`,
      `Item: ${returnItem.itemName} (${returnItem.brand})`,
      returnItem.serialOrImei ? `${t('suppliers.returnVoucherModal.imei')} ${returnItem.serialOrImei}` : '',
      `${t('suppliers.returnVoucherModal.quantity')} ${returnItem.quantity} ${t('suppliers.returnVoucherModal.unit')}`,
      `${t('suppliers.returnVoucherModal.value')} ${returnItem.currency === 'USD' ? `$${returnItem.totalValue}` : `${returnItem.totalValue} IQD`}`,
      `${t('suppliers.returnVoucherModal.reportedDefect')} ${returnItem.defectDescription}`,
      `${t('suppliers.returnVoucherModal.expectedSettlement')} ${returnItem.requestedResolution === 'replacement' ? t('suppliers.returnVoucherModal.replacementUnit') : t('suppliers.returnVoucherModal.refundCredit')}`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    success(t('suppliers.returnVoucherModal.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    sound.playClick();
    const text = encodeURIComponent(
      `⚠️ *${t('suppliers.returnVoucherModal.company')} - ${t('suppliers.returnVoucherModal.subtitle')}*\n` +
      `*RMA No:* ${returnItem.rmaNumber}\n` +
      `*${t('suppliers.returnVoucherModal.supplier')}* ${returnItem.supplierName}\n` +
      `*${t('suppliers.returnVoucherModal.item')}* ${returnItem.itemName} (${returnItem.brand})\n` +
      (returnItem.serialOrImei ? `*${t('suppliers.returnVoucherModal.imei')}* \`${returnItem.serialOrImei}\`\n` : '') +
      `*${t('suppliers.returnVoucherModal.quantity')}* ${returnItem.quantity} ${t('suppliers.returnVoucherModal.unit')}\n` +
      `*${t('suppliers.returnVoucherModal.value')}* ${returnItem.currency === 'USD' ? `$${returnItem.totalValue}` : `${returnItem.totalValue} IQD`}\n` +
      `*${t('suppliers.returnVoucherModal.reportedDefect')}* ${returnItem.defectDescription}\n` +
      `*${t('suppliers.returnVoucherModal.expectedSettlement')}* ${returnItem.requestedResolution === 'replacement' ? `🔄 ${t('suppliers.returnVoucherModal.replacementUnit')}` : `💵 ${t('suppliers.returnVoucherModal.refundCredit')}`}`
    );

    const phone = supplier?.phone ? supplier.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          dir={isKu ? 'rtl' : 'ltr'}
          className="w-full max-w-md bg-[#141a2e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:bg-white print:text-black print:max-w-full"
        >
          {/* Header - Screen only */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f1424] print:hidden">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{t('suppliers.returnVoucherModal.title')}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Ticket Area */}
          <div className="p-6 bg-slate-900/90 text-slate-200 print:bg-white print:text-black print:p-4 space-y-4 font-sans">
            
            {/* Slip Header */}
            <div className="text-center pb-4 border-b border-slate-700 print:border-black">
              <h1 className="text-lg font-extrabold tracking-wider text-white print:text-black uppercase">
                {t('suppliers.returnVoucherModal.company')}
              </h1>
              <p className="text-xs text-amber-400 print:text-gray-700 font-semibold tracking-wide">
                {t('suppliers.returnVoucherModal.subtitle')}
              </p>
              <div className="mt-2 inline-block px-3 py-1 rounded bg-slate-800 print:bg-gray-100 font-mono text-xs font-bold text-amber-300 print:text-black border border-slate-700 print:border-black">
                {returnItem.rmaNumber}
              </div>
            </div>

            {/* Slip Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 print:text-gray-600 block text-[10px]">{t('suppliers.returnVoucherModal.date')}</span>
                <span className="font-semibold">{formattedDate}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600 block text-[10px]">{t('suppliers.returnVoucherModal.supplier')}</span>
                <span className="font-semibold text-white print:text-black">{returnItem.supplierName}</span>
              </div>
            </div>

            {/* Item Information */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 print:bg-gray-50 print:border-gray-300 space-y-1 text-xs">
              <div className="font-bold text-white print:text-black text-sm">
                {returnItem.itemName}
              </div>
              <div className="text-slate-400 print:text-gray-600">
                {t('suppliers.returnVoucherModal.brand')} <strong className="text-slate-200 print:text-black">{returnItem.brand}</strong>
              </div>
              {returnItem.serialOrImei && (
                <div className="font-mono text-amber-300 print:text-black font-semibold">
                  {t('suppliers.returnVoucherModal.imei')} {returnItem.serialOrImei}
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-800 print:border-gray-200 mt-1">
                <span>{t('suppliers.returnVoucherModal.quantity')} <strong>{returnItem.quantity} {t('suppliers.returnVoucherModal.unit')}</strong></span>
                <span className="font-mono font-bold text-amber-400 print:text-black">
                  {t('suppliers.returnVoucherModal.value')} {returnItem.currency === 'USD' ? `$${returnItem.totalValue}` : `${returnItem.totalValue} IQD`}
                </span>
              </div>
            </div>

            {/* Problem & Diagnosis */}
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl print:bg-gray-50 print:border-gray-300 text-xs">
              <div className="font-bold text-rose-300 print:text-black text-[11px] mb-0.5">
                {t('suppliers.returnVoucherModal.reportedDefect')}
              </div>
              <p className="text-slate-200 print:text-gray-800 leading-relaxed">
                "{returnItem.defectDescription}"
              </p>
            </div>

            {/* Requested Resolution */}
            <div className="flex justify-between text-xs pt-2 border-t border-slate-800 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600">{t('suppliers.returnVoucherModal.expectedSettlement')}</span>
              <span className="font-bold capitalize text-amber-300 print:text-black">
                {returnItem.requestedResolution === 'replacement' 
                  ? t('suppliers.returnVoucherModal.replacementUnit')
                  : t('suppliers.returnVoucherModal.refundCredit')}
              </span>
            </div>

            {/* Stamp & Signatures for Official Dispatch (Print Only) */}
            <div className="hidden print:grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-gray-300 text-xs">
              <div className="text-center">
                <div className="h-12 border-b border-gray-400"></div>
                <span className="text-[10px] text-gray-600 mt-1 block">
                  {t('suppliers.returnVoucherModal.storeStamp', 'Store Stamp & Signature')}
                </span>
              </div>
              <div className="text-center">
                <div className="h-12 border-b border-gray-400"></div>
                <span className="text-[10px] text-gray-600 mt-1 block">
                  {t('suppliers.returnVoucherModal.supplierSignature', 'Supplier Representative Signature')}
                </span>
              </div>
            </div>

          </div>

          {/* Action Buttons - Screen Only */}
          <div className="p-4 bg-[#0f1424] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('suppliers.returnVoucherModal.print')}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('suppliers.returnVoucherModal.whatsapp')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySlip}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={t('suppliers.returnVoucherModal.copy')}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {onOpenResolveModal && ['pending_dispatch', 'dispatched'].includes(returnItem.status) && (
              <button
                type="button"
                onClick={() => onOpenResolveModal(returnItem)}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                {t('suppliers.returnVoucherModal.resolveClaim')}
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
