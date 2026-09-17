export type AlertSeverity = 'out_of_stock' | 'critical' | 'low' | 'healthy';

export interface StockAlert {
  id: string;
  accessoryId: string;
  name: string;
  brand?: string;
  sku: string;
  barcode?: string;
  category: string;
  currentStock: number;
  alertThreshold: number;
  deficit: number;
  suggestedRestock: number;
  supplier: string;
  estimatedCost: number;
  currency: 'USD' | 'IQD';
  severity: AlertSeverity;
  image?: string;
  isDefectiveFlag?: boolean;
}

export interface OrderItem {
  id: string; // can be existing accessory ID or generated for custom
  accessoryId?: string;
  sku: string;
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  quantity: number;
  unitCost: number;
  currency: 'USD' | 'IQD';
  supplier: string;
  notes?: string;
  isCustom?: boolean;
  currentStock?: number;
  alertThreshold?: number;
  image?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: 'draft' | 'submitted' | 'received' | 'cancelled';
  supplierId?: string;
  supplierName?: string;
  items: OrderItem[];
  totalAmountUSD: number;
  totalAmountIQD: number;
  totalUnits: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  receivedAt?: string;
}

