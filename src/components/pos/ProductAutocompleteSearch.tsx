import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, 
  X, 
  ScanLine, 
  Smartphone, 
  Headphones, 
  Package, 
  Sparkles, 
  Check, 
  Plus, 
  CornerDownLeft, 
  Tag,
  SearchX,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDualPrice } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { sound } from '../../lib/sound';

export interface AutocompleteProduct {
  id: string;
  type: 'mobile' | 'accessory';
  category: string;
  name: string;
  detail: string;
  price: number;
  currency: 'USD' | 'IQD';
  stock: number;
  barcode: string;
  brand: string;
  storage?: string;
  ram?: string;
  color?: string;
  battery?: string;
  condition?: string;
  originalData: any;
}

export interface ProductAutocompleteSearchProps {
  products: AutocompleteProduct[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onSelectProduct: (product: AutocompleteProduct) => void;
  cart: { product: { id: string }; quantity: number }[];
  exchangeRate: number;
  onScan?: () => void;
  scanTitle?: string;
  placeholder?: string;
  shortcutBadge?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onSubmitSearch?: (e: React.FormEvent) => void;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <span>{text}</span>;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-indigo-500/30 text-indigo-200 font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function ProductAutocompleteSearch({
  products,
  searchTerm,
  onSearchChange,
  onSelectProduct,
  cart,
  exchangeRate,
  onScan,
  scanTitle = 'Scan barcode',
  placeholder,
  shortcutBadge = 'F2',
  className,
  inputRef: externalInputRef,
  onSubmitSearch
}: ProductAutocompleteSearchProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ku' || i18n.language === 'ar';
  
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Keyboard shortcut F2 or '/' to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputRef]);

  // Compute suggestions with smart scoring
  const { suggestions, totalMatchCount } = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    
    if (!q) {
      // Empty query: Show top recommended in-stock items
      const quickPicks = (products || [])
        .filter(p => p.stock > 0)
        .slice(0, 6);
      return { suggestions: quickPicks, totalMatchCount: quickPicks.length };
    }

    const scored = (products || []).map(p => {
      let score = 0;
      const name = p.name.toLowerCase();
      const barcode = p.barcode.toLowerCase();
      const brand = p.brand.toLowerCase();
      const detail = p.detail.toLowerCase();
      const storage = (p.storage || '').toLowerCase();
      const color = (p.color || '').toLowerCase();

      // Exact barcode / IMEI match
      if (barcode === q) score += 1000;
      else if (barcode.startsWith(q)) score += 500;
      else if (barcode.includes(q)) score += 200;

      // Exact name match or starts with
      if (name === q) score += 800;
      else if (name.startsWith(q)) score += 400;
      else if (name.includes(q)) score += 250;

      // Brand match
      if (brand.startsWith(q)) score += 200;
      else if (brand.includes(q)) score += 100;

      // Specs match (e.g. 256gb, titanium, case)
      if (storage.includes(q)) score += 120;
      if (color.includes(q)) score += 80;
      if (detail.includes(q)) score += 60;

      return { product: p, score };
    });

    const matches = scored.filter(item => item.score > 0);
    matches.sort((a, b) => b.score - a.score);

