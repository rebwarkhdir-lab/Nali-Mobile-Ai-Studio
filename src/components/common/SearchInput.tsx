import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { Search, X, LucideIcon, ScanLine } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string;
  onChangeValue?: (val: string) => void;
  onClear?: () => void;
  onScan?: () => void;
  scanTitle?: string;
  icon?: LucideIcon;
  showClearButton?: boolean;
  shortcutBadge?: string;
  containerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  inputVariant?: 'default' | 'subtle' | 'card';
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  onChangeValue,
  onClear,
  onScan,
  scanTitle = 'Scan barcode',
  placeholder = 'Search...',
  icon: Icon = Search,
  showClearButton = true,
  shortcutBadge,
  containerClassName,
  className,
  size = 'md',
  inputVariant = 'default',
  disabled,
  onKeyDown,
  ...props
}, ref) => {
  const internalRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChangeValue) {
      onChangeValue('');
    }
    if (onChange) {
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    if (onClear) {
      onClear();
    }
    // Retain focus on input after clearing
    internalRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      e.stopPropagation();
      if (onChangeValue) {
        onChangeValue('');
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      if (onClear) {
        onClear();
      }
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const sizeClasses = {
    sm: cn('h-10 text-base sm:text-xs rounded-xl ps-9', onScan ? (shortcutBadge ? 'pe-24' : 'pe-18') : 'pe-8.5'),
    md: cn('h-10 sm:h-10.5 text-base sm:text-sm rounded-xl ps-10', onScan ? (shortcutBadge ? 'pe-24' : 'pe-20') : 'pe-9'),
    lg: cn('h-12 text-base sm:text-base rounded-xl ps-11', onScan ? (shortcutBadge ? 'pe-28' : 'pe-22') : 'pe-10'),
  };

  const iconWrapperClasses = {
    sm: 'start-0 ps-3',
    md: 'start-0 ps-3.5',
    lg: 'start-0 ps-4',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  const variantClasses = {
    default: 'bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40',
    subtle: 'bg-slate-950/60 border border-slate-800/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
    card: 'bg-[#0B0F19] border border-[#334155] text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
  };

  const hasContent = Boolean(value && value.toString().length > 0);

  return (
    <div className={cn('relative flex items-center w-full group', containerClassName)}>
      {/* Search Icon - Perfectly Vertically Centered */}
      <div
        className={cn(
          'absolute inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors',
          iconWrapperClasses[size]
        )}
      >
        <Icon className={cn(iconSizes[size], 'shrink-0')} />
      </div>

      {/* Input Field */}
      <input
        ref={internalRef}
        type="text"
        value={value}
        onChange={e => {
          if (onChangeValue) onChangeValue(e.target.value);
          if (onChange) onChange(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full transition-all shadow-inner outline-none font-sans leading-normal',
          sizeClasses[size],
          variantClasses[inputVariant],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      />

      {/* Right Controls: Clear Button, Shortcut Badge, & Scan Button */}
      <div className="absolute inset-y-0 end-1.5 pe-1 flex items-center gap-1.5 z-10">
        {showClearButton && hasContent && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Clear search"
            title="Clear (Esc)"
            className={cn(
              'flex items-center justify-center rounded-full text-slate-400 hover:text-white',
              'bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600',
              'transition-all duration-150 active:scale-90 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer shrink-0',
              size === 'sm' ? 'w-4.5 h-4.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
            )}
          >
            <X className={cn(size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3')} strokeWidth={2.5} />
          </button>
        )}

        {shortcutBadge && !hasContent && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded pointer-events-none select-none">
            {shortcutBadge}
          </kbd>
        )}

        {onScan && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onScan();
            }}
            className={cn(
              "flex items-center justify-center rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:bg-indigo-500/35 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 transition-all cursor-pointer shadow-sm group/scan active:scale-95 shrink-0",
              size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-9 h-9' : 'w-7.5 h-7.5 sm:w-8 sm:h-8'
            )}
            title={scanTitle}
            aria-label={scanTitle}
          >
            <ScanLine className={cn(
              "text-indigo-400 group-hover/scan:text-indigo-300 group-hover/scan:scale-110 transition-transform",
              size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-4.5 h-4.5' : 'w-4 h-4'
            )} />
          </button>
        )}
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
