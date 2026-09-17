export interface CashierSaleWidgetSummary {
  id: string;
  invoiceNo: string;
  cashierName: string;
  total: number;
  currency: 'USD' | 'IQD';
  sellType: string;
  itemsCount: number;
  topItemName: string;
  time: string;
  date: string;
  timestamp: number;
  customerName?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface DebtDueWidgetSummary {
  id: string;
  type: 'debt' | 'installment';
  customerName: string;
  customerPhone?: string;
  amountDue: number;
  currency: 'USD' | 'IQD';
  dueDate: string;
  isOverdue: boolean;
  daysRemainingOrOverdue: number; // <= 0 means overdue (e.g. -2 = 2 days overdue), 0 = today, > 0 = days remaining
  statusText: string;
  planMonth?: number;
}

export interface LowStockWidgetSummary {
  id: string;
  name: string;
  type: 'accessory' | 'mobile' | 'screen_protector';
  category: string;
  currentQuantity: number;
  notifyThreshold: number;
  barcode?: string;
  brand?: string;
  status: 'out_of_stock' | 'critical' | 'low_stock';
}

export interface IPhoneWidgetStats {
  todaySalesCount: number;
  todaySalesRevenueUSD: number;
  todaySalesRevenueIQD: number;
  pendingDebtsCount: number;
  totalDebtDueUSD: number;
  lowStockAlertCount: number;
  lastCashierSaleTime?: string;
}

export interface IPhoneWidgetData {
  sales: CashierSaleWidgetSummary[];
  debts: DebtDueWidgetSummary[];
  lowStock: LowStockWidgetSummary[];
  stats: IPhoneWidgetStats;
  lastUpdated: string;
  storeName: string;
  exchangeRate: number;
}

export type IPhoneWidgetSize = 'small' | 'medium' | 'large' | 'dynamic_island';
export type IPhoneWidgetCategory = 'all' | 'sales' | 'debts' | 'stock';