    return {
      suggestions: matches.slice(0, 8).map(m => m.product),
      totalMatchCount: matches.length
    };
  }, [products, searchTerm]);

  // Reset highlight index when query or suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  // Handle selecting a suggested item
  const handleSelectItem = useCallback((product: AutocompleteProduct) => {
    onSelectProduct(product);
    setIsOpen(false);
    onSearchChange('');
    inputRef.current?.focus();
  }, [onSelectProduct, onSearchChange, inputRef]);

  // Keyboard navigation inside the search bar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectItem(suggestions[highlightedIndex]);
        return;
      }
      if (isOpen && suggestions.length === 1) {
        e.preventDefault();
        handleSelectItem(suggestions[0]);
        return;
      }
      // If no suggestion selected, let the form submit normally or close dropdown
      setIsOpen(false);
      if (onSubmitSearch) {
        onSubmitSearch(e);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isOpen) {
        setIsOpen(false);
      } else if (searchTerm) {
        onSearchChange('');
      }
    }
  };

  const hasSearch = Boolean(searchTerm && searchTerm.length > 0);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input Bar */}
      <div className="relative flex items-center w-full group">
        {/* Search Icon */}
        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
          <Search className="w-4 h-4 shrink-0" />
        </div>

        {/* The Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('pos.searchPlaceholder', 'Scan barcode or search by name...')}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "w-full h-11 ps-10 pe-24 rounded-xl font-sans text-sm text-white",
            "bg-slate-900/95 border border-slate-700/80 shadow-inner outline-none",
            "placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all"
          )}
        />

        {/* Right Action Icons: Clear, Shortcut Badge, Camera Scanner */}
        <div className="absolute inset-y-0 end-1.5 pe-1 flex items-center gap-1.5 z-10">
          {hasSearch && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onSearchChange('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              title="Clear search (Esc)"
              className="flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 transition-all cursor-pointer active:scale-90"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          )}

          {shortcutBadge && !hasSearch && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded pointer-events-none select-none">
              {shortcutBadge}
            </kbd>
          )}

          {onScan && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onScan();
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:bg-indigo-500/35 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title={scanTitle}
              aria-label={scanTitle}
            >
              <ScanLine className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && hasSearch && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute top-full start-0 end-0 mt-2 z-50 overflow-hidden",
              "bg-[#0d121f]/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 flex flex-col"
            )}
          >
            {/* Header / Context Bar */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                {hasSearch ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>
                      {t('pos.autocompleteQuickSuggestions', 'Suggestions for')}{' '}
                      <span className="text-white font-bold">"{searchTerm}"</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold">
                      {totalMatchCount} {t('pos.autocompleteMatches', 'matches')}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{t('pos.autocompleteQuickPicks', 'Recommended In-Stock Products')}</span>
                  </>
                )}
              </div>

              {/* Navigation tip */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px]">↑↓</kbd> navigate
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px]">↵</kbd> add to cart
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px]">esc</kbd> close
                </span>
              </div>
            </div>

            {/* Suggestions List */}
            <div 
              ref={listRef} 
              className="max-h-[380px] sm:max-h-[420px] overflow-y-auto divide-y divide-slate-800/40 scrollbar-thin p-1.5"
            >
              {suggestions.length > 0 ? (
                suggestions.map((product, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const isMobile = product.type === 'mobile';
                  const inCartItem = cart.find(c => c.product.id === product.id);
                  const inCartQty = inCartItem?.quantity || 0;
                  const dual = formatDualPrice(product.price, product.currency, exchangeRate);

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectItem(product)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "group/item px-3.5 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3",
                        isHighlighted 
                          ? "bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm" 
                          : "hover:bg-slate-800/50 text-slate-200 border border-transparent"
                      )}
                    >
                      {/* Left: Type Icon + Product Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Type Icon Badge */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                          isMobile
                            ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 group-hover/item:bg-indigo-500/25 group-hover/item:text-indigo-300"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover/item:bg-emerald-500/25 group-hover/item:text-emerald-300"
                        )}>
                          {isMobile ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Headphones className="w-5 h-5" />
                          )}
                        </div>

                        {/* Title, Brand, Specs & Barcode */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">
                              <HighlightMatch text={product.name} query={searchTerm} />
                            </span>
                            
                            {/* Type & Condition Badge */}
                            <span className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider",
                              isMobile 
                                ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/50" 
                                : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                            )}>
                              {isMobile ? product.condition || 'Mobile' : product.category}
                            </span>

                            {/* In Cart Pill */}
                            {inCartQty > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-in fade-in">
                                <Check className="w-3 h-3" />
                                {inCartQty} in cart
                              </span>
                            )}
                          </div>

                          {/* Secondary Specs & Barcode line */}
                          <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 flex-wrap">
                            {/* Mobile specific specs */}
                            {isMobile && (product.storage || product.ram || product.color) && (
                              <div className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                                {product.storage && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700/60">
                                    {product.storage}
                                  </span>
                                )}
                                {product.ram && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700/60">
                                    {product.ram} RAM
                                  </span>
                                )}
                                {product.color && (
                                  <span className="text-slate-400">
                                    • {product.color}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Accessory detail */}
                            {!isMobile && product.detail && (
                              <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                                {product.detail}
                              </span>
                            )}

                            {/* Barcode / IMEI */}
                            <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                              <span className="text-slate-600">#</span>
                              <HighlightMatch text={product.barcode} query={searchTerm} />
                            </span>

                            {/* Stock status indicator */}
                            <span className={cn(
                              "text-[10px] font-semibold flex items-center gap-1",
                              product.stock > 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                product.stock > 0 ? "bg-emerald-400" : "bg-rose-400"
                              )}></span>
                              {isMobile ? '1 in stock' : `${product.stock} available`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Dual Price & Add to Cart button */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Price Display */}
                        <div className="text-right">
                          <div className={cn("font-black text-sm font-mono tracking-tight", dual.primaryColor)}>
                            {dual.primary}
                          </div>
                          <div className={cn("text-[10px] font-mono", dual.secondaryColor)}>
                            ≈ {dual.secondary}
                          </div>
                        </div>

                        {/* Direct Add Action Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem(product);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95",
                            inCartQty > 0
                              ? "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30 border border-indigo-400/30"
                          )}
                          title="Add to active sale cart"
                        >
                          {inCartQty > 0 ? (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isMobile ? 'Selected' : '+1'}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty state when no items match */
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                    <SearchX className="w-6 h-6 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {t('pos.autocompleteNoMatches', 'No items match your search')}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t('pos.autocompleteTryAnother', 'Try searching by brand, model, IMEI, barcode, or category.')}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Footer Action: Filter Catalog or Dismiss */}
            {suggestions.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Showing top {suggestions.length} of {totalMatchCount} matching products
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    // Smooth scroll down to catalog if available
                    const el = document.getElementById('pos-catalog-top');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                >
                  <span>View in catalog</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
