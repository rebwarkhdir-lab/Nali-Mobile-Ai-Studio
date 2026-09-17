import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Smartphone, ChevronDown, X, Check, Sparkles, Store, Layers } from 'lucide-react';
import { Mobile } from '../../types/mobile';
import { getBrandModels, BrandModelSuggestion } from '../../lib/brandModelsData';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ModelComboboxProps {
  value: string;
  brand: string;
  existingMobiles: Mobile[];
  onChange: (value: string) => void;
  onSelectModel: (model: string) => void;
  onSelectBrand?: (brand: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const POPULAR_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Honor', 'OnePlus', 'Tecno', 'Infinix', 'Realme', 'Nokia', 'iPad / Tablet'];

export const ModelCombobox: React.FC<ModelComboboxProps> = ({
  value,
  brand,
  existingMobiles = [],
  onChange,
  onSelectModel,
  onSelectBrand,
  placeholder,
  required = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Strictly extract models belonging ONLY to the selected brand
  const brandModels = useMemo(() => {
    return getBrandModels(brand, existingMobiles);
  }, [brand, existingMobiles]);

  // Filter models by the user's search query
  const filteredModels = useMemo(() => {
    if (!value || !value.trim()) {
      return brandModels;
    }
    const query = value.trim().toLowerCase();
    return brandModels.filter(item => 
      item.model.toLowerCase().includes(query)
    );
  }, [brandModels, value]);

  // Top quick chips for 1-click model selection
  const quickChips = useMemo(() => {
    if (!brandModels || brandModels.length === 0) return [];
    // Prioritize store-registered first, then popular catalog
    return brandModels.slice(0, 5);
  }, [brandModels]);

  // Handle outside click to close dropdown smoothly
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

  // Ensure highlighted item scrolls into view on PC arrow navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]');
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
          prev < filteredModels.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredModels.length - 1
        );
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < filteredModels.length) {
          e.preventDefault();
          const selected = filteredModels[highlightedIndex];
          handleSelect(selected.model);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
  };

  const handleSelect = (modelName: string) => {
    onSelectModel(modelName);
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

  // Highlight matched query substring in text
  const renderHighlighted = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <span className="text-indigo-400 font-semibold underline decoration-indigo-500/40">
          {text.substring(idx, idx + q.length)}
        </span>
        {text.substring(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name="modelName"
          autoComplete="off"
          required={required}
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
          placeholder={placeholder || t('drawer.modelPlaceholder')}
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
          <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              {brand ? (
                <span>
                  {t('drawer.modelsFor') || 'Models for'}{' '}
                  <strong className="text-white font-semibold">{brand}</strong>
                </span>
              ) : (
                <span className="text-amber-400 font-medium">
                  {t('drawer.selectBrandFirst') || 'Select a brand first'}
                </span>
              )}
            </div>
            {brand && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
              </span>
            )}
          </div>

          {/* If Brand is not selected, provide quick brand picker directly */}
          {!brand ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400 mb-2.5">
                {t('drawer.selectBrandFirst') || 'Please select a brand above to view relevant models:'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {POPULAR_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      if (onSelectBrand) {
                        onSelectBrand(b);
                      }
                      inputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700 transition-all cursor-pointer"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={listRef} className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60 p-1">
              {filteredModels.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-400 mb-2">
                    No predefined models found for "{value}" under {brand}
                  </p>
                  {value.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSelect(value.trim())}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('drawer.useCustomModel') || 'Use custom:'} "{value.trim()}"
                    </button>
                  )}
                </div>
              ) : (
                filteredModels.map((item, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const isCurrent = value.trim().toLowerCase() === item.model.toLowerCase();

                  return (
                    <div
                      key={`${item.model}-${idx}`}
                      data-combobox-item
                      onClick={() => handleSelect(item.model)}
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
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          item.isStoreRegistered 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700/60"
                        )}>
                          {item.isStoreRegistered ? (
                            <Store className="w-3.5 h-3.5" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="truncate">
                          <p className="font-medium text-slate-200 truncate">
                            {renderHighlighted(item.model, value)}
                          </p>
                          {item.isStoreRegistered && (item.lastBuyPrice || item.storage) && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {item.storage && <span>{item.storage}</span>}
                              {item.ram && <span>• {item.ram}</span>}
                              {item.lastBuyPrice !== undefined && (
                                <span className="text-emerald-400/90 font-mono">
                                  • Last Buy: {item.currency === 'IQD' ? `${item.lastBuyPrice.toLocaleString()} IQD` : `$${item.lastBuyPrice}`}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.isStoreRegistered ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <Store className="w-2.5 h-2.5" />
                            {t('drawer.inStoreInventory') || 'In Store'} ({item.storeCount})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-500 bg-slate-800/80 border border-slate-700/50">
                            {t('drawer.catalogModel') || 'Catalog'}
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
          )}
        </div>
      )}

      {/* Quick Autofill Suggestion Chips (Underneath Input) */}
      {brand && quickChips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            {t('drawer.suggested') || 'Suggested'}:
          </span>
          {quickChips.map((chip) => {
            const isSelected = value.toLowerCase() === chip.model.toLowerCase();
            return (
              <button
                key={chip.model}
                type="button"
                onClick={() => handleSelect(chip.model)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-1",
                  isSelected
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : chip.isStoreRegistered
                      ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 border-slate-700/60"
                )}
              >
                {chip.isStoreRegistered && <Store className="w-2.5 h-2.5 text-emerald-400" />}
                <span>{chip.model}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
