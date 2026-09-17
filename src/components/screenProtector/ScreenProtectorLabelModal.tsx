import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenProtectorGroup } from '../../types/screenProtector';
import { X, Printer, QrCode, Tag, Check, Copy } from 'lucide-react';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { getNotchLabel } from './ScreenProtectorCard';

interface ScreenProtectorLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ScreenProtectorGroup | null;
}

export default function ScreenProtectorLabelModal({
  isOpen,
  onClose,
  group
}: ScreenProtectorLabelModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const printRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();

  if (!isOpen || !group) return null;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const notchDisplay = t(`screenProtectorsPage.notches.${group.notchType}`, {
    defaultValue: getNotchLabel(group.notchType)
  });

  const handleCopyText = () => {
    sound.playClick();
    const text = `[GLASS LABEL: ${group.dieCode}]\nSize: ${group.screenSize}\nCutout: ${notchDisplay}\nLocation: ${group.shelfLocation || 'N/A'}\nCompatible: ${group.models.map(m => `${m.brand} ${m.model}`).join(', ')}`;
    navigator.clipboard.writeText(text);
    success(t('screenProtectorsPage.label.copiedToClipboard'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        dir={isKu ? 'rtl' : 'ltr'}
        className="bg-[#0f1422] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-4 bg-[#0b0e18] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{t('screenProtectorsPage.label.title')}</h2>
              <p className="text-[11px] text-slate-400">{t('screenProtectorsPage.label.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Label Container */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/60">
          <div 
            ref={printRef}
            dir="ltr"
            className="w-full max-w-sm bg-white text-black p-4 rounded-xl border-2 border-black shadow-lg font-sans space-y-2 select-text"
          >
            {/* Store Brand / Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
              <div>
                <div className="text-[11px] font-black tracking-wider uppercase text-black">
                  {t('screenProtectorsPage.label.storeName')}
                </div>
                <div className="text-[9px] font-bold text-slate-600">
                  {t('screenProtectorsPage.label.matrixTitle')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5 rounded">
                  {group.shelfLocation || t('screenProtectorsPage.label.drawerTag')}
                </span>
              </div>
            </div>

            {/* Die Code & Screen Size */}
            <div className="flex items-baseline justify-between pt-1">
              <div className="text-xl font-black font-mono tracking-tight text-black">
                {group.dieCode}
              </div>
              <div className="text-xs font-bold bg-slate-200 px-2 py-0.5 rounded text-black font-mono">
                {group.screenSize}
              </div>
            </div>

            <div className="text-[11px] font-bold text-slate-800">
              {t('screenProtectorsPage.label.cut')}: {notchDisplay}
            </div>

            {/* Compatible Models List */}
            <div className="border-t border-black/30 pt-1.5 space-y-1">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                {t('screenProtectorsPage.label.compatibleDevicesTitle')}
              </div>
              <div className="flex flex-wrap gap-1">
                {group.models.map((m, idx) => (
                  <span 
                    key={idx}
                    className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded border border-black/20 text-black leading-tight"
                  >
                    {m.brand} {m.model}
                  </span>
                ))}
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="border-t border-black/30 pt-2 flex flex-col items-center justify-center text-center">
              <div className="h-8 w-44 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] my-0.5"></div>
              <div className="text-[9px] font-mono tracking-widest text-black">
                *{group.dieCode.replace(/\s+/g, '-').toUpperCase()}*
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-[#0b0e18] border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyText}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('screenProtectorsPage.label.copyText')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-medium"
            >
              {t('screenProtectorsPage.label.close')}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('screenProtectorsPage.label.printLabel')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

