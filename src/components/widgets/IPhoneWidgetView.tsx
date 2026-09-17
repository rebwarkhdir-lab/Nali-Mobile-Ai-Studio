import React from 'react';
import { 
  ShoppingCart, 
  AlertTriangle, 
  PackageX, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpRight, 
  TrendingUp, 
  Layers, 
  ChevronRight,
  Flame,
  Radio,
  DollarSign
} from 'lucide-react';
import { 
  IPhoneWidgetData, 
  IPhoneWidgetSize, 
  IPhoneWidgetCategory,
  CashierSaleWidgetSummary,
  DebtDueWidgetSummary,
  LowStockWidgetSummary 
} from '../../types/widget';
import { formatNumberWithCommas } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface IPhoneWidgetViewProps {
  data: IPhoneWidgetData;
  size?: IPhoneWidgetSize;
  category?: IPhoneWidgetCategory;
  onNavigate?: (path: string) => void;
  interactive?: boolean;
}

export default function IPhoneWidgetView({
  data,
  size = 'medium',
  category = 'all',
  onNavigate,
  interactive = true
}: IPhoneWidgetViewProps) {
  const latestSale = data.sales?.[0];
  const latestDebt = data.debts?.[0];
  const latestLowStock = data.lowStock?.[0];

  const handleActionClick = (path: string) => {
    if (!interactive) return;
    sound.playClick();
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // =========================================================================
  // DYNAMIC ISLAND / LOCK SCREEN LIVE ACTIVITY (~340px x 68px)
  // =========================================================================
  if (size === 'dynamic_island') {
    return (
      <div 
        onClick={() => handleActionClick('/pos')}
        className={`w-full max-w-[350px] mx-auto bg-black text-white px-4 py-3 rounded-[36px] border border-white/10 shadow-2xl flex items-center justify-between gap-3 select-none transition-all ${
          interactive ? 'hover:scale-[1.02] cursor-pointer' : ''
        }`}
        style={{
          boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.8), 0 0 20px 0 rgba(99, 102, 241, 0.15)'
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center text-black font-bold shrink-0 shadow-lg shadow-emerald-500/20">
            <ShoppingCart className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                {latestSale ? `Cashier Sold` : 'Cashier POS'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {latestSale ? `${latestSale.topItemName} • ${latestSale.cashierName}` : 'Ready for transactions'}
            </p>
          </div>
        </div>

        <div className="text-end shrink-0 ps-2">
          <div className="text-sm font-extrabold text-emerald-400 tracking-tight">
            {latestSale ? `$${latestSale.total.toFixed(2)}` : '$0.00'}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">
            {latestSale?.time || 'Live POS'}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SMALL WIDGET (2x2 grid, ~160px x 160px)
  // =========================================================================
  if (size === 'small') {
    return (
      <div 
        onClick={() => handleActionClick('/pos')}
        className={`w-[160px] h-[160px] rounded-[28px] p-3.5 bg-gradient-to-b from-[#161c2d] to-[#0a0e18] border border-white/10 text-white shadow-xl flex flex-col justify-between select-none relative overflow-hidden transition-transform ${
          interactive ? 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : ''
        }`}
        style={{
          boxShadow: '0 8px 24px -2px rgba(0,0,0,0.6)'
        }}
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 end-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-1 text-indigo-400 font-bold text-[10px] tracking-wider uppercase">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="truncate max-w-[80px]">{data.storeName || 'NALI POS'}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
            Live
          </span>
        </div>

        {/* Middle Glance Content */}
        <div className="z-10 my-auto">
          {category === 'debts' && latestDebt ? (
            <div>
              <div className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Debt Due</span>
              </div>
              <div className="text-base font-extrabold text-white truncate mt-0.5">
                {latestDebt.customerName}
              </div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                ${latestDebt.amountDue}
              </div>
            </div>
          ) : category === 'stock' && latestLowStock ? (
            <div>
              <div className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                <PackageX className="w-3 h-3" />
                <span>Threshold Alert</span>
              </div>
              <div className="text-xs font-extrabold text-white truncate mt-0.5">
                {latestLowStock.name}
              </div>
              <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                Only <strong className="text-rose-400">{latestLowStock.currentQuantity}</strong> left
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                <span>Latest Sale</span>
              </div>
              <div className="text-lg font-black text-white tracking-tight mt-0.5">
                ${latestSale ? latestSale.total.toFixed(2) : '0.00'}
              </div>
              <div className="text-[10px] text-slate-300 truncate mt-0.5">
                {latestSale ? latestSale.topItemName : 'No sales yet'}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status / Pill */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-white/5 pt-1.5 z-10">
          <span>{data.stats.todaySalesCount} Sold Today</span>
          <span className="text-indigo-300 font-semibold flex items-center">
            View <ChevronRight className="w-2.5 h-2.5 ms-0.5" />
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MEDIUM WIDGET (4x2 grid, ~340px x 160px)
  // =========================================================================
  if (size === 'medium') {
    return (
      <div 
        className={`w-full max-w-[350px] h-[165px] rounded-[30px] p-4 bg-gradient-to-b from-[#13192a] via-[#0d121f] to-[#070912] border border-white/10 text-white shadow-2xl flex flex-col justify-between select-none relative overflow-hidden ${
          interactive ? 'hover:scale-[1.01] transition-transform' : ''
        }`}
        style={{
          boxShadow: '0 12px 32px -4px rgba(0,0,0,0.7)'
        }}
      >
        {/* Glow corner */}
        <div className="absolute top-0 end-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header Bar */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/40">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide">{data.storeName || 'NALI MOBILE'}</span>
              <span className="text-[10px] text-slate-400 ms-1.5">• iPhone Live Widget</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{data.stats.todaySalesCount} Sales Today</span>
          </div>
        </div>

        {/* 2-Column Split Content */}
        <div className="grid grid-cols-2 gap-2.5 my-auto z-10">
          {/* Left Column: Cashier Sold */}
          <div 
            onClick={() => handleActionClick('/pos')}
            className={`p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/40 transition-colors flex flex-col justify-between ${
              interactive ? 'cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                <ShoppingCart className="w-3 h-3" />
                <span>Cashier Sold</span>
              </span>
              <span className="text-[9px] text-slate-400">{latestSale?.time || 'POS'}</span>
            </div>
            <div className="my-1">
              <div className="text-base font-extrabold text-white tracking-tight">
                ${latestSale ? latestSale.total.toFixed(2) : '0.00'}
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                {latestSale ? latestSale.topItemName : 'Awaiting sale'}
              </div>
            </div>
            <div className="text-[9px] text-slate-400 flex items-center gap-1 truncate">
              <User className="w-2.5 h-2.5 text-slate-400" />
              <span>{latestSale?.cashierName || 'Cashier POS'}</span>
            </div>
          </div>

          {/* Right Column: Debts Due OR Low Stock Alert */}
          {latestDebt ? (
            <div 
              onClick={() => handleActionClick('/debts')}
              className={`p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 transition-colors flex flex-col justify-between ${
                interactive ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Time to Pay</span>
                </span>
                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                  latestDebt.isOverdue ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {latestDebt.statusText}
                </span>
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-white truncate">
                  {latestDebt.customerName}
                </div>
                <div className="text-xs font-bold text-rose-400">
                  ${latestDebt.amountDue} {latestDebt.currency}
                </div>
              </div>
              <div className="text-[9px] text-slate-400 truncate flex items-center gap-1">
                <Phone className="w-2.5 h-2.5 text-amber-400" />
                <span>{latestDebt.customerPhone || 'Call Customer'}</span>
              </div>
            </div>
          ) : latestLowStock ? (
            <div 
              onClick={() => handleActionClick('/restock-alerts')}
              className={`p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/50 transition-colors flex flex-col justify-between ${
                interactive ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 uppercase tracking-wider">
                  <PackageX className="w-3 h-3" />
                  <span>Stock Alert</span>
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                  Threshold
                </span>
              </div>
              <div className="my-1">
                <div className="text-xs font-extrabold text-white truncate">
                  {latestLowStock.name}
                </div>
                <div className="text-xs font-bold text-rose-300 mt-0.5">
                  Stock: {latestLowStock.currentQuantity} (Min {latestLowStock.notifyThreshold})
                </div>
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                Restock Needed
              </div>
            </div>
          ) : (
            <div 
              onClick={() => handleActionClick('/reports')}
              className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Store Revenue
              </span>
              <div>
                <div className="text-base font-extrabold text-white">
                  ${data.stats.todaySalesRevenueUSD.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {formatNumberWithCommas(data.stats.todaySalesRevenueIQD)} IQD
                </div>
              </div>
              <span className="text-[9px] text-emerald-400">All systems normal</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-white/5 z-10">
          <span>Updated just now</span>
          <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
            Tap to Open POS <ArrowUpRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LARGE WIDGET (4x4 grid, ~340px x 340px) - COMPREHENSIVE EXECUTIVE VIEW
  // =========================================================================
  return (
    <div 
      className="w-full max-w-[350px] rounded-[34px] p-4 bg-gradient-to-b from-[#13192a] via-[#0d121f] to-[#070912] border border-white/10 text-white shadow-2xl flex flex-col justify-between select-none relative overflow-hidden"
      style={{
        boxShadow: '0 16px 40px -4px rgba(0,0,0,0.8)'
      }}
    >
      {/* Background radial highlight */}
      <div className="absolute -top-10 -end-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
            NM
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">{data.storeName || 'NALI MOBILE'}</div>
            <div className="text-[10px] text-slate-400">iPhone Real-Time Widget</div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Live Sync</span>
        </div>
      </div>

      {/* SECTION 1: CASHIER SALES LIVE FEED */}
      <div className="py-2 z-10 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3 h-3 text-emerald-400" />
            <span>Cashier Sales Feed ({data.sales?.length || 0})</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Today: <strong className="text-white">${data.stats.todaySalesRevenueUSD.toFixed(2)}</strong>
          </span>
        </div>

        {data.sales && data.sales.length > 0 ? (
          <div className="space-y-1.5">
            {data.sales.slice(0, 2).map((sale) => (
              <div 
                key={sale.id}
                onClick={() => handleActionClick('/pos')}
                className={`p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/40 transition-colors flex items-center justify-between gap-2 ${
                  interactive ? 'cursor-pointer hover:bg-white/[0.06]' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{sale.topItemName}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-300">{sale.itemsCount}x</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{sale.cashierName}</span>
                    <span>•</span>
                    <span>{sale.time}</span>
                    <span>•</span>
                    <span className="uppercase text-slate-500">{sale.sellType}</span>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xs font-extrabold text-emerald-400">
                    ${sale.total.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {sale.invoiceNo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
            Awaiting today's first cashier sale...
          </div>
        )}
      </div>

      {/* SECTION 2: DEBTS & INSTALLMENTS TIME TO PAY */}
      <div className="py-2 border-t border-white/5 z-10 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Time to Pay ({data.debts?.length || 0})</span>
          </span>
          <span className="text-[10px] text-slate-400">Debts & Installments</span>
        </div>

        {data.debts && data.debts.length > 0 ? (
          <div className="space-y-1.5">
            {data.debts.slice(0, 2).map((debt) => (
              <div 
                key={debt.id}
                onClick={() => handleActionClick(debt.type === 'installment' ? '/installments' : '/debts')}
                className={`p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors flex items-center justify-between gap-2 ${
                  interactive ? 'cursor-pointer hover:bg-amber-500/15' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{debt.customerName}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      debt.isOverdue ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {debt.statusText}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{debt.type === 'installment' ? `Installment #${debt.planMonth || 1}` : 'Credit Debt'}</span>
                    {debt.customerPhone && (
                      <>
                        <span>•</span>
                        <span>{debt.customerPhone}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xs font-extrabold text-rose-400">
                    ${debt.amountDue}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Due: {debt.dueDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-center text-[11px] text-emerald-300 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>No overdue debts or installments due today!</span>
          </div>
        )}
      </div>

      {/* SECTION 3: LOW STOCK THRESHOLD ALERTS */}
      <div className="pt-2 border-t border-white/5 z-10 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <PackageX className="w-3 h-3 text-rose-400" />
            <span>Stock Reached Threshold ({data.lowStock?.length || 0})</span>
          </span>
          <span className="text-[10px] text-slate-400">Restock Needed</span>
        </div>

        {data.lowStock && data.lowStock.length > 0 ? (
          <div className="space-y-1.5">
            {data.lowStock.slice(0, 2).map((item) => (
              <div 
                key={item.id}
                onClick={() => handleActionClick('/restock-alerts')}
                className={`p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors flex items-center justify-between gap-2 ${
                  interactive ? 'cursor-pointer hover:bg-rose-500/15' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{item.category}</span>
                    {item.barcode && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[9px]">{item.barcode}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xs font-extrabold text-rose-300">
                    {item.currentQuantity} In Stock
                  </div>
                  <div className="text-[9px] text-rose-400 font-semibold">
                    Threshold: ≤ {item.notifyThreshold}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-center text-[11px] text-emerald-300 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>All inventory is above notification thresholds!</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 z-10">
        <span>Auto-refreshes on every sale</span>
        <button 
          onClick={() => handleActionClick('/pos')}
          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
        >
          <span>Open Full POS</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
