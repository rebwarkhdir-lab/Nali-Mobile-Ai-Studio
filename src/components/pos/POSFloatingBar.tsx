import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCart, 
  CheckCircle2, 
  Check, 
  Banknote, 
  CreditCard, 
  Clock, 
  Layers, 
  ChevronUp,
  User,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { sound } from '../../lib/sound';

export interface POSFloatingBarProps {
  cartCount: number;
  totalUSD: number;
  totalIQD: number;
  cartCurrency: 'USD' | 'IQD';
  cartSellType: 'cash' | 'card' | 'debt' | 'installment';
  onSelectPaymentMethod: (method: 'cash' | 'card' | 'debt' | 'installment') => void;
  onOpenCart: () => void;
  onCompleteSale: () => void;
  isSubmittingSale: boolean;
  selectedCustomer: { name: string; phone?: string; type?: string } | null;
  lastAddedItemName?: string;
}

export const POSFloatingBar: React.FC<POSFloatingBarProps> = ({
  cartCount,
  totalUSD,
  totalIQD,
  cartCurrency,
  cartSellType,
  onSelectPaymentMethod,
  onOpenCart,
  onCompleteSale,
  isSubmittingSale,
  selectedCustomer,
  lastAddedItemName
}) => {
  const { t } = useTranslation();
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY < -30) {
      sound.playClick();
      onOpenCart();
    }
  };

  if (cartCount === 0) return null;

  const primaryAmount = cartCurrency === 'USD' ? totalUSD : totalIQD;
  const secondaryAmount = cartCurrency === 'USD' ? totalIQD : totalUSD;
  const secondaryCurrency = cartCurrency === 'USD' ? 'IQD' : 'USD';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        id="pos-floating-smart-bar"
        className="fixed z-40 inset-x-2 sm:inset-x-4 bottom-[4.75rem] md:bottom-3 max-w-2xl mx-auto pointer-events-auto"
      >
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="bg-[#0b0f19]/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] p-2 sm:p-2.5 flex flex-col gap-2 ring-1 ring-white/10"
        >
          {/* Subtle Swipe-Up Indicator */}
          <div 
            onClick={() => {
              sound.playClick();
              onOpenCart();
            }}
            className="flex justify-center -mt-1 pb-0.5 cursor-pointer"
            title={t('pos.viewCart', 'View Cart')}
          >
            <div className="w-10 h-1 bg-slate-600/70 hover:bg-slate-400 rounded-full transition-colors" />
          </div>
          
          {/* Top Mini Bar: Cart items counter + Customer + Quick Sell Type Pills */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            {/* Clickable Cart Preview Pill */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenCart();
              }}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all cursor-pointer group"
              title={t('pos.viewCart', 'View Cart')}
            >
              <div className="relative">
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </div>
              <span className="font-bold text-[11px] text-white">
                {cartCount} {cartCount === 1 ? t('pos.item', 'item') : t('pos.items', 'items')}
              </span>
              <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
            </button>

            {/* Customer Badge or Last Added Notice */}
            <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-[11px] text-slate-400 truncate">
              {selectedCustomer ? (
                <span className="flex items-center gap-1 font-semibold text-slate-200 truncate">
                  <User className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{selectedCustomer.name}</span>
                </span>
              ) : lastAddedItemName ? (
                <span className="flex items-center gap-1 text-slate-400 truncate">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-slate-300 font-medium truncate">{lastAddedItemName}</span>
                </span>
              ) : null}
            </div>

            {/* 4 Quick Sell Mode Switchers */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectPaymentMethod('cash')}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                  cartSellType === 'cash'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title={t('pos.cash')}
              >
                <Banknote className="w-3 h-3" />
                <span className="hidden xs:inline">{t('pos.cash')}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPaymentMethod('card')}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                  cartSellType === 'card'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title={t('pos.card')}
              >
                <CreditCard className="w-3 h-3" />
                <span className="hidden xs:inline">{t('pos.card')}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPaymentMethod('debt')}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                  cartSellType === 'debt'
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title={t('pos.debt')}
              >
                <Clock className="w-3 h-3" />
                <span className="hidden xs:inline">{t('pos.debt')}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPaymentMethod('installment')}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                  cartSellType === 'installment'
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title={t('pos.installment')}
              >
                <Layers className="w-3 h-3" />
                <span className="hidden xs:inline">{t('pos.installment')}</span>
              </button>
            </div>
          </div>

          {/* Bottom Action Area: Total Price + PROMINENT "COMPLETE SALE" BUTTON */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Total Price Box (Clickable to view cart) */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenCart();
              }}
              className="flex-1 text-left rtl:text-right px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-colors cursor-pointer min-w-0"
            >
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {t('pos.total')}:
                </span>
                <span className={cn(
                  "text-base sm:text-lg font-black font-mono tracking-tight truncate",
                  cartCurrency === 'USD' ? 'text-amber-400' : 'text-sky-400'
                )}>
                  {formatCurrency(primaryAmount, cartCurrency)}
                </span>
              </div>
              <div className={cn(
                "text-[10px] font-mono truncate font-medium",
                secondaryCurrency === 'USD' ? 'text-amber-400/80' : 'text-sky-400/80'
              )}>
                ≈ {formatCurrency(secondaryAmount, secondaryCurrency)}
              </div>
            </button>

            {/* MASTER "COMPLETE SALE" BUTTON */}
            <button
              type="button"
              id="btn-pos-floating-complete-sale"
              disabled={isSubmittingSale}
              onClick={() => {
                sound.playClick();
                onCompleteSale();
              }}
              className={cn(
                "flex-[1.4] py-3 px-4 rounded-xl flex items-center justify-between font-black transition-all cursor-pointer shadow-xl relative active:scale-[0.98] border select-none",
                isSubmittingSale ? "opacity-75 cursor-wait" : "",
                cartSellType === 'cash'
                  ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/70 border-emerald-400/80 ring-2 ring-emerald-500/40"
                  : cartSellType === 'card'
                    ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-950/70 border-indigo-400/80 ring-2 ring-indigo-500/40"
                    : cartSellType === 'debt'
                      ? "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/70 border-amber-400/80 ring-2 ring-amber-500/40"
                      : "bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 hover:from-cyan-500 hover:to-teal-500 text-white shadow-cyan-950/70 border-cyan-400/80 ring-2 ring-cyan-500/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
                  {isSubmittingSale ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  )}
                </div>
                <div className="text-left rtl:text-right truncate">
                  <span className="text-xs sm:text-sm font-black text-white leading-none block truncate">
                    {cartSellType === 'cash' ? t('pos.completeCashSale', 'Complete Cash Sale') : t('pos.completeSale', 'Complete Sale')}
                  </span>
                  <span className="text-[9px] text-white/80 font-mono hidden xs:inline">
                    {cartSellType === 'cash' ? t('pos.fastPay', 'Instant (F2)') : t('pos.confirmPayment', 'Confirm')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/25 border border-white/30 text-white shadow-sm flex items-center gap-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{t('pos.sale', 'SALE')}</span>
                </span>
              </div>
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
