export type InvoiceType = 
  | 'cash' 
  | 'card' 
  | 'debt' 
  | 'installment' 
  | 'debt_payment' 
  | 'installment_payment' 
  | 'statement';

export type InvoiceDocumentType = 
  | 'cash_invoice' 
  | 'debt_invoice' 
  | 'installment_invoice' 
  | 'debt_receipt' 
  | 'installment_receipt' 
  | 'customer_statement';

export type InvoiceStatus = 
  | 'paid' 
  | 'partially_paid' 
  | 'debt' 
  | 'installment' 
  | 'overdue' 
  | 'cancelled' 
  | 'active'
  | 'draft';

export interface InvoiceItem {
  id: string;
  type: 'mobile' | 'accessory' | 'service' | 'general';
  name: string;
  brand?: string;
  model?: string;
  imei?: string;
  serialNumber?: string;
  barcode?: string;
  sku?: string;
  storage?: string;
  ram?: string;
  color?: string;
  battery?: string;
  condition?: string;
  warranty?: string;
  accessories?: string;
  quantity: number;
  unitPrice: number;
  currency: 'USD' | 'IQD';
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  total: number;
}

export interface InvoiceCustomer {
  id?: string;
  name: string;
  phone?: string;
  secondaryPhone?: string;
  idCard?: string;
  address?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorIdCard?: string;
  guarantorAddress?: string;
  previousBalance?: number;
  currentTransactionAmount?: number;
  totalOutstandingBalance?: number;
  accountStatus?: 'good_standing' | 'warning' | 'overdue' | 'vip';
}

export interface InstallmentScheduleDocItem {
  monthNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paidDate?: string;
  paymentMethod?: string;
  status: 'paid' | 'partially_paid' | 'upcoming' | 'overdue' | 'due';
  receiptNumber?: string;
  notes?: string;
}

export interface InstallmentPlanDetails {
  contractNumber: string;
  principalAmount: number;
  additionalFee: number;
  totalAmount: number;
  downPayment: number;
  financedAmount: number;
  monthlyPayment: number;
  durationMonths: number;
  frequency: 'monthly' | 'biweekly' | 'weekly';
  startDate: string;
  firstDueDate: string;
  finalDueDate?: string;
  paidSchedulesCount: number;
  totalSchedulesCount: number;
  paidAmount: number;
  balanceRemaining: number;
  schedules: InstallmentScheduleDocItem[];
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorIdCard?: string;
  guarantorAddress?: string;
}

export interface DebtPaymentDocItem {
  id: string;
  debtId?: string;
  amount: number;
  currency: 'USD' | 'IQD';
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  notes?: string;
  receivedBy?: string;
}

export interface DebtPlanDetails {
  originalAmount: number;
  downPayment: number;
  paidAmount: number;
  remainingAmount: number;
  startDate: string;
  dueDate: string;
  status: 'outstanding' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payments: DebtPaymentDocItem[];
  guarantorName?: string;
  guarantorPhone?: string;
}

export interface PaymentReceiptDetails {
  receiptNumber: string;
  originalInvoiceNumber?: string;
  contractNumber?: string;
  paymentType: 'debt' | 'installment' | 'partial' | 'down_payment';
  paymentDate: string;
  paymentTime?: string;
  amountPaid: number;
  currency: 'USD' | 'IQD';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  previousBalance: number;
  remainingBalance: number;
  installmentMonthNumber?: number;
  totalInstallmentMonths?: number;
  nextDueDate?: string;
  receivedBy?: string;
  notes?: string;
}

export interface CustomerStatementTransaction {
  id: string;
  date: string;
  type: 'sale' | 'payment' | 'debt_added' | 'installment_fee' | 'down_payment' | 'adjustment';
  referenceNo: string; // Invoice / Receipt #
  description: string;
  debit: number; // Charges to customer (increases debt)
  credit: number; // Payments made by customer (decreases debt)
  runningBalance: number;
  currency: 'USD' | 'IQD';
  status?: string;
}

export interface CustomerStatementDetails {
  customer: InvoiceCustomer;
  periodStart?: string;
  periodEnd?: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  currency: 'USD' | 'IQD';
  transactions: CustomerStatementTransaction[];
}

export interface BusinessInvoiceSettings {
  businessNameEn: string;
  businessNameKu: string;
  businessTaglineEn: string;
  businessTaglineKu: string;
  businessAddressEn: string;
  businessAddressKu: string;
  businessPhone: string;
  businessPhoneSecondary?: string;
  businessWhatsApp: string;
  businessEmail?: string;
  businessTaxNumber?: string;
  logoUrl?: string | null;
  invoiceFooterMessageEn: string;
  invoiceFooterMessageKu: string;
  invoiceTermsEn?: string;
  invoiceTermsKu?: string;
  invoiceShowQR: boolean;
  invoiceShowDualCurrency: boolean;
}

export interface InvoiceDocument {
  documentId: string;
  documentNumber: string; // e.g. "INV-2026-1042", "INS-2026-001", "REC-DEBT-001"
  documentType: InvoiceDocumentType;
  issueDate: string;
  issueTime?: string;
  currency: 'USD' | 'IQD';
  exchangeRate: number;
  sellerName?: string;
  
  // Financial totals
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  previousBalance?: number;
  remainingBalance: number;
  
  // Payment Method details
  paymentMethod?: 'cash' | 'card' | 'debt' | 'installment' | 'mixed' | 'bank_transfer' | 'other';
  cashTendered?: number;
  cashChange?: number;
  cardProvider?: string;
  cardRef?: string;
  
  status: InvoiceStatus;
  notes?: string;
  
  // Contextual sections
  customer?: InvoiceCustomer;
  items?: InvoiceItem[];
  debtDetails?: DebtPlanDetails;
  installmentDetails?: InstallmentPlanDetails;
  paymentReceiptDetails?: PaymentReceiptDetails;
  statementDetails?: CustomerStatementDetails;
  businessInfo?: Partial<BusinessInvoiceSettings>;
}
