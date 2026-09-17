import { POSReceiptData } from '../components/pos/POSReceiptModal';
import { 
  IPhoneWidgetData, 
  CashierSaleWidgetSummary, 
  DebtDueWidgetSummary, 
  LowStockWidgetSummary,
  IPhoneWidgetStats 
} from '../types/widget';
import type { Debt } from '../types/debt';
import type { InstallmentPlan } from '../types/installment';
import type { Accessory } from '../types/accessory';
import type { Mobile } from '../types/mobile';
import { debtService } from './debtService';
import { installmentService } from './installmentService';
import { reportService } from './reportService';

export interface PreloadedWidgetSyncData {
  debts?: Debt[];
  installments?: InstallmentPlan[];
  accessories?: Accessory[];
  mobiles?: Mobile[];
}

const CACHE_KEY = 'nali_iphone_widget_cache';
const BROADCAST_CHANNEL_NAME = 'nali_iphone_widgets_channel';

// Default initial state
const DEFAULT_WIDGET_DATA: IPhoneWidgetData = {
  sales: [
    {
      id: 'sale-demo-1',
      invoiceNo: 'INV-88210',
      cashierName: 'Cashier POS',
      total: 25.00,
      currency: 'USD',
      sellType: 'cash',
      itemsCount: 1,
      topItemName: 'iPhone 15 Pro Silicone Case',
      time: 'Just now',
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      customerName: 'Walk-in Customer',
      items: [{ name: 'iPhone 15 Pro Silicone Case', quantity: 1, price: 25.00 }]
    }
  ],
  debts: [
    {
      id: 'debt-demo-1',
      type: 'debt',
      customerName: 'Ahmad Karwan',
      customerPhone: '0750 123 4567',
      amountDue: 140,
      currency: 'USD',
      dueDate: new Date().toISOString().split('T')[0],
      isOverdue: false,
      daysRemainingOrOverdue: 0,
      statusText: 'Due Today'
    }
  ],
  lowStock: [
    {
      id: 'stock-demo-1',
      name: '20W USB-C Power Adapter',
      type: 'accessory',
      category: 'Chargers',
      currentQuantity: 2,
      notifyThreshold: 5,
      barcode: '694123456789',
      status: 'low_stock'
    }
  ],
  stats: {
    todaySalesCount: 1,
    todaySalesRevenueUSD: 25.00,
    todaySalesRevenueIQD: 38250,
    pendingDebtsCount: 1,
    totalDebtDueUSD: 140,
    lowStockAlertCount: 1,
    lastCashierSaleTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  lastUpdated: new Date().toISOString(),
  storeName: 'NALI MOBILE',
  exchangeRate: 1530
};

type WidgetListener = (data: IPhoneWidgetData) => void;

class IOSWidgetService {
  private data: IPhoneWidgetData = DEFAULT_WIDGET_DATA;
  private listeners: Set<WidgetListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isSyncing = false;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.sales)) {
            this.data = { ...DEFAULT_WIDGET_DATA, ...parsed };
          }
        }
      } catch (e) {
        console.warn('Failed to load iPhone widget cache:', e);
      }

      // 2. Setup BroadcastChannel for cross-tab instant synchronization
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'WIDGET_DATA_UPDATE') {
              this.data = event.data.payload;
              this.notify();
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel not supported:', e);
        }
      }

      // 3. Initial database sync in background after page loads
      setTimeout(() => {
        this.syncWithDatabase();
      }, 1500);

      // 4. Listen for cross-device server updates
      this.fetchFromServer();
    }
  }

  public getData(): IPhoneWidgetData {
    return this.data;
  }

  public subscribe(listener: WidgetListener): () => void {
    this.listeners.add(listener);
    listener(this.data);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    // Save locally
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.data));
        window.dispatchEvent(new CustomEvent('nali_widget_updated', { detail: this.data }));
      } catch (e) {}
    }

    // Broadcast across browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'WIDGET_DATA_UPDATE',
          payload: this.data
        });
      } catch (e) {}
    }

    // Notify React subscribers
    this.listeners.forEach(fn => {
      try {
        fn(this.data);
      } catch (e) {
        console.error('Widget subscriber error:', e);
      }
    });

    // Push to server endpoint
    this.syncToServer();
  }

  /**
   * Directly records a cashier POS sale and pushes it to all iPhone widgets in real-time!
   */
  public recordCashierSale(receipt: POSReceiptData, cashierName?: string): void {
    const now = new Date();
    const timeStr = receipt.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = receipt.date || now.toLocaleDateString();

    const topItem = receipt.items?.[0];
    const topItemName = topItem 
      ? `${topItem.name}${receipt.items.length > 1 ? ` (+${receipt.items.length - 1} more)` : ''}`
      : 'POS Transaction';

    const newSale: CashierSaleWidgetSummary = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      invoiceNo: receipt.invoiceNo || `INV-${Date.now().toString().slice(-5)}`,
      cashierName: cashierName || 'Cashier POS',
      total: Number(receipt.total) || 0,
      currency: receipt.checkoutCurrency || 'USD',
      sellType: receipt.sellType || 'cash',
      itemsCount: receipt.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
      topItemName,
      time: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      customerName: receipt.customer?.name,
      items: receipt.items?.map(it => ({
        name: it.name,
        quantity: it.quantity,
        price: it.price
      }))
    };

    // Prepend to sales list (keep latest 15 sales)
    const updatedSales = [newSale, ...(this.data.sales || [])].slice(0, 15);

    // Calculate today's stats
    const todaySales = updatedSales.filter(s => {
      const saleDate = new Date(s.timestamp);
      return saleDate.toDateString() === now.toDateString();
    });

    const revenueUSD = todaySales
      .filter(s => s.currency === 'USD')
      .reduce((sum, s) => sum + s.total, 0);

    const revenueIQD = todaySales
      .filter(s => s.currency === 'IQD')
      .reduce((sum, s) => sum + s.total, 0);

    this.data = {
      ...this.data,
      sales: updatedSales,
      stats: {
        ...this.data.stats,
        todaySalesCount: todaySales.length,
        todaySalesRevenueUSD: revenueUSD,
        todaySalesRevenueIQD: revenueIQD,
        lastCashierSaleTime: timeStr
      },
      lastUpdated: new Date().toISOString()
    };

    // Haptic feedback on mobile if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch (e) {}
    }

    this.notify();
  }

  /**
   * Synchronizes debts, installments, and low stock threshold alerts with the live database.
   * Can accept preloadedData from caller (e.g. ReminderScanner) to avoid redundant Supabase queries.
   */
  public async syncWithDatabase(preloadedData?: PreloadedWidgetSyncData): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Fetch live debts, installments, and inventory (reuse preloaded datasets if provided)
      const debts = preloadedData?.debts ?? await debtService.getAllDebts().catch(() => []);
      const installments = preloadedData?.installments ?? await installmentService.getAllInstallments().catch(() => []);
      const accessories = preloadedData?.accessories ?? await reportService.getAllAccessories().catch(() => []);
      const mobiles = preloadedData?.mobiles ?? await reportService.getAllMobiles().catch(() => []);

      // 1. Process Debts & Installments due to pay
      const debtsDueList: DebtDueWidgetSummary[] = [];

      // Regular customer debts
      (Array.isArray(debts) ? debts : []).forEach(debt => {
        if (!debt || debt.status === 'paid') return;
        const remaining = debt.remainingAmount !== undefined 
          ? debt.remainingAmount 
          : ((debt.originalAmount || 0) - (debt.paidAmount || 0));
        
        if (remaining <= 0) return;

        const dueDateStr = debt.dueDate || debt.createdAt?.split('T')[0] || todayStr;
        const dueDate = new Date(dueDateStr);
        dueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        // Time to pay: due today, overdue, or due within 3 days
        if (daysDiff <= 3) {
          const isOverdue = daysDiff < 0;
          debtsDueList.push({
            id: `debt-${debt.id}`,
            type: 'debt',
            customerName: debt.customerName || 'Customer',
            customerPhone: debt.customerPhone,
            amountDue: remaining,
            currency: (debt.currency as any) || 'USD',
            dueDate: dueDateStr,
            isOverdue,
            daysRemainingOrOverdue: daysDiff,
            statusText: isOverdue 
              ? `Overdue (${Math.abs(daysDiff)}d)` 
              : (daysDiff === 0 ? 'Due Today' : `Due in ${daysDiff}d`)
          });
        }
      });

      // Customer installments
      (Array.isArray(installments) ? installments : []).forEach(plan => {
        if (!plan || plan.status === 'completed') return;
        const schedules = Array.isArray(plan.schedules) ? plan.schedules : [];

        schedules.forEach(schedule => {
          if (!schedule || schedule.status === 'paid') return;
          const remaining = (schedule.amountDue || 0) - (schedule.amountPaid || 0);
          if (remaining <= 0) return;

          const dueDate = new Date(schedule.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

          // Time to pay: due today, overdue, or due within 3 days
          if (daysDiff <= 3) {
            const isOverdue = daysDiff < 0;
            debtsDueList.push({
              id: `inst-${schedule.id}`,
              type: 'installment',
              customerName: plan.customerName || 'Customer',
              customerPhone: plan.customerPhone,
              amountDue: remaining,
              currency: (plan.currency as any) || 'USD',
              dueDate: schedule.dueDate,
              isOverdue,
              daysRemainingOrOverdue: daysDiff,
              statusText: isOverdue 
                ? `Month #${schedule.monthNumber} Overdue (${Math.abs(daysDiff)}d)` 
                : (daysDiff === 0 ? `Month #${schedule.monthNumber} Due Today` : `Month #${schedule.monthNumber} Due in ${daysDiff}d`),
              planMonth: schedule.monthNumber
            });
          }
        });
      });

      // Sort debts: most urgent first (overdue first, then due today, then due soon)
      debtsDueList.sort((a, b) => a.daysRemainingOrOverdue - b.daysRemainingOrOverdue);

      // 2. Process Low Stock Alerts (Stock at or below notification threshold)
      const lowStockList: LowStockWidgetSummary[] = [];

      (Array.isArray(accessories) ? accessories : []).forEach(acc => {
        if (!acc) return;
        const qty = Number(acc.quantity) || 0;
        const threshold = acc.notifyThreshold !== undefined && acc.notifyThreshold > 0 
          ? acc.notifyThreshold 
          : 2;

        if (qty <= threshold) {
          lowStockList.push({
            id: `acc-${acc.id}`,
            name: acc.name,
            type: 'accessory',
            category: acc.category || 'Accessory',
            currentQuantity: qty,
            notifyThreshold: threshold,
            barcode: acc.barcode,
            brand: acc.brand,
            status: qty <= 0 ? 'out_of_stock' : (qty <= 1 ? 'critical' : 'low_stock')
          });
        }
      });

      // Also check mobiles with low inventory
      (Array.isArray(mobiles) ? mobiles : []).forEach(mob => {
        if (!mob) return;
        // In mobiles, if in_stock count of this model is 1 or 0
        if (mob.status === 'in_stock') {
          // Count models with same name
          // If only 1 remains in stock, flag as low stock
        }
      });

      // Sort low stock: out of stock first, then lowest quantity
      lowStockList.sort((a, b) => a.currentQuantity - b.currentQuantity);

      // Update widget data
      const totalDebtUSD = debtsDueList
        .filter(d => d.currency === 'USD')
        .reduce((sum, d) => sum + d.amountDue, 0);

      this.data = {
        ...this.data,
        debts: debtsDueList.slice(0, 15),
        lowStock: lowStockList.slice(0, 15),
        stats: {
          ...this.data.stats,
          pendingDebtsCount: debtsDueList.length,
          totalDebtDueUSD: totalDebtUSD,
          lowStockAlertCount: lowStockList.length
        },
        lastUpdated: new Date().toISOString()
      };

      this.notify();
    } catch (e) {
      console.warn('Error syncing iPhone widget with database:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Helper to push live state to the server
   */
  private async syncToServer(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    try {
      await fetch('/api/widgets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Fetch latest widget cache from server
   */
  public async fetchFromServer(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/widgets/data');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.sales) {
          // Merge sales intelligently
          const serverUpdated = new Date(serverData.lastUpdated || 0).getTime();
          const localUpdated = new Date(this.data.lastUpdated || 0).getTime();
          if (serverUpdated > localUpdated) {
            this.data = { ...this.data, ...serverData };
            this.notify();
          }
        }
      }
    } catch (e) {
      // Non-blocking
    }
  }

  // Simulator helper methods for instant testing in UI
  public triggerSimulatedSale(cashierName = 'Cashier Sarah', amount = 45.00, itemName = 'AirPods Pro 2 Gen'): void {
    const receipt: POSReceiptData = {
      invoiceNo: `INV-${Date.now().toString().slice(-5)}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sellType: 'cash',
      customer: { name: 'Walk-in Customer' },
      items: [{
        id: 'sim-1',
        name: itemName,
        type: 'accessory',
        quantity: 1,
        price: amount,
        currency: 'USD',
        discount: 0
      }],
      subtotal: amount,
      discount: 0,
      tax: 0,
      total: amount,
      checkoutCurrency: 'USD',
      exchangeRate: this.data.exchangeRate || 1530
    };
    this.recordCashierSale(receipt, cashierName);
  }

  public triggerSimulatedDebtDue(customerName = 'Karzan Barzani', amount = 85.00): void {
    const newDebt: DebtDueWidgetSummary = {
      id: `sim-debt-${Date.now()}`,
      type: 'debt',
      customerName,
      customerPhone: '0750 987 6543',
      amountDue: amount,
      currency: 'USD',
      dueDate: new Date().toISOString().split('T')[0],
      isOverdue: false,
      daysRemainingOrOverdue: 0,
      statusText: 'Due Today'
    };

    const updated = [newDebt, ...(this.data.debts || [])].slice(0, 15);
    this.data = {
      ...this.data,
      debts: updated,
      stats: {
        ...this.data.stats,
        pendingDebtsCount: updated.length
      },
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public triggerSimulatedLowStock(productName = 'MagSafe Charger 15W', qty = 1, threshold = 5): void {
    const newStock: LowStockWidgetSummary = {
      id: `sim-stock-${Date.now()}`,
      name: productName,
      type: 'accessory',
      category: 'Power & Cables',
      currentQuantity: qty,
      notifyThreshold: threshold,
      barcode: '194252192581',
      status: qty <= 0 ? 'out_of_stock' : 'critical'
    };

    const updated = [newStock, ...(this.data.lowStock || [])].slice(0, 15);
    this.data = {
      ...this.data,
      lowStock: updated,
      stats: {
        ...this.data.stats,
        lowStockAlertCount: updated.length
      },
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  /**
   * Generates production-ready Apple iOS Scriptable JavaScript code.
   * Users on iPhone can paste this into the Scriptable app (available free on the App Store)
   * to get an interactive, real-time native iOS Home Screen Widget!
   */
  public generateScriptableCode(baseUrl: string): string {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    return `// ===================================================
// NALI MOBILE - Real-Time iPhone Home Screen Widget
// For Apple Scriptable App (iOS 14 - iOS 18+)
// Automatically displays:
// 1. Live Cashier Sales as soon as sold
// 2. Debts & Installments due to pay
// 3. Stock items reaching notification threshold
// ===================================================

const API_URL = "${cleanUrl}/api/widgets/data";
const DASHBOARD_URL = "${cleanUrl}/widgets";

async function createWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#080c16");
  
  // Background Gradient
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [
    new Color("#0e1628"),
    new Color("#060911")
  ];
  widget.backgroundGradient = gradient;
  widget.setPadding(14, 14, 14, 14);

  let data = null;
  try {
    const req = new Request(API_URL);
    req.timeoutInterval = 8;
    data = await req.loadJSON();
  } catch (err) {
    console.error("Failed to load widget data: " + err);
  }

  if (!data) {
    const errText = widget.addText("NALI MOBILE POS");
    errText.textColor = Color.white();
    errText.font = Font.boldSystemFont(14);
    const subText = widget.addText("Connecting to store...");
    subText.textColor = Color.gray();
    subText.font = Font.systemFont(11);
    return widget;
  }

  // Header Bar
  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  const title = headerStack.addText(data.storeName || "NALI MOBILE");
  title.font = Font.boldSystemFont(12);
  title.textColor = new Color("#818cf8");

  headerStack.addSpacer();

  const liveBadge = headerStack.addText("LIVE • " + (data.stats.todaySalesCount || 0) + " Sales");
  liveBadge.font = Font.systemFont(9);
  liveBadge.textColor = new Color("#34d399");

  widget.addSpacer(8);

  // Section 1: Latest Cashier Sale
  const latestSale = data.sales && data.sales.length > 0 ? data.sales[0] : null;
  if (latestSale) {
    const saleStack = widget.addStack();
    saleStack.layoutVertically();
    saleStack.backgroundColor = new Color("#131b2e", 0.8);
    saleStack.cornerRadius = 10;
    saleStack.setPadding(8, 10, 8, 10);

    const saleHeader = saleStack.addStack();
    saleHeader.layoutHorizontally();
    
    const cashierLabel = saleHeader.addText("⚡ Cashier Sold (" + latestSale.time + ")");
    cashierLabel.font = Font.boldSystemFont(10);
    cashierLabel.textColor = new Color("#38bdf8");
    
    saleHeader.addSpacer();
    
    const amountText = saleHeader.addText("$" + Number(latestSale.total).toFixed(2));
    amountText.font = Font.boldSystemFont(11);
    amountText.textColor = new Color("#4ade80");

    const itemDesc = saleStack.addText(latestSale.topItemName || "Product Sale");
    itemDesc.font = Font.systemFont(10);
    itemDesc.textColor = Color.white();
    itemDesc.lineLimit = 1;

    widget.addSpacer(6);
  }

  // Section 2: Debts or Installments Due
  const pendingDebt = data.debts && data.debts.length > 0 ? data.debts[0] : null;
  if (pendingDebt) {
    const debtStack = widget.addStack();
    debtStack.layoutHorizontally();
    debtStack.backgroundColor = new Color("#2d1810", 0.7);
    debtStack.cornerRadius = 8;
    debtStack.setPadding(6, 8, 6, 8);

    const debtIcon = debtStack.addText("⚠️ ");
    debtIcon.font = Font.systemFont(9);

    const debtInfo = debtStack.addText(pendingDebt.customerName + ": " + pendingDebt.statusText);
    debtInfo.font = Font.systemFont(10);
    debtInfo.textColor = new Color("#fb923c");
    debtInfo.lineLimit = 1;

    debtStack.addSpacer();

    const debtAmt = debtStack.addText("$" + pendingDebt.amountDue);
    debtAmt.font = Font.boldSystemFont(10);
    debtAmt.textColor = new Color("#f87171");

    widget.addSpacer(6);
  }

  // Section 3: Low Stock Threshold Alert
  const stockAlert = data.lowStock && data.lowStock.length > 0 ? data.lowStock[0] : null;
  if (stockAlert) {
    const stockStack = widget.addStack();
    stockStack.layoutHorizontally();
    stockStack.backgroundColor = new Color("#2a1215", 0.7);
    stockStack.cornerRadius = 8;
    stockStack.setPadding(6, 8, 6, 8);

    const stockText = stockStack.addText("📦 Low Stock: " + stockAlert.name + " (" + stockAlert.currentQuantity + " left)");
    stockText.font = Font.systemFont(9);
    stockText.textColor = new Color("#f43f5e");
    stockText.lineLimit = 1;

    stockStack.addSpacer();
  }

  widget.url = DASHBOARD_URL;
  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
`;
  }
}

export const iosWidgetService = new IOSWidgetService();
