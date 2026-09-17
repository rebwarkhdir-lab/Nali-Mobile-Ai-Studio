import React, { useState } from 'react';
import { X, Save, User, FileText, Phone, Hash, MapPin } from 'lucide-react';
import { InvoiceDocument } from '../../types/invoice';
import { sound } from '../../lib/sound';
import { useDesignSystem } from '../../context/DesignContext';

interface InvoiceEditorModalProps {
  document: InvoiceDocument;
  onClose: () => void;
  onSave: (updatedDoc: InvoiceDocument) => void;
  lang: 'ku' | 'en';
}

export default function InvoiceEditorModal({ document, onClose, onSave, lang }: InvoiceEditorModalProps) {
  const isKu = lang === 'ku';
  const { updateSettings } = useDesignSystem();
  const [doc, setDoc] = useState<InvoiceDocument>(JSON.parse(JSON.stringify(document)));

  const handleSave = () => {
    sound.play('click');
    // Save to document
    onSave(doc);
    // Persist store contact details to global settings if updated
    if (doc.businessInfo) {
      updateSettings({
        businessPhone: doc.businessInfo.businessPhone,
        businessPhoneSecondary: doc.businessInfo.businessPhoneSecondary,
        businessAddressKu: doc.businessInfo.businessAddressKu,
        businessAddressEn: doc.businessInfo.businessAddressEn,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            {isKu ? 'دەستکاریکردنی وەسڵ' : 'Edit Invoice Details'}
          </h2>
          <button onClick={() => { sound.play('click'); onClose(); }} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" dir={isKu ? 'rtl' : 'ltr'}>
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              {isKu ? 'زانیاری کڕیار' : 'Customer Details'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'ناوی کڕیار' : 'Customer Name'}</label>
                <input
                  type="text"
                  value={doc.customer?.name || ''}
                  onChange={(e) => setDoc({ ...doc, customer: { ...doc.customer!, name: e.target.value } })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'مۆبایل' : 'Phone Number'}</label>
                <input
                  type="text"
                  value={doc.customer?.phone || ''}
                  onChange={(e) => setDoc({ ...doc, customer: { ...doc.customer!, phone: e.target.value } })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  dir="ltr"
                />
              </div>
              {(doc.documentType === 'debt_invoice' || doc.documentType === 'installment_invoice') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'ناوی کەفیل' : 'Guarantor Name'}</label>
                    <input
                      type="text"
                      value={doc.customer?.guarantorName || ''}
                      onChange={(e) => setDoc({ ...doc, customer: { ...doc.customer!, guarantorName: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'مۆبایلی کەفیل' : 'Guarantor Phone'}</label>
                    <input
                      type="text"
                      value={doc.customer?.guarantorPhone || ''}
                      onChange={(e) => setDoc({ ...doc, customer: { ...doc.customer!, guarantorPhone: e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      dir="ltr"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Document Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              {isKu ? 'زانیاری وەسڵ' : 'Document Details'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'بەروار' : 'Issue Date'}</label>
                <input
                  type="date"
                  value={doc.issueDate}
                  onChange={(e) => setDoc({ ...doc, issueDate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'ناوی فرۆشیار' : 'Seller Name'}</label>
                <input
                  type="text"
                  value={doc.sellerName || ''}
                  onChange={(e) => setDoc({ ...doc, sellerName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isKu ? 'تێبینی' : 'Notes / Remarks'}</label>
                <textarea
                  value={doc.notes || ''}
                  onChange={(e) => setDoc({ ...doc, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Store Location & Phone Numbers */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              {isKu ? 'ناونیشان و مۆبایلی فرۆشگا' : 'Store Location & Contact'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {isKu ? 'مۆبایلی سەرەکی فرۆشگا' : 'Store Primary Phone'}
                </label>
                <input
                  type="text"
                  value={doc.businessInfo?.businessPhone || ''}
                  onChange={(e) => setDoc({
                    ...doc,
                    businessInfo: { ...(doc.businessInfo || {}), businessPhone: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {isKu ? 'مۆبایلی دووەمی فرۆشگا' : 'Store Secondary Phone'}
                </label>
                <input
                  type="text"
                  value={doc.businessInfo?.businessPhoneSecondary || ''}
                  onChange={(e) => setDoc({
                    ...doc,
                    businessInfo: { ...(doc.businessInfo || {}), businessPhoneSecondary: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {isKu ? 'ناونیشانی فرۆشگا (کوردی)' : 'Store Address (Kurdish)'}
                </label>
                <input
                  type="text"
                  value={doc.businessInfo?.businessAddressKu || ''}
                  onChange={(e) => setDoc({
                    ...doc,
                    businessInfo: { ...(doc.businessInfo || {}), businessAddressKu: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  dir="rtl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {isKu ? 'ناونیشانی فرۆشگا (ئینگلیزی)' : 'Store Address (English)'}
                </label>
                <input
                  type="text"
                  value={doc.businessInfo?.businessAddressEn || ''}
                  onChange={(e) => setDoc({
                    ...doc,
                    businessInfo: { ...(doc.businessInfo || {}), businessAddressEn: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all"
          >
            <Save className="w-4 h-4" />
            {isKu ? 'پاشەکەوتکردن' : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>
  );
}
