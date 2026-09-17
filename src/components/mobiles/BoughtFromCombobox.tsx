import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, ChevronDown, X, Check, Store, User, Globe, Tag, Sparkles } from 'lucide-react';
import { Mobile } from '../../types/mobile';
import { getBoughtFromSuggestions, BoughtFromSuggestion } from '../../lib/brandModelsData';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface BoughtFromComboboxProps {
  value: string;
  existingMobiles: Mobile[];
  knownSuppliers?: string[];
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const BoughtFromCombobox: React.FC<BoughtFromComboboxProps> = ({
  value,
  existingMobiles = [],
  knownSuppliers = [],
  onChange,
  onSelect,
  placeholder,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate intelligent suggestions from store history and suppliers
  const allSuggestions = useMemo(() => {
    return getBoughtFromSuggestions(existingMobiles, knownSuppliers);
  }, [existingMobiles, knownSuppliers]);

  // Filter based on user query
  const filteredSuggestions = useMemo(() => {
    if (!value || !value.trim()) {
      return allSuggestions;
    }
    const query = value.trim().toLowerCase();
    return allSuggestions.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.badge && item.badge.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }, [allSuggestions, value]);

  // Top quick chips for 1-click source selection
  const quickChips = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    
    // Always provide Customer Trade-in & Wholesale Market
    list.push({ label: 'Customer (کڕیار)', value: 'Customer Trade-in (کڕیاری دوکان)' });
    list.push({ label: 'Wholesale (بۆرسە)', value: 'Wholesale Market (بۆرسەی مۆبایل)' });

    // Add top 2 frequent suppliers from store history
    const topHistory = allSuggestions
      .filter(s => s.category === 'store_history')
      .slice(0, 2);

    for (const h of topHistory) {
      // Avoid duplicate labels
      if (!list.some(item => item.value.toLowerCase() === h.name.toLowerCase())) {
        list.push({ label: h.name, value: h.name });
      }
    }

    return list.slice(0, 4);
  }, [allSuggestions]);

  // Click outside to dismiss
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-boughtfrom-item]');
      const activeEl = items[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          e.preventDefault();
          const selected = filteredSuggestions[highlightedIndex];
          handleSelect(selected.name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
  };

  const handleSelect = (sourceName: string) => {
    onChange(sourceName);
    if (onSelect) {
      onSelect(sourceName);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Helper for rendering icons
  const renderIcon = (type: BoughtFromSuggestion['iconType']) => {
    switch (type) {
      case 'user':
        return <User className="w-3.5 h-3.5 text-blue-400" />;
      case 'building':
        return <Building2 className="w-3.5 h-3.5 text-indigo-400" />;
      case 'globe':
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
      case 'store':
      default:
        return <Store className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name="boughtFrom"
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('drawer.boughtFromPlaceholder')}
          className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/50 ps-3.5 pe-16 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />

        {/* Action icons on the right */}
        <div className="absolute inset-y-0 end-0 flex items-center pe-2 gap-1 pointer-events-auto">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              title={t('drawer.clear')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(prev => !prev);
              if (!isOpen) {
                inputRef.current?.focus();
              }
            }}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors focus:outline-none cursor-pointer"
            title="Toggle suggestions"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180 text-indigo-400")} />
          </button>
        </div>
      </div>

      {/* Modern Premium Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-[#0d1322] border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header indicator */}
          <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('drawer.boughtFrom') || 'Source / Supplier'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {filteredSuggestions.length} options
            </span>
          </div>

          <div ref={listRef} className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60 p-1">
            {filteredSuggestions.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-2">
                  No registered supplier matching "{value}"
                </p>
                {value.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(value.trim())}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('drawer.useCustomSource') || 'Use source:'} "{value.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filteredSuggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isCurrent = value.trim().toLowerCase() === item.name.toLowerCase();

                return (
                  <div
                    key={`${item.name}-${idx}`}
                    data-boughtfrom-item
                    onClick={() => handleSelect(item.name)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "group px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer select-none",
                      isHighlighted
                        ? "bg-indigo-600/20 text-white"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
                      isCurrent && "bg-indigo-950/40 border border-indigo-500/30 text-indigo-200"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center shrink-0">
                        {renderIcon(item.iconType)}
                      </div>

                      <div className="truncate">
                        <p className="font-medium text-slate-200 truncate">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
                          item.category === 'store_history' 
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            : item.category === 'registered_supplier'
                              ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700/50"
                        )}>
                          {item.badge}
                        </span>
                      )}

                      {isCurrent && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 ms-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Chips underneath input */}
      {quickChips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-500" />
            {t('drawer.quickSources') || 'Quick'}:
          </span>
          {quickChips.map((chip) => {
            const isSelected = value.toLowerCase() === chip.value.toLowerCase();
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleSelect(chip.value)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer border",
                  isSelected
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 border-slate-700/60"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
