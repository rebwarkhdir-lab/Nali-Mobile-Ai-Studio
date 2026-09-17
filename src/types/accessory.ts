export type AccessoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
export type CurrencyType = 'USD' | 'IQD';

export interface Accessory {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode: string;
  company: string; // Supplier / Vendor / Distribution Company
  quantity: number;
  notifyThreshold?: number; // Low stock alert threshold (optional/disabled if undefined or <= 0)
  currency: CurrencyType;
  buyPrice: number;
  sellPrice: number;
  notes?: string;
  image?: string; // Optional image URL or base64 data
  color?: string; // Optional color/finish
  compatibility?: string; // Compatible devices e.g., "iPhone 15, Type-C, Universal"
  warranty?: string; // e.g., "12 Months Official", "6 Months", "Store Warranty"
  location?: string; // Shelf, bin, rack or drawer number
  sku?: string;
  status: AccessoryStatus;
  totalSold?: number;
  purchaseDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockAdjustment {
  id: string;
  accessoryId: string;
  type: 'stock_in' | 'stock_out' | 'sale' | 'damaged' | 'correction';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  date: string;
  performedBy?: string;
}
