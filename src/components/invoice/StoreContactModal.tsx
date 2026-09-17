import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Phone, Building2, Sparkles, Check, Eye } from 'lucide-react';
import { InvoiceDocument } from '../../types/invoice';
import { sound } from '../../lib/sound';
import { useDesignSystem } from '../../context/DesignContext';
import { useToast } from '../common/Toast';

interface StoreContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: InvoiceDocument;
  onUpdateDocument: (updatedDoc: InvoiceDocument) => void;
  lang?: 'ku' | 'en';
}

export default function StoreContactModal({
  isOpen,
  onClose,
  document: doc,
  onUpdateDocument,
  lang = 'ku'
}: StoreContactModalProps) {
  const isKu = lang === 'ku';
  const { settings, updateSettings } = useDesignSystem();
  const { success } = useToast();

  const currentBusinessInfo = doc.businessInfo || {};

  // Form states initialized from document or global settings
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [addressKu, setAddressKu] = useState('');
  const [addressEn, setAddressEn] = useState('');
  const [storeNameKu, setStoreNameKu] = useState('');
  const [storeNameEn, setStoreNameEn] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  // Sync state whenever modal opens or doc changes
  useEffect(() => {
    if (isOpen) {
      const bInfo = doc.businessInfo || {};
      setPhone1(bInfo.businessPhone || settings.businessPhone || '+964 750 123 4567');
      setPhone2(bInfo.businessPhoneSecondary || settings.businessPhoneSecondary || '+964 770 987 6543');
      setAddressKu(bInfo.businessAddressKu || settings.businessAddressKu || 'هەولێر - شەقامی ١٠٠ مەتری / سلێمانی - شەقامی سالم');
      setAddressEn(bInfo.businessAddressEn || settings.businessAddressEn || 'Erbil - 100M Road / Sulaymaniyah - Salim Street');
      setStoreNameKu(bInfo.businessNameKu || settings.businessNameKu || 'نالی مۆبایل');
      setStoreNameEn(bInfo.businessNameEn || settings.businessNameEn || 'Nali Mobile');
    }
  }, [isOpen, doc, settings]);

  if (!isOpen) return null;

  const quickAddresses = [
    {
      labelKu: 'سلێمانی - شەقامی سالم',
      labelEn: 'Sulaymaniyah - Salim St',
      ku: 'سلێمانی - شەقامی سالم، بەرامبەر باخی گشتی',
      en: 'Sulaymaniyah - Salim Street, Opposite Public Garden'
    },
    {
      labelKu: 'هەولێر - ١٠٠ مەتری',
      labelEn: 'Erbil - 100M Road',
      ku: 'هەولێر - شەقامی ١٠٠ مەتری، نزیک فامیلی مۆڵ',
      en: 'Erbil - 100M Road, Near Family Mall'
    },
    {
      labelKu: 'دهۆک - بازاڕی سەنتەر',
      labelEn: 'Duhok - City Center',
      ku: 'دهۆک - بازاڕی سەنتەر، شەقامی KRO',
      en: 'Duhok - City Center, KRO Street'
    },
    {
      labelKu: 'سلێمانی و هەولێر (هاوبەش)',
      labelEn: 'Erbil & Sulaymaniyah',
      ku: 'سلێمانی - شەقامی سالم / هەولێر - شەقامی ١٠٠ مەتری',
      en: 'Sulaymaniyah - Salim St / Erbil - 100M Road'
    }
  ];

  const handleSave = () => {
    sound.play('success');

    const finalPhone1 = phone1.trim() || '+964 750 123 4567';
    const finalPhone2 = phone2.trim();
    const finalAddressKu = addressKu.trim() || 'هەولێر - شەقامی ١٠٠ مەتری / سلێمانی - شەقامی سالم';
    const finalAddressEn = addressEn.trim() || finalAddressKu || 'Erbil - 100M Road / Sulaymaniyah - Salim Street';
    
    // Cross-language smart sync: ensure both languages get updated so whichever invoice view is chosen, it reflects!
    let finalStoreKu = storeNameKu.trim() || 'نالی مۆبایل';
    let finalStoreEn = storeNameEn.trim() || 'Nali Mobile';

    // If user edited Kurdish store name but left English as default 'Nali Mobile'
    if (finalStoreKu !== 'نالی مۆبایل' && finalStoreEn === 'Nali Mobile') {
      finalStoreEn = finalStoreKu;
    } else if (finalStoreEn !== 'Nali Mobile' && finalStoreKu === 'نالی مۆبایل') {
      finalStoreKu = finalStoreEn;
    }

    // 1. Update the document's business info
    const updatedBusinessInfo = {
      ...(doc.businessInfo || {}),
      businessPhone: finalPhone1,
      businessPhoneSecondary: finalPhone2,
      businessAddressKu: finalAddressKu,
      businessAddressEn: finalAddressEn,
      businessNameKu: finalStoreKu,
      businessNameEn: finalStoreEn,
    };

    const updatedDoc: InvoiceDocument = {
      ...doc,
      businessInfo: updatedBusinessInfo
    };

    onUpdateDocument(updatedDoc);

    // 2. If saveAsDefault is checked, persist to application settings (localStorage & DesignContext)
    if (saveAsDefault) {
      updateSettings({
        businessPhone: finalPhone1,
        businessPhoneSecondary: finalPhone2,
        businessAddressKu: finalAddressKu,
        businessAddressEn: finalAddressEn,
        businessNameKu: finalStoreKu,
        businessNameEn: finalStoreEn,
      });
    }

    success(
      isKu 
        ? 'ناونیشان، ژمارەی مۆبایل و ناوی فرۆشگا بە سەرکەوتوویی نوێکرایەوە' 
        : 'Store location, phone, and name updated successfully'
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl shadow-black/80"
        dir={isKu ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <header className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isKu ? 'دەستکاریکردنی ناونیشان و ژمارەی مۆبایل' : 'Edit Store Location & Phone'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKu 
                  ? 'زانیاری پەیوەندی و شوێنی فرۆشگا لەسەر وەسڵەکە ڕێکبخە' 
                  : 'Customize contact numbers and store address shown on the invoice'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { sound.play('click'); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Phone Numbers Section */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Phone className="w-4 h-4" />
              <span>{isKu ? 'ژمارەکانی مۆبایل و پەیوەندی' : 'Store Phone Numbers'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isKu ? 'مۆبایلی سەرەکی (ژمارە ١)' : 'Primary Phone Number'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                    placeholder="+964 750 123 4567"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isKu ? 'مۆبایلی دووەم (ژمارە ٢)' : 'Secondary Phone Number'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    placeholder="+964 770 987 6543"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location & Address Section */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>{isKu ? 'ناونیشان و شوێنی فرۆشگا' : 'Store Address & Location'}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {isKu ? 'لەسەر هەموو وەسڵەکان دەردەکەوێت' : 'Printed on all invoices'}
              </span>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                {isKu ? 'نموونە و شارە خێراکان:' : 'Quick Presets:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickAddresses.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sound.play('click');
                      setAddressKu(preset.ku);
                      setAddressEn(preset.en);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {isKu ? preset.labelKu : preset.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isKu ? 'ناونیشان (بە زمانی کوردی)' : 'Address (Kurdish)'}
              </label>
              <textarea
                value={addressKu}
                onChange={(e) => setAddressKu(e.target.value)}
                placeholder="هەولێر - شەقامی ١٠٠ مەتری / سلێمانی - شەقامی سالم"
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isKu ? 'ناونیشان (بە زمانی ئینگلیزی)' : 'Address (English)'}
              </label>
              <textarea
                value={addressEn}
                onChange={(e) => setAddressEn(e.target.value)}
                placeholder="Erbil - 100M Road / Sulaymaniyah - Salim Street"
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                dir="ltr"
              />
            </div>
          </div>

          {/* Store Name (Optional customization) */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>{isKu ? 'ناوی فرۆشگا' : 'Store Branding Name'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isKu ? 'ناوی فرۆشگا (کوردی)' : 'Store Name (Kurdish)'}
                </label>
                <input
                  type="text"
                  value={storeNameKu}
                  onChange={(e) => setStoreNameKu(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isKu ? 'ناوی فرۆشگا (ئینگلیزی)' : 'Store Name (English)'}
                </label>
                <input
                  type="text"
                  value={storeNameEn}
                  onChange={(e) => setStoreNameEn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                <Eye className="w-3.5 h-3.5" />
                <span>{isKu ? 'پێشبینینی شێوازی سەر وەسڵ' : 'Live Invoice Header Preview'}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono">
                {isKu ? 'ڕاستەوخۆ' : 'Live Sync'}
              </span>
            </div>
            <div className="bg-white text-slate-900 rounded-lg p-3 text-xs shadow-sm border border-slate-200">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                <div className="font-extrabold text-slate-900 text-sm">
                  {isKu ? (storeNameKu || 'نالی مۆبایل') : (storeNameEn || 'Nali Mobile')}
                </div>
                <div className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                  Official Store
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate">{isKu ? (addressKu || 'هەولێر / سلێمانی') : (addressEn || 'Erbil / Sulaymaniyah')}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[10.5px]">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    {phone1 || '+964 750 123 4567'}
                  </span>
                  {phone2 && (
                    <span className="text-slate-400">| {phone2}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save as default toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">
                {isKu ? 'پاشەکەوتکردن وەک ناونیشانی هەمیشەیی سیستەم' : 'Save as permanent default for all future invoices'}
              </span>
              <span className="text-slate-400">
                {isKu 
                  ? 'ئەم ناونیشان و ژمارانە لە هەموو بەشەکانی قەرز، قیست و وەسڵەکانی داهاتوو جێبەجێ دەبێت' 
                  : 'Applies automatically to future debts, installments, and receipts'}
              </span>
            </div>
          </label>

        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={() => { sound.play('click'); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isKu ? 'داخستن' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{isKu ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'Save & Update Invoice'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
