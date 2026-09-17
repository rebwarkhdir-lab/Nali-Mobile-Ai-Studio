import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  Calendar, 
  TrendingUp, 
  Package, 
  Battery, 
  Cpu, 
  HardDrive, 
  Palette, 
  User, 
  FileText,
  Barcode,
  Printer,
  Sparkles,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { Mobile } from '../../types/mobile';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { CostProfitGuard } from '../common/PermissionGuard';

interface MobileDetailsModalProps {
  mobile: Mobile | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBarcodeStudio?: (mobile: Mobile) => void;
  onReturnToStock?: (mobile: Mobile) => void;
  onMarkAsSold?: (mobile: Mobile) => void;
}

export default function MobileDetailsModal({
  mobile,
  isOpen,
  onClose,
  onOpenBarcodeStudio,
  onReturnToStock,
  onMarkAsSold
}: MobileDetailsModalProps) {
  const [copiedImei, setCopiedImei] = useState(false);

  const { canViewCostAndProfit } = useAuth();
  const canSeeFinancials = canViewCostAndProfit('inventory_mobiles');

  if (!isOpen || !mobile) return null;

  const handleCopyImei = () => {
    navigator.clipboard.writeText(mobile.imei);
    setCopiedImei(true);
    setTimeout(() => setCopiedImei(false), 2000);
  };

  const isSold = mobile.status === 'sold';
  const margin = mobile.sellPrice - mobile.buyPrice;
  const marginPercent = mobile.buyPrice > 0 ? ((margin / mobile.buyPrice) * 100).toFixed(1) : '0';
  const realizedProfit = isSold && mobile.soldPrice ? mobile.soldPrice - mobile.buyPrice : margin;

  const brandLower = (mobile.brand || '').trim().toLowerCase();
  const isApple = brandLower === 'apple';
  const isNokia = brandLower === 'nokia';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0e1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-[#080b14]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold tracking-wider text-indigo-400">{mobile.brand}</span>
                <span className={cn(
                  "px-2 py-0.5 text-[11px] font-semibold rounded-full border",
                  isSold 
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                )}>
                  {isSold ? 'Sold' : 'In Stock'}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {mobile.condition || 'Pre-owned'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                {mobile.brand} {mobile.model}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* IMEI Barcode & Fast Copy Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#141a2c] border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <Barcode className="w-4 h-4 text-indigo-400" />
                <span>IMEI / Serial Number</span>
              </div>
              <div className="font-mono text-base font-semibold text-white tracking-wider">
                {mobile.imei}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenBarcodeStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBarcodeStudio(mobile);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Print Barcode Label</span>
                </button>
              )}
              <button
                onClick={handleCopyImei}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/50 transition-colors cursor-pointer"
              >
                {copiedImei ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy IMEI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Specifications Grid */}
          <div>
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Hardware Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Storage</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {isNokia ? <span className="text-slate-500 text-xs font-normal">N/A</span> : (mobile.storage || '—')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RAM</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {(isApple || isNokia) ? <span className="text-slate-500 text-xs font-normal">N/A</span> : (mobile.ram || '—')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Palette className="w-3.5 h-3.5 text-pink-400" />
                  <span>Color</span>
                </div>
                <div className="text-sm font-semibold text-white">{mobile.color || '—'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isApple ? 'Battery Health' : isNokia ? 'Battery' : 'Battery Capacity'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {isNokia ? (
                    <span className="text-slate-500 text-xs font-normal">N/A</span>
                  ) : (
                    mobile.battery || (isApple ? '100%' : 'Standard')
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Financial Overview */}
          <div>
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Financial & Procurement Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium mb-1">Purchase Cost (Buy Price)</div>
                {canSeeFinancials ? (
                  <>
                    <div className="text-lg font-bold font-mono text-white">
                      {formatCurrency(mobile.buyPrice, mobile.currency)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Bought on {mobile.purchaseDate || 'N/A'}
                    </div>
                  </>
                ) : (
                  <div className="mt-2">
                    <CostProfitGuard module="inventory_mobiles" />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium mb-1">
                  {isSold ? 'Sold Price' : 'Target Sell Price'}
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {formatCurrency(isSold && mobile.soldPrice ? mobile.soldPrice : mobile.sellPrice, mobile.currency)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {isSold ? `Closed on ${mobile.soldDate || 'Recent'}` : 'Configured listing price'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium mb-1">
                  {isSold ? 'Realized Profit' : 'Expected Profit Margin'}
                </div>
                {canSeeFinancials ? (
                  <>
                    <div className="text-lg font-bold font-mono text-cyan-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      {formatCurrency(realizedProfit, mobile.currency)}
                    </div>
                    <div className="text-[11px] text-cyan-500/80 mt-1 font-mono">
                      +{marginPercent}% margin
                    </div>
                  </>
                ) : (
                  <div className="mt-2">
                    <CostProfitGuard module="inventory_mobiles" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supplier, Accessories, and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div>
                <div className="text-xs text-slate-400 font-medium mb-0.5">Bought From (Source/Supplier)</div>
                <div className="text-sm font-semibold text-slate-200">{mobile.boughtFrom || 'Direct Customer'}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-medium mb-0.5">Included Accessories</div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  {isNokia ? 'N/A' : (mobile.accessories || 'None')}
                </div>
              </div>
            </div>

            {/* Sold Info or Extra Info */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              {isSold ? (
                <>
                  <div>
                    <div className="text-xs text-slate-400 font-medium mb-0.5">Sold To Customer</div>
                    <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {mobile.soldToCustomer || 'Direct Walk-in Buyer'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium mb-0.5">Sale Notes</div>
                    <div className="text-xs text-slate-300 italic">{mobile.soldNotes || 'Completed at checkout counter'}</div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-0.5">Current Status Details</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Device is fully verified, tested, and actively available in shop inventory for sale.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {mobile.notes && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Internal Notes</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {mobile.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#080b14]/70 flex items-center justify-between">
          <div>
            {isSold ? (
              onReturnToStock && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReturnToStock(mobile);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return to Mobile List</span>
                </button>
              )
            ) : (
              onMarkAsSold && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onMarkAsSold(mobile);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Sold</span>
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
