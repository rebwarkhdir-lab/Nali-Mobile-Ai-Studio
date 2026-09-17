import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShoppingCart, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Boxes, 
  Sparkles, 
  X, 
  Sliders, 
  Plus, 
  Minus, 
  ArrowRight,
  ShieldAlert,
  BellRing
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Accessory } from '../../types/accessory';
import { sound } from '../../lib/sound';
import { useDesignSystem } from '../../context/DesignContext';

interface LowStockBannerProps {
  accessories: Accessory[];
  exchangeRate: number;
  onOpenRestockModal: (specificAccessoryId?: string) => void;
  onRefreshData?: () => void;
}

export default function LowStockBanner({
  accessories,
  exchangeRate,
  onOpenRestockModal,
  onRefreshData
}: LowStockBannerProps) {
  const { settings, updateSettings } = useDesignSystem();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);

  const threshold = settings.lowStockThreshold || 3;

  // Filter low-stock and out-of-stock accessories
  const safeAccessories = Array.isArray(accessories) ? accessories : [];
  const lowStockItems = safeAccessories.filter(item => {
    if (!item) return false;
    // If individual notifyThreshold is set > 0, use that; otherwise use global user threshold
    const effectiveThreshold = item.notifyThreshold && item.notifyThreshold > 0 
      ? item.notifyThreshold 
      : threshold;
    return (item.quantity ?? 0) <= effectiveThreshold;
  });

  const outOfStockCount = lowStockItems.filter(item => (item?.quantity ?? 0) === 0).length;
  const lowOnlyCount = Math.max(0, (lowStockItems?.length || 0) - outOfStockCount);

  // If no items are low stock, return null
  if ((lowStockItems?.length || 0) === 0) {
    return null;
  }

  // Handle threshold change
  const handleThresholdChange = (delta: number) => {
    sound.playClick();
    const newThreshold = Math.max(1, Math.min(50, threshold + delta));
    updateSettings({ lowStockThreshold: newThreshold });
  };

  const handleSetDirectThreshold = (value: number) => {
    sound.playClick();
    const valid = Math.max(1, Math.min(99, value));
    updateSettings({ lowStockThreshold: valid });
    setIsEditingThreshold(false);
  };

  // If user temporarily dismissed it, show a sleek mini badge so it doesn't block the screen
  if (isDismissed) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>{lowStockItems?.length || 0} items</strong> below stock threshold ({threshold} units)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onOpenRestockModal();
            }}
            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
          >
            Quick Restock
          </button>
          <span className="text-amber-500/40">•</span>
          <button
            onClick={() => {
              sound.playClick();
              setIsDismissed(false);
            }}
            className="text-slate-400 hover:text-white"
          >
            Show Banner
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#181c2e] to-[#141828] border border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.08)] backdrop-blur-sm"
    >
      {/* Subtle background glow effect */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Main Banner Header Bar */}
      <div className="relative p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left Info: Icon & Message */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <BellRing className="w-4 h-4 animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">
                Low Stock Alert
              </span>

              {outOfStockCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {outOfStockCount} Out of Stock
                </span>
              )}

              <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {lowStockItems?.length || 0} Items ≤ {threshold} Units
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-0.5">
              {outOfStockCount > 0 ? (
                <>
                  <strong className="text-rose-300">{outOfStockCount} products are completely out of stock</strong> and {lowOnlyCount} are running low.
                </>
              ) : (
                <>
                  <strong>{lowStockItems?.length || 0} products</strong> have reached your reorder threshold. Create a restock order to prevent sales interruption.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Actions: Threshold Stepper, Restock Order Button, Expand Toggle & Dismiss */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0 self-end sm:self-auto">
          
          {/* User-defined Threshold Quick Adjuster */}
          <div className="flex items-center bg-[#101524] border border-amber-500/30 rounded-xl px-2 py-1 gap-1.5 shadow-inner">
            <span className="text-[11px] text-slate-400 font-medium">Threshold:</span>
            
            <button
              type="button"
              onClick={() => handleThresholdChange(-1)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Decrease threshold"
            >
              <Minus className="w-3 h-3" />
            </button>

            {isEditingThreshold ? (
              <input
                type="number"
                min="1"
                max="99"
                defaultValue={threshold}
                autoFocus
                onBlur={(e) => handleSetDirectThreshold(parseInt(e.target.value) || 3)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetDirectThreshold(parseInt((e.target as HTMLInputElement).value) || 3);
                  }
                }}
                className="w-8 bg-slate-800 text-center text-xs font-bold text-amber-300 rounded border border-amber-500/50 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingThreshold(true)}
                className="text-xs font-bold text-amber-300 px-1 hover:underline cursor-pointer"
                title="Click to type threshold number"
              >
                ≤ {threshold}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleThresholdChange(1)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Increase threshold"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Restock Order Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenRestockModal();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Create Restock Order</span>
          </button>

          {/* Toggle List View */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsExpanded(!isExpanded);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            title={isExpanded ? 'Hide products list' : 'View products list'}
          >
            <span>{isExpanded ? 'Hide' : 'View'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsDismissed(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Low-Stock Products Tray */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-amber-500/20 bg-[#0c101d]/90 px-4 py-3"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Critical Low Stock Items ({lowStockItems?.length || 0})
              </span>
              <span className="text-[11px] text-slate-500">
                Click Restock to order specific item from supplier
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {lowStockItems.map(item => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span className="text-slate-500">{item.brand}</span>
                      <span>•</span>
                      <span className="text-slate-500">{item.category}</span>
                      {item.company && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400 truncate max-w-[80px]">{item.company}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                      item.quantity === 0 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {item.quantity === 0 ? '0 Left' : `${item.quantity} Left`}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onOpenRestockModal(item.id);
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      title={`Restock ${item.name}`}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Restock</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
