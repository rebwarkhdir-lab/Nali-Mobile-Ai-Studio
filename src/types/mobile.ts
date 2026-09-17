export type MobileStatus = 'in_stock' | 'sold' | 'reserved' | 'defective';
export type CurrencyType = 'USD' | 'IQD';

export interface Mobile {
  id: string;
  brand: string;
  model: string;
  imei: string;
  storage: string;
  ram: string;
  color: string;
  battery: string;
  condition: string;
  boughtFrom: string;
  purchaseDate: string;
  currency: CurrencyType;
  buyPrice: number;
  sellPrice: number;
  accessories: string;
  notes?: string;
  status: MobileStatus;
  
  // Sold specific fields
  soldDate?: string;
  soldPrice?: number;
  soldToCustomer?: string;
  soldNotes?: string;
  createdAt?: string;
}
