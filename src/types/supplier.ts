export type SupplierCompanyType = 'distributor' | 'wholesaler' | 'factory_direct' | 'importer' | 'trade_in_partner' | 'service_center';
export type SupplierStatus = 'active' | 'inactive' | 'blocked';
export type SupplierPaymentMethod = 'cash' | 'bank_transfer' | 'exchange_office' | 'hawala' | 'cheque' | 'card';
export type InvoiceProductType = 'mobiles' | 'accessories' | 'mixed' | 'spare_parts' | 'services';
export type InvoicePaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'overdue';

export interface Supplier {
  id: string;
  name: string; // Company / Trade Name
  companyType?: SupplierCompanyType;
  contactPerson: string; // Representative / Agent
  phone: string;
  secondaryPhone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  categoriesSupplied: string[]; // e.g. ['Apple Devices', 'Anker Chargers', 'OEM Displays']
  paymentTerms: string; // e.g. 'Net 15 Days', 'Cash on Delivery', 'Monthly Ledger'
  currency: 'USD' | 'IQD'; // Preferred or Primary Currency
  openingBalanceUSD: number;
  openingBalanceIQD: number;
  totalPurchasesUSD: number;
  totalPurchasesIQD: number;
  totalPaidUSD: number;
  totalPaidIQD: number;
  currentDebtUSD: number; // Current Payables Owed to Supplier in USD
  currentDebtIQD: number; // Current Payables Owed to Supplier in IQD
  creditLimitUSD?: number;
  creditLimitIQD?: number;
  rating?: number; // 1 - 5
  status: SupplierStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPurchaseInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string; // Bill of Lading / Supplier Invoice #
  purchaseDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  currency: 'USD' | 'IQD';
  totalAmount: number;
  downPayment: number;
  paidAmount: number;
  remainingDebt: number;
  status: InvoicePaymentStatus;
  productType: InvoiceProductType;
  itemsSummary: string; // e.g. "15x iPhone 15 Pro, 20x 20W Chargers"
  itemCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPaymentVoucher {
  id: string;
  voucherNumber: string; // e.g. "VCH-2026-0041"
  supplierId: string;
  supplierName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  currency: 'USD' | 'IQD';
  exchangeRate?: number;
  paymentDate: string; // YYYY-MM-DD or ISO
  paymentMethod: SupplierPaymentMethod;
  exchangeOfficeOrBank?: string; // e.g. "Al-Taif Exchange", "Baghdad Bank Erbil Branch"
  receiptNumber?: string; // Bank slip or Hawala reference
  paidBy?: string; // Cashier / Admin name
  notes?: string;
  createdAt: string;
}

export interface SupplierStatementItem {
  id: string;
  date: string;
  type: 'opening_balance' | 'invoice' | 'payment' | 'adjustment';
  referenceNumber: string;
  description: string;
  currency: 'USD' | 'IQD';
  debit: number; // Purchases / Increases in debt
  credit: number; // Payments / Decreases in debt
  runningBalanceUSD: number;
  runningBalanceIQD: number;
}
