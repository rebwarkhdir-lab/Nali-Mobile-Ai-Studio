import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ShoppingCart, 
  Trash2, 
  User, 
  Percent, 
  Minus, 
  Plus, 
  Smartphone, 
  Edit3, 
  CreditCard, 
  Banknote, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'motion/react';
import { cn, formatCurrency, formatDualPrice } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useModalScrollLock } from '../../lib/modalLock';

export interface CartItem {
  cartId: string;
  product: {
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
  };
  customPrice?: number;
  quantity: number;
  discount: number;
  discountType: 'fixed' | 'percentage';
}

export interface POSCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartCurrency: 'USD' | 'IQD';
  exchangeRate: number;
  subtotalBase: number;
  finalDiscountBase: number;
  taxAmountBase: number;
  totalUSD: number;
  totalIQD: number;
  globalDiscount: { value: number; type: 'fixed' | 'percentage' };
  onOpenGlobalDiscount: () => void;
  onClearGlobalDiscount: () => void;
  cartSellType: 'cash' | 'card' | 'debt' | 'installment';
  onSelectPaymentMethod: (method: 'cash' | 'card' | 'debt' | 'installment') => void;
  onCompleteSale: () => void;
  isSubmittingSale: boolean;
  clearCart: () => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  onEditItemPrice: (item: CartItem) => void;
  onApplyItemDiscount: (item: CartItem) => void;
  selectedCustomer: { name: string; type: string; phone?: string } | null;
  isAddingCustomer: boolean;
  setIsAddingCustomer: (val: boolean) => void;
  newCustomerName: string;
  setNewCustomerName: (val: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (val: string) => void;
  onSetCustomer: (cust: { name: string; type: string; phone?: string } | null) => void;
}

