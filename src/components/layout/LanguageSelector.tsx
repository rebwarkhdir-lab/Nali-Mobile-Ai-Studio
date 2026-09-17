import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ku', label: 'کوردی', short: 'KU' }
];

export default function LanguageSelector({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (code: string) => {
    sound.playClick();
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const currentLangInfo = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-slate-700/50 bg-[#0c101b] hover:bg-slate-800/80 transition-colors cursor-pointer text-slate-300 hover:text-white shadow-sm",
          isOpen && "bg-slate-800/80 border-slate-600"
        )}
        title={t('layout.language', 'Change Language')}
      >
        <Globe className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[11px] font-bold tracking-wide uppercase">
          {currentLangInfo.short}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform duration-200", isOpen && "rotate-180")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full mt-2 end-0 w-36 bg-[#1A1F2C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right rtl:origin-top-left"
          >
            <div className="p-1.5 flex flex-col gap-0.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => selectLanguage(lang.code)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors text-start cursor-pointer",
                    currentLang === lang.code 
                      ? "bg-indigo-500/10 text-indigo-400 font-semibold" 
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span>{lang.label}</span>
                  {currentLang === lang.code && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
