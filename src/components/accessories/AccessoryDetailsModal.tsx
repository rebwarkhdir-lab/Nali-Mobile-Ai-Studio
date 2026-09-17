import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Package, 
  Tag, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  MapPin, 
  Barcode as BarcodeIcon, 
  Printer, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Share2, 
  Sparkles,
  Percent,
  Box,
  Image as ImageIcon,
  Bell,
  BellOff,
  ShieldAlert,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, formatNumberWithCommas, cn } from '../../lib/utils';
import { Accessory } from '../../types/accessory';
import { getCategoryTranslation, getWarrantyTranslation } from '../../lib/accessoryTranslations';
import { useAuth } from '../../context/AuthContext';
import { CostProfitGuard } from '../common/PermissionGuard';

interface AccessoryDetailsModalProps {
  accessory: Accessory | null;
  isOpen: boolean;
  onClose: () => void;
  onQuickAdjustStock?: (accessory: Accessory, amount: number) => void;
  onOpenPrintLabel?: (accessory: Accessory) => void;
  onReportDefect?: (accessory: Accessory) => void;
  onMarkAsSold?: (accessory: Accessory) => void;
  onReturnSoldUnits?: (accessory: Accessory) => void;
}

export default function AccessoryDetailsModal({
  accessory,
  isOpen,
  onClose,
  onQuickAdjustStock,
  onOpenPrintLabel,
  onReportDefect,
  onMarkAsSold,
  onReturnSoldUnits
}: AccessoryDetailsModalProps) {
  const { t } = useTranslation();
  const { canViewCostAndProfit } = useAuth();
  const canSeeFinancials = canViewCostAndProfit('inventory_accessories');

  if (!isOpen || !accessory) return null;

  const handlePrint = () => {
    if (onOpenPrintLabel) {
      onOpenPrintLabel(accessory);
    } else {
      window.print();
    }
  };

  const hasNotify = accessory.notifyThreshold !== undefined && accessory.notifyThreshold !== null && accessory.notifyThreshold > 0;
  const isLowStock = hasNotify && accessory.quantity > 0 && accessory.quantity <= accessory.notifyThreshold!;
  const isOutOfStock = accessory.quantity <= 0;

  const profitPerUnit = accessory.sellPrice - accessory.buyPrice;
  const marginPercent = accessory.buyPrice > 0 
    ? ((profitPerUnit / accessory.buyPrice) * 100).toFixed(1) 
    : '0';

  const totalStockCost = accessory.buyPrice * accessory.quantity;
  const totalStockRevenue = accessory.sellPrice * accessory.quantity;
  const totalPotentialProfit = profitPerUnit * accessory.quantity;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-[#0f1523] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-[#090d18] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  {accessory.name}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-2 truncate">
                <span className="text-indigo-400 font-medium">{accessory.brand}</span>
                <span>•</span>
                <span className="truncate">{getCategoryTranslation(accessory.category, t)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
              title={t('accessories.printPriceLabel', 'Print Price Label')}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Top Banner: Image & Stock Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 bg-[#141b2e] p-3.5 sm:p-4.5 rounded-2xl border border-slate-800">
            {/* Product Image */}
            <div className="flex items-center justify-center bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden h-36 relative group">
              {accessory.image ? (
                <img 
                  src={accessory.image} 
                  alt={accessory.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-3 text-slate-500">
                  <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-40 text-indigo-400" />
                  <span className="text-xs">{t('accessories.noImageAttached', 'No Image Attached')}</span>
                </div>
              )}
            </div>

            {/* Stock Level & Quick Adjust */}
            <div className="md:col-span-2 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('accessories.inventoryStatus', 'Inventory Status')}</span>
                  {isOutOfStock ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {t('accessories.statuses.out_of_stock', 'Out of Stock')}
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" /> {t('accessories.lowStockAlert', 'Low Stock Alert')} ({accessory.quantity} {t('accessories.unitsLeft', 'left')})
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('accessories.statuses.in_stock', 'In Stock')} ({accessory.quantity} {t('accessories.unitsAvailable', 'units')})
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {accessory.quantity}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{t('accessories.unitsAvailable', 'units available')}</span>
                  <span className="text-xs text-slate-400 ms-auto flex items-center gap-1">
                    {hasNotify ? (
                      <>
                        <Bell className="w-3 h-3 text-amber-400" />
                        <span>{t('accessories.thresholdUnits', 'Threshold: ≤ {{count}} units', { count: accessory.notifyThreshold })}</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500">{t('accessories.alertDisabled', 'Alerts off')}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Quick Increment/Decrement Bar */}
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 ps-1">{t('accessories.quickStockAdjust', 'Quick Stock Adjust:')}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onQuickAdjustStock?.(accessory, -1)}
                    disabled={accessory.quantity <= 0}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" /> 1
                  </button>
                  <button
                    onClick={() => onQuickAdjustStock?.(accessory, 1)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 1
                  </button>
                  <button
                    onClick={() => onQuickAdjustStock?.(accessory, 5)}
                    className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 5
                  </button>
                  <button
                    onClick={() => onQuickAdjustStock?.(accessory, 10)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 10
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Pricing & Profit Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#141b2e] p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">{t('accessories.buyPriceCost', 'Buy Price (Cost)')}</span>
              {canSeeFinancials ? (
                <span className="text-base font-bold font-mono text-slate-200">
                  {accessory.currency === 'USD' ? '$' : ''}
                  {formatNumberWithCommas(accessory.buyPrice)}
                  {accessory.currency === 'IQD' ? ' د.ع' : ''}
                </span>
              ) : (
                <div className="mt-1">
                  <CostProfitGuard module="inventory_accessories" />
                </div>
              )}
            </div>

            <div className="bg-[#141b2e] p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">{t('accessories.targetSellPrice', 'Sell Price (Retail)')}</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {accessory.currency === 'USD' ? '$' : ''}
                {formatNumberWithCommas(accessory.sellPrice)}
                {accessory.currency === 'IQD' ? ' د.ع' : ''}
              </span>
            </div>

            <div className="bg-[#141b2e] p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">{t('accessories.unitProfit', 'Unit Profit')}</span>
              {canSeeFinancials ? (
                <span className="text-base font-bold font-mono text-cyan-400">
                  {accessory.currency === 'USD' ? '$' : ''}
                  {formatNumberWithCommas(profitPerUnit > 0 ? profitPerUnit : 0)}
                  {accessory.currency === 'IQD' ? ' د.ع' : ''}
                </span>
              ) : (
                <div className="mt-1">
                  <CostProfitGuard module="inventory_accessories" />
                </div>
              )}
            </div>

            <div className="bg-[#141b2e] p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">{t('accessories.profitMargin', 'Margin Markup')}</span>
              {canSeeFinancials ? (
                <span className="text-base font-bold font-mono text-indigo-400">
                  +{marginPercent}%
                </span>
              ) : (
                <div className="mt-1">
                  <CostProfitGuard module="inventory_accessories" />
                </div>
              )}
            </div>
          </div>

          {/* Detailed Info Spec Cards */}
          <div className="bg-[#141b2e] rounded-2xl border border-slate-800 divide-y divide-slate-800/80">
            
            {/* Barcode & SKU */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <BarcodeIcon className="w-4 h-4 text-cyan-400" />
                <span>{t('accessories.barcode', 'Barcode / SKU')}:</span>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                {accessory.barcode}
              </span>
            </div>

            {/* Supplier / Company */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>{t('accessories.supplierCompany', 'Distribution Company / Supplier')}:</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {accessory.company}
              </span>
            </div>

            {/* Storage Location */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>{t('accessories.storageLocation', 'Storage Shelf / Bin')}:</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {accessory.location || t('accessories.notSpecified', 'Not Specified')}
              </span>
            </div>

            {/* Color / Variant */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <Tag className="w-4 h-4 text-violet-400" />
                <span>{t('accessories.colorFinish', 'Color / Finish')}:</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {accessory.color || t('accessories.standardUniversal', 'Standard / Universal')}
              </span>
            </div>

            {/* Device Compatibility */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>{t('accessories.deviceCompatibility', 'Device Compatibility')}:</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {accessory.compatibility || t('accessories.standardUniversal', 'Universal')}
              </span>
            </div>

            {/* Warranty Policy */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t('accessories.warranty', 'Warranty')}:</span>
              </div>
              <span className="text-xs font-semibold text-emerald-300">
                {accessory.warranty ? getWarrantyTranslation(accessory.warranty, t) : t('accessories.storeStandard', 'Store Standard')}
              </span>
            </div>

            {/* Date Added / Purchase Date */}
            {accessory.purchaseDate && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{t('accessories.purchaseDate', 'Purchase / Received Date')}:</span>
                </div>
                <span className="text-xs font-medium text-slate-300">
                  {accessory.purchaseDate}
                </span>
              </div>
            )}
          </div>

          {/* Notes Card */}
          {accessory.notes && (
            <div className="bg-[#141b2e] p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">{t('accessories.staffNotes', 'Additional Notes')}:</span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {accessory.notes}
              </p>
            </div>
          )}

          {/* Batch Financial Valuation */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400">{t('accessories.totalStockCost', 'Total Stock Cost:')} </span>
              {canSeeFinancials ? (
                <span className="font-mono font-bold text-slate-200">
                  {accessory.currency === 'USD' ? '$' : ''}
                  {formatNumberWithCommas(totalStockCost)}
                  {accessory.currency === 'IQD' ? ' د.ع' : ''}
                </span>
              ) : (
                <CostProfitGuard module="inventory_accessories" inline />
              )}
            </div>
            <div>
              <span className="text-slate-400">{t('accessories.totalStockRevenue', 'Total Potential Revenue')}: </span>
              <span className="font-mono font-bold text-emerald-400">
                {accessory.currency === 'USD' ? '$' : ''}
                {formatNumberWithCommas(totalStockRevenue)}
                {accessory.currency === 'IQD' ? ' د.ع' : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400">{t('accessories.totalPotentialProfit', 'Estimated Total Profit')}: </span>
              {canSeeFinancials ? (
                <span className="font-mono font-bold text-cyan-400">
                  {accessory.currency === 'USD' ? '$' : ''}
                  {formatNumberWithCommas(totalPotentialProfit)}
                  {accessory.currency === 'IQD' ? ' د.ع' : ''}
                </span>
              ) : (
                <CostProfitGuard module="inventory_accessories" inline />
              )}
            </div>
          </div>

          {/* Sales Performance Card (if any units sold) */}
          {(accessory.totalSold || 0) > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 p-4 rounded-xl border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  {t('accessories.salesPerformance', 'Sales Performance History')}
                </span>
                <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                  {t('accessories.unitsSoldTag', '{{count}} Units Sold', { count: accessory.totalSold })}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">{t('accessories.unitsSold', 'Units Sold:')}</span>
                  <span className="font-mono font-bold text-white text-sm">{accessory.totalSold}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{t('accessories.realizedRevenue', 'Realized Revenue:')}</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {accessory.currency === 'USD' ? '$' : ''}
                    {formatNumberWithCommas(accessory.sellPrice * (accessory.totalSold || 0))}
                    {accessory.currency === 'IQD' ? ' د.ع' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{t('accessories.realizedProfit', 'Realized Profit:')}</span>
                  {canSeeFinancials ? (
                    <span className="font-mono font-bold text-cyan-400 text-sm">
                      {accessory.currency === 'USD' ? '$' : ''}
                      {formatNumberWithCommas(profitPerUnit * (accessory.totalSold || 0))}
                      {accessory.currency === 'IQD' ? ' د.ع' : ''}
                    </span>
                  ) : (
                    <CostProfitGuard module="inventory_accessories" inline />
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-[#090d18] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center flex-wrap gap-2">
            {accessory.quantity > 0 && onMarkAsSold && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onMarkAsSold(accessory);
                }}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t('accessories.markAsSold', 'Mark as Sold')}</span>
              </button>
            )}

            {(accessory.totalSold || 0) > 0 && onReturnSoldUnits && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReturnSoldUnits(accessory);
                }}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('accessories.returnSold', 'Return Sold')}</span>
              </button>
            )}

            {onReportDefect && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReportDefect(accessory);
                }}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/30 text-slate-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('accessories.defectRma', 'RMA')}</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            {t('common.close', 'Close')}
          </button>
        </div>

      </div>
    </div>
  );
}