export const POSCartDrawer: React.FC<POSCartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  cartCurrency,
  exchangeRate,
  subtotalBase,
  finalDiscountBase,
  totalUSD,
  totalIQD,
  globalDiscount,
  onOpenGlobalDiscount,
  onClearGlobalDiscount,
  cartSellType,
  onSelectPaymentMethod,
  onCompleteSale,
  isSubmittingSale,
  clearCart,
  removeFromCart,
  updateQuantity,
  onEditItemPrice,
  onApplyItemDiscount,
  selectedCustomer,
  isAddingCustomer,
  setIsAddingCustomer,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  onSetCustomer
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragControls = useDragControls();

  // Auto-reset expanded state when sheet re-opens
  React.useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    const { offset, velocity } = info;

    // Dragged DOWN (positive Y)
    if (velocity.y > 450 || offset.y > 100) {
      if (isExpanded && offset.y < 220 && velocity.y < 650) {
        // If expanded and pulled down moderately, collapse to normal peek height first
        sound.playClick();
        setIsExpanded(false);
      } else {
        // Pulled down substantially or high velocity -> dismiss sheet
        sound.playClick();
        onClose();
      }
    }
    // Dragged UP (negative Y)
    else if (velocity.y < -250 || offset.y < -40) {
      if (!isExpanded) {
        sound.playClick();
        setIsExpanded(true);
      }
    }
  };

  // Lock background scrolling whenever cart drawer is open
  useModalScrollLock(isOpen, 'pos-cart-drawer');

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          data-modal="true"
          data-drawer="true"
          data-sheet="true"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end touch-none overscroll-contain"
        >
          {/* Backdrop with Fade & Tap to close */}
          <motion.div 
            data-modal-backdrop="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none overscroll-contain" 
            onClick={() => {
              sound.playClick();
              onClose();
            }} 
          />

          {/* Drawer Sheet with Framer-Motion Drag Gesture Physics */}
          <motion.div
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: isExpanded ? 0.04 : 0.2, bottom: 0.75 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ 
              y: 0,
              height: isExpanded ? '94dvh' : '72dvh',
            }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 340, 
              mass: 0.8 
            }}
            className="relative z-10 w-full max-w-2xl mx-auto bg-[#101626] border-t border-slate-700/80 rounded-t-3xl shadow-[0_-16px_48px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden will-change-transform select-none"
          >
            {/* Top Pull Handle (Interactive Framer-Motion Grab Bar) */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => {
                sound.playClick();
                setIsExpanded((prev) => !prev);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  sound.playClick();
                  setIsExpanded((prev) => !prev);
                }
              }}
              style={{ touchAction: 'none' }}
              className="w-full pt-3 pb-2 px-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none group hover:bg-slate-800/40 transition-colors shrink-0 touch-none"
              role="button"
              tabIndex={0}
              aria-label={isExpanded ? t('pos.dragDownToHide', 'Drag down to collapse or hide') : t('pos.dragUpForActions', 'Drag up for full actions & sale')}
              title={isExpanded ? t('pos.dragDownToHide', 'Drag down to collapse or hide') : t('pos.dragUpForActions', 'Drag up for full actions & sale')}
            >
              {/* Visual Grab Handle Indicator Pill */}
              <motion.div 
                animate={{
                  width: isDragging ? 76 : 56,
                  backgroundColor: isDragging ? '#818cf8' : '#475569',
                  scale: isDragging ? 1.08 : 1,
                  boxShadow: isDragging ? '0 0 12px rgba(129, 140, 248, 0.6)' : 'none'
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                className="h-1.5 rounded-full transition-colors shadow-sm" 
              />

              {/* Direction cue and micro status badge */}
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                {isExpanded ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                    <span>{t('pos.dragDownToHide', 'Drag down to collapse or hide')}</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                    <span>{t('pos.dragUpForActions', 'Drag up for full actions & sale')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Drawer Header (Also Draggable via pointer down) */}
            <div 
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button, input, select')) return;
                dragControls.start(e);
              }}
              style={{ touchAction: 'none' }}
              className="px-4 py-2.5 border-b border-slate-800 bg-[#0c111d] flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>{t('pos.currentCart')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Expand / Collapse Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsExpanded((prev) => !prev);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title={isExpanded ? t('pos.collapse', 'Collapse') : t('pos.expand', 'Expand')}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
                title={t('pos.clearCart')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Customer Selection Section */}
          <div className="p-3 border-b border-slate-800 bg-[#0e1322] shrink-0">
            {isAddingCustomer ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{t('pos.customerInfo')}</span>
                  <button onClick={() => setIsAddingCustomer(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={t('pos.customerFullName', 'Customer Full Name')}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
                <input
                  type="tel"
                  placeholder={t('pos.phonePlaceholder', 'Phone Number (e.g. 0750 000 0000)')}
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomerName.trim()) {
                        onSetCustomer({ name: newCustomerName.trim(), type: 'custom', phone: newCustomerPhone.trim() });
                        setIsAddingCustomer(false);
                      }
                    }}
                    className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    {t('pos.setCustomer', 'Set Customer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onSetCustomer(null); setIsAddingCustomer(false); }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                  >
                    {t('pos.resetWalkIn', 'Reset to Walk-in')}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setIsAddingCustomer(true)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-slate-800 rounded-lg text-indigo-400 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="text-left rtl:text-right min-w-0">
                    <span className="font-semibold text-white block truncate">
                      {selectedCustomer ? selectedCustomer.name : t('pos.walkInCustomer', 'Walk-in Customer')}
                    </span>
                    {selectedCustomer?.phone && (
                      <span className="text-[10px] text-slate-400 font-mono block truncate">{selectedCustomer.phone}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold hover:underline shrink-0 ml-2">{t('pos.change', 'Change')}</span>
              </button>
            )}
          </div>

          {/* Cart Items List (Scrollable) */}
          <div data-modal-scrollable="true" className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-[#090d15]/80 divide-y divide-slate-800/60 overscroll-contain">
            {cart.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <p className="font-semibold text-slate-400 text-sm">{t('pos.emptyCart')}</p>
                <p className="text-xs text-slate-500 text-center max-w-[240px]">
                  {t('pos.scanPrompt')}
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const itemDual = formatDualPrice(
                  (item.customPrice !== undefined ? item.customPrice : item.product.price) * item.quantity, 
                  item.product.currency, 
                  exchangeRate
                );

                return (
                  <div key={item.cartId} className="pt-2.5 first:pt-0 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-bold text-sm text-slate-200 truncate">{item.product.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className={cn("text-xs font-mono shrink-0 font-medium", item.product.currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                            {formatCurrency(item.customPrice !== undefined ? item.customPrice : item.product.price, item.product.currency)} {t('pos.each', 'ea')}
                          </span>
                          {item.product.barcode && (
                            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">
                              #{item.product.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button 
                          onClick={() => onApplyItemDiscount(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                          title={t('pos.itemDiscount', 'Item Discount')}
                        >
                          <Percent className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => removeFromCart(item.cartId)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                          title={t('pos.removeItem', 'Remove item')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      {/* Quantity or Single Device Badge */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {item.product.type === 'accessory' ? (
                          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden h-7">
                            <button 
                              onClick={() => updateQuantity(item.cartId, -1)} 
                              className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-bold text-white">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.cartId, 1)} 
                              className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-lg h-7 px-2.5">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[11px] font-semibold text-indigo-300">
                              {t('pos.singleDevice', 'Single Device')}
                            </span>
                          </div>
                        )}

                        {/* Price Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEditItemPrice(item)}
                          className={cn(
                            "h-7 px-2.5 rounded-lg border flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer",
                            item.customPrice !== undefined && item.customPrice !== item.product.price
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-slate-900 text-slate-400 border-slate-700 hover:text-indigo-300 hover:border-indigo-500/40"
                          )}
                          title={t('pos.editUnitPrice', 'Edit Unit Price')}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t('common.price', 'Price')}</span>
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right font-mono shrink-0 ml-auto">
                        <div className={cn("font-bold text-sm truncate", itemDual.primaryColor)}>
                          {itemDual.primary}
                        </div>
                        <div className={cn("text-[10px] truncate font-medium", itemDual.secondaryColor)}>
                          ≈ {itemDual.secondary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer: Totals Breakdown + 4 Payment Methods + COMPLETE SALE BUTTON */}
          <div className="bg-[#0c111d] border-t border-slate-800 p-3 sm:p-4 pb-6 sm:pb-4 space-y-2.5 shrink-0 shadow-2xl">
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t('pos.subtotal')} ({cartCurrency})</span>
                <span className="font-mono text-slate-200 font-semibold">{formatCurrency(subtotalBase, cartCurrency)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">{t('pos.discount')}</span>
                  <button
                    type="button"
                    onClick={onOpenGlobalDiscount}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                  >
                    {globalDiscount.value > 0 ? t('common.edit', 'Edit') : `+ ${t('pos.addDiscount', 'Add')}`}
                  </button>
                </span>
                {finalDiscountBase > 0 ? (
                  <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                    <span>-{formatCurrency(finalDiscountBase, cartCurrency)}</span>
                    <button
                      type="button"
                      onClick={onClearGlobalDiscount}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                      title={t('common.clear', 'Clear')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-slate-500">{formatCurrency(0, cartCurrency)}</span>
                )}
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-white">{t('pos.total')}</span>
                <div className="text-right font-mono">
                  <span className={cn(
                    "text-lg font-black block tracking-tight leading-tight",
                    cartCurrency === 'USD' ? 'text-amber-400' : 'text-sky-400'
                  )}>
                    {formatCurrency(cartCurrency === 'USD' ? totalUSD : totalIQD, cartCurrency)}
                  </span>
                  <span className={cn(
                    "text-xs font-medium",
                    cartCurrency === 'USD' ? 'text-sky-400/80' : 'text-amber-400/80'
                  )}>
                    ≈ {formatCurrency(cartCurrency === 'USD' ? totalIQD : totalUSD, cartCurrency === 'USD' ? 'IQD' : 'USD')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Payment Mode Selection Cards */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onSelectPaymentMethod('cash')}
                className={cn(
                  "py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
                  cartSellType === 'cash'
                    ? "bg-emerald-600/30 border-emerald-500 text-white ring-1 ring-emerald-500"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('pos.cash')}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentMethod('card')}
                className={cn(
                  "py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
                  cartSellType === 'card'
                    ? "bg-indigo-600/30 border-indigo-500 text-white ring-1 ring-indigo-500"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('pos.card')}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentMethod('debt')}
                className={cn(
                  "py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
                  cartSellType === 'debt'
                    ? "bg-amber-600/30 border-amber-500 text-white ring-1 ring-amber-500"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('pos.debt')}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentMethod('installment')}
                className={cn(
                  "py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
                  cartSellType === 'installment'
                    ? "bg-cyan-600/30 border-cyan-500 text-white ring-1 ring-cyan-500"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('pos.installment')}</span>
              </button>
            </div>

            {/* MASTER COMPLETE SALE BUTTON INSIDE DRAWER */}
            <button
              type="button"
              disabled={isSubmittingSale || cart.length === 0}
              onClick={() => {
                sound.playClick();
                onCompleteSale();
              }}
              className={cn(
                "w-full py-3.5 px-4 rounded-xl flex items-center justify-between font-black transition-all cursor-pointer shadow-xl relative active:scale-[0.98] border select-none",
                isSubmittingSale ? "opacity-75 cursor-wait" : "",
                cart.length > 0
                  ? cartSellType === 'cash'
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/70 border-emerald-400/80 ring-2 ring-emerald-500/40"
                    : cartSellType === 'card'
                      ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-950/70 border-indigo-400/80 ring-2 ring-indigo-500/40"
                      : cartSellType === 'debt'
                        ? "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/70 border-amber-400/80 ring-2 ring-amber-500/40"
                        : "bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 hover:from-cyan-500 hover:to-teal-500 text-white shadow-cyan-950/70 border-cyan-400/80 ring-2 ring-cyan-500/40"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
                  {isSubmittingSale ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div className="text-left rtl:text-right truncate">
                  <span className="text-sm sm:text-base font-black text-white leading-none block truncate">
                    {cartSellType === 'cash' ? t('pos.completeCashSale', 'Complete Cash Sale') : t('pos.completeSale', 'Complete Sale')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black font-mono text-white">
                  {formatCurrency(cartCurrency === 'USD' ? totalUSD : totalIQD, cartCurrency)}
                </span>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/25 border border-white/30 text-white shadow-sm flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t('pos.sale', 'SALE')}</span>
                </span>
              </div>
            </button>

          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
};
