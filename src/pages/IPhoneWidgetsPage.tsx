import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShoppingCart, 
  AlertTriangle, 
  PackageX, 
  RefreshCw, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Share2, 
  Radio, 
  ExternalLink,
  Phone,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { iosWidgetService } from '../lib/iosWidgetService';
import { IPhoneWidgetData, IPhoneWidgetCategory } from '../types/widget';
import IPhoneWidgetView from '../components/widgets/IPhoneWidgetView';
import { sound } from '../lib/sound';
import { formatNumberWithCommas } from '../lib/utils';

export default function IPhoneWidgetsPage() {
  const [data, setData] = useState<IPhoneWidgetData>(() => iosWidgetService.getData());
  const [activeCategory, setActiveCategory] = useState<IPhoneWidgetCategory>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(data.sales?.[0]?.id || null);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = iosWidgetService.subscribe((updated) => {
      // If a new sale arrived, chime and vibrate
      const newFirstSale = updated.sales?.[0];
      if (newFirstSale && newFirstSale.id !== lastSaleId) {
        setLastSaleId(newFirstSale.id);
        if (soundEnabled) {
          sound.playPaymentSuccess();
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([60, 40, 60]);
        }
      }
      setData({ ...updated });
    });

    return () => {
      unsubscribe();
    };
  }, [lastSaleId, soundEnabled]);

  const handleManualRefresh = async () => {
    sound.playClick();
    setIsRefreshing(true);
    await iosWidgetService.syncWithDatabase();
    await iosWidgetService.fetchFromServer();
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-[#060911] text-white p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start antialiased selection:bg-indigo-600">
      
      {/* Top Mobile Safari Header */}
      <div className="w-full max-w-md flex items-center justify-between py-3 border-b border-white/10 mb-5">
        <a 
          href="/pos"
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to POS</span>
        </a>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Widget Container */}
      <div className="w-full max-w-md space-y-4">
        
        {/* Dynamic Island Banner for Cashier Sales */}
        {data.sales && data.sales.length > 0 && (
          <div className="w-full mb-2">
            <IPhoneWidgetView data={data} size="dynamic_island" />
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all' as IPhoneWidgetCategory, label: '3-in-1 Executive', icon: Smartphone },
            { id: 'sales' as IPhoneWidgetCategory, label: 'Cashier Sales', icon: ShoppingCart },
            { id: 'debts' as IPhoneWidgetCategory, label: 'Debts Due', icon: AlertTriangle },
            { id: 'stock' as IPhoneWidgetCategory, label: 'Stock Threshold', icon: PackageX }
          ].map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  sound.playClick();
                  setActiveCategory(cat.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected View Mode */}
        {activeCategory === 'all' && (
          <div className="space-y-4">
            <IPhoneWidgetView data={data} size="large" />
          </div>
        )}

        {/* Focus: Cashier Sales Feed */}
        {activeCategory === 'sales' && (
          <div className="p-5 rounded-[32px] bg-gradient-to-b from-[#13192a] via-[#0d121f] to-[#070912] border border-white/10 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Live Cashier Sales</h4>
                  <p className="text-[10px] text-slate-400">Updates the second a cashier sells</p>
                </div>
              </div>
              <div className="text-end">
                <div className="text-sm font-extrabold text-emerald-400">
                  ${data.stats.todaySalesRevenueUSD.toFixed(2)}
                </div>
                <div className="text-[9px] text-slate-400">
                  {data.stats.todaySalesCount} transactions today
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {data.sales && data.sales.length > 0 ? (
                data.sales.map((sale) => (
                  <div 
                    key={sale.id}
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{sale.topItemName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">{sale.itemsCount}x</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-slate-300 font-medium">{sale.cashierName}</span>
                        <span>•</span>
                        <span>{sale.time}</span>
                        <span>•</span>
                        <span className="uppercase text-slate-500">{sale.sellType}</span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-sm font-extrabold text-emerald-400">
                        ${sale.total.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {sale.invoiceNo}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No sales recorded today yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Focus: Debts Due to Pay */}
        {activeCategory === 'debts' && (
          <div className="p-5 rounded-[32px] bg-gradient-to-b from-[#13192a] via-[#0d121f] to-[#070912] border border-white/10 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Debts & Installments Due</h4>
                  <p className="text-[10px] text-slate-400">Due today or overdue balances</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                {data.debts?.length || 0} Accounts
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {data.debts && data.debts.length > 0 ? (
                data.debts.map((debt) => (
                  <div 
                    key={debt.id}
                    className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{debt.customerName}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          debt.isOverdue ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {debt.statusText}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{debt.type === 'installment' ? `Installment #${debt.planMonth || 1}` : 'Store Credit'}</span>
                        {debt.customerPhone && (
                          <a 
                            href={`tel:${debt.customerPhone}`}
                            className="text-amber-400 hover:underline flex items-center gap-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{debt.customerPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-sm font-extrabold text-rose-400">
                        ${debt.amountDue}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Due: {debt.dueDate}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-emerald-400">
                  🎉 No overdue debts or installments due today!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Focus: Stock Notification Threshold */}
        {activeCategory === 'stock' && (
          <div className="p-5 rounded-[32px] bg-gradient-to-b from-[#13192a] via-[#0d121f] to-[#070912] border border-white/10 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-500/30">
                  <PackageX className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Stock Threshold Alerts</h4>
                  <p className="text-[10px] text-slate-400">Items at or below restock limit</p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                {data.lowStock?.length || 0} Items
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {data.lowStock && data.lowStock.length > 0 ? (
                data.lowStock.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                        {item.barcode && <span className="font-mono text-[9px]">{item.barcode}</span>}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-sm font-extrabold text-rose-300">
                        {item.currentQuantity} In Stock
                      </div>
                      <div className="text-[9px] text-rose-400 font-semibold">
                        Threshold: ≤ {item.notifyThreshold}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-emerald-400">
                  All inventory stocks are above notification thresholds!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add to Home Screen Instructions callout */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">Add to iPhone Home Screen</div>
              <div className="text-[10px] text-slate-400">Tap Safari Share &gt; "Add to Home Screen"</div>
            </div>
          </div>
          <a
            href="/pos"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0"
          >
            Open POS
          </a>
        </div>

      </div>
    </div>
  );
}
