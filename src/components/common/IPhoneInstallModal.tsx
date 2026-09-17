import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Smartphone, 
  Share, 
  PlusSquare, 
  ExternalLink, 
  Copy, 
  Check, 
  QrCode, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { sound } from '../../lib/sound';
import { useToast } from './Toast';
import { useTranslation } from 'react-i18next';

interface IPhoneInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IPhoneInstallModal({ isOpen, onClose }: IPhoneInstallModalProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'guide' | 'qr'>('guide');

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  // Fallback to current origin if in browser
  const directAppUrl = currentOrigin || 'https://ais-pre-aje5ynxorrjp35enpdo3wh-149769069644.europe-west2.run.app';

  const handleCopyLink = () => {
    sound.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(directAppUrl);
      setCopied(true);
      toast.success(t('installModal.copied', 'Direct App URL copied to clipboard!'));
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenDirect = () => {
    sound.playClick();
    window.open(directAppUrl, '_blank');
  };

  const isKu = i18n.language === 'ku';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#0d121f] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-lg shadow-indigo-500/20 border border-white/20 shrink-0 overflow-hidden flex items-center justify-center">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="Nali Mobile Logo" 
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{isKu ? 'دامەزراندنی ئەپ لەسەر ئایفۆن' : 'Install on iPhone & iPad'}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    Web App
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isKu ? 'ئایکۆن و ناوی فەرمی Nali Mobile بە بێ لۆگۆی AI Studio' : 'Your custom Nali Mobile icon & standalone app'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Explanation Alert Box */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold mb-0.5">
                  {isKu ? 'بۆچی ئایکۆنی AI Studio دەرکەوتبوو؟' : 'Why did the AI Studio icon show up?'}
                </strong>
                <span>
                  {isKu 
                    ? 'چونکە لە ناو پەڕەی سازدەری Google AI Studio دوگمەی بەشداریکردنت (Share) داگرتووە. بۆ ئەوەی ئایکۆنی تایبەتی Nali Mobile دەربکەوێت، دەبێت لینکی ڕاستەوخۆ لە سەفاری بکەیتەوە!'
                    : 'When you tap "Add to Home Screen" inside the Google AI Studio builder tab, Safari bookmarks the builder instead. To install with your official Nali Mobile icon, open the direct link in Safari!'}
                </span>
              </div>
            </div>

            {/* Direct URL Action Bar */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                {isKu ? 'لینکی ڕاستەوخۆی ئەپەکەت لە سەفاری:' : 'Direct Web Application URL for Safari:'}
              </label>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 sm:p-2.5">
                <input 
                  type="text" 
                  readOnly 
                  value={directAppUrl} 
                  className="bg-transparent text-xs text-slate-200 flex-1 outline-none font-mono truncate px-1"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? (isKu ? 'کۆپیکرا' : 'Copied') : (isKu ? 'کۆپیکردن' : 'Copy')}</span>
                </button>
                <button
                  onClick={handleOpenDirect}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-lg shadow-emerald-500/20"
                >
                  <ExternalLink size={14} />
                  <span>{isKu ? 'لە سەفاری بکەوە' : 'Open in Safari'}</span>
                </button>
              </div>
            </div>

            {/* Toggle View: Steps vs QR Code */}
            <div className="flex border-b border-white/10 gap-4 pt-1">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveView('guide');
                }}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
                  activeView === 'guide'
                    ? 'text-white border-emerald-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {isKu ? 'ڕێنمایی هەنگاو بە هەنگاو (iPhone)' : 'iPhone Installation Steps'}
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveView('qr');
                }}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeView === 'qr'
                    ? 'text-white border-emerald-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <QrCode size={14} />
                <span>{isKu ? 'سکانی QR لەگەڵ مۆبایل' : 'Scan iPhone Camera QR'}</span>
              </button>
            </div>

            {activeView === 'guide' ? (
              <div className="space-y-3 pt-1">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-indigo-500/30">
                    1
                  </div>
                  <div className="text-xs leading-relaxed text-slate-300">
                    <strong className="text-white block mb-0.5">
                      {isKu ? '١. لینکی سەرەوە لە وێبگەڕی Safari بکەوە' : '1. Open the Direct URL in Safari'}
                    </strong>
                    {isKu 
                      ? 'دوگمەی "لە سەفاری بکەوە" لە سەرەوە داگرە یان لینکەکە کۆپی بکە و لە سەفاریدا Pasteی بکە.'
                      : 'Tap the green "Open in Safari" button above or paste the direct URL into your iPhone Safari address bar.'}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-indigo-500/30">
                    2
                  </div>
                  <div className="text-xs leading-relaxed text-slate-300">
                    <strong className="text-white block mb-0.5 flex items-center gap-1.5">
                      <span>{isKu ? '٢. دوگمەی Share داگرە' : '2. Tap the Safari Share Button'}</span>
                      <Share size={13} className="text-sky-400 inline" />
                    </strong>
                    {isKu 
                      ? 'لە خوارەوەی سەفاری ئەو چوارگۆشەیەی تیری بەرەو سەرەوەی هەیە (Share) داگرە.'
                      : 'At the bottom bar of Safari, tap the Share icon (square with upward arrow).'}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-emerald-500/30">
                    3
                  </div>
                  <div className="text-xs leading-relaxed text-slate-300">
                    <strong className="text-white block mb-0.5 flex items-center gap-1.5">
                      <span>{isKu ? '٣. هەڵبژاردنی "Add to Home Screen"' : '3. Tap "Add to Home Screen"'}</span>
                      <PlusSquare size={13} className="text-emerald-400 inline" />
                    </strong>
                    {isKu 
                      ? 'بڕۆ خوارەوە و دەست بنێ بە "Add to Home Screen" (زیادکردن بۆ سەر شاشە).'
                      : 'Scroll down the share sheet and tap "Add to Home Screen".'}
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div className="text-xs leading-relaxed text-slate-200">
                    <strong className="text-emerald-300 block mb-0.5">
                      {isKu ? '٤. ئایکۆنی ڕاستەقینەی Nali Mobile دەبینیت!' : '4. See your official Nali Mobile icon!'}
                    </strong>
                    {isKu 
                      ? 'ئایکۆنی ڕەنگاوڕەنگی Nali Mobile بە ناوی "Nali Mobile" دەردەکەوێت، دواتر دەست بنێ بە Add لە سەرەوە.'
                      : 'Safari will now display your custom Nali Mobile icon and the title "Nali Mobile". Tap "Add" at the top-right!'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/10 rounded-2xl text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <QRCodeSVG value={directAppUrl} size={180} level="H" includeMargin={true} />
                </div>
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                  {isKu 
                    ? 'کامێرای ئایفۆنەکەت ئاڕاستەی ئەم کۆدە بکە تا ڕاستەوخۆ لە سەفاری بکرێتەوە، پاشان Share > Add to Home Screen بکە.'
                    : 'Open the Camera app on your iPhone or iPad and point it at this QR code. Tap the Safari banner to open directly, then Share > Add to Home Screen.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 sm:px-6 bg-black/40 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-400" />
              <span>Standalone iOS PWA Ready</span>
            </span>
            <button
              onClick={handleOpenDirect}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <span>{isKu ? 'کردنەوە لە سەفاری' : 'Launch in Safari'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
