import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CurrencyPriceInputProps {
  id?: string;
  name: string;
  label?: React.ReactNode;
  required?: boolean;
  value: string;
  currency: 'USD' | 'IQD';
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onCurrencyToggle?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  accent?: 'indigo' | 'emerald' | 'amber' | 'cyan';
  helperText?: React.ReactNode;
}

export default function CurrencyPriceInput({
  id,
  name,
  label,
  required,
  value,
  currency,
  onChange,
  onClear,
  onCurrencyToggle,
  placeholder,
  autoFocus,
  disabled,
  className,
  accent = 'indigo',
  helperText
}: CurrencyPriceInputProps) {
  const { i18n, t } = useTranslation();
  const isKu = i18n.language === 'ku';

  const defaultPlaceholder = placeholder ?? (currency === 'USD' ? '0.00' : '0');

  const accentBorderClass = {
    indigo: 'focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20',
    emerald: 'focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20',
    amber: 'focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20',
    cyan: 'focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20'
  }[accent];

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-medium text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={cn(
          "group relative flex items-stretch h-11 w-full rounded-xl border border-slate-700/80 bg-[#090e1a] hover:border-slate-600 transition-all shadow-inner overflow-hidden",
          accentBorderClass,
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Docked Currency Indicator / Quick Toggle */}
        {onCurrencyToggle ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={onCurrencyToggle}
            title={t('common.toggleCurrency', 'Click to switch currency')}
            className={cn(
              "flex items-center gap-1.5 px-3 bg-slate-800/85 hover:bg-slate-700/80 border-r rtl:border-r-0 rtl:border-l border-slate-700/80 transition-all duration-150 select-none cursor-pointer shrink-0 group/curr",
              currency === 'USD' ? "text-emerald-400 hover:text-emerald-300" : "text-cyan-400 hover:text-cyan-300"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-transform group-hover/curr:scale-125",
                currency === 'USD'
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              )}
            />
            <span className="text-xs font-bold font-mono tracking-wider">
              {currency}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {currency === 'USD' ? '($)' : isKu ? '(د.ع)' : '(IQD)'}
            </span>
            <ArrowLeftRight className="w-2.5 h-2.5 text-slate-500 group-hover/curr:text-slate-300 transition-colors opacity-70 group-hover/curr:opacity-100" />
          </button>
        ) : (
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 bg-slate-800/85 border-r rtl:border-r-0 rtl:border-l border-slate-700/80 select-none shrink-0",
              currency === 'USD' ? "text-emerald-400" : "text-cyan-400"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                currency === 'USD'
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              )}
            />
            <span className="text-xs font-bold font-mono tracking-wider">
              {currency}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {currency === 'USD' ? '($)' : isKu ? '(د.ع)' : '(IQD)'}
            </span>
          </div>
        )}

        {/* Amount Input */}
        <input
          id={id || name}
          type="text"
          inputMode="decimal"
          name={name}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={defaultPlaceholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className="flex-1 h-full bg-transparent px-3 text-sm font-mono font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-0 border-none rtl:text-right text-left min-w-0"
        />

        {/* Clear Button */}
        {value && onClear && (
          <div className="flex items-center pe-2.5 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={onClear}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              title={t('drawer.clear', 'Clear')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {helperText && (
        <div className="text-[11px] text-slate-400">
          {helperText}
        </div>
      )}
    </div>
  );
}
